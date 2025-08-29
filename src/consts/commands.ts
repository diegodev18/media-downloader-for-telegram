import { FormBot } from "@/utils/form-bot";
import type { Command } from "@/types";

export const commands: Record<string, Command> = {
  info: {
    description: "Obtener información sobre un video",
    action: (ctx) => FormBot.info(ctx)
  }
};
