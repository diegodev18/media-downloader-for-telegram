import type { Context } from "telegraf";
import type { Update } from "telegraf/typings/core/types/typegram";

export const logRequest = (ctx: Context<Update>, next: () => Promise<void>) => {
  let command = ctx.message && "text" in ctx.message ? ctx.message.text : 'N/A'
  if (command !== 'N/A') {
    command = command !== 'N/A' ? command.slice(0, command.indexOf(' ')) : command;
  }

  console.log(`\
Request received:
From: ${ctx.from?.username || ctx.from?.first_name || 'Unknown'}
Chat ID: ${ctx.chat?.id}
Message ID: ${ctx.message?.message_id || 'N/A'}
Command: ${command}
Timestamp: ${new Date().toISOString()}`);
  next();
};
