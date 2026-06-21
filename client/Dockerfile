# ---- Build Stage ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Empty API_URL = relative paths (works behind nginx reverse proxy)
ENV NEXT_PUBLIC_API_URL=""

RUN npm run build

# ---- Runtime Stage ----
FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./

ENV PORT=13112
EXPOSE 13112

CMD ["node_modules/.bin/next", "start"]
