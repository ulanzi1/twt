// ⭐ THE PRODUCTION-PATH GATE for Story 10.27's member-facing missed-cycle read. Live DB (:5433).
//
// ── Why this file exists, and why it is HERE rather than in @twt/domain ─────────────────────────────
// AC1's row source is defined by two predicates, and one of them only acquired a producer four merges
// ago: a cycle is CLOSED when its alert reached `alert.closed` at/before the assessment instant, and
// Story 8.14 (`0f72c37`) shipped that event's ONLY production emitter —
// `apps/jobs/src/scheduler/close-cycle-alert.ts`, an hourly IST cross-tenant sweep that is PRIMARY,
// not recovery (a Day-15 close is a TIME boundary; nothing commits and nothing fires, so the sweep IS
// the producer). Before it, every `alert.closed` row in the system came from fixtures INSERTed BELOW
// the projector, which is exactly how Story 8.9's AC3 stayed vacuously green for four stories.
//
// So this gate drives the real spawn saga → the real cycle-open worker → the real close sweep → real
// `alert.closed` rows → the real projection backfill → the read the member actually sees. `@twt/domain`
// cannot import `apps/jobs`, so the gate lives beside the producer it depends on — the same reason
// `restoration-discipline-production-path-live.test.ts` does, whose fixture shape this reuses verbatim
// rather than authoring a third one (AC1: "do not build the fixture from scratch — it already exists").
//
// ── ⛔ THE THREE THINGS THIS GATE PINS ──────────────────────────────────────────────────────────────
//   (1) THE EQUALITY (AC1 / D2). The rows the member is SHOWN and the count the R7 ladder EVALUATES
//       them on come from ONE scan. `listMemberMissedCycles` and `skipsCurrentYear` share the
//       `opportunity`/`sequenced` CTE chain by construction; this asserts they agree over a live DB,
//       for the same member at the same `at`. A second scan spelled "equivalently" is the drift this
//       stops — the identical hazard Story 10.23's AC2 named for `scanR7ViolatorCandidates`.
//
//   (2) THE COVERAGE-ABSENT CASE (AC1 / D5 / Finding 3), ASSERTED — NOT SKIPPED. The shared CTE chain
//       is coverage-BLIND; `deriveContributionFacts` is not (it returns `null` outright with no
//       projection). An ungated row read would therefore show a member rows the fact layer has already
//       refused to reason about. ⚠ And AC1's equality CANNOT hold in that state — with coverage absent
//       there is no `skipsCurrentYear` to compare against — so the tempting repair is to skip the case,
//       which makes the equality silently never cover the branch most likely to be wrong. This gate
//       asserts BOTH halves TOGETHER (zero rows AND `deriveContributionFacts === null`) BEFORE the
//       backfill runs, then runs the backfill and asserts the equality after. One fixture, both states.
//
//   (3) AS-OF CORRECTNESS (AC5). A confirmation landing AFTER the cycle closed REMOVES the row on the
//       next read — no backfill, no migration, no write. That is the mechanical guarantee behind AC3's
//       "never permanent": the surface is honest about impermanence because the DATA is impermanent.
//
// ⚠ `backfillContributionProjections` is THE PRODUCTION PRECONDITION, and it was learned the hard way:
// the first run of the 10.23 pass reported `applied = []` and was misread as a clause gap until the
// backfill was added. It is also where D5 was discovered. Do not remove it from step (4) — and note
// that step (3) deliberately runs BEFORE it.
//
// This gate writes NOTHING a member could see and enables NOTHING: it is a pure READ over rows the
// existing workers produce. No flag is flipped here (contrast the 10.23 gate's step (7)).

import { randomUUID } from 'node:crypto';

import { CYCLE_WINDOW_DAYS } from '@twt/contracts';
import {
  alert as alertDomain,
  contribution,
  createDb,
  ids,
  pool as poolDomain,
  reconciliation,
  withPariwarScope,
  type CreatedDb,
} from '@twt/domain';
import { deriveContributionFacts } from '@twt/validity-service';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runCloseCycleAlertSweep } from '../src/scheduler/close-cycle-alert.js';
import { runCycleOpenAlert } from '../src/scheduler/cycle-open-alert.js';
import { cleanupPoolCohort, seedPoolCohort, type SeededPoolCohort } from './pool-cohort-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 2 confirmed + 2 missed. Two misses (not one) so the equality is a real count comparison rather
 *  than a coincidence any non-empty result would satisfy, and so ORDERING has something to order. */
const CONFIRMED_CYCLES = 2;
const TOTAL_CYCLES = 4;
const EXPECTED_MISSES = TOTAL_CYCLES - CONFIRMED_CYCLES;

describe.skipIf(!hasDatabase)('Story 10.27 — the member missed-cycle read, over production-produced closures (:5433)', () => {
  let created: CreatedDb;
  let pool: pg.Pool;
  let cohort: SeededPoolCohort;
  const pariwarId = randomUUID();
  const brandedPariwarId = ids.pariwarId(pariwarId);
  const poolIdByCycle = new Map<string, string>();

  beforeAll(async () => {
    created = createDb(DATABASE_URL!, { ssl: false, max: 8 });
    pool = created.pool;
    cohort = await seedPoolCohort(pool, { scale: 1, n: 1, cycleCount: TOTAL_CYCLES, pariwarId });
  }, 120_000);

  afterAll(async () => {
    if (!pool) return;
    let cleanupError: unknown = null;
    try {
      await cleanupPoolCohort(pool, pariwarId);
      const alertIds = cohort?.cycles.map((c) => alertDomain.deriveAlertId(c.cycleId)) ?? [];
      const admin = await pool.connect();
      try {
        await admin.query('BEGIN');
        // Cleanup bypasses the append-only triggers, exactly as the 10.23 gate does.
        await admin.query("SET LOCAL session_replication_role = 'replica'");
        if (alertIds.length > 0) {
          await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [alertIds]);
          await admin.query('DELETE FROM alerts WHERE alert_id = ANY($1)', [alertIds]);
        }
        await admin.query('DELETE FROM events_log WHERE pariwar_id = $1', [pariwarId]);
        await admin.query('DELETE FROM contribution_projection_coverage WHERE pariwar_id = $1', [pariwarId]);
        await admin.query('COMMIT');
      } catch (err) {
        await admin.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        admin.release();
      }
    } catch (err) {
      cleanupError = err;
    } finally {
      await pool.end().catch(() => undefined);
    }
    // Raised, never warned: undetected residue in a SHARED test database is inherited by whatever
    // runs next (the 10.23 gate's recorded lesson).
    if (cleanupError !== null) {
      throw new Error(`[10.27-gate] CLEANUP FAILED for Pariwar ${pariwarId}: ${String(cleanupError)}`);
    }
  }, 60_000);

  /** Drive one seeded cycle through the REAL spawn saga + the shipped cycle-open worker. */
  async function openCycle(cycle: SeededPoolCohort['cycles'][number]): Promise<string> {
    const plan = await withPariwarScope(pool, pariwarId, (db) =>
      poolDomain.planCycleSpawn(db, {
        pariwarId: brandedPariwarId,
        cycleId: ids.cycleFreezeCommitId(cycle.cycleId),
        frozenClaims: cycle.frozenClaims,
      }),
    );
    await withPariwarScope(pool, pariwarId, (_db, client) =>
      poolDomain.spawnChildPool(client, plan.children[0]!, poolDomain.createPoolAssignmentSeam(), cohort.memberIds, true),
    );
    await withPariwarScope(pool, pariwarId, (_db, client) =>
      poolDomain.finalizeCycleIfComplete(client, {
        pariwarId: brandedPariwarId,
        cycleId: ids.cycleFreezeCommitId(cycle.cycleId),
        poolCount: 1,
      }),
    );
    const opened = await runCycleOpenAlert(
      { pool },
      {
        requestId: `10.27-gate:${cycle.cycleId}`,
        pariwarId,
        actorId: null,
        traceId: `10.27-gate:${cycle.cycleId}`,
        payload: { cycleId: cycle.cycleId },
      },
    );
    expect(opened.state).toBe('live');
    const { rows } = await pool.query<{ pool_id: string }>('SELECT pool_id FROM pools WHERE cycle_id = $1', [
      cycle.cycleId,
    ]);
    return rows[0]!.pool_id;
  }

  /** Read BOTH sides of AC1's equality at one instant — the rows AND the fact the ladder evaluates. */
  async function readBothSides(memberId: string, at: Date) {
    return withPariwarScope(pool, pariwarId, async (db) => {
      const scope = { pariwarId: brandedPariwarId, memberId: ids.memberId(memberId) };
      const rows = await contribution.listMemberMissedCycles(db, scope, at);
      const inputs = await contribution.readContributionFactInputs(db, scope, at);
      return { rows, inputs, facts: deriveContributionFacts(inputs, at) };
    });
  }

  it('⭐ carries production-produced closures into the member surface — coverage-gated, count-equal, and as-of correct', async () => {
    const memberId = cohort.memberIds[0]!;

    // ── (1) Four real cycles opened; the member CONFIRMS on the first two, misses the last two ────
    for (let i = 0; i < TOTAL_CYCLES; i += 1) {
      const poolId = await openCycle(cohort.cycles[i]!);
      poolIdByCycle.set(cohort.cycles[i]!.cycleId, poolId);
      if (i >= CONFIRMED_CYCLES) continue;
      await withPariwarScope(pool, pariwarId, (_db, client) =>
        reconciliation.appendConfirmedContribution(client, {
          pariwarId: brandedPariwarId,
          alertId: ids.alertId(alertDomain.deriveAlertId(cohort.cycles[i]!.cycleId)),
          payload: {
            poolId,
            memberId,
            alertId: alertDomain.deriveAlertId(cohort.cycles[i]!.cycleId),
            utr: String(200000000000 + i),
            confirmedAt: new Date(cohort.committedAt.getTime() + i * MS_PER_DAY).toISOString(),
            matchProvenance: {
              bankStatementEntryId: randomUUID(),
              idempotencyKey: `10.27-gate-${i}`,
              matcherRun: `10.27-gate-run-${i}`,
              senderVpaCheck: { available: false, reason: 'member_vpa_not_collected' },
            },
          },
        }),
      );
    }

    // ── (2) The REAL close sweep produces REAL `alert.closed` events ─────────────────────────────
    const past = new Date(cohort.committedAt.getTime() + (CYCLE_WINDOW_DAYS + 1) * MS_PER_DAY);
    const swept = await runCloseCycleAlertSweep({ pool, now: () => past });
    expect(swept.closed).toBe(TOTAL_CYCLES);
    expect(swept.failed).toBe(0);

    // The load-bearing distinction from the pre-existing fixtures: these rows went through the
    // PROJECTOR — schema-valid payloads, not `'{}'::jsonb` written below it.
    const { rows: closedEvents } = await pool.query<{ payload: unknown }>(
      `SELECT payload FROM events_log WHERE pariwar_id = $1 AND event_type = 'alert.closed'`,
      [pariwarId],
    );
    expect(closedEvents).toHaveLength(TOTAL_CYCLES);
    for (const evt of closedEvents) {
      expect(alertDomain.AlertClosedPayloadSchema.safeParse(evt.payload).success).toBe(true);
    }

    const at = new Date();

    // ── (3) ⛔ D5 — COVERAGE ABSENT. Asserted BEFORE the backfill, and asserted TOGETHER ──────────
    // This is the state the surface must be SILENT in: the fact layer refuses to reason, so the
    // member is told nothing in either direction. The two assertions are one claim — a test that
    // skipped this case would make AC1's equality silently never cover the branch most likely to be
    // wrong (Finding 3). Note the cycles ARE closed and the member DID miss two of them at this
    // point: the only thing absent is projection coverage, which is precisely the trap.
    {
      const { rows: coverageRow } = await pool.query(
        'SELECT 1 FROM contribution_projection_coverage WHERE pariwar_id = $1',
        [pariwarId],
      );
      expect(coverageRow, 'the fixture must reach this assertion with NO coverage row').toHaveLength(0);

      const before = await readBothSides(memberId, at);
      expect(before.inputs.coveredFrom, 'coveredFrom must be null before the backfill').toBeNull();
      expect(
        before.facts,
        'deriveContributionFacts must refuse to reason with no projection coverage',
      ).toBeNull();
      expect(
        before.rows,
        'D5: with no coverage the member surface must return ZERO rows — the section is ABSENT, not empty',
      ).toHaveLength(0);
    }

    // ── (4) The production precondition: the contribution-projection backfill ─────────────────────
    await withPariwarScope(pool, pariwarId, (db) =>
      contribution.backfillContributionProjections(db, brandedPariwarId),
    );

    // ── (5) ⛔ AC1 — THE EQUALITY, both sides read at the SAME instant ────────────────────────────
    const after = await readBothSides(memberId, at);
    expect(after.inputs.coveredFrom).not.toBeNull();
    expect(after.facts, 'with coverage present the facts must be derivable').not.toBeNull();
    expect(after.inputs.skipsCurrentYear).toBe(EXPECTED_MISSES);

    // The rows falling in the IST calendar year of `at` must number exactly `skipsCurrentYear`.
    // ⚠ `istYearStartUtc`, never `getFullYear()` on a UTC Date (Story 8.9's convention).
    const yearStart = contribution.istYearStartUtc(at);
    const inYear = after.rows.filter((r) => r.closedAt.getTime() >= yearStart.getTime());
    expect(
      inYear,
      'D2: the rows the member is SHOWN must number exactly what the ladder EVALUATES them on',
    ).toHaveLength(after.inputs.skipsCurrentYear);

    // The rows are the MISSED cycles specifically — not every opportunity. The two confirmed cycles
    // must be absent, or the surface would name cycles the member demonstrably contributed to.
    const missedCycleIds = new Set(after.rows.map((r) => r.cycleId));
    for (let i = 0; i < TOTAL_CYCLES; i += 1) {
      const cycleId = cohort.cycles[i]!.cycleId;
      expect(missedCycleIds.has(cycleId), `cycle ${String(i)} membership`).toBe(i >= CONFIRMED_CYCLES);
    }

    // Ordering is EXPLICIT and most-recent-first (AC4), never incidental.
    const closedTimes = after.rows.map((r) => r.closedAt.getTime());
    expect([...closedTimes].sort((a, b) => b - a)).toEqual(closedTimes);

    // Every row carries a real cycle UUID and a real pool id — the D4 provenance the R7(G) assertion
    // consumes. A blank or display-shaped value here would corrupt that provenance.
    for (const row of after.rows) {
      expect(row.cycleId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(poolIdByCycle.get(row.cycleId)).toBe(row.poolId);
      expect(row.closedAt).toBeInstanceOf(Date);
    }

    // ── (6) ⛔ AC5 — a LATE confirmation REMOVES the row. No backfill, no migration, no write ─────
    const lateCycle = cohort.cycles[TOTAL_CYCLES - 1]!;
    const lateAlertId = alertDomain.deriveAlertId(lateCycle.cycleId);
    const latePoolId = poolIdByCycle.get(lateCycle.cycleId)!;
    expect(missedCycleIds.has(lateCycle.cycleId), 'the target cycle must be present before we clear it').toBe(true);

    // ⚠ The close instant is the sweep's REAL emit time, not the `now()` injected into it — the sweep
    // decides WHETHER a cycle is due from the injected clock, but `alert.closed`'s `occurred_at` is
    // when the event was actually appended. The AS-OF scan filters on that `occurred_at`, so both the
    // late confirmation and the re-read instant must be derived from it. (Reading it back rather than
    // assuming it is what makes this assertion mean "after the cycle closed" rather than "after some
    // date we picked"; an earlier draft used the seeded window boundary and read an instant at which
    // no cycle had closed yet, so the surface was legitimately empty for an unrelated reason.)
    const { rows: closeInstants } = await pool.query<{ max_closed: Date }>(
      `SELECT max(occurred_at) AS max_closed FROM events_log
        WHERE pariwar_id = $1 AND event_type = 'alert.closed'`,
      [pariwarId],
    );
    const closedAt = new Date(closeInstants[0]!.max_closed);
    const lateConfirmedAt = new Date(closedAt.getTime() + 60 * 60 * 1000); // one hour AFTER the close
    const later = new Date(closedAt.getTime() + 2 * 60 * 60 * 1000);
    expect(lateConfirmedAt.getTime(), 'the confirmation must land AFTER the close').toBeGreaterThan(
      closedAt.getTime(),
    );

    await withPariwarScope(pool, pariwarId, (_db, client) =>
      reconciliation.appendConfirmedContribution(client, {
        pariwarId: brandedPariwarId,
        alertId: ids.alertId(lateAlertId),
        payload: {
          poolId: latePoolId,
          memberId,
          alertId: lateAlertId,
          utr: String(299999999999),
          // AFTER the close — the tail-reconciled case the 2026-08-05 rule ratified.
          confirmedAt: lateConfirmedAt.toISOString(),
          matchProvenance: {
            bankStatementEntryId: randomUUID(),
            idempotencyKey: '10.27-gate-late',
            matcherRun: '10.27-gate-run-late',
            senderVpaCheck: { available: false, reason: 'member_vpa_not_collected' },
          },
        },
      }),
    );
    // The ledger projection is what the read scans, so the confirmation has to reach it — the same
    // production step (4) already ran, re-run for the newly appended event. Still no migration.
    await withPariwarScope(pool, pariwarId, (db) =>
      contribution.backfillContributionProjections(db, brandedPariwarId),
    );

    const cleared = await readBothSides(memberId, later);
    expect(
      cleared.rows.map((r) => r.cycleId),
      'AC5: a tail-reconciled confirmation must REMOVE the cycle from the member surface',
    ).not.toContain(lateCycle.cycleId);
    expect(cleared.rows).toHaveLength(EXPECTED_MISSES - 1);
    // And the equality still holds after the removal — the two sides moved together, which is the
    // whole point of sharing one scan.
    expect(cleared.inputs.skipsCurrentYear).toBe(EXPECTED_MISSES - 1);
    const laterYearStart = contribution.istYearStartUtc(later);
    expect(
      cleared.rows.filter((r) => r.closedAt.getTime() >= laterYearStart.getTime()),
    ).toHaveLength(cleared.inputs.skipsCurrentYear);
  }, 120_000);
}, { timeout: 120_000 });
