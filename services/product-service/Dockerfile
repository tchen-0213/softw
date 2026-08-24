FROM node:20-alpine
WORKDIR /app/product-service
COPY product-service/package*.json ./
RUN npm install --omit=dev
COPY product-service/app.js ./
COPY common /app/common
ENV PORT=3102
EXPOSE 3102
CMD ["node", "app.js"]
