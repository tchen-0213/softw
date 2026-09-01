FROM node:20-alpine
ARG SERVICE_VERSION=2.0.0
ARG SERVICE_REVISION=dev
ARG BUILD_TIME=unknown
WORKDIR /app/user-service
COPY user-service/package*.json ./
RUN npm ci --omit=dev
COPY user-service/app.js ./
COPY common /app/common
RUN chown -R node:node /app
ENV PORT=3101
ENV NODE_PATH=/app/user-service/node_modules
ENV SERVICE_VERSION=$SERVICE_VERSION
ENV SERVICE_REVISION=$SERVICE_REVISION
ENV BUILD_TIME=$BUILD_TIME
EXPOSE 3101
USER node
CMD ["node", "app.js"]
