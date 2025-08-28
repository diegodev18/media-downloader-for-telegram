import { FormBot } from "@/utils/form-bot";
import type { Context } from "telegraf";
import type { Command } from "@/types";

export const commands: Record<string, Command> = {
  support: {
    description: "Ver redes sociales soportadas",
    action: (ctx: Context) => FormBot.support(ctx),
  },
};
