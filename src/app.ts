import { message } from "telegraf/filters";
import { bot } from "@/lib/telegraf-bot";
import { FormBot } from "@/utils/form-bot";
import { commands } from "@/consts/commands";
import { logRequest } from "@/lib/middlewares";

bot.use(logRequest);

async function main() {
  bot.start(FormBot.start);

  bot.help(FormBot.help);

  Object.entries(commands).forEach(([command, { action }]) => {
    bot.command(command, action);
  });

  bot.on(message('text'), (ctx) => FormBot.download(ctx));

  bot.launch(() => {
    console.log('Bot started');
  });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch((error) => {
  const status = error.response?.status || 500;
  console.error(`Error ${status}: ${error.message}`);
});
