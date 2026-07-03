// Pure R7-ladder tests — Story 4.2 (Task 5; DB-free determinism + scenario matrix).
//
// Mirrors the 4.1 determinism style (AR-57): no `fast-check`; determinism is proven by
// REPEATED evaluation → byte-identical bytes across an explicit scenario matrix. Story 4.6
// runs this family 100× across threads and fails CI as a P0 on any byte-variance.
//
// The R7 payloads below are contractual EXAMPLES that mirror packages/domain/seed/
// niyamavali-v1-clauses.sql — they pin the fact-key names/types/semantics R7 depends on;
// they are NOT a mock of the future contribution subsystem (whose producer is Epic 8/9).

import { canonicalJsonStringify, ids } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  evaluateR7Ladder,
  R7_CLAUSE_IDS,
  R7_CONTRIBUTION_FACT_KEYS,
} from '../src/index.js';
import type { ResolvedClause, ResolvedEvaluationContext, Facts } from '../src/index.js';
import { NO_R7_FACTS, R7_PAYLOADS, R7_VERSION_IDS } from './fixtures/r7-clauses.js';

const F = R7_CONTRIBUTION_FACT_KEYS;

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const AT = new Date('2025-06-01T00:00:00.000Z');

/** Build the seven resolved R7 clauses (optionally overriding one clause's payload). */
function resolvedR7Clauses(overrides: Record<string, Record<string, unknown>> = {}): ResolvedClause[] {
  return R7_CLAUSE_IDS.map((cid) => ({
    clauseId: ids.clauseId(cid),
    clauseVersionId: ids.clauseVersionId(R7_VERSION_IDS[cid]!),
    payload: overrides[cid] ?? R7_PAYLOADS[cid]!,
    benefitMechanism: 'pool' as const,
  }));
}

function ctx(facts: Facts): ResolvedEvaluationContext {
  return {
    pariwarId: PARIWAR,
    memberId: MEMBER,
    memberState: 'active',
    facts,
    evaluatedAt: AT,
    resolvedClauseVersionIds: R7_CLAUSE_IDS.map((cid) => ids.clauseVersionId(R7_VERSION_IDS[cid]!)),
  };
}

function facts(overrides: Facts): Facts {
  return { ...(NO_R7_FACTS as Facts), ...overrides };
}

describe('evaluateR7Ladder — stable structure', () => {
  it('emits all seven sub-clause results sorted by clause_id (never hash-map order)', () => {
    const r = evaluateR7Ladder(resolvedR7Clauses(), ctx(facts({})));
    expect(r.perClauseResults.map((c) => c.clauseId)).toEqual([...R7_CLAUSE_IDS]);
  });

  it('resolves to no applicable clause when no R7 precondition is met', () => {
    const r = evaluateR7Ladder(resolvedR7Clauses(), ctx(facts({})));
    expect(r.applicableClauseId).toBeNull();
    expect(r.applicableResult).toBeNull();
    expect(r.perClauseResults.every((c) => !c.applied)).toBe(true);
  });
});

// AC3.7 — facts satisfying exactly one sub-clause identify that restoration path.
// NOTE: R7(C) is intentionally absent from this "exactly one applies" matrix — its precondition
// (months_since_last >= 12) is a strict superset of R7(F)'s (>= 6), so any input that fires
// R7(C) also fires R7(F). R7(C)'s coverage lives in the overlap block below (AC3.8), where it
// proves R7(C) governs over R7(F) by payload precedence (70 > 45).
describe('evaluateR7Ladder — one applicable sub-clause per R7 letter (AC3.7)', () => {
  const cases: Array<{ letter: string; clauseId: string; decision: string; facts: Facts }> = [
    {
      letter: 'A',
      clauseId: 'niy.contribution-discipline.r7-a',
      decision: 'restore_3_consecutive_one_time',
      facts: facts({ [F.IN_LAPSE]: true, [F.TOTAL_COUNT]: 9, [F.R7A_RESTORATIONS_USED]: 0 }),
    },
    {
      letter: 'B',
      clauseId: 'niy.contribution-discipline.r7-b',
      decision: 'restore_5_consecutive_plus_lockin',
      facts: facts({ [F.EVER_CONTRIBUTED]: false, [F.TOTAL_COUNT]: 0 }),
    },
    {
      letter: 'D',
      clauseId: 'niy.contribution-discipline.r7-d',
      decision: 'lockin_3mo_plus_catchup',
      facts: facts({ [F.TOTAL_COUNT]: 10, [F.SKIPS_CURRENT_YEAR]: 1 }),
    },
    {
      letter: 'E',
      clauseId: 'niy.contribution-discipline.r7-e',
      decision: 'lockin_5mo_complete_all',
      facts: facts({ [F.TOTAL_COUNT]: 12, [F.SKIPS_CURRENT_YEAR]: 2 }),
    },
    {
      letter: 'F',
      clauseId: 'niy.contribution-discipline.r7-f',
      decision: 'lockin_5mo_complete_all',
      facts: facts({ [F.MONTHS_SINCE_LAST]: 6 }),
    },
    {
      letter: 'G',
      clauseId: 'niy.contribution-discipline.r7-g',
      decision: 'no_exemption',
      facts: facts({ [F.PERSONAL_EVENT_EXCUSE_CLAIMED]: true }),
    },
  ];

  for (const c of cases) {
    it(`R7(${c.letter}) applies → ${c.decision}`, () => {
      const r = evaluateR7Ladder(resolvedR7Clauses(), ctx(c.facts));
      expect(r.applicableClauseId).toBe(c.clauseId);
      expect(r.applicableResult?.result.decision).toBe(c.decision);
      // Exactly one sub-clause applied.
      expect(r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId)).toEqual([c.clauseId]);
    });
  }
});

// AC3.8 — overlaps resolved by the payload-encoded `precedence` (data, not a hardcoded order).
describe('evaluateR7Ladder — overlap resolved by payload precedence (AC3.8)', () => {
  it('both A and B preconditions met (ever_contributed=false, in_lapse=true, total_count=0) → R7(B) wins (precedence 60 > 50)', () => {
    // The FR-9 policy ambiguity ("after R7(A) is exhausted R7(B) applies") produces a real
    // overlap: a member who never contributed (ever_contributed=false) with a lapse satisfies
    // BOTH R7(A) (in_lapse + total_count < 10 + restorations_used < 2) AND R7(B) (ever_contributed==false).
    // The ladder correctly picks R7(B) by precedence (60 > 50) — data, not a hardcoded branch.
    const r = evaluateR7Ladder(
      resolvedR7Clauses(),
      ctx(facts({ [F.EVER_CONTRIBUTED]: false, [F.TOTAL_COUNT]: 0, [F.IN_LAPSE]: true })),
    );
    const applied = r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId).sort();
    expect(applied).toEqual([
      'niy.contribution-discipline.r7-a',
      'niy.contribution-discipline.r7-b',
    ]);
    expect(r.applicableClauseId).toBe('niy.contribution-discipline.r7-b');
    expect(r.applicableResult?.result.decision).toBe('restore_5_consecutive_plus_lockin');
  });

  it('a 12-month gap satisfies R7(C) AND R7(F) → R7(C) wins (precedence 70 > 45)', () => {
    const r = evaluateR7Ladder(resolvedR7Clauses(), ctx(facts({ [F.MONTHS_SINCE_LAST]: 12 })));
    const applied = r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId).sort();
    expect(applied).toEqual([
      'niy.contribution-discipline.r7-c',
      'niy.contribution-discipline.r7-f',
    ]);
    expect(r.applicableClauseId).toBe('niy.contribution-discipline.r7-c');
    expect(r.applicableResult?.result.decision).toBe('treat_as_new_registration');
  });

  it('2+ skips with a 6-month gap satisfies R7(E) AND R7(F) → R7(F) wins (precedence 45 > 40)', () => {
    const r = evaluateR7Ladder(
      resolvedR7Clauses(),
      ctx(facts({ [F.TOTAL_COUNT]: 12, [F.SKIPS_CURRENT_YEAR]: 2, [F.MONTHS_SINCE_LAST]: 6 })),
    );
    const applied = r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId).sort();
    expect(applied).toEqual([
      'niy.contribution-discipline.r7-e',
      'niy.contribution-discipline.r7-f',
    ]);
    expect(r.applicableClauseId).toBe('niy.contribution-discipline.r7-f');
  });
});

// Boundary values — the strict/inclusive edges of each operator.
describe('evaluateR7Ladder — boundary values', () => {
  it('R7(A) total_count: 9 (< 10) applies, 10 (=== 10) does not', () => {
    const applies = evaluateR7Ladder(
      resolvedR7Clauses(),
      ctx(facts({ [F.IN_LAPSE]: true, [F.TOTAL_COUNT]: 9 })),
    );
    expect(applies.applicableClauseId).toBe('niy.contribution-discipline.r7-a');
    const boundary = evaluateR7Ladder(
      resolvedR7Clauses(),
      ctx(facts({ [F.IN_LAPSE]: true, [F.TOTAL_COUNT]: 10 })),
    );
    // total_count === 10 fails r7-a's `< 10`; 10 >= 10 does NOT trigger d/e (skips=0) → none.
    expect(boundary.applicableClauseId).toBeNull();
  });

  it('R7(A) lifetime cap: r7a_restorations_used 1 (< 2) applies, 2 (=== 2) does not', () => {
    const under = evaluateR7Ladder(
      resolvedR7Clauses(),
      ctx(facts({ [F.IN_LAPSE]: true, [F.TOTAL_COUNT]: 5, [F.R7A_RESTORATIONS_USED]: 1 })),
    );
    expect(under.applicableClauseId).toBe('niy.contribution-discipline.r7-a');
    const atCap = evaluateR7Ladder(
      resolvedR7Clauses(),
      ctx(facts({ [F.IN_LAPSE]: true, [F.TOTAL_COUNT]: 5, [F.R7A_RESTORATIONS_USED]: 2 })),
    );
    expect(atCap.applicableClauseId).toBeNull();
  });

  it('R7(F) months_since_last: 5 (< 6) → none, 6 (>= 6) → R7(F), 11 → still R7(F) not R7(C)', () => {
    expect(
      evaluateR7Ladder(resolvedR7Clauses(), ctx(facts({ [F.MONTHS_SINCE_LAST]: 5 }))).applicableClauseId,
    ).toBeNull();
    expect(
      evaluateR7Ladder(resolvedR7Clauses(), ctx(facts({ [F.MONTHS_SINCE_LAST]: 6 }))).applicableClauseId,
    ).toBe('niy.contribution-discipline.r7-f');
    expect(
      evaluateR7Ladder(resolvedR7Clauses(), ctx(facts({ [F.MONTHS_SINCE_LAST]: 11 }))).applicableClauseId,
    ).toBe('niy.contribution-discipline.r7-f');
  });

  it('R7(D) vs R7(E): skips === 1 → R7(D), skips === 2 → R7(E)', () => {
    expect(
      evaluateR7Ladder(
        resolvedR7Clauses(),
        ctx(facts({ [F.TOTAL_COUNT]: 10, [F.SKIPS_CURRENT_YEAR]: 1 })),
      ).applicableClauseId,
    ).toBe('niy.contribution-discipline.r7-d');
    expect(
      evaluateR7Ladder(
        resolvedR7Clauses(),
        ctx(facts({ [F.TOTAL_COUNT]: 10, [F.SKIPS_CURRENT_YEAR]: 2 })),
      ).applicableClauseId,
    ).toBe('niy.contribution-discipline.r7-e');
  });
});

// Determinism (AR-57) — byte-identical repeated evaluation + reproducible hashes.
describe('evaluateR7Ladder — determinism (AR-57)', () => {
  const scenarioFacts = facts({ [F.MONTHS_SINCE_LAST]: 12, [F.IN_LAPSE]: true, [F.TOTAL_COUNT]: 9 });

  it('same (clauses, ctx) → byte-identical R7LadderResult across repeated runs', () => {
    const build = () =>
      canonicalJsonStringify(evaluateR7Ladder(resolvedR7Clauses(), ctx(scenarioFacts)) as never);
    const a = build();
    const b = build();
    const c = build();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('fact insertion order does not affect the result (canonical hashing)', () => {
    const f1: Facts = {};
    f1[F.MONTHS_SINCE_LAST] = 12;
    f1[F.IN_LAPSE] = true;
    f1[F.TOTAL_COUNT] = 9;
    const f2: Facts = {};
    f2[F.TOTAL_COUNT] = 9;
    f2[F.IN_LAPSE] = true;
    f2[F.MONTHS_SINCE_LAST] = 12;
    const r1 = canonicalJsonStringify(evaluateR7Ladder(resolvedR7Clauses(), ctx(facts(f1))) as never);
    const r2 = canonicalJsonStringify(evaluateR7Ladder(resolvedR7Clauses(), ctx(facts(f2))) as never);
    expect(r1).toBe(r2);
  });

  it('clause input order does not affect the result (ladder sorts by clause_id)', () => {
    const forward = resolvedR7Clauses();
    const reversed = [...forward].reverse();
    const rf = canonicalJsonStringify(evaluateR7Ladder(forward, ctx(scenarioFacts)) as never);
    const rr = canonicalJsonStringify(evaluateR7Ladder(reversed, ctx(scenarioFacts)) as never);
    expect(rf).toBe(rr);
  });

  it('per-clause payload_hash is reproducible (64-hex) for every sub-clause', () => {
    const r = evaluateR7Ladder(resolvedR7Clauses(), ctx(scenarioFacts));
    for (const c of r.perClauseResults) {
      expect(c.result.provenance.payloadHash).toHaveLength(64);
    }
    // ...and stable across a second run.
    const r2 = evaluateR7Ladder(resolvedR7Clauses(), ctx(scenarioFacts));
    expect(r.perClauseResults.map((c) => c.result.provenance.payloadHash)).toEqual(
      r2.perClauseResults.map((c) => c.result.provenance.payloadHash),
    );
  });
});

// Malformed payload / facts — typed reason, never a throw (carried from 4.1).
describe('evaluateR7Ladder — malformed input (never throws)', () => {
  it('a malformed sub-clause payload is not applied; the ladder still resolves', () => {
    // r7-c is garbage → payload_unrecognized → not applied. Facts otherwise trigger R7(F).
    const clauses = resolvedR7Clauses({ 'niy.contribution-discipline.r7-c': { hello: 'world' } });
    const r = evaluateR7Ladder(clauses, ctx(facts({ [F.MONTHS_SINCE_LAST]: 12 })));
    const cEntry = r.perClauseResults.find((x) => x.clauseId === 'niy.contribution-discipline.r7-c');
    expect(cEntry?.applied).toBe(false);
    expect(cEntry?.result.reasonCode).toBe('rule.payload_unrecognized');
    // With R7(C) inert, the 12-month gap still satisfies R7(F) → it becomes applicable.
    expect(r.applicableClauseId).toBe('niy.contribution-discipline.r7-f');
  });

  it('malformed (non-numeric) facts do not throw — the affected clause simply does not apply', () => {
    const bad: Facts = facts({ [F.MONTHS_SINCE_LAST]: 'twelve' as unknown as number });
    const r = evaluateR7Ladder(resolvedR7Clauses(), ctx(bad));
    expect(r.applicableClauseId).toBeNull(); // fact_gte on a string fails → R7(C)/R7(F) not applied
    expect(r.perClauseResults).toHaveLength(7);
  });
});
