import type { TelegrafContext } from "@/types/telegraf";
import { ALLOWED_CHAT_IDS, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "@/config";
import { extractUrls } from "@/utils/url-utils";

/** Por chat: lista de timestamps de descargas en la ventana actual. */
const rateLimitStore = new Map<number, number[]>();

function trimToWindow(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((t) => t > cutoff);
}

export const allowChatIds = async (ctx: TelegrafContext, next: () => Promise<void>) => {
  if (ALLOWED_CHAT_IDS === null) return next();
  const chatId = ctx.chat?.id;
  if (chatId === undefined || !ALLOWED_CHAT_IDS.has(chatId)) {
    await ctx.reply("No estás autorizado para usar este bot.");
    return;
  }
  return next();
};

export const logRequest = (ctx: TelegrafContext, next: () => Promise<void>) => {
  let command = ctx.message && "text" in ctx.message ? ctx.message.text : "N/A";
  if (command !== "N/A") {
    command =
      command !== "N/A" ? command.slice(0, command.indexOf(" ") + 1) : command;
  }
  const requestFrom =
    ctx.from?.username || ctx.from?.first_name || "Unknown";

  console.log(
    `Request received. From: ${requestFrom}, Chat ID: ${ctx.chat?.id}, Command: ${command[0] === "/" ? command : "N/A"}`
  );
  next();
};

/**
 * Rate limit por chat: solo se aplica a mensajes de texto que contienen al menos una URL (descarga).
 * Requiere RATE_LIMIT_MAX y RATE_LIMIT_WINDOW_MS en config; si no están definidos, no hace nada.
 */
export const rateLimitDownloads = async (
  ctx: TelegrafContext,
  next: () => Promise<void>
) => {
  if (RATE_LIMIT_MAX === null || RATE_LIMIT_WINDOW_MS <= 0) {
    return next();
  }

  const text =
    ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const urls = extractUrls(text);
  if (urls.length === 0) {
    return next();
  }

  const chatId = ctx.chat?.id;
  if (chatId === undefined) return next();

  let timestamps = rateLimitStore.get(chatId) ?? [];
  timestamps = trimToWindow(timestamps, RATE_LIMIT_WINDOW_MS);
  rateLimitStore.set(chatId, timestamps);

  if (timestamps.length >= RATE_LIMIT_MAX) {
    await ctx.reply(
      `❌ Has alcanzado el límite de ${RATE_LIMIT_MAX} descargas en esta ventana de tiempo. Vuelve a intentarlo más tarde.`
    );
    return;
  }

  timestamps.push(Date.now());
  rateLimitStore.set(chatId, timestamps);
  return next();
};

/** Store en memoria para estadísticas (descargas por chat, errores recientes). */
export const statsStore = {
  downloadsByChat: new Map<number, number>(),
  downloadsToday: 0,
  lastResetDay: new Date().toDateString(),
  lastErrors: [] as { chatId: number; message: string; at: string }[],
  maxLastErrors: 20,

  recordDownload(chatId: number) {
    const today = new Date().toDateString();
    if (today !== this.lastResetDay) {
      this.downloadsToday = 0;
      this.lastResetDay = today;
    }
    this.downloadsToday += 1;
    this.downloadsByChat.set(
      chatId,
      (this.downloadsByChat.get(chatId) ?? 0) + 1
    );
  },

  recordError(chatId: number, message: string) {
    this.lastErrors.push({
      chatId,
      message: message.slice(0, 200),
      at: new Date().toISOString(),
    });
    if (this.lastErrors.length > this.maxLastErrors) {
      this.lastErrors.shift();
    }
  },

  getStats() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDay) {
      this.downloadsToday = 0;
      this.lastResetDay = today;
    }
    return {
      downloadsToday: this.downloadsToday,
      byChat: Object.fromEntries(this.downloadsByChat),
      lastErrors: [...this.lastErrors].reverse(),
    };
  },
};
