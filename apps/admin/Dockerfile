# Multi-stage Dockerfile for @twt/admin.
# PR-1 scope: image builds successfully; runtime entrypoint is a placeholder.
# Substantive runtime correctness lands in subsequent Epic 1 stories.

# ---------- base ----------
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY tsconfig.base.json ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/eslint-config-twt/package.json ./packages/eslint-config-twt/
COPY packages/tokens/package.json ./packages/tokens/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/domain/package.json ./packages/domain/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/platform-adapters/package.json ./packages/platform-adapters/
COPY packages/bank-parsers/package.json ./packages/bank-parsers/
COPY packages/events/package.json ./packages/events/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY . .
RUN pnpm turbo run build --filter=@twt/admin

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/apps/admin/dist ./apps/admin/dist
COPY --from=build /app/apps/admin/package.json ./apps/admin/
# PR-1 placeholder entrypoint — runtime correctness lands in subsequent stories.
CMD ["node", "apps/admin/dist/index.js"]
