import { bot } from "@/lib/telegraf-bot";
import { message } from "telegraf/filters";
import { FormBot } from "@/utils/form-bot";
import { commands } from "./consts/commands";

bot.start(FormBot.start);

bot.help(FormBot.help);

Object.entries(commands).forEach(([command, { action }]) => {
  bot.command(command, action);
});

bot.on(message('text'), async (ctx) => {
  const text = ctx.message.text;

  if (text.startsWith('https://www.facebook.com/share/r/')) {
    ctx.reply(`Descargando video de Facebook...`);
  } else if (text.startsWith('https://www.youtube.com/shorts/')) {
    ctx.reply(`Descargando short de YouTube...`);
  } else if (text.startsWith('https://youtu.be/') || text.startsWith('https://www.youtube.com/watch?v=')) {
    ctx.reply(`Descargando video de YouTube...`);
  }
});

bot.launch(() => {
  console.log('Bot started');
});

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
