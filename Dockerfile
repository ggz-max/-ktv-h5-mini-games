FROM node:22-alpine

WORKDIR /app/app-projects/move-this-mic

COPY app-projects/move-this-mic/package.json app-projects/move-this-mic/package-lock.json ./
RUN npm ci

COPY app-projects/move-this-mic ./
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
