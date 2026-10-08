# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:20-slim AS build
WORKDIR /opt/app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NODE_ENV=production
RUN pnpm build

# --- Runtime stage ---
FROM node:20-slim AS runtime
WORKDIR /opt/app
RUN corepack enable
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /opt/app/dist ./dist
COPY --from=build /opt/app/public ./public
COPY --from=build /opt/app/src ./src
COPY --from=build /opt/app/config ./config

# Uploaded media on local disk does not survive a redeploy on most platforms — see
# SETUP.md Step 5. This volume makes that explicit rather than silently losing files;
# swap for a cloud upload provider before relying on this in production.
VOLUME ["/opt/app/public/uploads"]

EXPOSE 1337
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:1337/_health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["pnpm", "start"]
