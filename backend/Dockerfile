# ─── Dev stage ────────────────────────────────────────────────────────────────
FROM node:20-slim AS dev

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY pnpm-lock.yaml ./
COPY backend/package.json ./
RUN pnpm install

COPY backend/tsconfig.json backend/drizzle.config.ts ./
COPY backend/src ./src
COPY backend/drizzle ./drizzle

EXPOSE 3000 3001

CMD ["pnpm", "dev"]


# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY pnpm-lock.yaml ./
COPY backend/package.json ./
RUN pnpm install

COPY backend/tsconfig.json backend/drizzle.config.ts ./
COPY backend/src ./src

RUN pnpm build


# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY pnpm-lock.yaml ./
COPY backend/package.json ./
RUN pnpm install --prod

COPY --from=builder /app/dist ./dist
COPY backend/drizzle ./drizzle

RUN mkdir -p /app/data

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000 3001

CMD ["node", "dist/index.js"]
