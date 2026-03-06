# Media Downloader for Telegram

Bot de Telegram que permite descargar vídeos desde redes sociales enviando un enlace. Usa **yt-dlp** para soportar múltiples plataformas y envía el archivo directamente en el chat (hasta 50 MB).

## Características

- **Descarga de vídeos**: Envía un enlace y recibe el vídeo en MP4.
- **Múltiples plataformas**: Cualquier sitio soportado por [yt-dlp](https://github.com/yt-dlp/yt-dlp) (YouTube, Twitter/X, Instagram, TikTok, etc.).
- **Comandos**: `/start`, `/help`, `/info <enlace>` para ver metadatos sin descargar.
- **Opcional**: Restricción por IDs de chat (`ALLOWED_CHAT_IDS`) para uso privado.
- **Stack**: TypeScript, [Telegraf](https://telegraf.js.org/), [yt-dlp-exec](https://github.com/nickel-org/yt-dlp-exec).

## Requisitos previos

- **Node.js** 18+ (recomendado 22)
- **pnpm** (gestor de paquetes del proyecto)
- **ffmpeg** y **yt-dlp** (en producción/Docker se instalan automáticamente)
- Token de bot de Telegram ([@BotFather](https://t.me/BotFather))
- Cookies de YouTube (opcional, para vídeos con restricciones de edad o región)

## Instalación (desarrollo)

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/diegodev18/media-downloader-for-telegram.git
   cd media-downloader-for-telegram
   ```

2. **Instalar dependencias**

   ```bash
   pnpm install
   ```

   Si no tienes pnpm: `npm install -g pnpm`

3. **Configurar variables de entorno**

   Copia `.env.example` a `.env` y rellena los valores:

   | Variable           | Requerido | Descripción |
   |--------------------|-----------|-------------|
   | `BOT_TOKEN`        | Sí        | Token del bot (BotFather) |
   | `COOKIES`          | No        | Cookies de YouTube en formato Netscape (para vídeos restringidos) |
   | `ALLOWED_CHAT_IDS` | No        | IDs de chat permitidos separados por comas; si no se define, el bot acepta todos |

4. **Arrancar en modo desarrollo**

   ```bash
   pnpm run dev
   ```

   (Usa `nodemon` para recargar al cambiar código.)

## Uso

- **Descargar**: Envía al bot un mensaje de texto con solo la URL del vídeo (ej. `https://www.youtube.com/watch?v=...`).
- **Información**: `/info <url>` para ver título, duración, canal, etc., sin descargar.
- **Ayuda**: `/help` lista los comandos disponibles.

**Límite**: Telegram permite archivos de hasta 50 MB; vídeos más grandes se rechazan con un mensaje de error.

## Producción

### Con Docker

```bash
docker build -t media-downloader-for-telegram .
docker run -d --name media-downloader-for-telegram \
  -e BOT_TOKEN="<tu_token>" \
  -e COOKIES="<cookies_opcional>" \
  -e ALLOWED_CHAT_IDS="123456789" \
  media-downloader-for-telegram
```

### Con Docker Compose

Ajusta las variables en tu entorno o en un `.env` en la raíz y ejecuta:

```bash
docker compose up -d
```

Las variables `BOT_TOKEN`, `COOKIES` y `ALLOWED_CHAT_IDS` se leen del entorno.

### Despliegue (Nixpacks)

El proyecto incluye `nixpacks.toml` para entornos compatibles (p. ej. Railway): se instalan Node, ffmpeg, yt-dlp y Python. El comando de inicio es `pnpm start`.

## Scripts disponibles

| Comando           | Descripción                |
|-------------------|----------------------------|
| `pnpm run dev`    | Desarrollo con recarga     |
| `pnpm run build`  | Compila TypeScript a `dist/` |
| `pnpm start`      | Ejecuta `dist/app.js`      |
| `pnpm test`       | Tests con Jest             |
| `pnpm run test:coverage` | Tests con cobertura  |

## Cookies de YouTube

Para vídeos con restricción de edad o región hace falta un archivo de cookies en formato Netscape:

1. Usa una extensión del navegador (p. ej. "Get cookies.txt") o exporta desde las devtools.
2. En desarrollo: guarda el contenido en `dist/cookies.txt` (se usa la ruta definida en `config.ts`).
3. En Docker: pasa el contenido en la variable de entorno `COOKIES`; la imagen escribe `dist/cookies.txt` al arrancar.

**Importante:** Las cookies de YouTube caducan o se rotan con el tiempo. Si ves errores como "cookies are no longer valid" o "Sign in to confirm you're not a bot", exporta de nuevo las cookies desde tu navegador y actualiza `dist/cookies.txt` o la variable `COOKIES`.

## Contribuir

Las contribuciones son bienvenidas. Abre un issue o un pull request para mejoras o correcciones.

## Licencia

MIT. Ver [LICENSE](LICENSE).
