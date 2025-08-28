FROM node:22 AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm add -g pnpm

RUN pnpm install

COPY . .

RUN pnpm run build


FROM node:alpine3.22 AS production

ENV NODE_ENV=production

RUN apk add --no-cache python3 py3-pip ffmpeg curl

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

RUN npm add -g pnpm

WORKDIR /usr/src/app

COPY package*.json ./

RUN pnpm install -P

RUN echo "${COOKIES}" > cookies.txt

COPY --from=build /usr/src/app/dist ./dist

CMD ["node", "dist/app.js"]
