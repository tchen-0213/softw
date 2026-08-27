FROM node:20-alpine
WORKDIR /app/user-service
COPY user-service/package*.json ./
RUN npm ci --omit=dev
COPY user-service/app.js ./
COPY common /app/common
ENV PORT=3101
ENV NODE_PATH=/app/user-service/node_modules
EXPOSE 3101
CMD ["node", "app.js"]
