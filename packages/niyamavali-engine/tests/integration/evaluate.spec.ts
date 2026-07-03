// Rule-evaluation engine — live-DB integration (Story 4.1, Task 8; :5433).
//
// Drives the DB shell against real Postgres. Own-committing (NOT setupLiveDb): the
// idempotency store + audit writer both COMMIT their own tx, so a single per-test
// rollback envelope cannot contain them. Seeds are committed (clause_versions/events),
// cleaned by the specific pariwar/member ids this suite created; events_log +
// audit_log_entries are append-only (no cleanup — random ids avoid collisions).
// Assertions key on membership / idempotent outcome / our own rows, never global counts
// ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { createDb, ids, idempotency, schema, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { evaluate, evaluateAt, type EvaluateDeps } from '../../src/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

/** A minimal conditional rule: `member_state_in [active]` → decision = `tag` on pass. */
function rulePayload(tag: string): Record<string, unknown> {
  return {
    rule_kind: 'conditional',
    rule_code: 'IT-FIXTURE',
    on_pass: tag,
    on_fail: 'no',
    all_of: [{ op: 'member_state_in', states: ['active'] }],
  };
}

describe.skipIf(!hasDatabase)('niyamavali-engine — evaluate (live DB, own-committing) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  let deps: EvaluateDeps;
  const pariwars: string[] = [];
  const members: string[] = [];

  function track(pariwarId: string, memberId: string): void {
    pariwars.push(pariwarId);
    members.push(memberId);
  }

  interface SeedClauseOpts {
    pariwarId: ids.PariwarId;
    clauseId: string;
    version?: number;
    effectiveDate?: Date;
    payload: Record<string, unknown>;
    benefitMechanism?: 'pool' | 'reserve';
  }

  async function seedClause(opts: SeedClauseOpts): Promise<ids.ClauseVersionId> {
    const [row] = await db
      .insert(schema.clauseVersions)
      .values({
        clauseId: ids.clauseId(opts.clauseId),
        pariwarId: opts.pariwarId,
        version: opts.version ?? 1,
        effectiveDate: opts.effectiveDate ?? new Date('2024-01-01T00:00:00Z'),
        payload: opts.payload,
        benefitMechanism: opts.benefitMechanism ?? 'pool',
      })
      .returning();
    if (!row) throw new Error('seedClause: insert returned no row');
    return row.clauseVersionId;
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

  /** Seed the 4-event chain that replays to `active`. */
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

  it('resolves the clause version effective at the evaluation timestamp (effective-date resolution)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    const v1 = await seedClause({
      pariwarId,
      clauseId: 'niy.test.eff',
      version: 1,
      effectiveDate: new Date('2024-01-01T00:00:00Z'),
      payload: rulePayload('v1'),
    });
    const v2 = await seedClause({
      pariwarId,
      clauseId: 'niy.test.eff',
      version: 2,
      effectiveDate: new Date('2026-01-01T00:00:00Z'),
      payload: rulePayload('v2'),
    });

    const clauseId = ids.clauseId('niy.test.eff');
    const early = await evaluateAt(deps, clauseId, { pariwarId, memberId }, new Date('2025-06-01T00:00:00Z'));
    const late = await evaluateAt(deps, clauseId, { pariwarId, memberId }, new Date('2026-06-01T00:00:00Z'));

    expect(early?.provenance.clauseVersionId).toBe(v1);
    expect(early?.result.decision).toBe('v1');
    expect(late?.provenance.clauseVersionId).toBe(v2);
    expect(late?.result.decision).toBe('v2');
  });

  it('returns null when the clause cannot be resolved (caller maps → 503)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    const r = await evaluateAt(
      deps,
      ids.clauseId('niy.test.absent'),
      { pariwarId, memberId },
      new Date('2025-06-01T00:00:00Z'),
    );
    expect(r).toBeNull();
  });

  it('snapshot resolution reads the member snapshot, NOT the current amended policy (AC2 — amend-does-not-re-lock)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);

    // Lock-in policy V1 = 30 days (the snapshotted version).
    const policyV1 = await seedClause({
      pariwarId,
      clauseId: 'niy.lock-in.policy',
      version: 1,
      effectiveDate: new Date('2024-01-01T00:00:00Z'),
      payload: { rule_code: 'LOCKIN', lock_in_days: 30 },
    });
    // Member entered lock-in snapshotting policyV1.
    await seedEvent(pariwarId, memberId, 1, 'member.lock_in_entered', new Date('2024-02-01T00:00:00Z'), {
      from_state: 'lock-in',
      to_state: 'lock-in',
      trigger: 'signup',
      actor: 'system',
      lock_in_days_at_join: 30,
      lock_in_policy_version: policyV1,
    });
    // Amendment: V2 = 60 days, effective later. A re-lock bug would resolve THIS.
    const policyV2 = await seedClause({
      pariwarId,
      clauseId: 'niy.lock-in.policy',
      version: 2,
      effectiveDate: new Date('2025-01-01T00:00:00Z'),
      payload: { rule_code: 'LOCKIN', lock_in_days: 60 },
    });
    // Rule that snapshot-resolves lock-in and asks snapshot_days >= 60.
    await seedClause({
      pariwarId,
      clauseId: 'niy.test.snap',
      version: 1,
      effectiveDate: new Date('2024-01-01T00:00:00Z'),
      payload: {
        rule_kind: 'conditional',
        snapshot_resolution: 'lock_in',
        on_pass: 'relocked',
        on_fail: 'not_relocked',
        all_of: [{ op: 'fact_gte', fact: 'snapshot.lock_in_days', min: 60 }],
      },
    });

    const r = await evaluateAt(
      deps,
      ids.clauseId('niy.test.snap'),
      { pariwarId, memberId },
      new Date('2026-01-01T00:00:00Z'),
    );

    // Snapshot = V1 (30 days): 30 >= 60 is FALSE → not_relocked. Using the CURRENT
    // policy (V2=60) would flip this to `relocked` — the exact re-lock defect AC2 forbids.
    expect(r?.result.decision).toBe('not_relocked');
    const versions = (r?.provenance.inputsSummary as { resolved_clause_version_ids: string[] })
      .resolved_clause_version_ids;
    expect(versions).toContain(policyV1); // snapshotted version recorded in provenance
    expect(versions).not.toContain(policyV2); // the current (amended) version is NOT used
  });

  it('memoizes an identical re-evaluation and does NOT re-audit a cache hit (AC3.1/AC3.2)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedClause({ pariwarId, clauseId: 'niy.test.memo', payload: rulePayload('eligible') });
    const clauseId = ids.clauseId('niy.test.memo');
    const at = new Date('2025-06-01T00:00:00Z');

    const before = await countRuleAudits(memberId);
    const first = await evaluateAt(deps, clauseId, { pariwarId, memberId }, at);
    const afterFirst = await countRuleAudits(memberId);
    const second = await evaluateAt(deps, clauseId, { pariwarId, memberId }, at);
    const afterSecond = await countRuleAudits(memberId);

    expect(first?.result.decision).toBe('eligible');
    expect(second).toEqual(first); // cache-hit replays the memoized result byte-for-byte
    expect(afterFirst - before).toBe(1); // compute audited exactly once
    expect(afterSecond - afterFirst).toBe(0); // cache-hit is NOT re-audited
  });

  it('evaluate() resolves DB-authoritative now() and returns a live result', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId, memberId);
    await seedActiveMember(pariwarId, memberId);
    await seedClause({ pariwarId, clauseId: 'niy.test.live', payload: rulePayload('eligible') });

    const r = await evaluate(deps, ids.clauseId('niy.test.live'), { pariwarId, memberId });
    expect(r?.result.decision).toBe('eligible');
    expect(Number.isNaN(Date.parse(r!.provenance.evaluatedAt))).toBe(false);
  });
});
