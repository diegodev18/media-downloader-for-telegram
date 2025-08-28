import type { YtResponse } from "yt-dlp-exec";
import ytdlp from "yt-dlp-exec";
import fs from "fs";

const dirName = "vids";

export const downloadVideo = async (ctx: any, url: string) => {
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName);
  }

  const outputPath = `${dirName}/${Date.now()}.mp4`;

  const video = ytdlp(url, {
    output: outputPath,
    format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
  });

  video
    .then(async (info) => {
      await ctx.sendVideo(outputPath);
      printData(ctx, info, outputPath);
      fs.rmSync(outputPath);
    })
    .catch((err) => {
      if (ctx) ctx.reply("❌ Error al descargar: " + err);
      console.error("❌ Error:", err);
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
