FROM node:20-alpine
WORKDIR /app/api-gateway
COPY api-gateway/package*.json ./
RUN npm install --omit=dev
COPY api-gateway/app.js ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "app.js"]
