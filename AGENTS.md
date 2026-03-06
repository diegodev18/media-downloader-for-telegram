# AGENTS.md — Media Downloader for Telegram

Guía para agentes de IA que trabajan en este repositorio.

## Resumen del proyecto

- **Qué es**: Bot de Telegram que descarga vídeos desde URLs (redes sociales) usando **yt-dlp** y los envía en el chat.
- **Runtime**: Node.js. Gestor de paquetes: **pnpm**.
- **Lenguaje**: TypeScript (compilado a `dist/`).
- **Framework del bot**: [Telegraf](https://telegraf.js.org/) v4.
- **Descargas**: [yt-dlp-exec](https://github.com/nickel-org/yt-dlp-exec) + binario **yt-dlp** + **ffmpeg** (necesarios en runtime/producción).

## Estructura del código

```
src/
  app.ts                 # Entrada: registra middlewares, comandos y handler de mensajes de texto
  config.ts              # NODE_ENV, BOT_TOKEN, ALLOWED_CHAT_IDS, opciones YTDLP (formato, cookies, rutas)
  consts/
    commands.ts          # Definición de comandos (nombre, descripción, action) → /info
  lib/
    telegraf-bot.ts      # Instancia del bot Telegraf
    middlewares.ts       # allowChatIds (filtrar por ALLOWED_CHAT_IDS), logRequest
    ytdlp-client.ts      # Cliente yt-dlp (create from yt-dlp-exec)
  utils/
    form-bot.ts          # FormBot: start, help, sendDownloadedVideo, info
    download-utils.ts    # downloadVideo(url), getDataLines(info) — uso de yt-dlp y rutas en vids/
  types/
    telegraf.d.ts        # TelegrafContext
    index.d.ts           # Command, SupportNetwork
tests/
  config.test.ts
```

- **Entrada de la app**: `src/app.ts` → compilado a `dist/app.js`; `pnpm start` ejecuta `node dist/app.js`.
- **Vídeos descargados**: se guardan en `vids/` (configurable en `config.ts` como `YTDLP.DIRECTORY_NAME`). Se borran tras enviar por Telegram.
- **Cookies**: ruta en config `YTDLP.COOKIES_FILE` (`dist/cookies.txt`). En Docker, `COOKIES` se escribe ahí en el ENTRYPOINT.

## Variables de entorno

| Variable           | Uso |
|--------------------|-----|
| `BOT_TOKEN`        | Token del bot de Telegram (obligatorio). |
| `COOKIES`          | Opcional. Contenido del archivo de cookies (Netscape) para yt-dlp; en Docker se vuelca a `dist/cookies.txt`. |
| `ALLOWED_CHAT_IDS` | Opcional. Lista de IDs de chat separados por comas. Si está definida, solo esos chats pueden usar el bot; si no, se permiten todos. |
| `NODE_ENV`         | `development` / `production`; en no-producción se carga `.env` con `process.loadEnvFile`. |

## Flujo principal

1. **Mensaje de texto con URL**: `app.ts` → middleware `allowChatIds` → `logRequest` → handler que llama a `FormBot.sendDownloadedVideo(ctx)`.
2. **sendDownloadedVideo**: extrae URL del mensaje → `downloadVideo(url)` (download-utils + ytdlp-client) → comprueba tamaño &lt; 50 MB → `ctx.replyWithVideo()` → borra el archivo local.
3. **Comandos**: `/start`, `/help` y los definidos en `commands` (p. ej. `/info`) se enrutan en `app.ts` con `bot.command(command, action)`.

## Convenciones y detalles técnicos

- **Alias de rutas**: se usa `@/` (ej. `@/lib/telegraf-bot`, `@/config`). Configurado en `tsconfig.json` y resuelto en build con `tsc-alias`.
- **Idioma de mensajes al usuario**: español (respuestas del bot, errores, ayuda).
- **Límite Telegram**: 50 MB; si el archivo es mayor, se informa y se elimina el archivo sin enviar.
- **Tests**: Jest; configuración en `jest.config.ts`. Ejecutar con `pnpm test` o `pnpm run test:coverage`.

## Cambios frecuentes

- **Añadir comando**: en `src/consts/commands.ts` añadir entrada y en `src/utils/form-bot.ts` la función (o en otro módulo) que implemente la acción; `app.ts` ya itera `commands` y registra cada uno.
- **Cambiar formato de descarga / opciones yt-dlp**: en `src/config.ts` (`YTDLP`) y en `src/utils/download-utils.ts` donde se llama a `youtubedl(..., options)`.
- **Nuevos middlewares**: registrarlos en `src/app.ts` antes de los handlers (por ejemplo después de `logRequest`).
- **Producción**: la imagen Docker instala ffmpeg y yt-dlp; `nixpacks.toml` declara dependencias para despliegue con Nixpacks.

## Comandos útiles

- `pnpm install` — instalar dependencias  
- `pnpm run dev` — desarrollo con nodemon  
- `pnpm run build` — compilar TypeScript  
- `pnpm start` — ejecutar en producción (`node dist/app.js`)  
- `pnpm test` — tests  
- `docker compose up -d` — levantar con Docker Compose (variables desde entorno o `.env`)
