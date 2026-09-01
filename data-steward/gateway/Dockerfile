FROM node:22.4.0-alpine

WORKDIR /app

COPY package.json ./package.json
COPY shared ./shared
COPY gateway/src ./src
COPY shared ./shared

RUN npm install

CMD ["node", "src/server.js"]
