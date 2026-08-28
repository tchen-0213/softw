FROM node:20-alpine
ARG SERVICE_VERSION=2.0.0
ARG SERVICE_REVISION=dev
ARG BUILD_TIME=unknown
WORKDIR /app/order-service
COPY order-service/package*.json ./
RUN npm ci --omit=dev
COPY order-service/app.js ./
COPY common /app/common
ENV PORT=3103
ENV NODE_PATH=/app/order-service/node_modules
ENV SERVICE_VERSION=$SERVICE_VERSION
ENV SERVICE_REVISION=$SERVICE_REVISION
ENV BUILD_TIME=$BUILD_TIME
EXPOSE 3103
CMD ["node", "app.js"]
