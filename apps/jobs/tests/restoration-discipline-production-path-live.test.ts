// ⭐ THE END-TO-END GATE for Story 10.23's restoration engine, driven from PRODUCTION-PRODUCED
// `alert.closed` events. Live DB (:5433). Hardened from the investigative probe that found the
// post-merge findings recorded in `10-23-restoration-discipline-lock-in.md` (2026-08-09).
//
// ── What this gate exists to stop ───────────────────────────────────────────────────────────────────
// Story 8.14's gate (`close-cycle-alert-live.test.ts`) proves the chain as far as
// `skipsCurrentYear = 1` and stops there BY DESIGN. Everything after that hop — facts → R7 ladder →
// imposition → overlay → payload fold — was evidenced only against fixtures:
//
//   · `restoration-discipline-fold.test.ts`            — DB-free, literal `liveOverlay()`
//   · `validity-service/…/contribution-facts.spec.ts`  — inserts `alert.closed` as `'{}'::jsonb` at a
//                                                        hardcoded `event_version`, BELOW the projector
//   · `assignable-roster-live.test.ts`                 — seeds `member.restoration_discipline.imposed`
//                                                        directly
//
// Each is legitimate in isolation. Collectively, NOTHING connected a production-produced skip to the
// ladder, the writer, or the fold — which is how Story 8.9's AC3 stayed vacuously green for four
// stories. This gate closes that segment: 11 real cycles through the real spawn saga, the real
// cycle-open worker, the real close sweep, real `alert.closed` rows, the real projection backfill, the
// real scan, and the real job.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// ⛔ READ THIS BEFORE COPYING THE FLAG-FLIP BLOCK BELOW — IT IS NOT AN ENABLEMENT PRECEDENT
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// Step (7) creates `restoration_discipline_imposition` flag versions and drives them to `full`. That
// is a TEST FIXTURE scoped to a randomly-generated Pariwar that exists only for the duration of this
// file, in a local test database. It is NOT an enablement of the flag in any environment, and it
// confers NO authority to enable it anywhere — Decision `2026-08-07-089` says exactly that, in those
// terms, and it governs.
//
// The flip is here because the writer half of Story 10.23 is otherwise permanently untestable: with
// the flag off, `impositionsWritten` is 0 by construction and every downstream hop is unreachable. A
// gate that only exercised the OFF path would prove the kill switch and nothing it guards.
//
// ⚠ Step (6) — the flag ABSENT — is the half that pins production posture. Both are asserted.

import { randomUUID } from 'node:crypto';

import { CYCLE_WINDOW_DAYS } from '@twt/contracts';
import {
  alert as alertDomain,
  contribution,
  createDb,
  featureFlags,
  ids,
  member,
  pool as poolDomain,
  reconciliation,
  withPariwarScope,
  type CreatedDb,
} from '@twt/domain';
import {
  deriveIsAssignable,
  deriveIsValid,
  projectRestorationDisciplineStatus,
  scanR7ViolatorCandidates,
} from '@twt/validity-service';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runCloseCycleAlertSweep } from '../src/scheduler/close-cycle-alert.js';
import { runCycleOpenAlert } from '../src/scheduler/cycle-open-alert.js';
import { runRestorationDiscipline } from '../src/restoration-discipline.js';
import { cleanupPoolCohort, seedPoolCohort, type SeededPoolCohort } from './pool-cohort-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 10 confirmed + 1 missed ⇒ `total_count = 10`, `skips_current_year = 1` ⇒ R7(D) applies and R7(C)
 *  (which needs a ≥12-month gap) does not. The one shape that isolates R7(D) cleanly. */
const CONFIRMED_CYCLES = 10;
const TOTAL_CYCLES = 11;

/** R7(D)'s ratified lock-in, from the seed. Asserted against the overlay, not assumed. */
const R7D_LOCK_IN_MONTHS = 3;
const R7D_CLAUSE_ID = 'niy.contribution-discipline.r7-d';

/**
 * ⛔ ALL FIVE ACTIVATED R7 clauses (`R7_ACTIVATED_CLAUSE_IDS`), copied VERBATIM from
 * `packages/domain/seed/niyamavali-v1-clauses.sql` (`policy_review_required` / `provisional` elided —
 * they are registry metadata the ladder does not read).
 *
 * ⚠ ALL FIVE, not a convenient subset. An earlier draft of this gate provisioned only three and
 * hand-wrote R7(D)'s conditions as `skips_current_year >= 1`, dropping the ratified
 * `total_count >= 10`. That fabrication made R7(D) fire on a never-contributed member, and the CONTROL
 * case below is what caught it. A partial or paraphrased registry does not test the ladder — it tests
 * a different ladder that happens to share clause ids.
 *
 * Copied rather than imported so a seed edit that changes a rung's MEANING breaks this gate loudly
 * instead of silently retuning what it proves.
 */
const R7_PAYLOADS: Record<string, Record<string, unknown>> = {
  'niy.contribution-discipline.r7-c': {
    rule_code: 'R7(C)',
    title_en: 'Long-gap restoration (treat as new registration)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 70,
    on_pass: 'treat_as_new_registration',
    on_fail: 'r7_not_applicable',
    all_of: [
      { op: 'member_state_in', states: ['lock-in', 'active', 'active-in-grace', 'lapsed-unpaid'] },
      { op: 'fact_gte', fact: 'contribution.months_since_last', min: 12 },
    ],
    restoration: { consecutive_required: 5, lock_in_months: 3 },
  },
  'niy.contribution-discipline.r7-d': {
    rule_code: 'R7(D)',
    title_en: 'Established member single-skip restoration (3-month lock-in plus catch-up)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 30,
    on_pass: 'lockin_3mo_plus_catchup',
    on_fail: 'r7_not_applicable',
    all_of: [
      { op: 'member_state_in', states: ['lock-in', 'active', 'active-in-grace', 'lapsed-unpaid'] },
      // ⛔ THE CONDITION THE FABRICATED DRAFT DROPPED. R7(D) is the ESTABLISHED-member rung; it
      // cannot reach someone who has never contributed.
      { op: 'fact_gte', fact: 'contribution.total_count', min: 10 },
      { op: 'fact_equals', fact: 'contribution.skips_current_year', value: 1 },
    ],
    restoration: { lock_in_months: R7D_LOCK_IN_MONTHS, catch_up_required: true },
  },
  'niy.contribution-discipline.r7-e': {
    rule_code: 'R7(E)',
    title_en: 'Established member multi-skip restoration (5-month lock-in complete all)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 40,
    on_pass: 'lockin_5mo_complete_all',
    on_fail: 'r7_not_applicable',
    all_of: [
      { op: 'member_state_in', states: ['lock-in', 'active', 'active-in-grace', 'lapsed-unpaid'] },
      { op: 'fact_gte', fact: 'contribution.total_count', min: 10 },
      { op: 'fact_gte', fact: 'contribution.skips_current_year', min: 2 },
    ],
    restoration: { lock_in_months: 5, complete_all: true },
  },
  'niy.contribution-discipline.r7-f': {
    rule_code: 'R7(F)',
    title_en: 'Six-month gap restoration (5-month lock-in complete all)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 45,
    on_pass: 'lockin_5mo_complete_all',
    on_fail: 'r7_not_applicable',
    all_of: [
      { op: 'member_state_in', states: ['lock-in', 'active', 'active-in-grace', 'lapsed-unpaid'] },
      { op: 'fact_gte', fact: 'contribution.months_since_last', min: 6 },
    ],
    restoration: { lock_in_months: 5, complete_all: true },
  },
  'niy.contribution-discipline.r7-g': {
    rule_code: 'R7(G)',
    title_en: 'Personal events do not excuse contribution skips (non-exemption)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 10,
    on_pass: 'no_exemption',
    on_fail: 'r7_not_applicable',
    all_of: [{ op: 'fact_equals', fact: 'contribution.personal_event_excuse_claimed', value: true }],
    // ⚠ `never_excuses` is deliberately NOT a `RESTORATION_OBLIGATION_KEYS` member, so R7(G) is
    // ACTIVATED but imposes nothing (the ratified D4 invariant, Decision `2026-08-06-080`). Included
    // precisely so this gate would catch a change that made it start imposing.
    restoration: { never_excuses: true },
  },
};

const RESTORATION_POLICY_PAYLOAD = {
  rule_code: 'RESTORATION-DISCIPLINE',
  title_en: 'Restoration-discipline lock-in instrument (§3.1 R7 consequence)',
  month_counting: 'calendar_end_of_month_clamped',
  concurrency_rule: 'max_over_live',
};

/**
 * `imposedAt + months`, end-of-month CLAMPED — the JS mirror of Postgres `make_interval`.
 *
 * ⚠ Needed because JS `setUTCMonth` OVERFLOWS where Postgres CLAMPS: 31 Aug + 3 months is 30 Nov in
 * Postgres and 1 Dec in naive JS. They agree on every other day of the month, so a naive helper would
 * make this gate silently wrong on exactly the days AC4 exists for.
 */
function addMonthsClamped(from: Date, months: number): Date {
  const day = from.getUTCDate();
  const target = new Date(from.getTime());
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDayOfTargetMonth));
  return target;
}

describe.skipIf(!hasDatabase)('Story 10.23 — production path into the restoration engine', () => {
  let created: CreatedDb;
  let pool: pg.Pool;
  let cohort: SeededPoolCohort;
  const pariwarId = randomUUID();
  const brandedPariwarId = ids.pariwarId(pariwarId);

  beforeAll(async () => {
    created = createDb(DATABASE_URL!, { ssl: false, max: 8 });
    pool = created.pool;
    cohort = await seedPoolCohort(pool, { scale: 1, n: 1, cycleCount: TOTAL_CYCLES, pariwarId });
  }, 120_000);

  afterAll(async () => {
    if (!pool) return;
    await cleanupPoolCohort(pool, pariwarId);
    const alertIds = cohort?.cycles.map((c) => alertDomain.deriveAlertId(c.cycleId)) ?? [];
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      if (alertIds.length > 0) {
        await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [alertIds]);
        await admin.query('DELETE FROM alerts WHERE alert_id = ANY($1)', [alertIds]);
      }
      await admin.query('DELETE FROM events_log WHERE pariwar_id = $1', [pariwarId]);
      await admin.query('DELETE FROM clause_versions WHERE pariwar_id = $1', [pariwarId]);
      await admin.query('DELETE FROM feature_flag_versions WHERE pariwar_id = $1', [pariwarId]);
      await admin.query('DELETE FROM member_restoration_impositions WHERE pariwar_id = $1', [
        pariwarId,
      ]);
      await admin.query('DELETE FROM contribution_projection_coverage WHERE pariwar_id = $1', [
        pariwarId,
      ]);
      await admin.query('COMMIT');
    } catch (err) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.warn('[10.23-gate] cleanup residue:', String(err));
    } finally {
      admin.release();
    }
    await pool.end();
  }, 60_000);

  /** Provision one clause version for a Pariwar. */
  async function insertClause(
    targetPariwar: string,
    id: string,
    payload: unknown,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO clause_versions (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
       VALUES ($1,$2,$3,1,'2025-01-01T00:00:00Z',$4::jsonb,'pool')`,
      [randomUUID(), id, targetPariwar, JSON.stringify(payload)],
    );
  }

  /** Provision the full activated registry + the instrument policy. */
  async function provisionRegistry(targetPariwar: string): Promise<void> {
    for (const [clauseId, payload] of Object.entries(R7_PAYLOADS)) {
      await insertClause(targetPariwar, clauseId, payload);
    }
    await insertClause(targetPariwar, 'niy.restoration-discipline.policy', RESTORATION_POLICY_PAYLOAD);
  }

  /** Drive one seeded cycle through the REAL spawn saga + the shipped cycle-open worker. */
  async function openCycle(
    targetPariwar: string,
    brandedTarget: ids.PariwarId,
    memberIds: string[],
    cycle: SeededPoolCohort['cycles'][number],
  ): Promise<{ alertId: string; poolId: string }> {
    const plan = await withPariwarScope(pool, targetPariwar, (db) =>
      poolDomain.planCycleSpawn(db, {
        pariwarId: brandedTarget,
        cycleId: ids.cycleFreezeCommitId(cycle.cycleId),
        frozenClaims: cycle.frozenClaims,
      }),
    );
    await withPariwarScope(pool, targetPariwar, (_db, client) =>
      poolDomain.spawnChildPool(
        client,
        plan.children[0]!,
        poolDomain.createPoolAssignmentSeam(),
        memberIds,
        true,
      ),
    );
    await withPariwarScope(pool, targetPariwar, (_db, client) =>
      poolDomain.finalizeCycleIfComplete(client, {
        pariwarId: brandedTarget,
        cycleId: ids.cycleFreezeCommitId(cycle.cycleId),
        poolCount: 1,
      }),
    );
    const opened = await runCycleOpenAlert(
      { pool },
      {
        requestId: `gate:${cycle.cycleId}`,
        pariwarId: targetPariwar,
        actorId: null,
        traceId: `gate:${cycle.cycleId}`,
        payload: { cycleId: cycle.cycleId },
      },
    );
    expect(opened.state).toBe('live');
    const { rows } = await pool.query<{ pool_id: string }>(
      'SELECT pool_id FROM pools WHERE cycle_id = $1',
      [cycle.cycleId],
    );
    return { alertId: opened.alertId, poolId: rows[0]!.pool_id };
  }

  it('⭐ carries a production-produced skip all the way to a coverage-removing lock-in, and to the fold', async () => {
    const memberId = cohort.memberIds[0]!;

    // ── (1) 11 real cycles opened; the member CONFIRMS on the first 10, misses the 11th ───────────
    for (let i = 0; i < TOTAL_CYCLES; i += 1) {
      const { alertId, poolId } = await openCycle(
        pariwarId,
        brandedPariwarId,
        cohort.memberIds,
        cohort.cycles[i]!,
      );
      if (i >= CONFIRMED_CYCLES) continue;
      await withPariwarScope(pool, pariwarId, (_db, client) =>
        reconciliation.appendConfirmedContribution(client, {
          pariwarId: brandedPariwarId,
          alertId: ids.alertId(alertId),
          payload: {
            poolId,
            memberId,
            alertId,
            utr: String(100000000000 + i),
            confirmedAt: new Date(cohort.committedAt.getTime() + i * MS_PER_DAY).toISOString(),
            matchProvenance: {
              bankStatementEntryId: randomUUID(),
              idempotencyKey: `gate-${i}`,
              matcherRun: `gate-run-${i}`,
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

    // ⛔ The load-bearing distinction from the pre-existing fixtures: these rows went through the
    // PROJECTOR. A fixture inserting `'{}'::jsonb` below it is why the alert-state gate never caught
    // the original gap.
    const { rows: closedEvents } = await pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM events_log
        WHERE pariwar_id = $1 AND event_type = 'alert.closed' AND payload <> '{}'::jsonb`,
      [pariwarId],
    );
    expect(Number(closedEvents[0]!.n)).toBe(TOTAL_CYCLES);

    // ── (3) The production precondition: the contribution-projection backfill ─────────────────────
    await withPariwarScope(pool, pariwarId, (db) =>
      contribution.backfillContributionProjections(db, brandedPariwarId),
    );

    // ── (4) Contribution facts, from production-produced closures ────────────────────────────────
    const factInputs = await withPariwarScope(pool, pariwarId, (db) =>
      contribution.readContributionFactInputs(
        db,
        { pariwarId: brandedPariwarId, memberId: ids.memberId(memberId) },
        new Date(),
      ),
    );
    expect(factInputs.coveredFrom).not.toBeNull();
    expect(factInputs.totalCount).toBe(CONFIRMED_CYCLES);
    // ⛔ THE HOP 8.14's GATE STOPS AT. Everything below is what this file adds.
    expect(factInputs.skipsCurrentYear).toBe(1);

    await provisionRegistry(pariwarId);

    // ── (5) The R7 ladder — R7(D) applies, and it is the ONLY imposing clause ────────────────────
    const scan = await withPariwarScope(pool, pariwarId, (db) =>
      scanR7ViolatorCandidates(db, brandedPariwarId, new Date()),
    );
    expect(scan.status).toBe('available');
    if (scan.status !== 'available') throw new Error('unreachable — narrowed above');

    const candidate = scan.candidates.find((c) => c.memberId === memberId);
    expect(candidate).toBeDefined();
    expect(candidate!.impositionInputs.imposingClauses.map((c) => c.clauseId)).toEqual([
      R7D_CLAUSE_ID,
    ]);

    // ── (6) ⛔ THE PRODUCTION POSTURE: flag ABSENT ⇒ default-OFF ⇒ nothing written (AC14) ─────────
    const offRun = await runRestorationDiscipline({ pool, clock: () => new Date() }, pariwarId);
    expect(offRun.writerEnabled).toBe(false);
    expect(offRun.impositionsWritten).toBe(0);
    // The new third sentinel stays silent: coverage IS present, so `null` here is EARNED.
    expect(offRun.unavailable).toBeNull();

    const { rows: noRows } = await pool.query<{ n: string }>(
      'SELECT count(*) AS n FROM member_restoration_impositions WHERE pariwar_id = $1',
      [pariwarId],
    );
    expect(Number(noRows[0]!.n)).toBe(0);

    // ── (7) TEST FIXTURE ONLY — see the banner at the top of this file ───────────────────────────
    // `off → full` is rejected; the ladder is walked one legal step at a time.
    for (const state of ['canary', 'rollout', 'full'] as const) {
      await withPariwarScope(pool, pariwarId, (db) =>
        featureFlags.createFlagVersion(db, {
          flagKey: 'restoration_discipline_imposition',
          pariwarId: brandedPariwarId,
          state,
          cohortDefinition: { clauses: [] },
          fallbackDefault: false,
          owner: 'test-fixture',
          deadBy: new Date(Date.now() + 90 * MS_PER_DAY),
          rationale: 'test fixture: Story 10.23 production-path gate',
          actorWhoFlipped: null,
          actorDisplay: null,
          auditId: null,
        }),
      );
    }
    // ⚠ 5 s in-process TTL — step (6) warmed the cache with the code default. Without this the
    // post-flip run still resolves `state_off`, which is exactly the trap Finding 2 recorded.
    featureFlags.clearFlagCache();

    const decision = await withPariwarScope(pool, pariwarId, (db) =>
      featureFlags.resolveFlagAudited(
        db,
        'restoration_discipline_imposition',
        brandedPariwarId,
        { pariwarId },
        new Date(),
        false,
      ),
    );
    expect(decision.enabled).toBe(true);
    // At `full` the cohort is IGNORED — the empty cohort above would serve nobody at canary/rollout
    // (Decision `2026-08-09-094`).
    expect(decision.reason).toBe('state_full');

    const onRun = await runRestorationDiscipline({ pool, clock: () => new Date() }, pariwarId);
    expect(onRun.writerEnabled).toBe(true);
    expect(onRun.unavailable).toBeNull();
    expect(onRun.impositionsWritten).toBe(1);

    // ── (8) The record — BOTH version pins carried (FR-8) ────────────────────────────────────────
    const { rows: lockIns } = await pool.query<{
      member_id: string;
      clause_id: string;
      clause_version_id: string | null;
      policy_clause_version_id: string | null;
      lock_in_months: number;
      concurrency_rule: string;
      imposed_at: string | Date;
      expires_at: string | Date;
    }>('SELECT * FROM member_restoration_impositions WHERE pariwar_id = $1', [pariwarId]);

    expect(lockIns).toHaveLength(1);
    const row = lockIns[0]!;
    expect(row.member_id).toBe(memberId);
    expect(row.clause_id).toBe(R7D_CLAUSE_ID);
    // ⛔ Both pins non-null: the clause AND the instrument policy in force at imposition time. A
    // lock-in that cannot name the versions it was imposed under is unauditable after an amendment.
    expect(row.clause_version_id).not.toBeNull();
    expect(row.policy_clause_version_id).not.toBeNull();
    expect(Number(row.lock_in_months)).toBe(R7D_LOCK_IN_MONTHS);
    expect(row.concurrency_rule).toBe('max_over_live');

    // AC4 — the calendar identity, asserted against the ACTUAL imposed instant.
    // ⚠ `imposed_at` is Postgres `clock_timestamp()`, NOT the injected clock (deliberately, so
    // members imposed in one run get distinct instants), so an absolute expiry date is not
    // assertable here. The IDENTITY is, on every run. The end-of-month clamp EDGE belongs to the
    // dedicated AC4 unit tests; this asserts the production path agrees with them.
    const imposedAt = new Date(row.imposed_at);
    const expiresAt = new Date(row.expires_at);
    expect(expiresAt.toISOString()).toBe(
      addMonthsClamped(imposedAt, R7D_LOCK_IN_MONTHS).toISOString(),
    );

    // ── (9) THE PAYLOAD FOLD — coverage removed, roster UNTOUCHED (AC6) ──────────────────────────
    // Read through the SAME production reader `getValidityAt` uses, then run the shipped pure fold.
    const overlay = await withPariwarScope(pool, pariwarId, (db) =>
      member.restorationDiscipline.getMemberRestorationDiscipline(
        db,
        ids.memberId(memberId),
        new Date(),
      ),
    );
    expect(overlay.state).toBe('in-lock-in');
    expect(overlay.impositions).toHaveLength(1);

    const status = projectRestorationDisciplineStatus(overlay);
    expect(status.state).toBe('in-lock-in');

    // ⛔ THE AC6 DIVERGENCE, on production-produced data: coverage is removed, assignability is NOT.
    // `deriveIsAssignable` takes no restoration parameter AT ALL — the roster cannot be affected by a
    // lock-in BY SIGNATURE, not by a branch someone could later add.
    expect(deriveIsValid('active', 'none', overlay.state)).toBe(false);
    expect(deriveIsAssignable('active', 'none')).toBe(true);
  }, 300_000);

  it('CONTROL — a never-contributed member reaches skips=1 but draws NO imposition (R7(B) is HELD)', async () => {
    // A fresh Pariwar so the first test's confirmations cannot contaminate this one.
    const p2 = randomUUID();
    const branded2 = ids.pariwarId(p2);
    const c2 = await seedPoolCohort(pool, { scale: 1, n: 1, cycleCount: 1, pariwarId: p2 });
    try {
      const memberId = c2.memberIds[0]!;
      await openCycle(p2, branded2, c2.memberIds, c2.cycles[0]!);
      await runCloseCycleAlertSweep({
        pool,
        now: () => new Date(c2.committedAt.getTime() + (CYCLE_WINDOW_DAYS + 1) * MS_PER_DAY),
      });
      await withPariwarScope(pool, p2, (db) =>
        contribution.backfillContributionProjections(db, branded2),
      );
      await provisionRegistry(p2);

      const facts = await withPariwarScope(pool, p2, (db) =>
        contribution.readContributionFactInputs(
          db,
          { pariwarId: branded2, memberId: ids.memberId(memberId) },
          new Date(),
        ),
      );
      // Facts are fully available and the member genuinely missed their only assigned cycle.
      expect(facts.coveredFrom).not.toBeNull();
      expect(facts.totalCount).toBe(0);
      expect(facts.skipsCurrentYear).toBe(1);

      const scan = await withPariwarScope(pool, p2, (db) =>
        scanR7ViolatorCandidates(db, branded2, new Date()),
      );
      expect(scan.status).toBe('available');
      if (scan.status !== 'available') throw new Error('unreachable — narrowed above');

      const candidate = scan.candidates.find((c) => c.memberId === memberId);
      expect(candidate).toBeDefined();

      // ⭐ THE POINT OF THIS CASE. Every FACT blocker is satisfied — this member's clause is R7(B)
      // (`ever_contributed == false`), whose payload WOULD impose. It draws nothing because R7(B) is
      // HELD on a NON-fact blocker no producer can supply: the Trustee Panel's unpublished Part 11
      // amendment (AC8/AC9; `R7_HELD_CLAUSES`). This asserts the hold is real on the production path.
      //
      // ⛔ AND it is the fixture guard. Every ACTIVATED rung is excluded here for a REASON that lives
      // in the ratified payload, so a paraphrased registry shows up as a spurious imposition:
      //   · R7(D)/R7(E) — gated on `total_count >= 10`; this member has 0
      //   · R7(C)/R7(F) — gated on `months_since_last`, which a never-contributed member has none of
      //   · R7(G)       — applies only on an asserted personal event, and imposes nothing regardless
      // This is exactly how the fabricated R7(D) in an earlier draft of this file was caught.
      //
      // ⚠ If this ever goes RED with a non-empty list, either the fixture drifted from the seed or
      // R7(B) has been activated — the latter is a GOVERNANCE act, not a test fix. Do not "repair"
      // this expectation; diff the payloads against the seed, then check the Decision log.
      expect(candidate!.impositionInputs.imposingClauses).toEqual([]);
      const run = await runRestorationDiscipline({ pool, clock: () => new Date() }, p2);
      expect(run.impositionsWritten).toBe(0);
      expect(run.unavailable).toBeNull();
    } finally {
      await cleanupPoolCohort(pool, p2);
      const admin = await pool.connect();
      try {
        await admin.query('BEGIN');
        await admin.query("SET LOCAL session_replication_role = 'replica'");
        await admin.query('DELETE FROM events_log WHERE pariwar_id = $1', [p2]);
        await admin.query('DELETE FROM clause_versions WHERE pariwar_id = $1', [p2]);
        await admin.query('DELETE FROM contribution_projection_coverage WHERE pariwar_id = $1', [p2]);
        await admin.query('COMMIT');
      } catch {
        await admin.query('ROLLBACK').catch(() => undefined);
      } finally {
        admin.release();
      }
    }
  }, 300_000);
});
