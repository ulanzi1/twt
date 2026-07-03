// R7-family ladder — live-DB integration (Story 4.2, Task 5; :5433).
//
// Drives the DB shell (`evaluateR7LadderAt`) against real Postgres: seeds the seven R7
// clauses via the same `seedClause` pattern as evaluate.spec.ts, seeds an active member,
// evaluates with injected `contribution.*` facts, and asserts the applicable sub-clause +
// provenance + audit-on-compute. Own-committing (NOT setupLiveDb): the idempotency store +
// audit writer COMMIT their own tx. Assertions key on membership / our own rows / idempotent
// outcome, never global counts ([[project_live_db_test_gotchas]]). NO enterAppScope — that
// is a domain-package RLS-test helper not present here (mirror evaluate.spec.ts exactly).

import { randomUUID } from 'node:crypto';

import { canonicalJsonStringify, createDb, ids, idempotency, schema, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  evaluateR7LadderAt,
  R7_CLAUSE_IDS,
  R7_CONTRIBUTION_FACT_KEYS,
  type EvaluateDeps,
  type Facts,
} from '../../src/index.js';
import { NO_R7_FACTS, R7_PAYLOADS } from '../fixtures/r7-clauses.js';

const F = R7_CONTRIBUTION_FACT_KEYS;
const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const BASE_FACTS = NO_R7_FACTS as Facts;

describe.skipIf(!hasDatabase)('niyamavali-engine — R7 ladder (live DB, own-committing) (:5433)', () => {
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

  /** Seed all seven R7 clauses (the contractual fixture payloads) for a Pariwar. */
  async function seedR7Family(pariwarId: ids.PariwarId): Promise<void> {
    for (const clauseId of R7_CLAUSE_IDS) {
      await seedClause(pariwarId, clauseId, R7_PAYLOADS[clauseId]!);
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

  it('resolves the applicable R7 sub-clause via the payload precedence ladder (R7(C) over R7(F))', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedR7Family(pariwarId);

    const at = new Date('2025-06-01T00:00:00Z');
    // A 12-month gap satisfies BOTH R7(C) and R7(F); the ladder picks R7(C) (precedence 70 > 45).
    const facts: Facts = { ...BASE_FACTS, [F.MONTHS_SINCE_LAST]: 12 };
    const r = await evaluateR7LadderAt(deps, { pariwarId, memberId, facts }, at);

    // All seven resolved + emitted in stable clause_id order.
    expect(r.perClauseResults.map((c) => c.clauseId)).toEqual([...R7_CLAUSE_IDS]);
    expect(r.applicableClauseId).toBe('niy.contribution-discipline.r7-c');
    expect(r.applicableResult?.result.decision).toBe('treat_as_new_registration');

    // Provenance carries the applicable clause id + version id + a PII-FREE inputs summary (fact KEYS only).
    expect(r.applicableResult?.provenance.clauseId).toBe('niy.contribution-discipline.r7-c');
    // AC1.3: clauseVersionId is present in provenance (DB-generated, so just assert non-empty).
    expect(typeof r.applicableResult?.provenance.clauseVersionId).toBe('string');
    expect(r.applicableResult?.provenance.clauseVersionId).toBeTruthy();
    const summary = r.applicableResult?.provenance.inputsSummary as { fact_keys: string[] };
    expect(summary.fact_keys).toContain(F.MONTHS_SINCE_LAST);
    // The applied set is exactly {C, F}; C governs.
    const applied = r.perClauseResults.filter((c) => c.applied).map((c) => c.clauseId).sort();
    expect(applied).toEqual([
      'niy.contribution-discipline.r7-c',
      'niy.contribution-discipline.r7-f',
    ]);
  });

  it('audits each clause compute; an identical re-eval is all cache hits → no re-audit (AC2/AC3)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedR7Family(pariwarId);

    const at = new Date('2025-06-01T00:00:00Z');
    const facts: Facts = { ...BASE_FACTS, [F.IN_LAPSE]: true, [F.TOTAL_COUNT]: 9 };
    const context = { pariwarId, memberId, facts };

    const before = await countRuleAudits(memberId);
    const first = await evaluateR7LadderAt(deps, context, at);
    const afterFirst = await countRuleAudits(memberId);
    const second = await evaluateR7LadderAt(deps, context, at);
    const afterSecond = await countRuleAudits(memberId);

    expect(first.applicableClauseId).toBe('niy.contribution-discipline.r7-a');
    // Cache-hit replays the memoized result byte-for-byte (determinism / AR-57).
    expect(canonicalJsonStringify(second as never)).toBe(canonicalJsonStringify(first as never));
    // Some number of clause computes audited (each clause audited independently); membership.
    expect(afterFirst - before).toBeGreaterThanOrEqual(1);
    // Second identical eval: all seven clause results are cache hits → zero re-audits.
    expect(afterSecond - afterFirst).toBe(0);
  });
});
