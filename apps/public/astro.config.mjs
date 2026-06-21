// @ts-check
import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

// The public, unauthenticated SSR surface (Story 2.5, AR-48). Astro 6 + the Node
// standalone adapter → a self-contained server entry at `dist/server/entry.mjs`.
//
// `output: 'server'` makes every route SSR (cache-safe HTML — no per-user state
// enters the render; see COMPOSITION-CONTRACT.md). The `vite.ssr.noExternal` list
// BUNDLES the workspace packages into the server entry rather than leaving them as
// external `@twt/*` imports — required so the standalone Docker image (which copies
// `dist/`, not the workspace symlinks under `node_modules/@twt/*`) can resolve them.
// Do NOT move workspace packages to `ssr.external` — that breaks the standalone image.
// Client-island bundles never see `@twt/domain`: `.astro` frontmatter and
// `*.server.ts` modules are never part of an island's module graph (Story 2.5 AC9).
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // SEO surface: server-rendered, minimal JS by default (architecture §"apps/public").
  // `site` is the canonical origin; override per-Pariwar host at the edge later.
  site: process.env.PUBLIC_SITE_ORIGIN ?? 'https://twt.org',
  build: {
    // Extract CSS to a static asset (never inline into HTML) so the friction-budget
    // page-weight manifest can MEASURE the styling transfer (Story 2.5, AC6b). The
    // dynamic HTML + critical-render-path timing is the deferred Lighthouse metric.
    inlineStylesheets: 'never',
  },
  vite: {
    ssr: {
      noExternal: ['@twt/domain', '@twt/i18n', '@twt/contracts', '@twt/tokens'],
    },
  },
});
