FROM node:24-alpine

WORKDIR /app

COPY package.json ./
COPY backend/ ./backend/
COPY designs/ ./designs/
COPY docs/ ./docs/
COPY experiments/ ./experiments/
COPY h5/ ./h5/
COPY product/ ./product/
COPY research/ ./research/
COPY server/ ./server/
COPY tools/ ./tools/

ENV HOST=0.0.0.0
ENV PORT=4327
ENV NODE_NO_WARNINGS=1

EXPOSE 4327

CMD ["node", "server/index.js"]
