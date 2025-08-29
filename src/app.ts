import { bot } from "@/lib/telegraf-bot";
import { message } from "telegraf/filters";
import { FormBot } from "@/utils/form-bot";
import { commands } from "@/consts/commands";


async function main() {
  bot.start(FormBot.start);

  bot.help(FormBot.help);

  Object.entries(commands).forEach(([command, { action }]) => {
    bot.command(command, action);
  });

  bot.on(message('text'), async (ctx) => {
    FormBot.download(ctx).then((vidPath) => {
      if (vidPath) ctx.sendVideo(vidPath);
    });
  });

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
