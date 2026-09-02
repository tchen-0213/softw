FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ARG SERVICE_VERSION=1.0.0
ARG SERVICE_REVISION=dev
ARG BUILD_TIME=unknown
ENV NODE_ENV=production
ENV SERVICE_VERSION=$SERVICE_VERSION \
    SERVICE_REVISION=$SERVICE_REVISION \
    BUILD_TIME=$BUILD_TIME
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["node", "app.js"]
