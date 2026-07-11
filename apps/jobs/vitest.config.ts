import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
    // Live-DB test isolation (Story 1.11b): the audit-integrity walk
    // (integrity-check.test.ts) and the mirror push (mirror.test.ts) BOTH append
    // to the ONE global audit_log_entries chain via writeAuditEntry. Running the
    // files in parallel interleaves their seq writes, which breaks the chunk-walk
    // tests' "the rows I wrote are consecutive" assumption (a flaky, load-sensitive
    // failure). Run files serially so each chain-writing suite owns the tail while
    // it asserts. (Tests run on the shared global chain — they assert membership,
    // not absolute counts; this just removes cross-file interleaving.)
    fileParallelism: false,
    // Live-DB suite timeout (review finding, 2026-07-11 — Rule 7, docs/runbooks/test-runbook.md):
    // same root-cause fix as apps/api/vitest.config.ts — a global bump instead of chasing each
    // newly-discovered flaky file individually (integrity-check.test.ts, data-export.test.ts, ...).
    testTimeout: 20000,
  },
});
