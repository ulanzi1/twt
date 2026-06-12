// CLI / test entrypoint for the off-site audit-log mirror — Story 1.10 Task 8.3.
//
// Run: `pnpm --filter @twt/jobs audit:mirror`  (tsx src/audit/cli.ts)
//
// ── 6-hourly cadence (DD-5, recorded choice) ──────────────────────────────────
// The 6-hourly trigger is DEFERRED to the pg-boss cron that lands with Story
// 1.12 (the architecture's job queue, §1.7 — not installed yet). This CLI is the
// invocable unit the cron will call; until then it can be run manually or by an
// out-of-band scheduler. AC-3's "6-hourly job replicates new audit lines" is
// satisfied by this function + the committed schedule mechanism (pg-boss cron @
// 1.12); the live Cloud Scheduler/Terraform apply is deferrable (Story 1.5
// D1-1.5 precedent). See infra/gcp/audit-mirror.tf + docs/runbooks.
//
// ── Watermark (v1) ────────────────────────────────────────────────────────────
// v1 seeds an in-memory watermark from AUDIT_MIRROR_SINCE_SEQ (default 0 → full
// mirror). The DURABLE watermark store (primary-side `audit_mirror_state` row /
// readable marker) is wired alongside the pg-boss cron (Story 1.12) so a process
// restart resumes where it left off.

import { createDb, resolveConnectionString } from '@twt/domain';

import {
  createInMemoryWatermarkStore,
  pushNewAuditLinesToMirror,
  resolveMirrorTargetFromEnv,
} from './mirror.js';

async function main(): Promise<void> {
  // The mirror reads the GLOBAL chain → it needs the BYPASSRLS service login in
  // prod (SERVICE_DATABASE_URL); falls back to the app connection locally.
  const connectionString =
    process.env['SERVICE_DATABASE_URL'] ?? (await resolveConnectionString());
  const { pool } = createDb(connectionString, { max: 2, logger: false });

  try {
    const target = await resolveMirrorTargetFromEnv();
    const sinceSeq = Number(process.env['AUDIT_MIRROR_SINCE_SEQ'] ?? '0');
    const watermark = createInMemoryWatermarkStore(Number.isFinite(sinceSeq) ? sinceSeq : 0);

    const result = await pushNewAuditLinesToMirror({ servicePool: pool, target, watermark });
    console.info(
      '[audit-mirror]',
      JSON.stringify({
        mode: process.env['MIRROR_MODE'] ?? 'fake',
        pushedCount: result.pushedCount,
        fromSeq: result.fromSeq,
        toSeq: result.toSeq,
        objectName: result.objectName,
      }),
    );
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main().catch((err: unknown) => {
  console.error('[audit-mirror] failed:', err);
  process.exit(1);
});
