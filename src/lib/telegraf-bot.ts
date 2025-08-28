import { Telegraf } from "telegraf";

const { BOT_TOKEN } = process.env;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not defined");
}

export const bot = new Telegraf(BOT_TOKEN);
