import type { Context, NarrowedContext } from "telegraf";
import { commands } from "@/consts/commands";
import { supportNetworks } from "@/consts/support-networks";
import { downloadVideo } from "@/utils/download-utils";

export class FormBot {
  static start(ctx: Context) {
    const username = ctx.from?.first_name;
    ctx.reply(`\
Bienvenido${username && ` ${username}`}!

Soy un bot de Telegram y mi tarea es ayudarte a descargar archivos multimedia desde las redes sociales que desees.
Pero espera, aún no tenemos soporte para todas las redes sociales así que si deseas saber que redes sociales tenemos soporte, usa /support.`);
  }

  static help(ctx: Context) {
    const command_list = Object
      .entries(commands)
      .map(([command, { description }]) => `/${command} - ${description}`);
    ctx.reply(`\
Aquí tienes una lista de comandos que puedes usar:
${command_list.join("\n")}`);
  }

  static support(ctx: Context) {
    const supportNetworksList = supportNetworks.map(network => `- ${network.name}`);
    ctx.reply(`\
Aquí tienes una lista de redes sociales que tenemos soporte:
${supportNetworksList.join("\n")}`);
  }

  static download(ctx: any) {
    const message = ctx.message?.text;
    if (!message) return;

    let socialNetworkToDownload: string | null = null;

    supportNetworks.forEach((net) => {
      net.urls.forEach((url) => {
        if (message.toLowerCase().includes(url) && !socialNetworkToDownload) {
          ctx.reply(`Descargando contenido de ${net.name}...`);
          socialNetworkToDownload = net.id;
        }
      });
    });

    if (!socialNetworkToDownload) {
      ctx.reply("No se encontró una red social compatible en el mensaje.");
      return;
    }

    downloadVideo(message, ctx);
  }
}
