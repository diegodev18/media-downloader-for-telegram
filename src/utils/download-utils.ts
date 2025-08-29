import fs from "fs";
import { youtubedl } from "@/lib/ytdlp-client";
import { YTDLP } from "@/config";
import type { YtResponse } from "yt-dlp-exec";

const { DIRECTORY_NAME } = YTDLP;

export const downloadVideo = (
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

const getDataLines = (info: YtResponse, outputPath: string) => {
  return [
    `- Titulo del video: ${info.title}`,
    `- Duración del video: ${info.duration}`,
    `- Channel: ${info.channel}`,
    `- Tamaño del video: ${fs.statSync(outputPath).size} bytes`,
    `- Ruta del archivo: ${outputPath}`,
    `- Formato: mp4`
  ];
}
