# Production Dockerfile with pnpm
FROM node:24.22.1-alpine3.24 AS base
RUN npm install -g pnpm@11.28.6
WORKDIR /app

# Build frontend
FROM base AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml* frontend/pnpm-workspace.yaml ./
RUN pnpm install
COPY frontend/ ./
COPY tsconfig.base.json ../
RUN pnpm build

# Build backend
FROM base AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/pnpm-lock.yaml* backend/pnpm-workspace.yaml ./
RUN pnpm install
COPY backend/ ./
COPY tsconfig.base.json ../
RUN pnpm build

# Install production backend dependencies
FROM base AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/pnpm-lock.yaml* backend/pnpm-workspace.yaml ./
RUN pnpm install --prod

# Final production image
FROM node:24.22.1-alpine3.24
WORKDIR /app

# Install docker CLI and tzdata for timezone support
RUN apk upgrade --no-cache && apk add --no-cache docker-cli docker-cli-compose tzdata

# Remove package managers unused at runtime (their bundled deps carry CVEs)
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=frontend-build /app/public-dist ./public-dist
COPY backend/package.json ./backend/

# Create data directory for multi-server persistence
RUN mkdir -p /opt/hytale-panel/data/servers

ENV NODE_ENV=production
ENV DATA_PATH=/opt/hytale-panel/data
EXPOSE 3000

WORKDIR /app/backend
CMD ["node", "dist/server.js"]
