FROM node:24.22.2-alpine3.24 AS base
WORKDIR /app
COPY package.json package-lock.json ./

# Etapa de pruebas: docker build --target test -t ci-poli-api:test ./api
FROM base AS test
RUN npm ci
COPY src ./src
COPY test ./test
CMD ["npm", "test"]

# Imagen final: solo dependencias de producción y código fuente
FROM base AS runtime
ENV NODE_ENV=production
RUN npm ci --omit=dev
COPY src ./src
USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
