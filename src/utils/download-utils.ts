import type { YtResponse } from "yt-dlp-exec";
import { youtubedl } from "@/lib/ytdlp-client";
import fs from "fs";

const dirName = "vids";

export const downloadVideo = async (
  url: string,
): Promise<{ output: string; info: YtResponse; dataLines: string[] } | null> => {
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName);
  }

  const outputPath = `${dirName}/${Date.now()}.mp4`;

  const video = youtubedl(url, {
    cookies: "dist/cookies.txt",
    output: outputPath,
    format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4"
  });

  return video
    .then(async (info) => {
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
