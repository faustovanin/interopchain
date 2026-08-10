FROM node:22.4.0-alpine

WORKDIR /app

COPY package.json ./package.json
COPY shared ./shared
COPY services/storage-service ./services/storage-service

RUN npm install

CMD ["node", "services/storage-service/consumer.js"]
