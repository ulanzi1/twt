import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `.test.ts` = unit tests (smoke, db, encryption); `.spec.ts` under
    // tests/integration/ = live-DB integration tests (Story 1.6 RLS +
    // cross-Pariwar adversarial). The integration suites self-skip via
    // `describe.skipIf(!hasDatabase)` when DATABASE_URL is unset, so a local
    // `pnpm test` without Docker still passes.
    include: ['tests/**/*.test.ts', 'tests/integration/**/*.spec.ts'],
    passWithNoTests: true,
    // forks pool: each test file gets its own Node.js process + module scope.
    // Required because integration-setup.ts uses a module-level txContext that
    // would be shared across concurrent files in a thread-pool (review P3).
    pool: 'forks',
  },
});
