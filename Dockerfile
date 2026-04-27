# Build stage
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npx prisma generate --schema=src/infrastructure/database/prisma/schema.prisma
RUN npm run build
RUN npx tsc-alias -p tsconfig.build.json

# Production stage
FROM node:20-alpine AS production
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/infrastructure/database/generated ./dist/infrastructure/database/generated
COPY --from=builder /app/src/infrastructure/database/prisma ./src/infrastructure/database/prisma

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/main.js"]
