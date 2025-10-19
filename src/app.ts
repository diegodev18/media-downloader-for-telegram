import { message } from "telegraf/filters";
import { bot } from "@/lib/telegraf-bot";
import { FormBot } from "@/utils/form-bot";
import { commands } from "@/consts/commands";
import { logRequest } from "@/lib/middlewares";

bot.use(logRequest);

bot.start(FormBot.start);

bot.help(FormBot.help);

Object.entries(commands).forEach(([command, { action }]) => {
  bot.command(command, action);
});

bot.on(message("text"), async (ctx) => {
  try {
    ctx.sendChatAction("typing");

    await FormBot.download(ctx);
  } catch (err) {
    console.error("Error in FormBot.download:", err);
    ctx.reply(
      "❌ Ocurrió un error inesperado al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde."
    );
  }
});

bot.launch(() => {
  console.log("Bot started");
});
