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
  DIRECTORY_NAME: "vids",
  /** Perfiles de calidad para /format y descarga opcional. */
  FORMAT_PROFILES: {
    default: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4/bestvideo+bestaudio/mp4",
    "720p":
      "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/mp4/bestvideo[height<=720]+bestaudio/mp4",
    "480p":
      "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/mp4/bestvideo[height<=480]+bestaudio/mp4",
    max: "bestvideo+bestaudio/best",
  } as const,
};

export const DESCRIPTION_MAX_LENGTH = 50;

/** Rate limit: máximo de descargas por ventana. Si no se define, no hay límite. */
export const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX
  ? parseInt(process.env.RATE_LIMIT_MAX, 10)
  : null;
export const RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS
  ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10)
  : 60 * 60 * 1000;

/** IDs de chat con permisos de admin (p. ej. para /stats). Si no se define, se usa ALLOWED_CHAT_IDS. */
export const ADMIN_CHAT_IDS: Set<number> | null = (() => {
  const raw = process.env.ADMIN_CHAT_IDS?.trim();
  if (!raw) return null;
  return new Set(
    raw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n))
  );
})();

/** ID del canal al que el bot puede reenviar vídeos (opcional). */
export const CHANNEL_ID = process.env.CHANNEL_ID?.trim() || null;
