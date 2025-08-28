FROM node:22 AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm add -g pnpm

RUN pnpm install

COPY . .

RUN pnpm run build


FROM node:alpine3.22 AS production

ENV NODE_ENV=production

RUN apt install yt-dlp ffmpeg -y

RUN npm add -g pnpm

WORKDIR /usr/src/app

COPY package*.json ./

RUN pnpm install -P

COPY --from=build /usr/src/app/dist ./dist

CMD ["node", "dist/app.js"]
