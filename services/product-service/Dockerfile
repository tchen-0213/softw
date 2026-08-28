FROM node:20-alpine
ARG SERVICE_VERSION=2.0.0
ARG SERVICE_REVISION=dev
ARG BUILD_TIME=unknown
WORKDIR /app/product-service
COPY product-service/package*.json ./
RUN npm ci --omit=dev
COPY product-service/app.js ./
COPY common /app/common
ENV PORT=3102
ENV NODE_PATH=/app/product-service/node_modules
ENV SERVICE_VERSION=$SERVICE_VERSION
ENV SERVICE_REVISION=$SERVICE_REVISION
ENV BUILD_TIME=$BUILD_TIME
EXPOSE 3102
CMD ["node", "app.js"]
