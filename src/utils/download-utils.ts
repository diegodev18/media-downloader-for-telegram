import fs from "fs";
import { youtubedl } from "@/lib/ytdlp-client";
import { YTDLP } from "@/config";
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
  const dataLines = [
    `- Titulo del video: ${info.title}`,
    `- Duración del video: ${info.duration}`,
    `- Channel: ${info.channel}`,
    outputPath ? `- Tamaño del video: ${fs.statSync(outputPath).size} bytes` : null,
    outputPath ? `- Ruta del archivo: ${outputPath}` : null,
    `- Formato: mp4`
  ];

  return dataLines.filter(Boolean) as string[];
}
