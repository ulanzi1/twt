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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

/** Databases this gate may write to. CI's ephemeral `postgres:16-alpine` service and the local
 *  `twt-test-pg` container both use `twt_dev`; staging/prod carry different names. See GUARD 1. */
const DISPOSABLE_DATABASES = ['twt_dev'];

/** Session `TimeZone` values under which the AC4 expiry identity holds. See GUARD 2. */
const UTC_SESSION_TIMEZONES = ['UTC', 'Etc/UTC', 'GMT', 'Etc/GMT'];

/** 10 confirmed + 1 missed ⇒ `total_count = 10`, `skips_current_year = 1` ⇒ R7(D) applies and R7(C)
 *  (which needs a ≥12-month gap) does not. The one shape that isolates R7(D) cleanly. */
const CONFIRMED_CYCLES = 10;
const TOTAL_CYCLES = 11;

/** R7(D)'s ratified lock-in, from the seed. Asserted against the overlay, not assumed. */
const R7D_LOCK_IN_MONTHS = 3;
const R7D_CLAUSE_ID = 'niy.contribution-discipline.r7-d';

/** The seed that IS the registry's source of truth. Payloads are DERIVED from it, never restated. */
const SEED_SQL_PATH = fileURLToPath(
  new URL('../../../packages/domain/seed/niyamavali-v1-clauses.sql', import.meta.url),
);

/**
 * ⛔ THE ACTIVATED REGISTRY, DERIVED FROM THE SEED — never hand-copied.
 *
 * ⚠ An earlier draft of this gate RESTATED these payloads as TS literals, with a comment claiming
 * that a seed edit would "break this gate loudly". That claim was false and backwards: the gate never
 * read the seed, so a drifted fixture stayed green forever. It was caught by mutation — changing the
 * restated `total_count >= 10` to `>= 1` passed both tests — after an earlier fabrication of the same
 * payload had already made R7(D) fire on a never-contributed member.
 *
 * Deriving is what makes the claim true. The ladder is now exercised against the SAME bytes production
 * seeds, and a rung whose meaning changes moves this gate's expectations with it — loudly, because the
 * assertions below name the OUTCOME (which clause imposes, on which member) rather than the payload.
 */
function extractSeedPayloads(): {
  r7: Record<string, Record<string, unknown>>;
  policy: Record<string, unknown>;
} {
  const sql = readFileSync(SEED_SQL_PATH, 'utf8');
  // The seed writes each payload as a single-quoted JSON literal cast to jsonb. Verified to contain
  // no escaped (doubled) single quotes, so a non-greedy scan to `'::jsonb` is exact — asserted below
  // by requiring the full activated set, so a seed reformat FAILS rather than silently under-matching.
  const literals = [...sql.matchAll(/'(\{"rule_code":"(?:R7\([CDEFG]\)|RESTORATION-DISCIPLINE)".*?)'::jsonb/g)];

  const r7: Record<string, Record<string, unknown>> = {};
  let policy: Record<string, unknown> | null = null;
  const byRuleCode = new Map<string, Record<string, unknown>>();

  for (const [, raw] of literals) {
    const parsed = JSON.parse(raw!) as Record<string, unknown>;
    const ruleCode = String(parsed['rule_code']);
    if (byRuleCode.has(ruleCode)) continue; // the seed repeats the policy clause per environment
    byRuleCode.set(ruleCode, parsed);
    if (ruleCode === 'RESTORATION-DISCIPLINE') {
      policy = parsed;
      continue;
    }
    const letter = ruleCode.slice(3, 4).toLowerCase();
    r7[`niy.contribution-discipline.r7-${letter}`] = parsed;
  }

  // ⛔ The extraction guards ITSELF. A seed reformat that breaks the scan must fail here rather than
  // quietly provisioning a partial registry — a partial ladder is a DIFFERENT ladder sharing ids.
  const expected = ['R7(C)', 'R7(D)', 'R7(E)', 'R7(F)', 'R7(G)'];
  const missing = expected.filter((c) => !byRuleCode.has(c));
  if (missing.length > 0) {
    throw new Error(
      `[10.23-gate] seed extraction found ${String(byRuleCode.size)} clauses; missing ${missing.join(', ')}. ` +
        `The seed format changed — fix the extraction, do NOT restate the payloads inline.`,
    );
  }
  if (policy === null) throw new Error('[10.23-gate] seed extraction found no RESTORATION-DISCIPLINE policy clause');
  return { r7, policy };
}

const { r7: R7_PAYLOADS, policy: RESTORATION_POLICY_PAYLOAD } = extractSeedPayloads();

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

    // ── ⛔ GUARD 1: refuse to run against anything but a disposable database ──────────────────────
    // Most live tests write ordinary fixture rows. THIS one writes coverage-removing lock-ins and
    // appends versions of a Trustee-Panel-controlled flag to an APPEND-ONLY table. `DATABASE_URL`
    // being set is not evidence that the target is disposable, so the target is checked by name.
    // ⚠ Both CI (`ci.yml`'s ephemeral `postgres:16-alpine` service) and the local `twt-test-pg`
    // container use `twt_dev`; staging/prod carry different names, so this excludes them. Fails
    // CLOSED — an unrecognised database aborts rather than being assumed safe.
    const { rows: dbRows } = await pool.query<{ db: string; tz: string }>(
      'SELECT current_database() AS db, current_setting($1) AS tz',
      ['TimeZone'],
    );
    const dbName = dbRows[0]!.db;
    const override = process.env['TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS'] === '1';
    if (!DISPOSABLE_DATABASES.includes(dbName) && !override) {
      throw new Error(
        `[10.23-gate] REFUSING TO RUN against database '${dbName}'. This gate writes restoration ` +
          `lock-ins and appends '${'restoration_discipline_imposition'}' flag versions to an ` +
          `append-only table. Expected one of: ${DISPOSABLE_DATABASES.join(', ')}. If this database ` +
          `really is disposable, set TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS=1.`,
      );
    }

    // ── ⛔ GUARD 2: the AC4 expiry identity requires a UTC session ────────────────────────────────
    // `expires_at` is computed as `imposed_at + make_interval(months => N)`, and Postgres adds
    // MONTHS IN THE SESSION TIME ZONE, while `addMonthsClamped` is UTC-based. They agree under UTC
    // and under any zone without DST, but diverge by an hour when a 3-month window crosses a DST
    // transition — which would make the expiry assertion fail a few weeks a year, on a schedule
    // nobody would connect to timezones. Asserted as an explicit PRECONDITION so that divergence is
    // a loud, self-explaining failure at setup rather than a seasonal flake in the assertion.
    const sessionTz = dbRows[0]!.tz;
    if (!UTC_SESSION_TIMEZONES.includes(sessionTz)) {
      throw new Error(
        `[10.23-gate] session TimeZone is '${sessionTz}'; this gate's AC4 expiry identity assumes UTC ` +
          `because Postgres adds months in the session zone while the JS mirror is UTC-based. Set it ` +
          `on the CONNECTION — append '&options=-c%20timezone%3DUTC' to DATABASE_URL, or fix the ` +
          `server default. ⚠ PGTZ does NOT work: node-postgres does not forward it. Alternatively, ` +
          `make addMonthsClamped zone-aware.`,
      );
    }

    cohort = await seedPoolCohort(pool, { scale: 1, n: 1, cycleCount: TOTAL_CYCLES, pariwarId });
  }, 120_000);

  afterAll(async () => {
    if (!pool) return;
    // ⛔ Cleanup failures are RAISED, not warned. An earlier draft swallowed them into a
    // `console.warn`, which is the wrong trade for this file: cleanup bypasses the append-only
    // triggers via `session_replication_role = 'replica'`, so where that is unavailable the deletes
    // fail and leave a `full`-state flag version and live imposition rows behind — silently, in a
    // SHARED test database, to be inherited by whatever runs next. A red teardown is recoverable;
    // undetected residue on a coverage-removing writer is not.
    let cleanupError: unknown = null;
    try {
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

        // Verify rather than trust: a DELETE that silently matched nothing is indistinguishable
        // from one that was blocked, and both leave the same residue.
        const { rows: residue } = await admin.query<{ table_name: string; n: string }>(
          `SELECT 'feature_flag_versions' AS table_name, count(*)::text AS n
             FROM feature_flag_versions WHERE pariwar_id = $1
           UNION ALL
           SELECT 'member_restoration_impositions', count(*)::text
             FROM member_restoration_impositions WHERE pariwar_id = $1`,
          [pariwarId],
        );
        const left = residue.filter((r) => Number(r.n) > 0);
        if (left.length > 0) {
          throw new Error(
            `residue survived cleanup: ${left.map((r) => `${r.table_name}=${r.n}`).join(', ')}`,
          );
        }
      } catch (err) {
        await admin.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        admin.release();
      }
    } catch (err) {
      cleanupError = err;
    } finally {
      // The pool closes on EVERY path — otherwise a cleanup failure also hangs the run.
      await pool.end().catch(() => undefined);
    }
    if (cleanupError !== null) {
      throw new Error(`[10.23-gate] CLEANUP FAILED for Pariwar ${pariwarId}: ${String(cleanupError)}`);
    }
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
    //
    // ⚠ SCHEMA-VALID, not merely non-empty — matching the standard 8.14's sibling gate already set
    // (`close-cycle-alert-live.test.ts` asserts `AlertClosedPayloadSchema.safeParse(...).success`).
    // An earlier draft here asserted only `payload <> '{}'::jsonb`, which any non-empty fixture would
    // satisfy. Two gates on the same event type must not hold it to two different standards: the
    // weaker one becomes the one a future fixture is written against.
    const { rows: closedEvents } = await pool.query<{ payload: unknown }>(
      `SELECT payload FROM events_log WHERE pariwar_id = $1 AND event_type = 'alert.closed'`,
      [pariwarId],
    );
    expect(closedEvents).toHaveLength(TOTAL_CYCLES);
    for (const evt of closedEvents) {
      expect(alertDomain.AlertClosedPayloadSchema.safeParse(evt.payload).success).toBe(true);
    }

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

    // ⛔ RESOLVE AGAINST THE DATABASE CLOCK, NOT THE CLIENT'S. `createFlagVersion` stamps
    // `effective_from` from the DB, so resolving at a client-side `new Date()` races it: under any
    // clock skew the newest version is "not yet in force" and resolution silently falls back to the
    // prior one (`rollout` + empty cohort ⇒ DISABLED). That produced an INTERMITTENT
    // `expect(decision.enabled).toBe(true)` failure — a flake that looks exactly like the
    // stale-cache trap but has a different cause, which is the worst kind to debug.
    const { rows: nowRows } = await pool.query<{ now: Date | string }>('SELECT now() AS now');
    const afterFlip = new Date(new Date(nowRows[0]!.now).getTime() + 1000);

    const decision = await withPariwarScope(pool, pariwarId, (db) =>
      featureFlags.resolveFlagAudited(
        db,
        'restoration_discipline_imposition',
        brandedPariwarId,
        { pariwarId },
        afterFlip,
        false,
      ),
    );
    expect(decision.enabled).toBe(true);
    // At `full` the cohort is IGNORED — the empty cohort above would serve nobody at canary/rollout
    // (Decision `2026-08-09-094`).
    expect(decision.reason).toBe('state_full');

    // Same DB-derived instant, for the same reason — the job resolves the flag itself.
    const onRun = await runRestorationDiscipline({ pool, clock: () => afterFlip }, pariwarId);
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

    // ── The fold's INPUTS, read from the database rather than assumed ────────────────────────────
    // ⚠ An earlier draft passed the literals `('active', 'none')` into both fold calls. That made
    // `deriveIsAssignable('active','none')` a CONSTANT EXPRESSION — it would have passed with no
    // imposition, no member and no database, so the "divergence on production-produced data" claim
    // was half tautology. Both inputs are now real, and both assertions move if the member does.
    const states = await withPariwarScope(pool, pariwarId, (db) =>
      member.listMemberStatesForPariwar(db, brandedPariwarId),
    );
    const liveState = states.find((s) => String(s.memberId) === memberId)?.state;
    expect(liveState).toBeDefined();

    // Moderation status is DERIVED from `member_moderation_actions`, so 'none' is VERIFIED here
    // rather than assumed — otherwise a moderation action appearing in the fixture would silently
    // change which property this assertion is testing.
    const { rows: modActions } = await pool.query<{ n: string }>(
      'SELECT count(*) AS n FROM member_moderation_actions WHERE member_id = $1',
      [memberId],
    );
    expect(Number(modActions[0]!.n)).toBe(0);
    const liveModeration = 'none' as const;

    // ⛔ THE AC6 DIVERGENCE, on production-produced data: SAME member, SAME lifecycle state, SAME
    // moderation status — coverage is removed, assignability is NOT. The only differing input is the
    // restoration overlay, which `deriveIsAssignable` does not accept AT ALL: the roster cannot be
    // affected by a lock-in BY SIGNATURE, not by a branch someone could later add.
    expect(deriveIsValid(liveState!, liveModeration, overlay.state)).toBe(false);
    expect(deriveIsAssignable(liveState!, liveModeration)).toBe(true);
  }, 300_000);

  it('BOUNDARY — total_count 9 with skips=1 draws NOTHING; 10 is the ratified threshold', async () => {
    // ⛔ WHY THIS EXISTS. The CONTROL case below has `total_count = 0` — ten units from R7(D)'s
    // `total_count >= 10`. It therefore does NOT test the boundary: mutating the threshold to `>= 1`
    // left it green (proven by mutation during review), because 0 fails that too. Only a change to
    // `>= 0` would have been caught.
    //
    // This case sits ONE below the threshold with every other R7(D) condition satisfied, so together
    // with the main test (`total_count = 10` ⇒ imposes) it pins the boundary from both sides. A
    // regression loosening the threshold by even one turns this RED.
    const pb = randomUUID();
    const brandedB = ids.pariwarId(pb);
    const BOUNDARY_TOTAL = 9;
    const boundaryCycles = BOUNDARY_TOTAL + 1; // 9 confirmed + 1 missed ⇒ skips_current_year = 1
    const cb = await seedPoolCohort(pool, {
      scale: 1,
      n: 1,
      cycleCount: boundaryCycles,
      pariwarId: pb,
    });
    try {
      const memberId = cb.memberIds[0]!;
      for (let i = 0; i < boundaryCycles; i += 1) {
        const { alertId, poolId } = await openCycle(pb, brandedB, cb.memberIds, cb.cycles[i]!);
        if (i >= BOUNDARY_TOTAL) continue;
        await withPariwarScope(pool, pb, (_db, client) =>
          reconciliation.appendConfirmedContribution(client, {
            pariwarId: brandedB,
            alertId: ids.alertId(alertId),
            payload: {
              poolId,
              memberId,
              alertId,
              utr: String(200000000000 + i),
              confirmedAt: new Date(cb.committedAt.getTime() + i * MS_PER_DAY).toISOString(),
              matchProvenance: {
                bankStatementEntryId: randomUUID(),
                idempotencyKey: `boundary-${i}`,
                matcherRun: `boundary-run-${i}`,
                senderVpaCheck: { available: false, reason: 'member_vpa_not_collected' },
              },
            },
          }),
        );
      }
      await runCloseCycleAlertSweep({
        pool,
        now: () => new Date(cb.committedAt.getTime() + (CYCLE_WINDOW_DAYS + 1) * MS_PER_DAY),
      });
      await withPariwarScope(pool, pb, (db) =>
        contribution.backfillContributionProjections(db, brandedB),
      );
      await provisionRegistry(pb);

      const facts = await withPariwarScope(pool, pb, (db) =>
        contribution.readContributionFactInputs(
          db,
          { pariwarId: brandedB, memberId: ids.memberId(memberId) },
          new Date(),
        ),
      );
      // ⛔ Exactly ONE below the threshold, with R7(D)'s other conditions satisfied.
      expect(facts.totalCount).toBe(BOUNDARY_TOTAL);
      expect(facts.skipsCurrentYear).toBe(1);

      const scan = await withPariwarScope(pool, pb, (db) =>
        scanR7ViolatorCandidates(db, brandedB, new Date()),
      );
      expect(scan.status).toBe('available');
      if (scan.status !== 'available') throw new Error('unreachable — narrowed above');
      const candidate = scan.candidates.find((c) => c.memberId === memberId);
      expect(candidate).toBeDefined();
      expect(candidate!.impositionInputs.imposingClauses).toEqual([]);

      const run = await runRestorationDiscipline({ pool, clock: () => new Date() }, pb);
      expect(run.impositionsWritten).toBe(0);
      expect(run.unavailable).toBeNull();
    } finally {
      await cleanupPoolCohort(pool, pb);
      const admin = await pool.connect();
      try {
        await admin.query('BEGIN');
        await admin.query("SET LOCAL session_replication_role = 'replica'");
        await admin.query('DELETE FROM events_log WHERE pariwar_id = $1', [pb]);
        await admin.query('DELETE FROM clause_versions WHERE pariwar_id = $1', [pb]);
        await admin.query('DELETE FROM contribution_projection_coverage WHERE pariwar_id = $1', [pb]);
        await admin.query('COMMIT');
      } catch {
        await admin.query('ROLLBACK').catch(() => undefined);
      } finally {
        admin.release();
      }
    }
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
