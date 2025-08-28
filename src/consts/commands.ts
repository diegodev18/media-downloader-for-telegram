import { FormBot } from "@/utils/form-bot";
import type { Context } from "telegraf";

export const commands = {
  support: {
    description: "Ver redes sociales soportadas",
    action: (ctx: Context) => FormBot.support(ctx),
  },
};
