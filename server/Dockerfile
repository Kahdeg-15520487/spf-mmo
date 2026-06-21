# ---- Build Stage ----
FROM node:22-alpine AS build

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/

RUN npx prisma generate
RUN npm run build

# ---- Runtime Stage ----
FROM node:22-alpine

WORKDIR /app

# Prisma engine needs openssl; sqlite for seed check
RUN apk add --no-cache openssl sqlite

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

EXPOSE 13110
ENTRYPOINT ["./docker-entrypoint.sh"]
