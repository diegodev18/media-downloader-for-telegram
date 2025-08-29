import type { Context, NarrowedContext } from "telegraf";
import type { Update, Message } from "telegraf/typings/core/types/typegram";
import { commands } from "@/consts/commands";
import { downloadVideo } from "@/utils/download-utils";
import fs from "fs";

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

  static async download(
    ctx:
      NarrowedContext<Context<Update>, Update.MessageUpdate<Record<"text", {}> & Message.TextMessage>>
  ): Promise<void> {
    const message: string = ctx.message?.text;
    if (!message) return;

    ctx.reply(`Descargando video...\nUrl: ...${message.slice(15, message.length)}`);

    downloadVideo(message, ctx).then((videoPath) => {
      if (videoPath) ctx.replyWithVideo({
        source: fs.createReadStream(videoPath)
      }).then(() => {
        fs.rmSync(videoPath);
      }).catch(() => {
        ctx.reply("❌ Error al enviar el video.");
        fs.rmSync(videoPath);
      });
    });
  }
}
