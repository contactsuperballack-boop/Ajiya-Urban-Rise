# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# --- Runtime stage ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist

# Leads/subscribers now persist to PostgreSQL (see migrations/, server/db.ts) — the
# container itself holds no business data, so no local data volume is needed here.

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
