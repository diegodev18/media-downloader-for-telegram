import { bot } from "@/lib/telegraf-bot";

bot.start((ctx) => {
  ctx.reply("Bienvenido! Soy un bot de Telegram y mi tarea es ayudarte a descargar archivos multimedia desde las redes sociales que desees, pero espera, no tenemos soporte para todas las redes sociales asi que si quieres saber que redes sociales tenemos soporte, usa /support.")
});

bot.help((ctx) => {
  ctx.reply("Aquí tienes una lista de comandos que puedes usar:\n/start - Iniciar el bot\n/help - Obtener ayuda");
});
