import fs from "fs";
import path from "path";
import { youtubedl } from "@/lib/ytdlp-client";
import { YTDLP, DESCRIPTION_MAX_LENGTH } from "@/config";
import type { YtResponse } from "yt-dlp-exec";

/** Error cuando YouTube rechaza la descarga por cookies inválidas o detección de bot. */
export class YouTubeCookiesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YouTubeCookiesError";
  }
}

const { DIRECTORY_NAME } = YTDLP;

const YOUTUBE_COOKIES_BOT_MARKERS = [
  "cookies are no longer valid",
  "Sign in to confirm you're not a bot",
];

const getOutputFilePath = (extension = YTDLP.EXTENSION) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(DIRECTORY_NAME, `${timestamp}.${extension}`);
};

/** Opciones base compartidas para llamadas a youtubedl (cookies, userAgent, etc.). */
function getBaseYtdlpOpts(extra: Record<string, unknown> = {}) {
  const cookiesOpt =
    fs.existsSync(YTDLP.COOKIES_FILE) ? { cookies: YTDLP.COOKIES_FILE } : {};
  const base = {
    ...cookiesOpt,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    noCheckCertificates: true,
    jsRuntimes: "node",
    ...extra,
  };
  return Object.keys(cookiesOpt).length > 0
    ? base
    : { ...base, "extractor-args": "youtube:player_client=android,web" as const };
}

export type DownloadVideoOptions = {
  /** Perfil de formato (key de YTDLP.FORMAT_PROFILES) o string de formato yt-dlp. */
  formatProfile?: keyof typeof YTDLP.FORMAT_PROFILES | string;
};

export const downloadVideo = async (
  url: string,
  options?: DownloadVideoOptions
): Promise<{
  output: string;
  info: YtResponse;
  dataLines: string[];
} | null> => {
  if (!fs.existsSync(DIRECTORY_NAME)) {
    fs.mkdirSync(DIRECTORY_NAME);
  }

  const outputPath = getOutputFilePath();
  const formatStr =
    !options?.formatProfile
      ? YTDLP.FORMAT
      : options.formatProfile in YTDLP.FORMAT_PROFILES
        ? YTDLP.FORMAT_PROFILES[
            options.formatProfile as keyof typeof YTDLP.FORMAT_PROFILES
          ]
        : options.formatProfile;

  try {
    const opts = getBaseYtdlpOpts({
      output: outputPath,
      format: formatStr,
    });
    const info = await youtubedl(url, opts as Parameters<typeof youtubedl>[1]);

    return {
      output: outputPath,
      info,
      dataLines: getDataLines(info, outputPath),
    };
  } catch (err: unknown) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    const errMsg = err instanceof Error ? err.message : String(err);
    const stderr = (err as { stderr?: string })?.stderr ?? "";
    const combined = `${stderr}\n${errMsg}`;
    if (YOUTUBE_COOKIES_BOT_MARKERS.some((m) => combined.includes(m))) {
      throw new YouTubeCookiesError(
        "YouTube ha rechazado la descarga: las cookies han caducado o te pide iniciar sesión. Exporta de nuevo las cookies desde tu navegador (formato Netscape) y actualiza la variable COOKIES o el archivo dist/cookies.txt."
      );
    }

    console.error("Error downloading video:", url, errMsg, err);
    return null;
  }
};

export type PlaylistEntry = {
  id?: string;
  title?: string;
  url?: string;
  webpage_url?: string;
  duration?: number;
};

export type PlaylistInfo = {
  title?: string;
  entries: PlaylistEntry[];
};

/**
 * Obtiene la información de una playlist (título y lista de entradas con título, url, duración).
 * Si la URL no es una playlist, devuelve null.
 */
export async function getPlaylistInfo(
  url: string
): Promise<PlaylistInfo | null> {
  try {
    const opts = getBaseYtdlpOpts({
      dumpSingleJson: true,
      flatPlaylist: true,
    });
    const result = (await youtubedl(
      url,
      opts as Parameters<typeof youtubedl>[1]
    )) as { entries?: PlaylistEntry[]; title?: string; _type?: string };
    const entries = result?.entries;
    if (!Array.isArray(entries) || entries.length === 0) {
      return null;
    }
    return {
      title: result.title,
      entries: entries.map((e) => ({
        id: e.id,
        title: e.title,
        url: e.url ?? e.webpage_url,
        duration: e.duration,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Lista los formatos disponibles para una URL (equivalente a yt-dlp -F).
 * Devuelve el texto de stdout.
 */
export async function listFormats(url: string): Promise<string | null> {
  try {
    const opts = getBaseYtdlpOpts({ listFormats: true });
    const result = await youtubedl.exec(
      url,
      opts as Parameters<typeof youtubedl>[1],
      {}
    );
    const stdout = (result as { stdout?: string }).stdout;
    return typeof stdout === "string" ? stdout : null;
  } catch {
    return null;
  }
}

/**
 * Obtiene una URL directa de descarga para el vídeo (sin descargar el archivo).
 * Útil cuando el archivo supera 50 MB para ofrecer enlace al usuario.
 */
export async function getDirectUrl(url: string): Promise<string | null> {
  const cookiesOpt =
    fs.existsSync(YTDLP.COOKIES_FILE) ? { cookies: YTDLP.COOKIES_FILE } : {};
  try {
    const opts = getBaseYtdlpOpts({
      getUrl: true,
      format: YTDLP.FORMAT,
    });
    const result = await youtubedl.exec(url, opts as Parameters<typeof youtubedl>[1], {});
    const stdout = (result as { stdout?: string }).stdout?.trim();
    if (stdout && (stdout.startsWith("http://") || stdout.startsWith("https://"))) {
      return stdout;
    }
    return null;
  } catch {
    return null;
  }
}

const AUDIO_EXTENSION = "mp3";

/**
 * Descarga solo el audio de una URL y lo convierte a MP3.
 */
export async function downloadAudio(
  url: string
): Promise<{
  output: string;
  info: YtResponse;
} | null> {
  if (!fs.existsSync(DIRECTORY_NAME)) {
    fs.mkdirSync(DIRECTORY_NAME);
  }

  const outputPath = getOutputFilePath(AUDIO_EXTENSION);

  try {
    const opts = getBaseYtdlpOpts({
      output: outputPath,
      extractAudio: true,
      audioFormat: "mp3",
      audioQuality: 0,
    });
    const info = await youtubedl(url, opts as Parameters<typeof youtubedl>[1]);
    return { output: outputPath, info };
  } catch (err: unknown) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    const stderr = (err as { stderr?: string })?.stderr ?? "";
    const combined = `${stderr}\n${errMsg}`;
    if (YOUTUBE_COOKIES_BOT_MARKERS.some((m) => combined.includes(m))) {
      throw new YouTubeCookiesError(
        "YouTube ha rechazado la descarga: las cookies han caducado o te pide iniciar sesión. Exporta de nuevo las cookies desde tu navegador (formato Netscape) y actualiza la variable COOKIES o el archivo dist/cookies.txt."
      );
    }
    console.error("Error downloading audio:", url, errMsg, err);
    return null;
  }
}

/**
 * Descarga solo la miniatura (o imagen única) de una URL.
 * Devuelve la ruta del archivo creado (jpg, webp, etc.) o null.
 */
export async function downloadThumbnail(url: string): Promise<string | null> {
  if (!fs.existsSync(DIRECTORY_NAME)) {
    fs.mkdirSync(DIRECTORY_NAME);
  }

  const prefix = `img-${Date.now()}`;
  const outputTemplate = path.join(DIRECTORY_NAME, `${prefix}.%(ext)s`);

  try {
    const opts = getBaseYtdlpOpts({
      skipDownload: true,
      writeThumbnail: true,
      output: outputTemplate,
    });
    await youtubedl(url, opts as Parameters<typeof youtubedl>[1]);
    const files = fs.readdirSync(DIRECTORY_NAME).filter((f) => f.startsWith(prefix));
    const found = files[0];
    if (found) return path.join(DIRECTORY_NAME, found);
    return null;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Error downloading thumbnail:", url, errMsg);
    const files = fs.readdirSync(DIRECTORY_NAME).filter((f) => f.startsWith(prefix));
    for (const f of files) fs.unlinkSync(path.join(DIRECTORY_NAME, f));
    return null;
  }
}

export const getDataLines = (
  info: YtResponse,
  outputPath: string | null
): string[] => {
  const { title, duration, description, like_count, upload_date, channel } =
    info;

  const dataLines = [
    title ? `- Titulo del video: ${title}` : null,
    duration ? `- Duración del video: ${duration} segundos` : null,
    description
      ? `- Descripción: ${description.slice(0, DESCRIPTION_MAX_LENGTH)}${
          description.length > DESCRIPTION_MAX_LENGTH ? "..." : ""
        }`
      : null,
    like_count ? `- Likes: ${like_count}` : null,
    upload_date ? `- Fecha de subida: ${upload_date}` : null,
    channel ? `- Channel: ${channel}` : null,
    outputPath
      ? `- Tamaño del video: ${fs.statSync(outputPath).size} bytes`
      : null,
    outputPath ? `- Ruta del archivo: ${outputPath}` : null,
    `- Formato: mp4`,
  ];

  return dataLines.filter(Boolean) as string[];
};
