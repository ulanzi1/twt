// R8-family ladder — live-DB integration (Story 4.3, Task 5; :5433).
//
// Drives the DB shell (`evaluateR8LadderAt`) against real Postgres: seeds the three R8
// clauses via the same `seedClause` pattern as evaluate.spec.ts / r7-ladder.spec.ts, seeds
// an active member, evaluates with injected `contribution.*` / `claim.*` facts, and asserts
// the applicable sub-clause + provenance + audit-on-compute. Own-committing (NOT setupLiveDb):
// the idempotency store + audit writer COMMIT their own tx. Assertions key on membership / our
// own rows / idempotent outcome, never global counts ([[project_live_db_test_gotchas]]). NO
// enterAppScope — that is a domain-package RLS-test helper not present here (mirror
// evaluate.spec.ts / r7-ladder.spec.ts exactly).

import { randomUUID } from 'node:crypto';

import { canonicalJsonStringify, createDb, ids, idempotency, schema, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  evaluateR8LadderAt,
  evaluateR8LadderLive,
  R7_CONTRIBUTION_FACT_KEYS,
  R8_CLAIM_FACT_KEYS,
  R8_CLAUSE_IDS,
  R8_CONTRIBUTION_FACT_KEYS,
  type EvaluateDeps,
  type Facts,
} from '../../src/index.js';
import { NO_R8_FACTS, R8_PAYLOADS } from '../fixtures/r8-clauses.js';

const R7F = R7_CONTRIBUTION_FACT_KEYS;
const F = R8_CONTRIBUTION_FACT_KEYS;
const CF = R8_CLAIM_FACT_KEYS;
const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const BASE_FACTS = NO_R8_FACTS as Facts;

describe.skipIf(!hasDatabase)('niyamavali-engine — R8 ladder (live DB, own-committing) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  let deps: EvaluateDeps;
  const pariwars: string[] = [];
  const members: string[] = [];

  function track(pariwarId: string, memberId: string): void {
    pariwars.push(pariwarId);
    members.push(memberId);
  }

  async function seedClause(
    pariwarId: ids.PariwarId,
    clauseId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(schema.clauseVersions).values({
      clauseId: ids.clauseId(clauseId),
      pariwarId,
      version: 1,
      effectiveDate: new Date('2024-01-01T00:00:00Z'),
      payload,
      benefitMechanism: 'pool',
    });
  }

  /** Seed all three R8 clauses (the contractual fixture payloads) for a Pariwar. */
  async function seedR8Family(pariwarId: ids.PariwarId): Promise<void> {
    for (const clauseId of R8_CLAUSE_IDS) {
      await seedClause(pariwarId, clauseId, R8_PAYLOADS[clauseId]!);
    }
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

  /** Seed the 4-event chain that replays to `active` (mirror evaluate.spec.ts). */
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

  it('resolves the applicable R8 sub-clause via the payload precedence ladder (R8(B) over R8 base)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedR8Family(pariwarId);

    const at = new Date('2025-06-01T00:00:00Z');
    // A 90%-met illness death that is ALSO a mid-contribution death satisfies BOTH the R8 base
    // and R8(B); the ladder picks R8(B) (precedence 50 > 30).
    const facts: Facts = {
      ...BASE_FACTS,
      [CF.DEATH_CLASSIFICATION]: 'illness',
      [R7F.TOTAL_COUNT]: 12,
      [F.COMPLIANCE_PERCENT]: 95,
      [CF.MID_CONTRIBUTION_DEATH]: true,
    };
    const r = await evaluateR8LadderAt(deps, { pariwarId, memberId, facts }, at);

    // All three resolved + emitted in stable clause_id order.
    expect(r.perClauseResults.map((c) => c.clauseId)).toEqual([...R8_CLAUSE_IDS]);
    expect(r.missingClauseIds).toEqual([]);
    expect(r.applicableClauseId).toBe('niy.ninety-percent-rule.r8-b');
    expect(r.applicableResult?.result.decision).toBe('mid_contribution_eligible');

    // Provenance carries the applicable clause id + version id + a PII-FREE inputs summary (fact KEYS only).
    expect(r.applicableResult?.provenance.clauseId).toBe('niy.ninety-percent-rule.r8-b');
    // AC1.3: clauseVersionId is present in provenance (DB-generated, so just assert non-empty).
    expect(typeof r.applicableResult?.provenance.clauseVersionId).toBe('string');
    expect(r.applicableResult?.provenance.clauseVersionId).toBeTruthy();
    const summary = r.applicableResult?.provenance.inputsSummary as { fact_keys: string[] };
    expect(summary.fact_keys).toContain(CF.DEATH_CLASSIFICATION);
    // The applied set is exactly {r8, r8-b}; R8(B) governs.
    const applied = r.perClauseResults.filter((c) => c.applied).map((c) => c.clauseId).sort();
    expect(applied).toEqual(['niy.ninety-percent-rule.r8', 'niy.ninety-percent-rule.r8-b']);
  });

  it('audits each clause compute; an identical re-eval is all cache hits → no re-audit (AC2/AC3)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedR8Family(pariwarId);

    const at = new Date('2025-06-01T00:00:00Z');
    // A straight 90%-met illness death → R8 base applies.
    const facts: Facts = {
      ...BASE_FACTS,
      [CF.DEATH_CLASSIFICATION]: 'illness',
      [R7F.TOTAL_COUNT]: 10,
      [F.COMPLIANCE_PERCENT]: 90,
    };
    const context = { pariwarId, memberId, facts };

    const before = await countRuleAudits(memberId);
    const first = await evaluateR8LadderAt(deps, context, at);
    const afterFirst = await countRuleAudits(memberId);
    const second = await evaluateR8LadderAt(deps, context, at);
    const afterSecond = await countRuleAudits(memberId);

    expect(first.applicableClauseId).toBe('niy.ninety-percent-rule.r8');
    // Cache-hit replays the memoized result byte-for-byte (determinism / AR-57).
    expect(canonicalJsonStringify(second as never)).toBe(canonicalJsonStringify(first as never));
    // Fresh pariwar/member: all three clause computes are first-time (claim "acquired") → exactly
    // one audit row per sub-clause.
    expect(afterFirst - before).toBe(3);
    // Second identical eval: all three clause results are cache hits → zero re-audits.
    expect(afterSecond - afterFirst).toBe(0);
  });

  it('reports a missing sub-clause in missingClauseIds when it has no effective version for this pariwar', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    // Seed only R8 base + R8(A); leave R8(B) unseeded for this pariwar.
    await seedClause(pariwarId, 'niy.ninety-percent-rule.r8', R8_PAYLOADS['niy.ninety-percent-rule.r8']!);
    await seedClause(pariwarId, 'niy.ninety-percent-rule.r8-a', R8_PAYLOADS['niy.ninety-percent-rule.r8-a']!);

    const at = new Date('2025-06-01T00:00:00Z');
    const facts: Facts = {
      ...BASE_FACTS,
      [CF.DEATH_CLASSIFICATION]: 'illness',
      [R7F.TOTAL_COUNT]: 10,
      [F.COMPLIANCE_PERCENT]: 90,
    };
    const r = await evaluateR8LadderAt(deps, { pariwarId, memberId, facts }, at);

    expect(r.missingClauseIds).toEqual(['niy.ninety-percent-rule.r8-b']);
    expect(r.perClauseResults.map((c) => c.clauseId)).toEqual([
      'niy.ninety-percent-rule.r8',
      'niy.ninety-percent-rule.r8-a',
    ]);
    expect(r.applicableClauseId).toBe('niy.ninety-percent-rule.r8');
  });

  it('evaluateR8LadderLive pins one DB-authoritative instant and delegates to evaluateR8LadderAt', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedR8Family(pariwarId);

    const facts: Facts = {
      ...BASE_FACTS,
      [CF.DEATH_CLASSIFICATION]: 'illness',
      [R7F.TOTAL_COUNT]: 10,
      [F.COMPLIANCE_PERCENT]: 90,
    };
    const r = await evaluateR8LadderLive(deps, { pariwarId, memberId, facts });

    expect(r.perClauseResults.map((c) => c.clauseId)).toEqual([...R8_CLAUSE_IDS]);
    expect(r.missingClauseIds).toEqual([]);
    expect(r.applicableClauseId).toBe('niy.ninety-percent-rule.r8');
    expect(r.applicableResult?.result.decision).toBe('ninety_percent_met');
  });
});
