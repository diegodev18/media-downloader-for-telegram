import { create } from "yt-dlp-exec";
import { YTDLP } from "@/config";

export const youtubedl = create(YTDLP.BINARY_PATH || "yt-dlp");
