import fs from "fs";
import { logger, fmtBytes, fmtMs } from "@/lib/logger";
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
🎉 ¡Bienvenido${username && `, ${username}`}!

Soy tu asistente de descargas multimedia 📥. Puedo descargar videos, audios e imágenes desde múltiples plataformas sociales.

⚠️ Límite de tamaño: 50 MB por archivo.

Usa /help para ver todos los comandos disponibles.`);
  }

  static help(ctx: Context) {
    const command_list = Object.entries(commands).map(
      ([command, { description }]) => `/${command} - ${description}`
    );
    ctx.reply(`\
📚 Comandos disponibles:
${command_list.join("\n")}

💡 También puedes enviarme directamente un enlace para descargarlo.`);
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

    logger.dl(`Iniciando descarga | url: ${url} | perfil: ${formatProfile ?? "default"} | chatId: ${ctx.chat?.id}`);
    ctx.reply(`⬇️ Descargando video...\n🌐 Plataforma: ${domain}\n🔑 ID: ${videoId}`);

    const dlStart = Date.now();
    let videoData;
    try {
      videoData = await downloadVideo(url, {
        formatProfile,
      });
    } catch (err) {
      if (err instanceof YouTubeCookiesError) {
        logger.error(`Cookies de YouTube inválidas | url: ${url}`);
        ctx.reply(`❌ ${err.message}`);
        return false;
      }
      logger.error(`Excepción al descargar video | url: ${url}`, err);
      ctx.reply(
        "❌ No se pudo descargar el video. Verifica que el enlace sea válido e inténtalo de nuevo."
      );
      return false;
    }

    if (!videoData) {
      logger.error(`downloadVideo devolvió null | url: ${url}`);
      ctx.reply(
        "❌ No se pudo descargar el video. Verifica que el enlace sea válido e inténtalo de nuevo."
      );
      return false;
    }
    const { output, info } = videoData;

    if (!fs.existsSync(output)) {
      logger.error(`Archivo no encontrado tras descarga | path: ${output} | url: ${url}`);
      ctx.reply(
        "❌ Error interno: el archivo no se encontró tras la descarga."
      );
      return false;
    }
    const fileStats = fs.statSync(output);
    if (fileStats.size === 0) {
      logger.error(`Archivo vacío tras descarga | path: ${output} | url: ${url}`);
      ctx.reply(
        "❌ Error interno: el archivo descargado está vacío."
      );
      fs.unlinkSync(output);
      return false;
    }

    logger.dl(`Descarga completa | tamaño: ${fmtBytes(fileStats.size)} | tiempo: ${fmtMs(Date.now() - dlStart)} | título: "${info.title ?? "—"}"`);
    ctx.reply("✅ ¡Descarga completada! Preparando el envío...");

    const maxSize = 50 * 1024 * 1024;
    const actualSize = fileStats.size;
    if ((info.filesize ?? actualSize) > maxSize) {
      logger.warn(`Archivo demasiado grande | tamaño: ${fmtBytes(info.filesize ?? actualSize)} | url: ${url}`);
      let directUrl: string | null = null;
      try {
        directUrl = await getDirectUrl(url);
      } catch {
        // ignorar
      }
      ctx.reply(
        "❌ El archivo pesa más de 50 MB y no puede enviarse por Telegram." +
          (directUrl ? `\n\n📎 Descárgalo manualmente:\n${directUrl}` : "")
      );
      fs.unlinkSync(output);
      return false;
    }

    logger.dl(`Enviando video a Telegram | chatId: ${ctx.chat?.id} | tamaño: ${fmtBytes(actualSize)}`);
    ctx.reply("📤 Enviando el video...");
    ctx.sendChatAction("upload_video");

    const caption = `🎬 ¡Aquí tienes tu video${
      fromUsername ? `, @${fromUsername}` : `, ${ctx.from.first_name}`
    }! ✨`;

    const handleSuccess = async (repliedData: Message.VideoMessage) => {
      logger.ok(`Video enviado | chatId: ${ctx.from.id} | msgId: ${repliedData.message_id} | fileId: ${repliedData.video?.file_id ?? "—"}`);
      const chatId = ctx.chat?.id;
      if (chatId !== undefined) statsStore.recordDownload(chatId);

      if (CHANNEL_ID) {
        try {
          await ctx.telegram.sendVideo(
            CHANNEL_ID,
            repliedData.video!.file_id,
            {
              caption: info.title
                ? `📎 ${info.title}`
                : `Enviado desde chat ${ctx.chat?.id}`,
            }
          );
        } catch (channelErr) {
          logger.error("Error al reenviar al canal:", channelErr);
        }
      }
    };

    try {
      // Try URL-based send first: Telegram downloads from CDN, no upload from bot.
      // Falls back to buffer upload if the CDN URL is unavailable or Telegram rejects it.
      const directUrl = await getDirectUrl(url).catch(() => null);
      if (directUrl) {
        try {
          logger.dl(`Enviando por URL directa | chatId: ${ctx.chat?.id}`);
          const repliedData = await ctx.replyWithVideo(directUrl, { caption });
          await handleSuccess(repliedData);
          return true;
        } catch (urlErr: any) {
          logger.warn(`URL directa falló, usando buffer | error: ${urlErr?.message ?? urlErr?.code}`, urlErr);
        }
      }

      const fileBuffer = fs.readFileSync(output);

      const sendWithRetry = async (
        retries = 2
      ): Promise<Message.VideoMessage> => {
        let lastErr: Error | undefined;
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            return await ctx.replyWithVideo(
              { source: fileBuffer, filename: "video.mp4" },
              { caption }
            );
          } catch (err: any) {
            lastErr = err;
            const isRetryable =
              err?.code === "ECONNRESET" ||
              err?.code === "ETIMEDOUT" ||
              err?.code === "ECONNABORTED" ||
              err?.message?.includes("socket hang up");
            if (!isRetryable || attempt === retries) throw err;
            logger.warn(`Reintento de subida ${attempt + 1}/${retries} | error: ${err?.code ?? err?.message}`, err);
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          }
        }
        throw lastErr!;
      };

      const repliedData = await sendWithRetry();
      await handleSuccess(repliedData);
      return true;
    } catch (err: any) {
      if (err?.code === 413) {
        ctx.reply(
          "❌ El archivo pesa más de 50 MB y no puede enviarse por Telegram."
        );
      } else {
        ctx.reply("❌ No se pudo enviar el video. Inténtalo más tarde.");
      }
      logger.error(
        `Error al enviar video | id: ${info?.id ?? "—"} | code: ${err?.code ?? "?"} | título: "${info?.title ?? "—"}" | tamaño: ${info?.filesize ? fmtBytes(info.filesize) : "?"} | duración: ${info?.duration ?? "?"}s`,
        err
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
      ctx.reply("❌ No encontré ningún enlace en tu mensaje. Envíame un link de video.");
      return;
    }

    if (urls.length === 1) {
      const profile = getFormatProfileFromMessage(messageText, urls[0]);
      await FormBot.sendOneVideo(ctx, urls[0], profile);
      return;
    }

    ctx.reply(`🔍 Encontradas ${urls.length} URLs. Procesando en secuencia...`);
    let sent = 0;
    for (const url of urls) {
      const ok = await FormBot.sendOneVideo(ctx, url);
      if (ok) sent++;
    }
    ctx.reply(`✅ Listo. Enviados ${sent} de ${urls.length} videos.`);
  }

  static async info(ctx: Context) {
    let url: string | undefined;
    if (ctx.message && "text" in ctx.message) {
      url = ctx.message.text.split(" ")[1];
    }

    ctx.sendChatAction("typing");

    if (!url) {
      ctx.reply("❌ Falta el enlace. Uso: /info <enlace>");
      return;
    }

    ctx.reply("🔍 Obteniendo información del video...");

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
          `ℹ️ Información del video:\n${getDataLines(info, null).join("\n")}`
        );
      })
      .catch((err) => {
        logger.error(`/info error | url: ${url} | ${err.message}`);
        ctx.reply("❌ No se pudo obtener información. Verifica que el enlace sea válido.");
      });
  }

  static async audio(ctx: Context) {
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const urls = extractUrls(text);
    const url = urls[0] ?? text.split(/\s+/)[1];

    ctx.sendChatAction("typing");

    if (!url) {
      ctx.reply("❌ Falta el enlace. Uso: /audio <enlace>");
      return;
    }

    ctx.reply("🎵 Descargando audio...");

    let audioData;
    try {
      audioData = await downloadAudio(url);
    } catch (err) {
      if (err instanceof YouTubeCookiesError) {
        ctx.reply(`❌ ${err.message}`);
        return;
      }
      logger.error(`Excepción al descargar audio | url: ${url}`, err);
      ctx.reply(
        "❌ No se pudo descargar el audio. Verifica que el enlace sea válido e inténtalo de nuevo."
      );
      return;
    }

    if (!audioData) {
      ctx.reply(
        "❌ No se pudo descargar el audio. Verifica que el enlace sea válido e inténtalo de nuevo."
      );
      return;
    }

    const { output, info } = audioData;
    const maxSize = 50 * 1024 * 1024;
    const size = fs.statSync(output).size;

    if (size > maxSize) {
      ctx.reply(
        "❌ El audio pesa más de 50 MB y no puede enviarse por Telegram."
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
          caption: `🎵 ¡Audio listo${ctx.from?.username ? `, @${ctx.from.username}` : ""}!`,
        }
      );
      logger.ok(`Audio enviado | chatId: ${ctx.chat?.id} | título: "${info.title ?? "—"}"`);
    } catch (err) {
      logger.error(`Error al enviar audio | chatId: ${ctx.chat?.id}`, err);
      ctx.reply("❌ No se pudo enviar el audio. Inténtalo más tarde.");
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
      ctx.reply("❌ Falta el enlace. Uso: /playlist <enlace>");
      return;
    }

    ctx.reply("📋 Obteniendo información de la playlist...");

    const playlist = await getPlaylistInfo(url);
    if (!playlist) {
      ctx.reply(
        "❌ No se pudo obtener la playlist. Verifica que el enlace sea una playlist válida."
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
      ctx.reply("❌ Falta el enlace. Uso: /format <enlace>");
      return;
    }

    ctx.reply("🎞️ Obteniendo formatos disponibles...");

    const out = await listFormats(url);
    if (!out) {
      ctx.reply("❌ No se pudo obtener los formatos para ese enlace.");
      return;
    }

    const maxLen = 3500;
    const textToSend =
      out.length > maxLen
        ? `(Primeros ${maxLen} caracteres)\n\n${out.slice(0, maxLen)}...`
        : out;
    ctx.reply(`🎞️ Formatos disponibles:\n\n<pre>${textToSend}</pre>`, {
      parse_mode: "HTML",
    });
  }

  static async image(ctx: Context) {
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const urls = extractUrls(text);
    const url = urls[0] ?? text.split(/\s+/)[1];

    ctx.sendChatAction("typing");

    if (!url) {
      ctx.reply("❌ Falta el enlace. Uso: /image <enlace>");
      return;
    }

    ctx.reply("🖼️ Descargando imagen/miniatura...");

    const output = await downloadThumbnail(url);
    if (!output) {
      ctx.reply(
        "❌ No se pudo obtener la imagen. Verifica que el enlace sea correcto."
      );
      return;
    }

    try {
      const fileStream = fs.createReadStream(output);
      await ctx.replyWithPhoto(
        { source: fileStream },
        { caption: "🖼️ Miniatura del video" }
      );
      logger.ok(`Imagen enviada | chatId: ${ctx.chat?.id}`);
    } catch (err) {
      logger.error(`Error al enviar imagen | chatId: ${ctx.chat?.id}`, err);
      ctx.reply("❌ No se pudo enviar la imagen.");
    } finally {
      fs.unlinkSync(output);
    }
  }

  static async stats(ctx: Context) {
    const chatId = ctx.chat?.id;
    if (chatId === undefined) return;

    const adminIds = ADMIN_CHAT_IDS ?? ALLOWED_CHAT_IDS;
    if (adminIds !== null && !adminIds.has(chatId)) {
      ctx.reply("❌ No tienes permiso para ver las estadísticas.");
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
      `📊 Estadísticas\n\n📥 Descargas hoy: ${s.downloadsToday}\n\n💬 Por chat:\n${byChatStr}\n\n⚠️ Últimos errores (máx. 5):\n${errorsStr}`
    );
  }
}
