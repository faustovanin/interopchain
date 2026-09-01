FROM node:22.4.0-alpine

WORKDIR /app

COPY package.json ./package.json
COPY shared ./shared
COPY services/metadata-service ./services/metadata-service

RUN npm install

CMD ["node", "services/metadata-service/metadataConsumer.js"]