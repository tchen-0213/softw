FROM node:20-alpine
WORKDIR /app/order-service
COPY order-service/package*.json ./
RUN npm install --omit=dev
COPY order-service/app.js ./
COPY common /app/common
ENV PORT=3103
EXPOSE 3103
CMD ["node", "app.js"]
