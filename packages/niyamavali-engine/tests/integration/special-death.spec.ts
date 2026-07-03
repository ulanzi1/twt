// Special-death family + R14 concealment — live-DB integration (Story 4.4, Task 6; :5433).
//
// Drives the DB shells (`evaluateSpecialDeathLadderAt` + `evaluateConcealmentAt`) against real
// Postgres: seeds the seven R5/R9 family clauses + the R14 concealment clause via the same
// `seedClause` pattern as r8-ladder.spec.ts, seeds an active member, evaluates with injected
// `claim.*` facts, and asserts the applicable sub-clause + provenance + audit-on-compute + the
// SM-1 C7 concealment flag. Own-committing (NOT setupLiveDb): the idempotency store + audit writer
// COMMIT their own tx. Assertions key on membership / our own rows / idempotent outcome, never
// global counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { canonicalJsonStringify, createDb, ids, idempotency, schema, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  CONCEALMENT_CLAUSE_ID,
  CONCEALMENT_FACT_KEYS,
  CONCEALMENT_REVIEW_FLAG,
  evaluateConcealmentAt,
  evaluateSpecialDeathLadderAt,
  evaluateSpecialDeathLadderLive,
  SPECIAL_DEATH_CLAIM_FACT_KEYS,
  SPECIAL_DEATH_CLAUSE_IDS,
  type EvaluateDeps,
  type Facts,
} from '../../src/index.js';
import {
  CONCEALMENT_PAYLOAD,
  NO_SPECIAL_DEATH_FACTS,
  SPECIAL_DEATH_PAYLOADS,
} from '../fixtures/special-death-clauses.js';

const CF = SPECIAL_DEATH_CLAIM_FACT_KEYS;
const XF = CONCEALMENT_FACT_KEYS;
const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const BASE_FACTS = NO_SPECIAL_DEATH_FACTS as Facts;

describe.skipIf(!hasDatabase)('niyamavali-engine — special-death + concealment (live DB, own-committing) (:5433)', () => {
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

  /** Seed all seven R5/R9 family clauses (the contractual fixture payloads) for a Pariwar. */
  async function seedSpecialDeathFamily(pariwarId: ids.PariwarId): Promise<void> {
    for (const clauseId of SPECIAL_DEATH_CLAUSE_IDS) {
      await seedClause(pariwarId, clauseId, SPECIAL_DEATH_PAYLOADS[clauseId]!);
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

  /** Seed the 4-event chain that replays to `active` (mirror r8-ladder.spec.ts). */
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

  it('resolves the applicable special-death sub-clause via the payload precedence ladder (Mar-2025 over R9)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedSpecialDeathFamily(pariwarId);

    const at = new Date('2025-06-01T00:00:00Z');
    // A murder with the nominee accused satisfies BOTH R9 and Mar-2025; the ladder picks
    // Mar-2025 (precedence 80 > 60).
    const facts: Facts = {
      ...BASE_FACTS,
      [CF.DEATH_CLASSIFICATION]: 'murder',
      [CF.NOMINEE_ACCUSED]: true,
    };
    const r = await evaluateSpecialDeathLadderAt(deps, { pariwarId, memberId, facts }, at);

    // All seven resolved + emitted in stable clause_id order.
    expect(r.perClauseResults.map((c) => c.clauseId)).toEqual([...SPECIAL_DEATH_CLAUSE_IDS]);
    expect(r.missingClauseIds).toEqual([]);
    expect(r.applicableClauseId).toBe('niy.special-death.r9-suicide-murder');
    expect(r.applicableResult?.result.decision).toBe('route_r9_voting');
    // NEVER a deny (SM-1 C7).
    expect(r.applicableResult?.result.decision).not.toMatch(/deny|ineligible/i);

    // Provenance carries the applicable clause id + version id + a PII-FREE inputs summary.
    expect(r.applicableResult?.provenance.clauseId).toBe('niy.special-death.r9-suicide-murder');
    expect(typeof r.applicableResult?.provenance.clauseVersionId).toBe('string');
    expect(r.applicableResult?.provenance.clauseVersionId).toBeTruthy();
    const applied = r.perClauseResults.filter((c) => c.applied).map((c) => c.clauseId).sort();
    expect(applied).toEqual(['niy.special-death.r9', 'niy.special-death.r9-suicide-murder']);
  });

  it('audits each clause compute; an identical re-eval is all cache hits → no re-audit', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedSpecialDeathFamily(pariwarId);

    const at = new Date('2025-06-01T00:00:00Z');
    const facts: Facts = { ...BASE_FACTS, [CF.DEATH_CLASSIFICATION]: 'suicide' };
    const context = { pariwarId, memberId, facts };

    const before = await countRuleAudits(memberId);
    const first = await evaluateSpecialDeathLadderAt(deps, context, at);
    const afterFirst = await countRuleAudits(memberId);
    const second = await evaluateSpecialDeathLadderAt(deps, context, at);
    const afterSecond = await countRuleAudits(memberId);

    expect(first.applicableClauseId).toBe('niy.special-death.r9');
    // Cache-hit replays the memoized result byte-for-byte (determinism / AR-57).
    expect(canonicalJsonStringify(second as never)).toBe(canonicalJsonStringify(first as never));
    // Fresh pariwar/member: all seven clause computes are first-time → exactly one audit per sub-clause.
    expect(afterFirst - before).toBe(SPECIAL_DEATH_CLAUSE_IDS.length);
    // Second identical eval: all seven are cache hits → zero re-audits.
    expect(afterSecond - afterFirst).toBe(0);
  });

  it('reports missing sub-clauses in missingClauseIds when they have no effective version for this pariwar', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    // Seed only R9 + R9(A); leave the five others unseeded for this pariwar.
    await seedClause(pariwarId, 'niy.special-death.r9', SPECIAL_DEATH_PAYLOADS['niy.special-death.r9']!);
    await seedClause(pariwarId, 'niy.special-death.r9-a', SPECIAL_DEATH_PAYLOADS['niy.special-death.r9-a']!);

    const at = new Date('2025-06-01T00:00:00Z');
    const facts: Facts = { ...BASE_FACTS, [CF.DEATH_CLASSIFICATION]: 'suicide' };
    const r = await evaluateSpecialDeathLadderAt(deps, { pariwarId, memberId, facts }, at);

    expect(r.missingClauseIds).toEqual([
      'niy.special-death.r5-c-2',
      'niy.special-death.r5-d',
      'niy.special-death.r5-e',
      'niy.special-death.r5-f',
      'niy.special-death.r9-suicide-murder',
    ]);
    expect(r.perClauseResults.map((c) => c.clauseId)).toEqual([
      'niy.special-death.r9',
      'niy.special-death.r9-a',
    ]);
    expect(r.applicableClauseId).toBe('niy.special-death.r9');
  });

  it('evaluateSpecialDeathLadderLive pins one DB-authoritative instant and delegates', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedSpecialDeathFamily(pariwarId);

    const facts: Facts = { ...BASE_FACTS, [CF.DEATH_CLASSIFICATION]: 'suicide' };
    const r = await evaluateSpecialDeathLadderLive(deps, { pariwarId, memberId, facts });

    expect(r.perClauseResults.map((c) => c.clauseId)).toEqual([...SPECIAL_DEATH_CLAUSE_IDS]);
    expect(r.missingClauseIds).toEqual([]);
    expect(r.applicableClauseId).toBe('niy.special-death.r9');
    expect(r.applicableResult?.result.decision).toBe('route_r9_voting');
  });

  it('R14 concealment: undeclared linked IMA condition → flag + routing slug, audited once (SM-1 C7)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedClause(pariwarId, CONCEALMENT_CLAUSE_ID, { ...CONCEALMENT_PAYLOAD });

    const at = new Date('2025-06-01T00:00:00Z');
    const facts: Facts = { ...BASE_FACTS, [XF.CONCEALED_IMA_CONDITION_LINKED]: true };
    const context = { pariwarId, memberId, facts };

    const before = await countRuleAudits(memberId);
    const r = await evaluateConcealmentAt(deps, context, at);
    const afterFirst = await countRuleAudits(memberId);
    const again = await evaluateConcealmentAt(deps, context, at);
    const afterSecond = await countRuleAudits(memberId);

    expect(r).not.toBeNull();
    // NOT a deny verdict — a routing slug + the concealment flag (SM-1 C7).
    expect(r!.result.decision).toBe('route_state_trustee_review');
    expect(r!.result.decision).not.toMatch(/deny|ineligible/i);
    expect(r!.result.specialFlags).toEqual([CONCEALMENT_REVIEW_FLAG]);
    // References niy.concealment.r14 + carries clauseVersionId provenance (D4 scope).
    expect(r!.provenance.clauseId).toBe('niy.concealment.r14');
    expect(r!.provenance.clauseVersionId).toBeTruthy();
    // One compute → one audit; the identical re-eval is a cache hit → zero re-audit.
    expect(afterFirst - before).toBe(1);
    expect(afterSecond - afterFirst).toBe(0);
    expect(canonicalJsonStringify(again as never)).toBe(canonicalJsonStringify(r as never));
  });

  it('R14 concealment: an honest declarer (concealed=false) does not flag or deny', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedClause(pariwarId, CONCEALMENT_CLAUSE_ID, { ...CONCEALMENT_PAYLOAD });

    const at = new Date('2025-06-01T00:00:00Z');
    const facts: Facts = { ...BASE_FACTS, [XF.CONCEALED_IMA_CONDITION_LINKED]: false };
    const r = await evaluateConcealmentAt(deps, { pariwarId, memberId, facts }, at);

    expect(r).not.toBeNull();
    expect(r!.result.decision).toBe('concealment_not_applicable');
    expect(r!.result.specialFlags).toEqual([]);
  });
});
