FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
ENV DATA_DIR=/app/backend/data

COPY --from=build /app/backend ./backend
COPY --from=build /app/shared ./shared
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["node", "backend/server.js"]
