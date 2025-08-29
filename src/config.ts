export const { NODE_ENV = "development" } = process.env;

if (NODE_ENV !== "production" && process.loadEnvFile) {
  process.loadEnvFile(".env");
}

export const {
  BOT_TOKEN
} = process.env;

export const YTDLP = {
  BINARY_PATH: "yt-dlp",
  COOKIES_FILE: "dist/cookies.txt",
  FORMAT: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
  EXTENSION: "mp4",
  DIRECTORY_NAME: "vids"
};
