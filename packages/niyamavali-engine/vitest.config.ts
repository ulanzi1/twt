import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `.test.ts` = pure DB-free unit tests (the determinism spine — the bulk of
    // coverage). `.spec.ts` under tests/integration/ = live-DB integration tests
    // (clause resolution / snapshot / idempotency memo / audit-on-compute). The
    // integration suites self-skip via `describe.skipIf(!hasDatabase)` when
    // DATABASE_URL is unset, so a local `pnpm test` without Docker still passes.
    include: ['tests/**/*.test.ts', 'tests/integration/**/*.spec.ts'],
    passWithNoTests: true,
    // forks pool: each integration file gets its own Node.js process + module
    // scope (the own-committing writers connect their own pools — mirror
    // @twt/domain's vitest config).
    pool: 'forks',
  },
});
