import fs from "fs";
import { youtubedl } from "@/lib/ytdlp-client";
import { YTDLP, DESCRIPTION_MAX_LENGTH } from "@/config";
import type { YtResponse } from "yt-dlp-exec";

const { DIRECTORY_NAME } = YTDLP;

export const downloadVideo = async (
  url: string,
): Promise<{ output: string; info: YtResponse; dataLines: string[] } | null> => {
  if (!fs.existsSync(DIRECTORY_NAME)) {
    fs.mkdirSync(DIRECTORY_NAME);
  }

  const outputPath = `${DIRECTORY_NAME}/${Date.now()}.${YTDLP.EXTENSION}`;

  const video = youtubedl(url, {
    cookies: YTDLP.COOKIES_FILE,
    output: outputPath,
    format: YTDLP.FORMAT
  });

  return video
    .then((info) => {
      return {
        output: outputPath,
        info,
        dataLines: getDataLines(info, outputPath)
      };
    })
    .catch(() => null);
};

export const getDataLines = (info: YtResponse, outputPath: string | null): string[] => {
  const { title, duration, description, like_count, upload_date, channel } = info;

  const dataLines = [
    title ? `- Titulo del video: ${title}` : null,
    duration ? `- Duración del video: ${duration} segundos` : null,
    description ? `- Descripción: ${description.slice(0, DESCRIPTION_MAX_LENGTH)}${description.length > DESCRIPTION_MAX_LENGTH ? '...' : ''}` : null,
    like_count ? `- Likes: ${like_count}` : null,
    upload_date ? `- Fecha de subida: ${upload_date}` : null,
    channel ? `- Channel: ${channel}` : null,
    outputPath ? `- Tamaño del video: ${fs.statSync(outputPath).size} bytes` : null,
    outputPath ? `- Ruta del archivo: ${outputPath}` : null,
    `- Formato: mp4`,
  ];

  return dataLines.filter(Boolean) as string[];
}
