import { FormBot } from "@/utils/form-bot";
import type { Command } from "@/types";

export const commands: Record<string, Command> = {
  info: {
    description: "Obtener información sobre un video",
    action: (ctx) => FormBot.info(ctx),
  },
  audio: {
    description: "Descargar solo el audio en MP3",
    action: (ctx) => FormBot.audio(ctx),
  },
  format: {
    description: "Listar formatos disponibles para un enlace",
    action: (ctx) => FormBot.format(ctx),
  },
  playlist: {
    description: "Listar vídeos de una playlist",
    action: (ctx) => FormBot.playlist(ctx),
  },
  image: {
    description: "Descargar miniatura o imagen del enlace",
    action: (ctx) => FormBot.image(ctx),
  },
  stats: {
    description: "Ver estadísticas (solo admins)",
    action: (ctx) => FormBot.stats(ctx),
  },
};
