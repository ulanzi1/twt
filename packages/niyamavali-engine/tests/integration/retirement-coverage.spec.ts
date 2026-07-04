// R12 retirement-coverage — live-DB integration (Story 4.5, Task 5; :5433).
//
// Drives the DB shell (`evaluateRetirementCoverageAt` + `…Live`) against real Postgres: seeds the
// single R12 clause (with its pre-allocated clause_version_id 0e1c0015) + an active/retired member,
// evaluates with injected `member.*` facts, and asserts the computed `granted_years` + provenance +
// audit-on-compute + zero-re-audit on identical re-eval + `null` for an unseeded clause + `*Live`
// pinning one DB instant. Own-committing (NOT setupLiveDb): the idempotency store + audit writer
// COMMIT their own tx. Assertions key on membership / our own rows / idempotent outcome, never
// global counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { canonicalJsonStringify, createDb, ids, idempotency, schema, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  evaluateRetirementCoverageAt,
  evaluateRetirementCoverageLive,
  R12_CLAUSE_ID,
  R12_GRANTED_YEARS_KEY,
  R12_IS_RETIRED_KEY,
  R12_MEMBER_FACT_KEYS,
  RETIREMENT_COVERAGE_COMPUTED,
  RETIREMENT_COVERAGE_NOT_APPLICABLE,
  type EvaluateDeps,
  type Facts,
} from '../../src/index.js';
import { R12_PAYLOAD } from '../fixtures/retirement-coverage-clauses.js';

const MF = R12_MEMBER_FACT_KEYS;
const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('niyamavali-engine — R12 retirement-coverage (live DB, own-committing) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  let deps: EvaluateDeps;
  const pariwars: string[] = [];
  const members: string[] = [];

  function track(pariwarId: string, memberId: string): void {
    pariwars.push(pariwarId);
    members.push(memberId);
  }

  /**
   * Seed the R12 clause for a Pariwar and return its clause_version_id. Uses a per-test RANDOM id
   * (clause_version_id is a GLOBAL primary key — reusing the fixed seed id 0e1c0015 across these
   * own-committing tests against a shared DB would collide). The PURE spec pins the literal
   * 0e1c0015 via the fixture; here we assert provenance against the actual seeded handle
   * ([[project_live_db_test_gotchas]] — key on our own rows, never global identity).
   */
  async function seedR12(pariwarId: ids.PariwarId): Promise<ids.ClauseVersionId> {
    const clauseVersionId = ids.clauseVersionId(randomUUID());
    await db.insert(schema.clauseVersions).values({
      clauseVersionId,
      clauseId: ids.clauseId(R12_CLAUSE_ID),
      pariwarId,
      version: 1,
      effectiveDate: new Date('2024-01-01T00:00:00Z'),
      payload: { ...R12_PAYLOAD },
      benefitMechanism: 'pool',
    });
    return clauseVersionId;
  }

  async function seedEvent(
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
    version: number,
    eventType: string,
    occurredAt: Date,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(schema.eventsLog).values({
      streamId: memberId,
      eventType,
      payload,
      eventVersion: version,
      actorId: null,
      pariwarId,
      occurredAt,
    });
  }

  /** Seed the 4-event chain that replays to `active` (mirror special-death.spec.ts). */
  async function seedActiveMember(pariwarId: ids.PariwarId, memberId: ids.MemberId): Promise<void> {
    const base = Date.UTC(2024, 0, 1);
    const at = (n: number): Date => new Date(base + n * 1000);
    await seedEvent(pariwarId, memberId, 1, 'member.signup_initiated', at(1), {});
    await seedEvent(pariwarId, memberId, 2, 'member.kyc_completed', at(2), {});
    await seedEvent(pariwarId, memberId, 3, 'member.vyawastha_shulk_paid', at(3), {});
    await seedEvent(pariwarId, memberId, 4, 'member.lock_in_expired', at(4), { kyc_verified: true });
  }

  async function countRuleAudits(memberId: ids.MemberId): Promise<number> {
    const res = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM audit_log_entries WHERE action = 'rule.evaluate' AND resource_locator = $1`,
      [`member/${memberId}`],
    );
    return res.rows[0]?.n ?? 0;
  }

  beforeAll(() => {
    if (!hasDatabase) return;
    const created = createDb(DATABASE_URL!, { ssl: false, max: 8 });
    db = created.db;
    pool = created.pool;
    deps = { db, keyedStore: idempotency.createKeyedStore(pool), servicePool: pool };
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    if (pariwars.length > 0) {
      await pool
        .query('DELETE FROM clause_versions WHERE pariwar_id::text = ANY($1)', [pariwars])
        .catch(() => undefined);
    }
    for (const m of members) {
      await pool
        .query('DELETE FROM idempotency_keys WHERE key LIKE $1', [`rule-eval:v1:%:${m}:%`])
        .catch(() => undefined);
    }
    await pool.end();
  });

  it('computes granted_years for a retired member via the grant ladder (15yr → +3), audited once', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    const versionId = await seedR12(pariwarId);

    const at = new Date('2025-06-01T00:00:00Z');
    const facts: Facts = { [MF.VALID_MEMBERSHIP_YEARS]: 15, [MF.IS_RETIRED]: true };
    const context = { pariwarId, memberId, facts };

    const before = await countRuleAudits(memberId);
    const first = await evaluateRetirementCoverageAt(deps, context, at);
    const afterFirst = await countRuleAudits(memberId);
    const second = await evaluateRetirementCoverageAt(deps, context, at);
    const afterSecond = await countRuleAudits(memberId);

    expect(first).not.toBeNull();
    expect(first!.result.decision).toBe(RETIREMENT_COVERAGE_COMPUTED);
    expect(first!.result.decision).not.toMatch(/deny|ineligible/i);
    // The engine's on-the-fly computation: 15 years → +3 years granted; is_retired echoed.
    expect(first!.result.computed?.values[R12_GRANTED_YEARS_KEY]).toBe(3);
    expect(first!.result.computed?.values[R12_IS_RETIRED_KEY]).toBe(true);
    // Provenance carries the seeded clause id + version id handle.
    expect(first!.provenance.clauseId).toBe(R12_CLAUSE_ID);
    expect(first!.provenance.clauseVersionId).toBe(versionId);
    // One compute → one audit; the identical re-eval is a cache hit → zero re-audit, byte-identical.
    expect(afterFirst - before).toBe(1);
    expect(afterSecond - afterFirst).toBe(0);
    expect(canonicalJsonStringify(second as never)).toBe(canonicalJsonStringify(first as never));
  });

  it('a non-retired member is not-applicable (granted_years still reflects earned coverage)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedR12(pariwarId);

    const at = new Date('2025-06-01T00:00:00Z');
    const facts: Facts = { [MF.VALID_MEMBERSHIP_YEARS]: 10, [MF.IS_RETIRED]: false };
    const r = await evaluateRetirementCoverageAt(deps, { pariwarId, memberId, facts }, at);

    expect(r).not.toBeNull();
    expect(r!.result.decision).toBe(RETIREMENT_COVERAGE_NOT_APPLICABLE);
    expect(r!.result.decision).not.toMatch(/deny|ineligible/i);
    expect(r!.result.computed?.values[R12_GRANTED_YEARS_KEY]).toBe(2); // earned by tenure
    expect(r!.result.computed?.values[R12_IS_RETIRED_KEY]).toBe(false);
  });

  it('absent input facts route to rule.inputs_unavailable — never a silent granted_years:0 (CR-4.5-D1)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedR12(pariwarId);

    const at = new Date('2025-06-01T00:00:00Z');
    // No member.* facts injected: the producer has not derived tenure/retirement yet.
    const r = await evaluateRetirementCoverageAt(deps, { pariwarId, memberId, facts: {} }, at);

    expect(r).not.toBeNull();
    expect(r!.reasonCode).toBe('rule.inputs_unavailable');
    expect(r!.result.computed).toBeUndefined(); // NOT granted_years:0
  });

  it('returns null when the R12 clause is not seeded for the pariwar', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    // R12 NOT seeded for this pariwar.

    const at = new Date('2025-06-01T00:00:00Z');
    const facts: Facts = { [MF.VALID_MEMBERSHIP_YEARS]: 15, [MF.IS_RETIRED]: true };
    const r = await evaluateRetirementCoverageAt(deps, { pariwarId, memberId, facts }, at);
    expect(r).toBeNull();
  });

  it('evaluateRetirementCoverageLive pins one DB-authoritative instant and delegates', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    const versionId = await seedR12(pariwarId);

    const facts: Facts = { [MF.VALID_MEMBERSHIP_YEARS]: 5, [MF.IS_RETIRED]: true };
    const r = await evaluateRetirementCoverageLive(deps, { pariwarId, memberId, facts });

    expect(r).not.toBeNull();
    expect(r!.result.decision).toBe(RETIREMENT_COVERAGE_COMPUTED);
    expect(r!.result.computed?.values[R12_GRANTED_YEARS_KEY]).toBe(1); // 5yr → +1
    expect(r!.provenance.clauseVersionId).toBe(versionId);
  });
});
