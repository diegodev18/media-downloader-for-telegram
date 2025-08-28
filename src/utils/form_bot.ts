import type { Context } from "telegraf";
import { commands } from "@/consts/commands";

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
    ctx.reply(`\
Aquí tienes una lista de redes sociales que tenemos soporte:
- YouTube
- Facebook`);
  }
}
