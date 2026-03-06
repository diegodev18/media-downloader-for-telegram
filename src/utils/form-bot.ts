import fs from "fs";
import { commands } from "@/consts/commands";
import {
  downloadVideo,
  downloadAudio,
  getDataLines,
  getDirectUrl,
  listFormats,
  getPlaylistInfo,
  downloadThumbnail,
  YouTubeCookiesError,
} from "@/utils/download-utils";
import { extractUrls } from "@/utils/url-utils";
import { youtubedl } from "@/lib/ytdlp-client";
import {
  YTDLP as YTDLP_CONFIG,
  YTDLP,
  ADMIN_CHAT_IDS,
  ALLOWED_CHAT_IDS,
  CHANNEL_ID,
} from "@/config";
import { statsStore } from "@/lib/middlewares";
import type { TelegrafContext } from "@/types/telegraf";
import type { Context, NarrowedContext } from "telegraf";
import type { Update, Message } from "telegraf/types";

/**
 * Extrae un identificador del vídeo desde la URL para mostrar en mensajes.
 * YouTube: usa el parámetro ?v=; otras URLs: último segmento del path o host.
 */
function getVideoIdFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const v = parsed.searchParams.get("v");
    if (v) return v;
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    if (pathSegments.length > 0) return pathSegments[pathSegments.length - 1];
    return parsed.hostname || "—";
  } catch {
    return "—";
  }
}

const FORMAT_PROFILE_TOKENS: (keyof typeof YTDLP.FORMAT_PROFILES)[] = [
  "720p",
  "480p",
  "max",
  "default",
];

function getFormatProfileFromMessage(
  messageText: string,
  url: string
): keyof typeof YTDLP.FORMAT_PROFILES | undefined {
  const withoutUrl = messageText.replace(url, "").trim().toLowerCase();
  const token = FORMAT_PROFILE_TOKENS.find((t) =>
    withoutUrl.split(/\s+/).some((w) => w === t.toLowerCase())
  );
  return token;
}

export class FormBot {
  static start(ctx: Context) {
    const username = ctx.from?.first_name;
    ctx.reply(`\
Bienvenido${username && ` ${username}`}!

Soy un bot de Telegram y mi tarea es ayudarte a descargar archivos multimedia desde las redes sociales que desees. Tengo limite de 50 MB para enviar multimedia, asi que intenta no pasarme enlaces de videos muy largos.`);
  }

  static help(ctx: Context) {
    const command_list = Object.entries(commands).map(
      ([command, { description }]) => `/${command} - ${description}`
    );
    ctx.reply(`\
Aquí tienes una lista de comandos que puedes usar:
${command_list.join("\n")}`);
  }

  /**
   * Procesa y envía un único vídeo por URL. Usado tanto para un solo enlace como en bucle para varios.
   * formatProfile: opcional, p. ej. "720p", "480p", "max".
   */
  static async sendOneVideo(
    ctx: NarrowedContext<
      TelegrafContext,
      Update.MessageUpdate<Record<"text", {}> & Message.TextMessage>
    >,
    url: string,
    formatProfile?: keyof typeof YTDLP.FORMAT_PROFILES
  ): Promise<boolean> {
    let domain: string;
    try {
      domain = new URL(url).hostname || url;
    } catch {
      domain = url;
    }
    const videoId = getVideoIdFromUrl(url);
    const fromUsername = ctx.from.username;

    ctx.reply(`Descargando video...\nDesde: ${domain}\nVideoId: ${videoId}`);

    let videoData;
    try {
      videoData = await downloadVideo(url, {
        formatProfile,
      });
    } catch (err) {
      if (err instanceof YouTubeCookiesError) {
        ctx.reply(`❌ ${err.message}`);
        return false;
      }
      console.error("Error en downloadVideo (excepción):", url, err);
      ctx.reply(
        "❌ Error al descargar el video. Asegúrate de que el enlace es correcto y vuelve a intentarlo."
      );
      return false;
    }

    if (!videoData) {
      console.error("Error al descargar el video (downloadVideo devolvió null):", url);
      ctx.reply(
        "❌ Error al descargar el video. Asegúrate de que el enlace es correcto y vuelve a intentarlo."
      );
      return false;
    }
    const { output, info } = videoData;

    ctx.reply("Descarga exitosa! Preparando para enviar el video...");

    const maxSize = 50 * 1024 * 1024;
    if (info.filesize && info.filesize > maxSize) {
      let directUrl: string | null = null;
      try {
        directUrl = await getDirectUrl(url);
      } catch {
        // ignorar
      }
      ctx.reply(
        "❌ El archivo es demasiado grande para ser enviado por Telegram (más de 50 MB)." +
          (directUrl ? `\n\nEnlace para descargarlo manualmente:\n${directUrl}` : "")
      );
      console.error(`Archivo ${output} demasiado grande:`, info.filesize);
      fs.unlinkSync(output);
      return false;
    }

    ctx.reply("Enviando el video...");
    ctx.sendChatAction("upload_video");

    try {
      const fileStream = fs.createReadStream(output);

      const repliedData = await ctx.replyWithVideo(
        { source: fileStream },
        {
          caption: `Listo, ten el video que me pediste${
            fromUsername ? ` @${fromUsername}` : ` ${ctx.from.first_name}`
          }!`,
        }
      );

      console.log(`Video enviado exitosamente a ${ctx.from.id}:`, {
        message_id: repliedData.message_id,
        file_id: repliedData.video?.file_id,
      });
      const chatId = ctx.chat?.id;
      if (chatId !== undefined) statsStore.recordDownload(chatId);

      if (CHANNEL_ID) {
        try {
          const channelStream = fs.createReadStream(output);
          await ctx.telegram.sendVideo(
            CHANNEL_ID,
            { source: channelStream },
            {
              caption: info.title
                ? `📎 ${info.title}`
                : `Enviado desde chat ${ctx.chat?.id}`,
            }
          );
        } catch (channelErr) {
          console.error("Error al reenviar al canal:", channelErr);
        }
      }
      return true;
    } catch (err: any) {
      if (err?.code === 413) {
        ctx.reply(
          "❌ El archivo es demasiado grande para ser enviado por Telegram (más de 50 MB)."
        );
      } else {
        ctx.reply("❌ Error al enviar el video.");
      }
      console.error(
        `Error al enviar el video ${info.id}:`,
        err.response || { message: err.message, code: err.code }
      );
      console.error(
        `Video ${info.id} info:`,
        JSON.stringify({
          title: info.title,
          uploader: info.uploader,
          filesize: info.filesize,
          url: info.webpage_url,
          duration: info.duration,
        })
      );
      const chatId = ctx.chat?.id;
      if (chatId !== undefined)
        statsStore.recordError(chatId, (err as Error)?.message ?? "Error al enviar el video");
      return false;
    } finally {
      fs.unlinkSync(output);
    }
  }

  static async sendDownloadedVideo(
    ctx: NarrowedContext<
      TelegrafContext,
      Update.MessageUpdate<Record<"text", {}> & Message.TextMessage>
    >
  ): Promise<void> {
    const messageText = ctx.message?.text;
    if (!messageText) return;

    const urls = extractUrls(messageText);
    if (urls.length === 0) {
      ctx.reply("❌ No se encontró ninguna URL en tu mensaje. Envía un enlace de video.");
      return;
    }

    if (urls.length === 1) {
      const profile = getFormatProfileFromMessage(messageText, urls[0]);
      await FormBot.sendOneVideo(ctx, urls[0], profile);
      return;
    }

    ctx.reply(`Encontradas ${urls.length} URLs. Procesando en secuencia...`);
    let sent = 0;
    for (const url of urls) {
      const ok = await FormBot.sendOneVideo(ctx, url);
      if (ok) sent++;
    }
    ctx.reply(`Listo. Enviados ${sent} de ${urls.length} vídeos.`);
  }

  static async info(ctx: Context) {
    let url: string | undefined;
    if (ctx.message && "text" in ctx.message) {
      url = ctx.message.text.split(" ")[1];
    }

    ctx.sendChatAction("typing");

    if (!url) {
      ctx.reply(
        "❌ Por favor, proporciona un enlace de video para obtener información. Uso: /info <enlace>"
      );
      return;
    }

    ctx.reply("Obteniendo información del video...");

    const cookiesOpt = fs.existsSync(YTDLP_CONFIG.COOKIES_FILE)
      ? { cookies: YTDLP_CONFIG.COOKIES_FILE }
      : {};
    youtubedl(url, {
      ...cookiesOpt,
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
    })
      .then((info) => {
        ctx.reply(
          `Información del video:\n${getDataLines(info, null).join("\n")}`
        );
      })
      .catch((err) => {
        ctx.reply(`❌ Error al obtener información del video`);
        console.error("/info", err.message);
      });
  }

  static async audio(ctx: Context) {
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const urls = extractUrls(text);
    const url = urls[0] ?? text.split(/\s+/)[1];

    ctx.sendChatAction("typing");

    if (!url) {
      ctx.reply(
        "❌ Proporciona un enlace para extraer el audio. Uso: /audio <enlace>"
      );
      return;
    }

    ctx.reply("Descargando audio...");

    let audioData;
    try {
      audioData = await downloadAudio(url);
    } catch (err) {
      if (err instanceof YouTubeCookiesError) {
        ctx.reply(`❌ ${err.message}`);
        return;
      }
      console.error("Error en downloadAudio:", url, err);
      ctx.reply(
        "❌ Error al descargar el audio. Asegúrate de que el enlace es correcto y vuelve a intentarlo."
      );
      return;
    }

    if (!audioData) {
      ctx.reply(
        "❌ Error al descargar el audio. Asegúrate de que el enlace es correcto y vuelve a intentarlo."
      );
      return;
    }

    const { output, info } = audioData;
    const maxSize = 50 * 1024 * 1024;
    const size = fs.statSync(output).size;

    if (size > maxSize) {
      ctx.reply(
        "❌ El audio es demasiado grande para enviar por Telegram (más de 50 MB)."
      );
      fs.unlinkSync(output);
      return;
    }

    ctx.sendChatAction("upload_document");
    try {
      const fileStream = fs.createReadStream(output);
      await ctx.replyWithDocument(
        { source: fileStream, filename: `${info.title ?? "audio"}.mp3` },
        {
          caption: `Audio listo${ctx.from?.username ? ` @${ctx.from.username}` : ""}.`,
        }
      );
    } catch (err) {
      ctx.reply("❌ Error al enviar el audio.");
      console.error("Error al enviar audio:", err);
    } finally {
      fs.unlinkSync(output);
    }
  }

  static async playlist(ctx: Context) {
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const urls = extractUrls(text);
    const url = urls[0] ?? text.split(/\s+/)[1];

    ctx.sendChatAction("typing");

    if (!url) {
      ctx.reply(
        "❌ Proporciona un enlace de playlist. Uso: /playlist <enlace>"
      );
      return;
    }

    ctx.reply("Obteniendo información de la playlist...");

    const playlist = await getPlaylistInfo(url);
    if (!playlist) {
      ctx.reply(
        "❌ No se pudo obtener la playlist o el enlace no es una playlist."
      );
      return;
    }

    const lines: string[] = [
      playlist.title ? `📋 ${playlist.title}` : "📋 Playlist",
      "",
      ...playlist.entries.slice(0, 25).map((e, i) => {
        const dur = e.duration != null ? ` (${e.duration}s)` : "";
        const link = e.url ? `\n   ${e.url}` : "";
        return `${i + 1}. ${e.title ?? e.id ?? "—"}${dur}${link}`;
      }),
    ];
    if (playlist.entries.length > 25) {
      lines.push("", `... y ${playlist.entries.length - 25} más.`);
    }
    const msg = lines.join("\n");
    const maxLen = 4000;
    if (msg.length > maxLen) {
      await ctx.reply(msg.slice(0, maxLen) + "\n... (truncado)");
    } else {
      await ctx.reply(msg);
    }
  }

  static async format(ctx: Context) {
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const urls = extractUrls(text);
    const url = urls[0] ?? text.split(/\s+/)[1];

    ctx.sendChatAction("typing");

    if (!url) {
      ctx.reply(
        "❌ Proporciona un enlace para listar formatos. Uso: /format <enlace>"
      );
      return;
    }

    ctx.reply("Obteniendo formatos disponibles...");

    const out = await listFormats(url);
    if (!out) {
      ctx.reply("❌ No se pudo obtener la lista de formatos para ese enlace.");
      return;
    }

    const maxLen = 3500;
    const textToSend =
      out.length > maxLen
        ? `(Primeros ${maxLen} caracteres)\n\n${out.slice(0, maxLen)}...`
        : out;
    ctx.reply(`Formatos disponibles:\n\n<pre>${textToSend}</pre>`, {
      parse_mode: "HTML",
    });
  }

  static async image(ctx: Context) {
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const urls = extractUrls(text);
    const url = urls[0] ?? text.split(/\s+/)[1];

    ctx.sendChatAction("typing");

    if (!url) {
      ctx.reply(
        "❌ Proporciona un enlace para obtener la imagen/miniatura. Uso: /image <enlace>"
      );
      return;
    }

    ctx.reply("Descargando imagen o miniatura...");

    const output = await downloadThumbnail(url);
    if (!output) {
      ctx.reply(
        "❌ No se pudo obtener la imagen. Asegúrate de que el enlace es correcto."
      );
      return;
    }

    try {
      const fileStream = fs.createReadStream(output);
      await ctx.replyWithPhoto(
        { source: fileStream },
        { caption: "Imagen / miniatura del enlace." }
      );
    } catch (err) {
      ctx.reply("❌ Error al enviar la imagen.");
      console.error("Error al enviar imagen:", err);
    } finally {
      fs.unlinkSync(output);
    }
  }

  static async stats(ctx: Context) {
    const chatId = ctx.chat?.id;
    if (chatId === undefined) return;

    const adminIds = ADMIN_CHAT_IDS ?? ALLOWED_CHAT_IDS;
    if (adminIds !== null && !adminIds.has(chatId)) {
      ctx.reply("❌ No tienes permiso para ver estadísticas.");
      return;
    }

    const s = statsStore.getStats();
    const byChatStr =
      Object.entries(s.byChat).length > 0
        ? Object.entries(s.byChat)
            .map(([id, n]) => `  Chat ${id}: ${n}`)
            .join("\n")
        : "  (ninguno)";
    const errorsStr =
      s.lastErrors.length > 0
        ? s.lastErrors
            .slice(0, 5)
            .map(
              (e) =>
                `  ${e.at}: [${e.chatId}] ${e.message.slice(0, 80)}`
            )
            .join("\n")
        : "  (ninguno)";

    ctx.reply(
      `📊 Estadísticas\n\nDescargas hoy: ${s.downloadsToday}\n\nPor chat:\n${byChatStr}\n\nÚltimos errores (máx. 5):\n${errorsStr}`
    );
  }
}
