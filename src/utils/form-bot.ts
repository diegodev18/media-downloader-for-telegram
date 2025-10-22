import fs from "fs";
import { commands } from "@/consts/commands";
import { downloadVideo, getDataLines } from "@/utils/download-utils";
import { youtubedl } from "@/lib/ytdlp-client";
import { YTDLP as YTDLP_CONFIG } from "@/config";
import type { TelegrafContext } from "@/types/telegraf";
import type { Context, NarrowedContext, TelegramError } from "telegraf";
import type { Update, Message } from "telegraf/types";

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

  static async sendDownloadedVideo(
    ctx: NarrowedContext<
      TelegrafContext,
      Update.MessageUpdate<Record<"text", {}> & Message.TextMessage>
    >
  ): Promise<void> {
    const message: string = ctx.message?.text;
    if (!message) return;

    const domain = message.split("/")[2];
    const videoId = message.split("/")[4];

    const fromUsername = ctx.from.username;

    ctx.reply(`Descargando video...\nDesde: ${domain}\nVideoId: ${videoId}`);

    const url = message.split(" ")[0];
    const videoData = await downloadVideo(url);

    if (!videoData) {
      ctx.reply(
        "❌ Error al descargar el video. Asegúrate de que el enlace es correcto y vuelve a intentarlo."
      );
      return;
    }
    const { output, info } = videoData;

    ctx.reply("Descarga exitosa! Preparando para enviar el video...");

    if (info.filesize && info.filesize > 50 * 1024 * 1024) {
      ctx.reply(
        "❌ El archivo es demasiado grande para ser enviado por Telegram (más de 50 MB)."
      );
      console.error(`Archivo ${output} demasiado grande:`, info.filesize);
      fs.unlinkSync(output);
      return;
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
    } finally {
      fs.unlinkSync(output);
    }
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

    youtubedl(url, {
      cookies: YTDLP_CONFIG.COOKIES_FILE,
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
}
