// CLI / cron entrypoint for the audit-log integrity-verification job — Story
// 1.11a Task 10 (AC-2a).
//
// Run: `pnpm --filter @twt/jobs audit:verify-integrity`  (tsx src/audit/integrity-cli.ts)
//
// ── Daily 02:00 cadence (DD-4, recorded choice) ───────────────────────────────
// The daily trigger is the GitHub Actions schedule in
// .github/workflows/nightly-integrity.yml; the canonical pg-boss/Cloud-Scheduler
// cron is the Story 1.12 graduation (the job queue, §1.7 — not installed yet).
// This CLI is the invocable unit the cron calls; it can also be run manually. The
// prod-pointed run against the live chain from a separate execution environment
// (separate-project read SA per §2.10) is the recorded DD-1 graduation.
//
// Reads the GLOBAL chain → needs the BYPASSRLS service login in prod
// (SERVICE_DATABASE_URL); falls back to the app connection locally (DD-1/DD-3,
// identical to the mirror CLI). Exits non-zero if the chain is found broken so a
// scheduler/CI run fails loudly (the alerter has already fired, AC-5).

import { createDb, resolveConnectionString } from '@twt/domain';

import { verifyAuditChain } from './integrity-check.js';
import {
  resolveIntegrityAlerterFromEnv,
  resolveIntegritySinkFromEnv,
} from './integrity-observability.js';

async function main(): Promise<void> {
  const connectionString =
    process.env['SERVICE_DATABASE_URL'] ?? (await resolveConnectionString());
  const { pool } = createDb(connectionString, { max: 2, logger: false });

  try {
    const sink = resolveIntegritySinkFromEnv();
    const alerter = resolveIntegrityAlerterFromEnv();

    const result = await verifyAuditChain({
      servicePool: pool,
      sink,
      alerter,
      verifierActor: 'cron',
      triggerSource: 'cron',
    });

    console.info(
      '[audit-integrity]',
      JSON.stringify({
        mode: process.env['INTEGRITY_OBSERVABILITY_MODE'] ?? 'fake',
        checkId: result.checkId,
        chainValid: result.chainValid,
        rowsVerified: result.rowsVerified,
        startSeq: result.startSeq,
        endSeq: result.endSeq,
        firstBrokenSeq: result.firstBrokenSeq,
      }),
    );

    // A broken chain is a non-zero exit so the scheduler/CI run fails loudly.
    if (!result.chainValid) process.exitCode = 1;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main().catch((err: unknown) => {
  console.error('[audit-integrity] failed:', err);
  process.exit(1);
});
