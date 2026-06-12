import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit/smoke specs (*.test.ts) AND DB-gated integration specs (*.spec.ts).
    // Integration specs guard with describe.skipIf(!hasDatabase) so the suite
    // passes without DATABASE_URL; the live-DB CI job sets it.
    include: ['tests/**/*.test.ts', 'tests/integration/**/*.spec.ts'],
    // forks so each test file gets its own process + pool (mirrors @twt/domain;
    // the per-request scope transactions must not race across files).
    pool: 'forks',
    passWithNoTests: true,
  },
});
