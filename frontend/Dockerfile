# ─── Dev stage ────────────────────────────────────────────────────────────────
FROM node:20-slim AS dev

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY pnpm-lock.yaml ./
COPY frontend/package.json ./
RUN pnpm install

COPY frontend/ ./

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]


# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY pnpm-lock.yaml ./
COPY frontend/package.json ./
RUN pnpm install

COPY frontend/ ./

ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN pnpm build


# ─── Production stage (nginx) ─────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
