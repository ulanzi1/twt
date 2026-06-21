import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit/smoke specs (*.test.ts) AND the no-DB integration specs (*.spec.ts) — the
    // PII scrape live-render spec renders from the pure module, needing no live server.
    include: ['tests/**/*.test.ts', 'tests/integration/**/*.spec.ts'],
    passWithNoTests: true,
  },
});
