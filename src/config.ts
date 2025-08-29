export const { NODE_ENV = "development" } = process.env;

if (NODE_ENV !== "production" && process.loadEnvFile) {
  process.loadEnvFile(".env");
}

export const {
  BOT_TOKEN
} = process.env;

export const YTDLP_BINARY_PATH = "yt-dlp";
