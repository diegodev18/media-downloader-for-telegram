export const { NODE_ENV = "development" } = process.env;

if (NODE_ENV !== "production" && process.loadEnvFile) {
  process.loadEnvFile(".env");
}

export const { BOT_TOKEN, ALLOWED_CHAT_IDS: ALLOWED_CHAT_IDS_RAW } = process.env;

/**
 * IDs de chat permitidos (usuarios o grupos). Si no está definido o está vacío, se permiten todos.
 * Formato: números separados por comas, ej. "123456789,-987654321"
 */
export const ALLOWED_CHAT_IDS: Set<number> | null = (() => {
  if (!ALLOWED_CHAT_IDS_RAW?.trim()) return null;
  return new Set(
    ALLOWED_CHAT_IDS_RAW.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n))
  );
})();

export const YTDLP = {
  BINARY_PATH: "yt-dlp",
  COOKIES_FILE: "dist/cookies.txt",
  /** Prefer mp4+m4a; fallback to best video+audio merged to mp4 (e.g. when only webm is available). */
  FORMAT:
    "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4/bestvideo+bestaudio/mp4",
  EXTENSION: "mp4",
  DIRECTORY_NAME: "vids"
};

export const DESCRIPTION_MAX_LENGTH = 50;
