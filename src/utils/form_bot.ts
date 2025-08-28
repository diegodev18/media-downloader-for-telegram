import type { Context } from "telegraf";

export class FormBot {
  static start(ctx: Context) {
    const username = ctx.from?.first_name;
    ctx.reply(`\
Bienvenido${username && ` ${username}`}!

Soy un bot de Telegram y mi tarea es ayudarte a descargar archivos multimedia desde las redes sociales que desees.
Pero espera, aún no tenemos soporte para todas las redes sociales así que si deseas saber que redes sociales tenemos soporte, usa /support.`);
  }

  static help(ctx: Context) {
    ctx.reply(`\
Aquí tienes una lista de comandos que puedes usar:
/start - Iniciar el bot
/help - Obtener ayuda`);
  }

  static support(ctx: Context) {
    ctx.reply(`\
Aquí tienes una lista de redes sociales que tenemos soporte:
- YouTube
- Facebook`);
  }
}
