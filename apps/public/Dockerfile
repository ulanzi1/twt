# Multi-stage Dockerfile for @twt/public — the public Astro 6 Node-standalone server
# (Story 2.5, AR-48). `astro build` bundles the @twt/* workspace packages INTO the
# server entry (astro.config `vite.ssr.noExternal`), so the runtime needs no workspace
# symlinks; its third-party deps (pg, drizzle-orm, zod, @astrojs/*, …) stay external,
# so the runtime carries the installed node_modules from the build stage.

# ---------- base ----------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY tsconfig.base.json ./
COPY apps/public/package.json ./apps/public/
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
RUN pnpm turbo run build --filter=@twt/public

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
# The hoisted pnpm tree resolves the server's external deps (pg, drizzle-orm, zod,
# unstorage, @astrojs/*, …). The @twt/* symlinks within are unused — those are bundled
# into the server entry — so broken workspace symlinks at runtime are harmless.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/public/node_modules ./apps/public/node_modules
COPY --from=build /app/apps/public/dist ./apps/public/dist
COPY --from=build /app/apps/public/package.json ./apps/public/
EXPOSE 4321
# Astro Node standalone server entry (@astrojs/node standalone output).
CMD ["node", "apps/public/dist/server/entry.mjs"]
