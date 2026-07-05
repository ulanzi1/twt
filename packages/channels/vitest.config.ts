import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `.test.ts` = pure DB-free unit tests (schema round-trip, deep-freeze guard, renderer purity,
    // escaping discipline, dispatcher ordering/eligibility/suppression, and the P0 per-channel
    // determinism gate). `.spec.ts` under tests/integration/ = live-DB tests (the real writeAuditEntry
    // dispatch + per-channel + P0-violation audit lines) guarded by `describe.skipIf(!hasDatabase)` so a
    // local `pnpm test` without Docker still passes. Mirrors packages/validity-service.
    include: ['tests/**/*.test.ts', 'tests/integration/**/*.spec.ts'],
    passWithNoTests: true,
    // forks pool: each integration file gets its own process + module scope (the own-committing audit
    // writer connects its own pool). The determinism gate spawns its OWN worker_threads internally.
    pool: 'forks',
  },
});
