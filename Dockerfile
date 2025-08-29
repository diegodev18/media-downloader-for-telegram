# Stage build
FROM node:22 AS build
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm add -g pnpm
RUN pnpm install
COPY . .
RUN pnpm run build

# Stage production
FROM node:alpine3.22 AS production
ENV NODE_ENV=production
WORKDIR /usr/src/app

RUN apk add --no-cache python3 py3-pip ffmpeg curl
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp
RUN npm add -g pnpm

COPY package*.json ./
RUN pnpm install -P

COPY --from=build /usr/src/app/dist ./dist

# GENERA cookies.txt desde ENV al inicio
ENV COOKIES=""
ENTRYPOINT ["/bin/sh", "-c", "if [ -n \"$COOKIES\" ]; then echo \"$COOKIES\" > /usr/src/app/dist/cookies.txt; fi && exec \"$@\"", "--"]

CMD ["node", "dist/app.js"]
