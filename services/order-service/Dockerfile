FROM node:20-alpine
WORKDIR /app/order-service
COPY order-service/package*.json ./
RUN npm ci --omit=dev
COPY order-service/app.js ./
COPY common /app/common
ENV PORT=3103
ENV NODE_PATH=/app/order-service/node_modules
EXPOSE 3103
CMD ["node", "app.js"]
