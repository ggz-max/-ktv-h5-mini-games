FROM node:20-alpine
LABEL ktv_personality_build="20260629-1725-skins-v3"
WORKDIR /app
COPY package.json ./
COPY server/ ./server/
COPY www-room-lineup/ ./www-room-lineup/
EXPOSE 8080
CMD ["node", "server/index.js"]
