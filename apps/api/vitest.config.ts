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
    // Live-DB suite timeout (review finding, 2026-07-11 — Rule 7, docs/runbooks/test-runbook.md):
    // vitest's 5000ms default is repeatedly too tight for live-DB specs with several sequential
    // round-trips under `ci:local`'s concurrent turbo load, even though each is fast standalone
    // (~1s). Individually patching each newly-discovered file (niyamavali-workflow, device-token,
    // terms-and-conditions, medical-disclose, ...) proved to be whack-a-mole — a fresh ci:local run
    // keeps surfacing a different file. A global bump removes the flake CLASS at its root instead.
    testTimeout: 20000,
  },
});
