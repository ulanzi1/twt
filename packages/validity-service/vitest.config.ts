import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `.test.ts` = pure DB-free unit tests (payload assembly, the producer's
    // calendar math, redaction matrix, and the P0 100×-thread determinism gate).
    // `.spec.ts` under tests/integration/ = live-DB integration tests (real
    // multi-clause evaluation + audit-on-admin-call + idempotent replay). The
    // integration suites self-skip via `describe.skipIf(!hasDatabase)` when
    // DATABASE_URL is unset, so a local `pnpm test` without Docker still passes.
    include: ['tests/**/*.test.ts', 'tests/integration/**/*.spec.ts'],
    passWithNoTests: true,
    // forks pool: each integration file gets its own Node.js process + module
    // scope (the own-committing writers connect their own pools — mirror
    // @twt/niyamavali-engine's vitest config). The determinism gate spawns its
    // OWN worker_threads internally, orthogonal to this pool choice.
    pool: 'forks',
  },
});
