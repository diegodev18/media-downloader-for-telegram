import { create } from "yt-dlp-exec";
import { YTDLP_BINARY_PATH } from "@/config";

export const youtubedl = create(YTDLP_BINARY_PATH);
