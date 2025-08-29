import fs from "fs";
import { commands } from "@/consts/commands";
import { downloadVideo, getDataLines } from "@/utils/download-utils";
import { youtubedl } from "@/lib/ytdlp-client";
import { YTDLP as YTDLP_CONFIG } from "@/config";
import type { Context, NarrowedContext } from "telegraf";
import type { Update, Message } from "telegraf/typings/core/types/typegram";

export class FormBot {
  static start(ctx: Context) {
    const username = ctx.from?.first_name;
    ctx.reply(`\
Bienvenido${username && ` ${username}`}!

Soy un bot de Telegram y mi tarea es ayudarte a descargar archivos multimedia desde las redes sociales que desees. Tengo limite de 50 MB para enviar multimedia, asi que intenta no pasarme enlaces de videos muy largos.`);
  }

  static help(ctx: Context) {
    const command_list = Object
      .entries(commands)
      .map(([command, { description }]) => `/${command} - ${description}`);
    ctx.reply(`\
Aquí tienes una lista de comandos que puedes usar:
${command_list.join("\n")}`);
  }

  static download(
    ctx:
      NarrowedContext<Context<Update>, Update.MessageUpdate<Record<"text", {}> & Message.TextMessage>>
  ): void {
    const message: string = ctx.message?.text;
    if (!message) return;

    const domain = message.split("/")[2];
    const videoId = message.split("/")[4];

    const fromUsername = ctx.from.username;

    ctx.reply(`Descargando video...\nDesde: ${domain}\nVideoId: ${videoId}`);

    downloadVideo(message).then((videoData) => {
      if (!videoData) {
        ctx.reply("❌ Error al descargar el video. Asegúrate de que el enlace es correcto y vuelve a intentarlo.");
        return;
      };

      const { output, dataLines } = videoData;

      ctx.reply("Descarga exitosa!\nEnviando...");

      ctx.replyWithVideo({
        source: fs.createReadStream(output),
      }, {
        caption: `Listo, ten el video que me pediste${fromUsername ? ` @${fromUsername}` : ` ${ctx.from.first_name}`}!`
      }).then(() => {
        ctx.reply(`Información del video:\n${dataLines.join("\n")}`);

        fs.rmSync(output);
      }).catch(() => {
        ctx.reply("❌ Error al enviar el video. Probablemente se debe a que el video sea mayor a 50 MB.");

        fs.rmSync(output);
      });
    });
  }

  static async info(ctx: Context) {
    let url: string | undefined;
    if (ctx.message && "text" in ctx.message) {
      url = ctx.message.text.split(" ")[1];
    }

    if (!url) {
      ctx.reply("❌ Por favor, proporciona un enlace de video para obtener información. Uso: /info <enlace>");
      return;
    }

    ctx.reply("Obteniendo información del video...");

    youtubedl(url, {
      cookies: YTDLP_CONFIG.COOKIES_FILE,
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
    }).then((info) => {
      ctx.reply(`Información del video:\n${getDataLines(info, null).join("\n")}`);
    }).catch((err) => {
      ctx.reply(`❌ Error al obtener información del video`);
      console.error("/info", err.message);
    });
  }
}
