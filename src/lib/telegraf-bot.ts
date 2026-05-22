import https from "https";
import net from "net";
import { Telegraf } from "telegraf";
import { BOT_TOKEN } from "@/config";

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not defined");
}

// Railway's NAT drops TCP connections after ~60s of perceived inactivity.
// Large file uploads stall while waiting for remote ACKs, which looks idle to
// the NAT. TCP keepalive probes every 15s keep the NAT entry alive.
class KeepaliveAgent extends https.Agent {
  createConnection(options: object, callback: (...args: unknown[]) => void) {
    const socket = super.createConnection(options as any, callback as any) as net.Socket;
    socket.setKeepAlive(true, 15_000);
    return socket;
  }
}

export const bot = new Telegraf(BOT_TOKEN, {
  telegram: { agent: new KeepaliveAgent({ keepAlive: true }) },
});
