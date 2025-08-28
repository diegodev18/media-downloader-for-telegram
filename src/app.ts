import { bot } from "@/lib/telegraf-bot";
import { message } from "telegraf/filters";
import { FormBot } from "@/utils/form-bot";
import { commands } from "@/consts/commands";

bot.start(FormBot.start);

bot.help(FormBot.help);

Object.entries(commands).forEach(([command, { action }]) => {
  bot.command(command, action);
});

bot.on(message('text'), (ctx) => FormBot.download(ctx));

bot.launch(() => {
  console.log('Bot started');
});

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
