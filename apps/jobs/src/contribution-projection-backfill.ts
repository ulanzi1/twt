// CLI entrypoint for the contribution-projection BACKFILL — Story 10.24 round-2 review (P5, D2).
//
// Run: `pnpm --filter @twt/jobs contribution:backfill -- <pariwarId> [<pariwarId> …]`
//      (or `--all` to sweep every Pariwar)
//
// ── Why this file exists ─────────────────────────────────────────────────────────────────────────
// Story 10.24 shipped `backfillContributionLedger` / `backfillMemberPoolAssignments` as the D3 repair
// path and the replay-equivalence arm of the projection contract — but NOTHING called them outside
// tests. The repair path existed in principle and not in production, which mattered more than it
// sounds: migration 0093's trigger maintains the ledger only from the moment it was created, so every
// `contribution.confirmed` appended since Story 9.4 is invisible until a backfill projects it.
//
// Since the round-2 review this is no longer merely a repair path — it is a PRECONDITION. The coverage
// watermark (migration 0094) is written HERE, and `deriveContributionFacts` returns the
// `producer_unavailable` sentinel for any Pariwar without one. So until this runs, a Pariwar's whole
// trustee violator section degrades honestly to `detection_unavailable` rather than reporting a clean
// membership. ⚖ "Unknown projection state must never fabricate a clean member" (2026-08-05).
//
// ── Ordering and idempotency ─────────────────────────────────────────────────────────────────────
// `backfillContributionProjections` runs ledger → assignments → coverage in ONE transaction per
// Pariwar, and that order is load-bearing: the coverage row asserts "history is projected", so writing
// it first would hand every member a fabricated clean record over an empty ledger. Every statement is
// set-based and `ON CONFLICT`-guarded, so re-running is a no-op and re-running after new events
// converges — including the reversal-before-confirmation permutation the incremental trigger alone
// cannot resolve.
//
// Runs per-Pariwar in its OWN transaction so one tenant's failure cannot roll back another's, and uses
// the BYPASSRLS service login in prod (the backfill reads `events_log`/`pool_snapshots` and writes
// projections across tenants); falls back to the app connection locally, mirroring the audit CLIs.

import { contribution, createDb, ids, resolveConnectionString, type Db } from '@twt/domain';
import { sql } from 'drizzle-orm';

/** Every Pariwar that has at least one event — the `--all` sweep's target set. */
async function listAllPariwarIds(db: Db): Promise<string[]> {
  const result = await db.execute(
    sql`SELECT DISTINCT pariwar_id FROM events_log WHERE pariwar_id IS NOT NULL ORDER BY pariwar_id`,
  );
  const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  return rows
    .map((r) => (r as { pariwar_id?: unknown }).pariwar_id)
    .filter((v): v is string => typeof v === 'string');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a.length > 0);
  if (args.length === 0) {
    console.error(
      'usage: contribution:backfill -- <pariwarId> [<pariwarId> …]   |   contribution:backfill -- --all',
    );
    process.exitCode = 1;
    return;
  }

  const connectionString =
    process.env['SERVICE_DATABASE_URL'] ?? (await resolveConnectionString());
  const { db, pool } = createDb(connectionString, { max: 2, logger: false });

  try {
    const targets = args.includes('--all') ? await listAllPariwarIds(db) : args;
    if (targets.length === 0) {
      console.info('[contribution-backfill] no Pariwars to process');
      return;
    }

    let succeeded = 0;
    const failures: { pariwarId: string; error: string }[] = [];

    for (const target of targets) {
      // One transaction PER PARIWAR: a tenant whose data trips a constraint must not roll back the
      // tenants already projected, and a partial sweep is safe to re-run.
      try {
        await db.transaction(async (tx) => {
          await contribution.backfillContributionProjections(tx, ids.pariwarId(target));
        });
        succeeded += 1;
        console.info('[contribution-backfill]', JSON.stringify({ pariwarId: target, ok: true }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ pariwarId: target, error: message });
        console.error(
          '[contribution-backfill]',
          JSON.stringify({ pariwarId: target, ok: false, error: message }),
        );
      }
    }

    console.info(
      '[contribution-backfill] summary',
      JSON.stringify({ attempted: targets.length, succeeded, failed: failures.length }),
    );
    // Non-zero exit so a scheduler/CI invocation fails loudly rather than reporting a silent partial
    // sweep — a Pariwar left without coverage renders as `detection_unavailable`, which is honest but
    // is NOT the intended end state of a backfill run.
    if (failures.length > 0) process.exitCode = 1;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

void main().catch((error: unknown) => {
  console.error('[contribution-backfill] fatal', error);
  process.exitCode = 1;
});
