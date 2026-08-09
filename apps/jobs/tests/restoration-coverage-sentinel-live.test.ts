// ⭐ THE GATE for the projection-coverage sentinel — Decision `2026-08-09-093` clause 1. Live DB (:5433).
//
// ── Why this file exists ────────────────────────────────────────────────────────────────────────────
// The Trustee Panel ratified a third `unavailable` producer as a PRECONDITION of the AC14 flag flip:
// "shipped and pinned by a test, before the enabling Decision is authored". This is that pin.
//
// The gap it closes: `deriveContributionFacts` returns `null` when a Pariwar has no
// `contribution_projection_coverage` row, so EVERY member degrades to `producer_unavailable` and NO
// clause can apply — yet `runRestorationDiscipline` reported `{ unavailable: null, impositionsWritten:
// 0 }`, which is BYTE-IDENTICAL to a genuinely clean Pariwar. After a flip, `unavailable` is the field
// an operator reads to confirm the writer did nothing FOR THE RIGHT REASON.
//
// ── ⛔ WHY THE GATE WALKS THREE STATES INSTEAD OF ASSERTING THE SENTINEL ONCE ────────────────────────
// A test that only asserts "coverage absent ⇒ coverage sentinel" is satisfied by an implementation
// that returns that sentinel UNCONDITIONALLY — it would pass against a job that has gone permanently
// blind, a strictly worse failure than the one being fixed. So the fixture changes ONE thing at a time
// and the sentinel must MOVE, predictably, each time:
//
//   (1) no coverage, no policy   → the COVERAGE sentinel  (also pins the documented precedence)
//   (2) coverage, no policy      → the POLICY sentinel    (proves the coverage check actually released)
//   (3) coverage, policy         → `null`                 (proves no residual sentinel is left behind)
//
// Step (2) is the load-bearing one. Step (1) alone proves nothing a hard-coded return would not also
// satisfy ([[feedback_gate_scope_semantic_coverage]]).
//
// ⚠ Step (1) doubles as the precedence pin. BOTH gaps are true there, and `unavailable` reports one
// producer — the job names coverage first, deliberately: with no facts the scan's candidate list
// carries no information, so naming the policy gap would send an operator to publish an instrument
// that still could not fire.
//
// ⚠ The writer is never enabled here. The AC14 flag stays default-OFF, which is the correct posture
// for this gate: the sentinel is diagnostic and must be reported on the read-only path too — that is
// precisely the state an operator inspects BEFORE authorizing a flip.

import { randomUUID } from 'node:crypto';

import { contribution, createDb, ids, withPariwarScope, type CreatedDb } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  CONTRIBUTION_COVERAGE_UNPROJECTED_PRODUCER,
  RESTORATION_POLICY_UNPROVISIONED_PRODUCER,
  runRestorationDiscipline,
} from '../src/restoration-discipline.js';
import { cleanupPoolCohort, seedPoolCohort, type SeededPoolCohort } from './pool-cohort-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

/** The ACTIVATED R7 clause the registry must carry for the scan to reach the coverage check at all.
 *  Copied from `packages/domain/seed/niyamavali-v1-clauses.sql`; with no R7 clause resolving, the scan
 *  returns the REGISTRY sentinel — a third producer that would mask everything this gate pins. */
const R7_D_PAYLOAD = {
  rule_code: 'R7(D)',
  title_en: 'Short-gap restoration',
  rule_kind: 'conditional',
  family: 'r7-contribution-discipline',
  precedence: 40,
  on_pass: 'restore_short_gap',
  on_fail: 'r7_not_applicable',
  all_of: [
    { op: 'member_state_in', states: ['lock-in', 'active', 'active-in-grace', 'lapsed-unpaid'] },
    { op: 'fact_gte', fact: 'contribution.skips_current_year', min: 1 },
  ],
  restoration: { consecutive_required: 3, lock_in_months: 3 },
};

const RESTORATION_POLICY_PAYLOAD = {
  rule_code: 'RESTORATION-DISCIPLINE',
  title_en: 'Restoration-discipline lock-in instrument (§3.1 R7 consequence)',
  month_counting: 'calendar_end_of_month_clamped',
  concurrency_rule: 'max_over_live',
};

describe.skipIf(!hasDatabase)('restoration discipline — projection-coverage sentinel', () => {
  let created: CreatedDb;
  let pool: pg.Pool;
  let cohort: SeededPoolCohort;
  const pariwarId = randomUUID();
  const brandedPariwarId = ids.pariwarId(pariwarId);
  const clock = (): Date => new Date('2026-08-09T00:00:00.000Z');

  async function insertClause(id: string, payload: unknown): Promise<void> {
    await pool.query(
      `INSERT INTO clause_versions (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
       VALUES ($1,$2,$3,1,'2025-01-01T00:00:00Z',$4::jsonb,'pool')`,
      [randomUUID(), id, pariwarId, JSON.stringify(payload)],
    );
  }

  beforeAll(async () => {
    created = createDb(DATABASE_URL!, { ssl: false, max: 4 });
    pool = created.pool;
    cohort = await seedPoolCohort(pool, { scale: 1, n: 1, cycleCount: 1, pariwarId });
    void cohort;
    // The R7 registry only — the instrument policy is deliberately left UNPROVISIONED so step (1)
    // has both gaps open and can pin which one is named.
    await insertClause('niy.contribution-discipline.r7-d', R7_D_PAYLOAD);
  }, 120_000);

  afterAll(async () => {
    if (!pool) return;
    await cleanupPoolCohort(pool, pariwarId);
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM events_log WHERE pariwar_id = $1', [pariwarId]);
      await admin.query('DELETE FROM clause_versions WHERE pariwar_id = $1', [pariwarId]);
      await admin.query('DELETE FROM contribution_projection_coverage WHERE pariwar_id = $1', [
        pariwarId,
      ]);
      await admin.query('COMMIT');
    } catch (err) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.warn('[coverage-sentinel] cleanup residue:', String(err));
    } finally {
      admin.release();
    }
    await pool.end();
  }, 60_000);

  it('names the coverage gap, releases it once projected, and goes quiet when fully provisioned', async () => {
    // ── (1) NO COVERAGE, NO POLICY — both gaps open; coverage is the one named ────────────────────
    const unprojected = await runRestorationDiscipline({ pool, clock }, pariwarId);

    expect(unprojected.unavailable).toBe(CONTRIBUTION_COVERAGE_UNPROJECTED_PRODUCER);
    expect(unprojected.impositionsWritten).toBe(0);
    // ⛔ A run that names a gap must never also have written. The sentinel is not a substitute for
    // the AC14 gate, and the flag is absent here, so the writer is off on the real path.
    expect(unprojected.writerEnabled).toBe(false);
    // The members WERE enumerated; none was derivable. Honest, and unambiguous only because
    // `unavailable` above is non-null — that pairing is the whole point of this gate.
    expect(unprojected.membersScanned).toBeGreaterThan(0);

    // ── (2) Build coverage through the REAL production path, not an INSERT ────────────────────────
    await withPariwarScope(pool, pariwarId, (db) =>
      contribution.backfillContributionProjections(db, brandedPariwarId),
    );

    // ⛔ THE DISCRIMINATING ASSERTION. One thing changed. If the coverage sentinel persisted here,
    // the job would be permanently blind and step (1) would prove nothing.
    const projected = await runRestorationDiscipline({ pool, clock }, pariwarId);

    expect(projected.unavailable).toBe(RESTORATION_POLICY_UNPROVISIONED_PRODUCER);
    expect(projected.membersScanned).toBe(unprojected.membersScanned);
    expect(projected.impositionsWritten).toBe(0);

    // ── (3) Provision the instrument policy — no gap left, so no sentinel ─────────────────────────
    await insertClause('niy.restoration-discipline.policy', RESTORATION_POLICY_PAYLOAD);

    const provisioned = await runRestorationDiscipline({ pool, clock }, pariwarId);

    expect(provisioned.unavailable).toBeNull();
    expect(provisioned.membersScanned).toBe(unprojected.membersScanned);
    // Still nothing written — `unavailable: null` reports that the run PROCEEDED, never that the
    // writer ran. The AC14 flag remains absent and therefore default-OFF.
    expect(provisioned.writerEnabled).toBe(false);
    expect(provisioned.impositionsWritten).toBe(0);
  }, 120_000);
});
