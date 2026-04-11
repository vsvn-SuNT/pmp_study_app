FROM node:22-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
COPY backend/tests ./tests
COPY sql ./sql
COPY csv ./csv
COPY pdf_to_csv/csv ./pdf_to_csv/csv
EXPOSE 3001
CMD ["node", "src/server.js"]
