import fs from "fs";
import path from "path";
import { youtubedl } from "@/lib/ytdlp-client";
import { YTDLP, DESCRIPTION_MAX_LENGTH } from "@/config";
import type { YtResponse } from "yt-dlp-exec";

const { DIRECTORY_NAME } = YTDLP;

const getOutputFilePath = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(DIRECTORY_NAME, `${timestamp}.${YTDLP.EXTENSION}`);
};

export const downloadVideo = async (
  url: string
): Promise<{
  output: string;
  info: YtResponse;
  dataLines: string[];
} | null> => {
  if (!fs.existsSync(DIRECTORY_NAME)) {
    fs.mkdirSync(DIRECTORY_NAME);
  }

  const outputPath = getOutputFilePath();
  const cookiesOpt =
    fs.existsSync(YTDLP.COOKIES_FILE) ? { cookies: YTDLP.COOKIES_FILE } : {};

  try {
    const baseOpts = {
      ...cookiesOpt,
      output: outputPath,
      format: YTDLP.FORMAT,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      noCheckCertificates: true,
    };
    const opts =
      Object.keys(cookiesOpt).length > 0
        ? baseOpts
        : { ...baseOpts, "extractor-args": "youtube:player_client=android,web" as const };
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
    console.error("Error downloading video:", url, errMsg, err);
    return null;
  }
};

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
