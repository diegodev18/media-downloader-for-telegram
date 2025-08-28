import { Telegraf } from "telegraf";

process.loadEnvFile(".env");

const { BOT_TOKEN } = process.env;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not defined");
}

export const bot = new Telegraf(BOT_TOKEN);
