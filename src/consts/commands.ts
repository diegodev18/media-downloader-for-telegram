import { FormBot } from "@/utils/form_bot";

export const commands = {
  help: {
    description: "Obtener ayuda",
    action: FormBot.help,
  },
  support: {
    description: "Ver redes sociales soportadas",
    action: FormBot.support,
  },
};
