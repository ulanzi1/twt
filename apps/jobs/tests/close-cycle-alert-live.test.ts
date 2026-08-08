// ⭐ THE END-TO-END GATE for the close-of-cycle emitter — Story 8.14 (Task 4; AC6). Live DB (:5433).
//
// ── Why this file is written the way it is ──────────────────────────────────────────────────────────
// Story 8.9's AC3 was a regression fence asserting the alert's `live → closed` transition was
// "byte-unchanged", proven by a revert-sanity diff. It passed on every run. It was also completely
// vacuous: **byte-unchanged is satisfied by code that never runs**, and the transition it guarded had
// no emitter at all. Four stories were built on a fact nothing could produce.
//
// So this gate is deliberately NOT a diff assertion and NOT a fixture. It drives the REAL production
// path end to end and asserts the chain the whole story exists to restore:
//
//   1. open a cycle through the REAL cycle-open path (spawn saga → `cycle.frozen` → the shipped
//      `runCycleOpenAlert` worker) → the alert reaches `live`;
//   2. a member is really assigned (`member_pool_assignments`, written from the persisted spawn
//      snapshot by the real assignment seam);
//   3. advance past the Day-15 boundary and run the ACTUAL sweep function — not a hand-rolled close;
//   4. `alerts.current_state = 'closed'` AND a real `alert.closed` row exists in `events_log` with a
//      schema-valid, NON-fixture payload (the pre-existing fixtures insert `'{}'::jsonb` straight into
//      the table, below the projector — which is exactly why the `alert-state-invariant` gate never
//      caught the gap);
//   5. ⛔ THE LOAD-BEARING ONE — `readContributionFactInputs` now reports `skipsCurrentYear = 1` for
//      that member. This is the first test in the repository proving the R7 fact chain works from a
//      PRODUCTION-PRODUCED closed cycle rather than a manufactured one.
//
// A revert-probe accompanies it (see the story's Debug Log): disabling the emitter must turn step 4/5
// RED. A gate that passes with the feature reverted is the defect this story corrects
// ([[feedback_gate_scope_semantic_coverage]]).
//
// ⚠ The pre-existing fixture-based specs (`packages/validity-service/tests/integration/
// contribution-facts.spec.ts` and siblings) are deliberately left alone: they legitimately unit-test
// the fact derivation in isolation. This ADDS the missing integration proof.
//
// Own-committing throughout (the sweep opens its own transactions on the service pool, so per-test
// rollback isolation cannot be used). Everything is seeded under a FRESH `randomUUID()` Pariwar and
// deleted by it in `afterAll` — membership, never global counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { CYCLE_WINDOW_DAYS } from '@twt/contracts';
import {
  alert as alertDomain,
  contribution,
  createDb,
  ids,
  pool as poolDomain,
  withPariwarScope,
  type CreatedDb,
} from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runCycleOpenAlert } from '../src/scheduler/cycle-open-alert.js';
import { runCloseCycleAlertSweep } from '../src/scheduler/close-cycle-alert.js';
import { cleanupPoolCohort, seedPoolCohort, type SeededPoolCohort } from './pool-cohort-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!hasDatabase)('close-of-cycle emitter — END-TO-END (live DB :5433)', () => {
  let created: CreatedDb;
  let pool: pg.Pool;
  let cohort: SeededPoolCohort;
  const pariwarId = randomUUID();
  const brandedPariwarId = ids.pariwarId(pariwarId);

  beforeAll(async () => {
    created = createDb(DATABASE_URL!, { ssl: false, max: 8 });
    pool = created.pool;
    // ONE member, FOUR cycles: cycle[0] is the one this suite closes end-to-end; cycle[1] backs the
    // exact-boundary regression (AC5); cycle[2] backs the D3 anchor-authority regression (column dragged
    // into the past); cycle[3] backs the D3 dangerous-direction regression (column dragged into the future).
    cohort = await seedPoolCohort(pool, { scale: 1, n: 1, cycleCount: 4, pariwarId });
  }, 60_000);

  afterAll(async () => {
    if (!pool) return;
    await cleanupPoolCohort(pool, pariwarId);
    // The alert streams the cycle-open path minted — cleaned by the cycle ids this suite created.
    const alertIds = cohort?.cycles.map((c) => alertDomain.deriveAlertId(c.cycleId)) ?? [];
    if (alertIds.length > 0) {
      const admin = await pool.connect();
      try {
        // Both deletes in ONE transaction (Review Finding): the `alerts` delete used to run in
        // autocommit mode BEFORE this transaction opened, so a failed/rolled-back events_log purge
        // could leave `alerts` permanently gone while its events_log rows survived — orphaned data.
        await admin.query('BEGIN');
        // events_log is append-only (AR-8 trigger); replica role sheds it for the test-only purge.
        await admin.query("SET LOCAL session_replication_role = 'replica'");
        await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [alertIds]);
        await admin.query('DELETE FROM alerts WHERE alert_id = ANY($1)', [alertIds]);
        await admin.query('COMMIT');
      } catch (err) {
        await admin.query('ROLLBACK').catch(() => undefined);
        console.warn('[close-cycle-alert-live] alert cleanup residue:', String(err));
      } finally {
        admin.release();
      }
    }
    await pool.end();
  }, 60_000);

  /** Drive a seeded cycle through the REAL spawn saga to `cycle.frozen`, with the real roster + seam. */
  async function driveCycleToFrozen(cycle: SeededPoolCohort['cycles'][number]): Promise<void> {
    const plan = await withPariwarScope(pool, pariwarId, (db) =>
      poolDomain.planCycleSpawn(db, {
        pariwarId: brandedPariwarId,
        cycleId: ids.cycleFreezeCommitId(cycle.cycleId),
        frozenClaims: cycle.frozenClaims,
      }),
    );
    await withPariwarScope(pool, pariwarId, (_db, client) =>
      poolDomain.spawnChildPool(
        client,
        plan.children[0]!,
        poolDomain.createPoolAssignmentSeam(),
        cohort.memberIds,
        true,
      ),
    );
    const fin = await withPariwarScope(pool, pariwarId, (_db, client) =>
      poolDomain.finalizeCycleIfComplete(client, {
        pariwarId: brandedPariwarId,
        cycleId: ids.cycleFreezeCommitId(cycle.cycleId),
        poolCount: 1,
      }),
    );
    expect(fin.frozen).toBe(true);
  }

  /** Open the cycle's alert through the SHIPPED pg-boss worker body — not a direct domain call. */
  async function openAlertViaWorker(cycleId: string): Promise<string> {
    const result = await runCycleOpenAlert(
      { pool },
      {
        requestId: `close-of-cycle-e2e:${cycleId}`,
        pariwarId,
        actorId: null,
        traceId: `close-of-cycle-e2e:${cycleId}`,
        payload: { cycleId },
      },
    );
    expect(result.state).toBe('live');
    return result.alertId;
  }

  async function alertState(alertId: string): Promise<string | undefined> {
    const { rows } = await pool.query<{ current_state: string }>(
      'SELECT current_state FROM alerts WHERE alert_id = $1',
      [alertId],
    );
    return rows[0]?.current_state;
  }

  it('⭐ real cycle-open → assigned member → sweep → closed + real alert.closed event + skipsCurrentYear = 1', async () => {
    const cycle = cohort.cycles[0]!;
    const memberId = cohort.memberIds[0]!;

    // ── (1) The REAL cycle-open path → the alert reaches `live` ────────────────────────────────────
    await driveCycleToFrozen(cycle);
    const alertId = await openAlertViaWorker(cycle.cycleId);
    expect(await alertState(alertId)).toBe('live');

    // ── (2) The member is REALLY assigned (written by the spawn snapshot, not by this test) ────────
    const { rows: assigned } = await pool.query<{ member_id: string; assigned_at: Date }>(
      'SELECT member_id, assigned_at FROM member_pool_assignments WHERE cycle_id = $1 AND member_id = $2',
      [cycle.cycleId, memberId],
    );
    expect(assigned).toHaveLength(1);

    // The member has NO confirmed contribution, and the cycle is still OPEN — so at this point the
    // opportunity does not exist yet. This is the "before" half of the proof: without it, a green
    // assertion after the sweep could not distinguish "the emitter worked" from "it was already 1".
    const before = await withPariwarScope(pool, pariwarId, (db) =>
      contribution.readContributionFactInputs(
        db,
        { pariwarId: brandedPariwarId, memberId: ids.memberId(memberId) },
        new Date(),
      ),
    );
    expect(before.skipsCurrentYear).toBe(0);

    // ── (3) Advance past the Day-15 boundary and run the ACTUAL sweep ──────────────────────────────
    // The seeded freeze is `SEED_COMMITTED_AT`; the injected clock sits one day past its Day-15
    // boundary. The sweep's own arithmetic (payload anchor + CYCLE_WINDOW_DAYS) decides due-ness —
    // this test only moves the clock.
    const past = new Date(cohort.committedAt.getTime() + (CYCLE_WINDOW_DAYS + 1) * MS_PER_DAY);
    const result = await runCloseCycleAlertSweep({ pool, now: () => past });
    expect(result.failed).toBe(0);
    expect(result.closed).toBeGreaterThanOrEqual(1);

    // ── (4) The projection moved AND a real, schema-valid event landed on the alert's own stream ───
    expect(await alertState(alertId)).toBe('closed');
    const { rows: closedEvents } = await pool.query<{
      payload: Record<string, unknown>;
      actor_id: string | null;
      event_version: string;
    }>(
      `SELECT payload, actor_id, event_version FROM events_log
        WHERE stream_id = $1 AND event_type = 'alert.closed'`,
      [alertId],
    );
    expect(closedEvents).toHaveLength(1);
    // ⛔ NOT a `'{}'` fixture — the real, registered `.strict()` audit payload the projector validated.
    expect(closedEvents[0]!.payload).toEqual({
      from_state: 'live',
      to_state: 'closed',
      trigger: alertDomain.CLOSE_OF_CYCLE_TRIGGER,
      actor: 'system',
    });
    expect(alertDomain.AlertClosedPayloadSchema.safeParse(closedEvents[0]!.payload).success).toBe(true);
    expect(closedEvents[0]!.actor_id).toBeNull();
    // Version 4 = it landed on the SAME stream, after frozen/published/live — i.e. it went through the
    // projector, not around it into a detached row.
    expect(Number(closedEvents[0]!.event_version)).toBe(4);

    // ── (5) ⛔ THE LOAD-BEARING ASSERTION — the R7 fact chain reads a production-produced closure ───
    // `contribution/facts.ts` joins `alert.closed` with an INNER `JOIN LATERAL` on
    // `closed_at IS NOT NULL`, so an un-closed cycle is dropped from the opportunity set entirely.
    // Before this story no production code could ever make this number non-zero.
    const after = await withPariwarScope(pool, pariwarId, (db) =>
      contribution.readContributionFactInputs(
        db,
        { pariwarId: brandedPariwarId, memberId: ids.memberId(memberId) },
        new Date(),
      ),
    );
    expect(after.skipsCurrentYear).toBe(1);
    // ⚠ `opportunitiesSinceLast` stays 0, and that is CORRECT, not a gap: its predicate is
    // `last_confirmed_at IS NOT NULL AND closed_at > last_confirmed_at` (facts.ts), so it counts
    // misses SINCE a member's last live contribution. This member has never contributed, so there is
    // no "since". Pinned here so a future reader does not mistake the zero for the emitter failing to
    // reach the second R7 fact.
    expect(after.opportunitiesSinceLast).toBe(0);
  }, 60_000);

  it('AC4: a second sweep tick is a no-op — no second alert.closed is ever appended', async () => {
    const alertId = alertDomain.deriveAlertId(cohort.cycles[0]!.cycleId);
    const past = new Date(cohort.committedAt.getTime() + (CYCLE_WINDOW_DAYS + 1) * MS_PER_DAY);

    const second = await runCloseCycleAlertSweep({ pool, now: () => past });
    expect(second.failed).toBe(0);

    const { rows } = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'alert.closed'`,
      [alertId],
    );
    expect(Number(rows[0]!.n)).toBe(1);
    expect(await alertState(alertId)).toBe('closed');
  }, 60_000);

  it('AC5: the Day-15 boundary is exact — an alert one second SHORT of it is left `live`', async () => {
    const cycle = cohort.cycles[1]!;
    await driveCycleToFrozen(cycle);
    const alertId = await openAlertViaWorker(cycle.cycleId);

    // One second BEFORE the boundary → not due. This is the assertion that would catch a sweep that
    // closed on the `defaultNow()` column, on a calendar-adjusted tail, or on an off-by-one window.
    const justBefore = new Date(cohort.committedAt.getTime() + CYCLE_WINDOW_DAYS * MS_PER_DAY - 1000);
    const early = await runCloseCycleAlertSweep({ pool, now: () => justBefore });
    expect(early.failed).toBe(0);
    expect(await alertState(alertId)).toBe('live');

    // Exactly AT the boundary → due. `closeAt <= now` is the predicate, so the boundary instant itself
    // closes the window — the member's countdown reached zero.
    const atBoundary = new Date(cohort.committedAt.getTime() + CYCLE_WINDOW_DAYS * MS_PER_DAY);
    const onTime = await runCloseCycleAlertSweep({ pool, now: () => atBoundary });
    expect(onTime.failed).toBe(0);
    expect(await alertState(alertId)).toBe('closed');
  }, 60_000);

  it('D3: the EVENT PAYLOAD is the anchor — a past-due `committed_at` COLUMN does not close the cycle', async () => {
    const cycle = cohort.cycles[2]!;
    await driveCycleToFrozen(cycle);
    const alertId = await openAlertViaWorker(cycle.cycleId);

    // Force the two anchors apart. `cycle_freeze_commits.committed_at` is a `defaultNow()` COLUMN;
    // `cycle.frozen`'s `attestation.committed_at` is the durable event payload the member's own
    // countdown is computed from. Here the column is dragged a year into the past while the payload
    // keeps the seeded instant — so a sweep that trusted the column would close a cycle whose members
    // still have days left on the clock they were shown. That is precisely D3's hazard.
    const staleColumn = new Date(cohort.committedAt.getTime() - 365 * MS_PER_DAY);
    await pool.query('UPDATE cycle_freeze_commits SET committed_at = $1 WHERE commit_id = $2', [
      staleColumn,
      cycle.cycleId,
    ]);

    // One second before the PAYLOAD's boundary. The column prefilter admits this row; the payload —
    // the authority — says it is not due. The sweep must report it as `notDue` and leave it `live`.
    const justBefore = new Date(cohort.committedAt.getTime() + CYCLE_WINDOW_DAYS * MS_PER_DAY - 1000);
    const swept = await runCloseCycleAlertSweep({ pool, now: () => justBefore });
    expect(swept.failed).toBe(0);
    expect(swept.notDue).toBeGreaterThanOrEqual(1);
    expect(await alertState(alertId)).toBe('live');

    // And the payload boundary — not the column's — is what actually closes it.
    const atBoundary = new Date(cohort.committedAt.getTime() + CYCLE_WINDOW_DAYS * MS_PER_DAY);
    await runCloseCycleAlertSweep({ pool, now: () => atBoundary });
    expect(await alertState(alertId)).toBe('closed');
  }, 60_000);

  it('D3 (dangerous direction): a committed_at COLUMN drifted into the FUTURE silently excludes an otherwise-due alert from the scan', async () => {
    const cycle = cohort.cycles[3]!;
    await driveCycleToFrozen(cycle);
    const alertId = await openAlertViaWorker(cycle.cycleId);

    // The OPPOSITE tamper from the D3 test above: drag the COLUMN a year into the FUTURE relative to
    // the payload's `attestation.committed_at` (which keeps the seeded instant). By the AUTHORITATIVE
    // payload anchor this cycle is genuinely due — but the prefilter's `c.committed_at <= $1` now
    // excludes the row from the SQL scan entirely: it is never fetched, so the payload-anchored
    // per-candidate check downstream never even runs against it.
    const futureColumn = new Date(cohort.committedAt.getTime() + 365 * MS_PER_DAY);
    await pool.query('UPDATE cycle_freeze_commits SET committed_at = $1 WHERE commit_id = $2', [
      futureColumn,
      cycle.cycleId,
    ]);

    // Well past the PAYLOAD's boundary — a prefilter anchored to the payload would have surfaced this.
    const wellPastDue = new Date(cohort.committedAt.getTime() + (CYCLE_WINDOW_DAYS + 10) * MS_PER_DAY);
    const swept = await runCloseCycleAlertSweep({ pool, now: () => wellPastDue });
    expect(swept.failed).toBe(0);

    // ⚠ PINNED, not desired: the row never reaches `notDue`/`failed` — the SQL prefilter drops it
    // before the payload check runs, so a genuinely-due alert stays `live` with NO alarm at all. Under
    // normal operation `cycle_freeze_commits.committed_at` is set once, at freeze time, from the same
    // instant embedded in the `cycle.frozen` payload, and nothing in production code ever mutates it
    // afterward — this test reaches the divergence only via the same direct-UPDATE tampering the D3
    // test above uses, to make an otherwise-silent gap in the prefilter visible and regression-tested.
    expect(await alertState(alertId)).toBe('live');
  }, 60_000);
});
