FROM node:20-alpine
WORKDIR /app/user-service
COPY user-service/package*.json ./
RUN npm install --omit=dev
COPY user-service/app.js ./
COPY common /app/common
ENV PORT=3101
EXPOSE 3101
CMD ["node", "app.js"]
