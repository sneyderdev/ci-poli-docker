FROM node:24.22.2-alpine3.24

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
