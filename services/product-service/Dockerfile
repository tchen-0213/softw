FROM node:20-alpine
WORKDIR /app/product-service
COPY product-service/package*.json ./
RUN npm ci --omit=dev
COPY product-service/app.js ./
COPY common /app/common
ENV PORT=3102
ENV NODE_PATH=/app/product-service/node_modules
EXPOSE 3102
CMD ["node", "app.js"]
