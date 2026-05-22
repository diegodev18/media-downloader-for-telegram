import { message } from "telegraf/filters";
import { bot } from "@/lib/telegraf-bot";
import { FormBot } from "@/utils/form-bot";
import { commands } from "@/consts/commands";
import { allowChatIds, logRequest, rateLimitDownloads } from "@/lib/middlewares";
import { logger } from "@/lib/logger";
import { NODE_ENV, ALLOWED_CHAT_IDS, RATE_LIMIT_MAX, CHANNEL_ID } from "@/config";

bot.use(allowChatIds);
bot.use(logRequest);
bot.use(rateLimitDownloads);

bot.start(FormBot.start);

bot.help(FormBot.help);

Object.entries(commands).forEach(([command, { action }]) => {
  bot.command(command, action);
});

bot.on(message("text"), async (ctx) => {
  try {
    ctx.sendChatAction("typing");

    await FormBot.sendDownloadedVideo(ctx);
  } catch (err) {
    logger.error("Error inesperado en handler de mensaje:", err);
    ctx.reply(
      "❌ Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde."
    );
  }
});

bot.launch(() => {
  logger.info(
    `Bot iniciado | entorno: ${NODE_ENV} | chats permitidos: ${ALLOWED_CHAT_IDS.size}` +
    (RATE_LIMIT_MAX ? ` | rate limit: ${RATE_LIMIT_MAX} descargas/h` : "") +
    (CHANNEL_ID ? ` | canal: ${CHANNEL_ID}` : "")
  );
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
