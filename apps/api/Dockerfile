# Multi-stage Dockerfile for @twt/api.
# PR-1 scope: image builds successfully; runtime entrypoint is a placeholder.
# Substantive runtime correctness lands in subsequent Epic 1 stories.

# ---------- base ----------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
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
RUN pnpm turbo run build --filter=@twt/api

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production

# Headless Chromium for the Story 8.7 Contribution Note PDF renderer (D1 — the only engine that both
# shapes Devanagari correctly, via HarfBuzz, and exports a tagged PDF).
#
# The distro package, NOT a puppeteer-managed download: `puppeteer` bundles a glibc Chromium that does
# not run on this musl base at all, which is why the adapter uses `puppeteer-core` and takes the binary
# path by injection. This is a materially heavier runtime image than before — Chromium and its runtime
# libraries are the largest thing in it — and that cost is the price of the AC2 rendering guarantees.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
# The vendored Devanagari faces (Story 8.7, D5). LOAD-BEARING, not optional: the Note template inlines
# these as data URIs, so the rendered document carries its own face and a font-less container cannot
# produce tofu boxes (▯) for every Hindi glyph. `tsc` does not copy non-TS assets into dist, so they are
# copied explicitly here — an image built without them fails the render loudly (the asset loader throws
# naming every path it tried) rather than silently shipping an unreadable artifact.
COPY --from=build /app/apps/api/assets ./apps/api/assets
# PR-1 placeholder entrypoint — runtime correctness lands in subsequent stories.
CMD ["node", "apps/api/dist/index.js"]
