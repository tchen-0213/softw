FROM node:20-alpine
ARG SERVICE_VERSION=2.0.0
ARG SERVICE_REVISION=dev
ARG BUILD_TIME=unknown
WORKDIR /app/api-gateway
COPY api-gateway/package*.json ./
RUN npm ci --omit=dev
COPY api-gateway/app.js ./
COPY common /app/common
RUN chown -R node:node /app
ENV PORT=8080
ENV SERVICE_VERSION=$SERVICE_VERSION
ENV SERVICE_REVISION=$SERVICE_REVISION
ENV BUILD_TIME=$BUILD_TIME
EXPOSE 8080
USER node
CMD ["node", "app.js"]
