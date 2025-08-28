FROM node:alpine3.22

ENV NODE_ENV=production
ENV BOT_TOKEN=${BOT_TOKEN}

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .

CMD ["node", "./dist/app.js"]
