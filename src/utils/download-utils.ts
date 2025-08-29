import type { YtResponse } from "yt-dlp-exec";
import { youtubedl } from "@/lib/ytdlp-client";
import fs from "fs";

const dirName = "vids";

export const downloadVideo = async (url: string, ctx?: any): Promise<string | null> => {
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
      printData(ctx, info, outputPath);
      return outputPath;
    })
    .catch((err) => {
      if (ctx) ctx.reply("❌ Error al descargar");

      console.error(
        "❌ Error al descargar: ",
        ctx.from ? `from ${ctx.from?.username}` : '',
        err
      );

      return null;
    });
};

const printData = (ctx: any, info: YtResponse, outputPath: string) => {
  const dataLinesStr = getDataLines(info, outputPath).join("\n");

  if (ctx) ctx.reply(dataLinesStr);
  console.log(dataLinesStr);
}

const getDataLines = (info: YtResponse, outputPath: string) => {
  return [
    `   - Titulo del video: ${info.title}`,
    `   - Duración del video: ${info.duration}`,
    `   - Channel: ${info.channel}`,
    `   - Tamaño del video: ${fs.statSync(outputPath).size} bytes`,
    `   - Ruta del archivo: ${outputPath}`,
    `   - Formato: mp4`
  ];
}
