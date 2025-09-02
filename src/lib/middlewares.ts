import type { TelegrafContext } from "@/types/telegraf";

export const logRequest = (ctx: TelegrafContext, next: () => Promise<void>) => {
  let command = ctx.message && "text" in ctx.message ? ctx.message.text : 'N/A'
  if (command !== 'N/A') {
    command = command !== 'N/A' ? command.slice(0, command.indexOf(' ') + 1) : command;
  }
  const requestFrom = ctx.from?.username || ctx.from?.first_name || 'Unknown';

  console.log(`Request received. From: ${requestFrom}, Chat ID: ${ctx.chat?.id}, Command: ${command[0] === '/' ? command : 'N/A'}`);
  next();
};
