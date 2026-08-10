FROM node:22.4.0-alpine

WORKDIR /app

COPY package.json ./package.json
COPY shared ./shared
COPY services/metadata-crypto-service ./services/metadata-crypto-service

RUN npm install

CMD ["node", "services/metadata-crypto-service/consumer.js"]
