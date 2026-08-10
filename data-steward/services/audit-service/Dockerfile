FROM node:22.4.0-alpine

WORKDIR /app

COPY package.json ./package.json
COPY shared ./shared
COPY services/audit-service ./services/audit-service

RUN npm install

CMD ["node", "services/audit-service/src/index.js"]
