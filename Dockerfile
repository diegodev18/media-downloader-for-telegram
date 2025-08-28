FROM node:alpine3.22

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .

CMD ["node", "./dist/app.js"]
