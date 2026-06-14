// Vite config for @twt/admin — the trustee/admin SPA (Story 1.11b, DD-1).
//
// Tailwind v4 is CSS-first: the `@tailwindcss/vite` plugin replaces the v3 PostCSS
// config + `tailwind.config.ts` (the architecture tree shows a v3-era config file
// — deliberately NOT created; theme lives in `@theme {}` in src/styles.css).
// `@vitejs/plugin-react` provides the React 19 JSX transform + Fast Refresh.
//
// Routing is code-based (src/router.tsx assembles routes from src/routes/*), so the
// `@tanstack/router-plugin` codegen is intentionally not wired — a recorded DD-1
// deviation that keeps the `tsc → vite build` gate + CI deterministic for this
// 3-route dev surface (the committed TanStack Router stack, §4.7, is unchanged).

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
    // Local dev: proxy the API surface to apps/api so same-origin cookies +
    // `credentials: 'include'` work without CORS. Production serves the SPA behind
    // the same origin as the API (reverse proxy) — see Dockerfile + README.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: true },
});
