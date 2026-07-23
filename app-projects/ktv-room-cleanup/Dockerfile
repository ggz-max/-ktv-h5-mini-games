FROM node:24-alpine

WORKDIR /app

COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY scripts/ ./scripts/
COPY shared/ ./shared/
COPY package.json package-lock.json ./

RUN node scripts/build-static.js

ENV HOST=0.0.0.0
ENV PORT=8080
ENV NODE_NO_WARNINGS=1
EXPOSE 8080

CMD ["node", "backend/server.js"]
