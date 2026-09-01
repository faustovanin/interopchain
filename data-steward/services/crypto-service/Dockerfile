FROM node:22.4.0-alpine

WORKDIR /app

COPY package.json ./package.json
COPY shared ./shared
COPY services/crypto-service ./services/crypto-service

RUN npm install

CMD ["node", "services/crypto-service/cryptoConsumer.js"]
