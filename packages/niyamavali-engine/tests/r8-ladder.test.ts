// Pure R8-ladder tests — Story 4.3 (Task 5; DB-free determinism + scenario matrix).
//
// Mirrors the 4.1/4.2 determinism style (AR-57): no `fast-check`; determinism is proven by
// REPEATED evaluation → byte-identical bytes across an explicit scenario matrix. Story 4.6
// runs this family 100× across threads and fails CI as a P0 on any byte-variance.
//
// The R8 payloads below are contractual EXAMPLES that mirror packages/domain/seed/
// niyamavali-v1-clauses.sql — they pin the fact-key names/types/semantics R8 depends on;
// they are NOT a mock of the future contribution/claim subsystems (producers = Epic 8/9 +
// Epic 6 claim intake).

import { canonicalJsonStringify, ids } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  evaluateR8Ladder,
  R7_CONTRIBUTION_FACT_KEYS,
  R8_CLAIM_FACT_KEYS,
  R8_CLAUSE_IDS,
  R8_CONTRIBUTION_FACT_KEYS,
} from '../src/index.js';
import type { ResolvedClause, ResolvedEvaluationContext, Facts } from '../src/index.js';
import { NO_R8_FACTS, R8_FIXTURE_CLAUSE_IDS, R8_PAYLOADS, R8_VERSION_IDS } from './fixtures/r8-clauses.js';

const R7F = R7_CONTRIBUTION_FACT_KEYS; // TOTAL_COUNT, SKIPS_CURRENT_YEAR
const F = R8_CONTRIBUTION_FACT_KEYS; //   COMPLIANCE_PERCENT, PRIOR_PERIOD_FULL_COMPLIANCE
const CF = R8_CLAIM_FACT_KEYS; //         DEATH_CLASSIFICATION, MID_CONTRIBUTION_DEATH

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const AT = new Date('2025-06-01T00:00:00.000Z');

/** Build the three resolved R8 clauses (optionally overriding one clause's payload). */
function resolvedR8Clauses(overrides: Record<string, Record<string, unknown>> = {}): ResolvedClause[] {
  return R8_CLAUSE_IDS.map((cid) => ({
    clauseId: ids.clauseId(cid),
    clauseVersionId: ids.clauseVersionId(R8_VERSION_IDS[cid]!),
    payload: overrides[cid] ?? R8_PAYLOADS[cid]!,
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
    resolvedClauseVersionIds: R8_CLAUSE_IDS.map((cid) => ids.clauseVersionId(R8_VERSION_IDS[cid]!)),
  };
}

function facts(overrides: Facts): Facts {
  return { ...(NO_R8_FACTS as Facts), ...overrides };
}

/** An illness death (the common precondition of every R8 sub-clause) — the base for "applies" scenarios. */
const ILLNESS = { [CF.DEATH_CLASSIFICATION]: 'illness' } as const;

describe('R8 fixtures — sanity', () => {
  it('R8_FIXTURE_CLAUSE_IDS covers exactly the three family clause ids', () => {
    expect(R8_FIXTURE_CLAUSE_IDS).toEqual([...R8_CLAUSE_IDS]);
  });
});

describe('evaluateR8Ladder — stable structure', () => {
  it('emits all three sub-clause results sorted by clause_id (never hash-map order)', () => {
    const r = evaluateR8Ladder(resolvedR8Clauses(), ctx(facts({})));
    expect(r.perClauseResults.map((c) => c.clauseId)).toEqual([...R8_CLAUSE_IDS]);
  });

  it('resolves to no applicable clause when no R8 precondition is met', () => {
    const r = evaluateR8Ladder(resolvedR8Clauses(), ctx(facts({})));
    expect(r.applicableClauseId).toBeNull();
    expect(r.applicableResult).toBeNull();
    expect(r.perClauseResults.every((c) => !c.applied)).toBe(true);
    expect(r.missingClauseIds).toEqual([]);
  });
});

// AC1.3 / AC3.7 — facts satisfying exactly one sub-clause identify that eligibility path.
describe('evaluateR8Ladder — one applicable sub-clause (AC1.3)', () => {
  const cases: Array<{ label: string; clauseId: string; decision: string; facts: Facts }> = [
    {
      label: 'R8 base (90% met)',
      clauseId: 'niy.ninety-percent-rule.r8',
      decision: 'ninety_percent_met',
      facts: facts({ ...ILLNESS, [R7F.TOTAL_COUNT]: 10, [F.COMPLIANCE_PERCENT]: 90 }),
    },
    {
      label: 'R8(A) skip-allowance',
      clauseId: 'niy.ninety-percent-rule.r8-a',
      // total_count 10 + skip==1 + prior 100%, but compliance 85 (< 90) → base fails, R8(A) rescues.
      decision: 'skip_allowance_granted',
      facts: facts({
        ...ILLNESS,
        [R7F.TOTAL_COUNT]: 10,
        [R7F.SKIPS_CURRENT_YEAR]: 1,
        [F.PRIOR_PERIOD_FULL_COMPLIANCE]: true,
        [F.COMPLIANCE_PERCENT]: 85,
      }),
    },
    {
      label: 'R8(B) mid-contribution death',
      clauseId: 'niy.ninety-percent-rule.r8-b',
      // mid-contribution death with otherwise below-threshold contributions → only R8(B).
      decision: 'mid_contribution_eligible',
      facts: facts({ ...ILLNESS, [CF.MID_CONTRIBUTION_DEATH]: true }),
    },
  ];

  for (const c of cases) {
    it(`${c.label} applies → ${c.decision}`, () => {
      const r = evaluateR8Ladder(resolvedR8Clauses(), ctx(c.facts));
      expect(r.applicableClauseId).toBe(c.clauseId);
      expect(r.applicableResult?.result.decision).toBe(c.decision);
      // Exactly one sub-clause applied.
      expect(r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId)).toEqual([c.clauseId]);
    });
  }
});

// AC3.7 — overlaps resolved by the payload-encoded `precedence` (data, not a hardcoded order).
// Precedence is exceptions-win: R8(B) 50 > R8(A) 40 > R8 base 30. It selects the surfaced
// EXPLANATION, not eligibility — every applied clause already means "eligible".
describe('evaluateR8Ladder — overlap resolved by payload precedence (AC3.7)', () => {
  it('base-90%-met AND mid-contribution death → R8(B) wins (precedence 50 > 30)', () => {
    const r = evaluateR8Ladder(
      resolvedR8Clauses(),
      ctx(
        facts({
          ...ILLNESS,
          [R7F.TOTAL_COUNT]: 10,
          [F.COMPLIANCE_PERCENT]: 95,
          [CF.MID_CONTRIBUTION_DEATH]: true,
        }),
      ),
    );
    const applied = r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId).sort();
    expect(applied).toEqual(['niy.ninety-percent-rule.r8', 'niy.ninety-percent-rule.r8-b']);
    expect(r.applicableClauseId).toBe('niy.ninety-percent-rule.r8-b');
    expect(r.applicableResult?.result.decision).toBe('mid_contribution_eligible');
  });

  it('base-90%-met AND single-skip+prior-100% (no mid-death) → R8(A) wins (precedence 40 > 30)', () => {
    const r = evaluateR8Ladder(
      resolvedR8Clauses(),
      ctx(
        facts({
          ...ILLNESS,
          [R7F.TOTAL_COUNT]: 10,
          [R7F.SKIPS_CURRENT_YEAR]: 1,
          [F.PRIOR_PERIOD_FULL_COMPLIANCE]: true,
          [F.COMPLIANCE_PERCENT]: 90,
        }),
      ),
    );
    const applied = r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId).sort();
    expect(applied).toEqual(['niy.ninety-percent-rule.r8', 'niy.ninety-percent-rule.r8-a']);
    expect(r.applicableClauseId).toBe('niy.ninety-percent-rule.r8-a');
    expect(r.applicableResult?.result.decision).toBe('skip_allowance_granted');
  });

  it('single-skip + prior-100% AND mid-contribution death → R8(B) wins (precedence 50 > 40)', () => {
    const r = evaluateR8Ladder(
      resolvedR8Clauses(),
      ctx(
        facts({
          ...ILLNESS,
          [R7F.TOTAL_COUNT]: 10,
          [R7F.SKIPS_CURRENT_YEAR]: 1,
          [F.PRIOR_PERIOD_FULL_COMPLIANCE]: true,
          [F.COMPLIANCE_PERCENT]: 85,
          [CF.MID_CONTRIBUTION_DEATH]: true,
        }),
      ),
    );
    const applied = r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId).sort();
    expect(applied).toEqual(['niy.ninety-percent-rule.r8-a', 'niy.ninety-percent-rule.r8-b']);
    expect(r.applicableClauseId).toBe('niy.ninety-percent-rule.r8-b');
  });

  it('all three overlap (90%-met + single-skip + prior-100% + mid-death) → R8(B) wins (highest precedence)', () => {
    const r = evaluateR8Ladder(
      resolvedR8Clauses(),
      ctx(
        facts({
          ...ILLNESS,
          [R7F.TOTAL_COUNT]: 10,
          [R7F.SKIPS_CURRENT_YEAR]: 1,
          [F.PRIOR_PERIOD_FULL_COMPLIANCE]: true,
          [F.COMPLIANCE_PERCENT]: 90,
          [CF.MID_CONTRIBUTION_DEATH]: true,
        }),
      ),
    );
    const applied = r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId).sort();
    expect(applied).toEqual([
      'niy.ninety-percent-rule.r8',
      'niy.ninety-percent-rule.r8-a',
      'niy.ninety-percent-rule.r8-b',
    ]);
    expect(r.applicableClauseId).toBe('niy.ninety-percent-rule.r8-b');
  });

  it('R8(A) rescues a member who fails the base 90% gate (single skip, prior 100%, compliance 85)', () => {
    const r = evaluateR8Ladder(
      resolvedR8Clauses(),
      ctx(
        facts({
          ...ILLNESS,
          [R7F.TOTAL_COUNT]: 10,
          [R7F.SKIPS_CURRENT_YEAR]: 1,
          [F.PRIOR_PERIOD_FULL_COMPLIANCE]: true,
          [F.COMPLIANCE_PERCENT]: 85,
        }),
      ),
    );
    // Base R8 did NOT apply (compliance 85 < 90) but the member is still eligible via R8(A).
    expect(r.applicableClauseId).toBe('niy.ninety-percent-rule.r8-a');
    const base = r.perClauseResults.find((x) => x.clauseId === 'niy.ninety-percent-rule.r8');
    expect(base?.applied).toBe(false);
  });
});

// Tie-break: when two applied clauses share the same payload precedence, the pick is
// deterministic (lowest clause_id), never insertion/hash-map order.
describe('evaluateR8Ladder — precedence tie-break (deterministic, lowest clause_id wins)', () => {
  it('equal precedence between two applied clauses resolves to the lowest clause_id', () => {
    // Override R8(A)'s precedence to match R8 base's (30) — both R8 base and R8(A) apply.
    const tiedPayload = { ...R8_PAYLOADS['niy.ninety-percent-rule.r8-a']!, precedence: 30 };
    const clauses = resolvedR8Clauses({ 'niy.ninety-percent-rule.r8-a': tiedPayload });
    const r = evaluateR8Ladder(
      clauses,
      ctx(
        facts({
          ...ILLNESS,
          [R7F.TOTAL_COUNT]: 10,
          [R7F.SKIPS_CURRENT_YEAR]: 1,
          [F.PRIOR_PERIOD_FULL_COMPLIANCE]: true,
          [F.COMPLIANCE_PERCENT]: 90,
        }),
      ),
    );
    const applied = r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId).sort();
    expect(applied).toEqual(['niy.ninety-percent-rule.r8', 'niy.ninety-percent-rule.r8-a']);
    // Tie broken by lowest clause_id: 'niy.ninety-percent-rule.r8' < '...r8-a' lexicographically.
    expect(r.applicableClauseId).toBe('niy.ninety-percent-rule.r8');
  });
});

// AC2.4 — illness-only gate enforced as DATA (a precondition, not a hardcoded branch).
describe('evaluateR8Ladder — illness-only gate (AC2.4)', () => {
  it('an accident-classified death does NOT apply even at 100% compliance', () => {
    const r = evaluateR8Ladder(
      resolvedR8Clauses(),
      // Everything a 90%-met member needs EXCEPT the death is an accident.
      ctx(facts({ [R7F.TOTAL_COUNT]: 20, [F.COMPLIANCE_PERCENT]: 100, [CF.MID_CONTRIBUTION_DEATH]: true })),
    );
    expect(r.applicableClauseId).toBeNull();
    expect(r.perClauseResults.every((c) => !c.applied)).toBe(true);
  });

  it('the same contribution facts DO apply once the death is reclassified illness', () => {
    const r = evaluateR8Ladder(
      resolvedR8Clauses(),
      ctx(facts({ ...ILLNESS, [R7F.TOTAL_COUNT]: 20, [F.COMPLIANCE_PERCENT]: 100 })),
    );
    expect(r.applicableClauseId).toBe('niy.ninety-percent-rule.r8');
    expect(r.applicableResult?.result.decision).toBe('ninety_percent_met');
  });
});

// The applies-vs-90%-failed distinction is read from the base clause's subClauseResults
// (illness pass + >= 10 pass + >= 90 FAIL ⇒ "subject to R8 but failed the threshold").
describe('evaluateR8Ladder — base subClauseResults distinguish "R8 applies but 90% failed"', () => {
  it('illness + >= 10 pass but compliance < 90 fails → base not applied, but the failing sub-condition is legible', () => {
    const r = evaluateR8Ladder(
      resolvedR8Clauses(),
      ctx(facts({ ...ILLNESS, [R7F.TOTAL_COUNT]: 15, [F.COMPLIANCE_PERCENT]: 80 })),
    );
    expect(r.applicableClauseId).toBeNull(); // no exception rescues; base 90% failed
    const base = r.perClauseResults.find((x) => x.clauseId === 'niy.ninety-percent-rule.r8');
    const sub = base?.result.subClauseResults ?? [];
    // Order mirrors the payload all_of: [illness, total_count>=10, compliance>=90].
    expect(sub.map((s) => s.passed)).toEqual([true, true, false]);
  });
});

// Boundary values — the strict/inclusive edges of each operator.
describe('evaluateR8Ladder — boundary values', () => {
  it('R8 compliance_percent: 89 (< 90) does not apply, 90 (=== 90) applies', () => {
    const base = { ...ILLNESS, [R7F.TOTAL_COUNT]: 10 };
    expect(
      evaluateR8Ladder(resolvedR8Clauses(), ctx(facts({ ...base, [F.COMPLIANCE_PERCENT]: 89 }))).applicableClauseId,
    ).toBeNull();
    expect(
      evaluateR8Ladder(resolvedR8Clauses(), ctx(facts({ ...base, [F.COMPLIANCE_PERCENT]: 90 }))).applicableClauseId,
    ).toBe('niy.ninety-percent-rule.r8');
  });

  it('R8 total_count: 9 (< 10) does not apply, 10 (>= 10) applies', () => {
    const base = { ...ILLNESS, [F.COMPLIANCE_PERCENT]: 95 };
    expect(
      evaluateR8Ladder(resolvedR8Clauses(), ctx(facts({ ...base, [R7F.TOTAL_COUNT]: 9 }))).applicableClauseId,
    ).toBeNull();
    expect(
      evaluateR8Ladder(resolvedR8Clauses(), ctx(facts({ ...base, [R7F.TOTAL_COUNT]: 10 }))).applicableClauseId,
    ).toBe('niy.ninety-percent-rule.r8');
  });

  it('R8(A) skips_current_year: 1 → applies, 0 and 2 → does not (exact == 1)', () => {
    // total_count 10 + prior 100% + compliance 85 (base fails) → R8(A) hinges solely on skips == 1.
    const base = {
      ...ILLNESS,
      [R7F.TOTAL_COUNT]: 10,
      [F.PRIOR_PERIOD_FULL_COMPLIANCE]: true,
      [F.COMPLIANCE_PERCENT]: 85,
    };
    expect(
      evaluateR8Ladder(resolvedR8Clauses(), ctx(facts({ ...base, [R7F.SKIPS_CURRENT_YEAR]: 1 }))).applicableClauseId,
    ).toBe('niy.ninety-percent-rule.r8-a');
    expect(
      evaluateR8Ladder(resolvedR8Clauses(), ctx(facts({ ...base, [R7F.SKIPS_CURRENT_YEAR]: 0 }))).applicableClauseId,
    ).toBeNull();
    expect(
      evaluateR8Ladder(resolvedR8Clauses(), ctx(facts({ ...base, [R7F.SKIPS_CURRENT_YEAR]: 2 }))).applicableClauseId,
    ).toBeNull();
  });

  it('R8(A) prior_period_full_compliance: true → applies, false → does not (exact boolean gate)', () => {
    // total_count 10 + skip==1 + compliance 85 (base fails) → R8(A) hinges solely on prior_period_full_compliance.
    const base = {
      ...ILLNESS,
      [R7F.TOTAL_COUNT]: 10,
      [R7F.SKIPS_CURRENT_YEAR]: 1,
      [F.COMPLIANCE_PERCENT]: 85,
    };
    expect(
      evaluateR8Ladder(
        resolvedR8Clauses(),
        ctx(facts({ ...base, [F.PRIOR_PERIOD_FULL_COMPLIANCE]: true })),
      ).applicableClauseId,
    ).toBe('niy.ninety-percent-rule.r8-a');
    expect(
      evaluateR8Ladder(
        resolvedR8Clauses(),
        ctx(facts({ ...base, [F.PRIOR_PERIOD_FULL_COMPLIANCE]: false })),
      ).applicableClauseId,
    ).toBeNull();
  });
});

// Determinism (AR-57) — byte-identical repeated evaluation + reproducible hashes.
describe('evaluateR8Ladder — determinism (AR-57)', () => {
  const scenarioFacts = facts({
    ...ILLNESS,
    [R7F.TOTAL_COUNT]: 10,
    [R7F.SKIPS_CURRENT_YEAR]: 1,
    [F.PRIOR_PERIOD_FULL_COMPLIANCE]: true,
    [F.COMPLIANCE_PERCENT]: 90,
    [CF.MID_CONTRIBUTION_DEATH]: true,
  });

  it('same (clauses, ctx) → byte-identical R8LadderResult across repeated runs', () => {
    const build = () =>
      canonicalJsonStringify(evaluateR8Ladder(resolvedR8Clauses(), ctx(scenarioFacts)) as never);
    const a = build();
    const b = build();
    const c = build();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('fact insertion order does not affect the result (canonical hashing)', () => {
    const f1: Facts = {};
    f1[CF.DEATH_CLASSIFICATION] = 'illness';
    f1[R7F.TOTAL_COUNT] = 10;
    f1[F.COMPLIANCE_PERCENT] = 90;
    const f2: Facts = {};
    f2[F.COMPLIANCE_PERCENT] = 90;
    f2[R7F.TOTAL_COUNT] = 10;
    f2[CF.DEATH_CLASSIFICATION] = 'illness';
    const r1 = canonicalJsonStringify(evaluateR8Ladder(resolvedR8Clauses(), ctx(facts(f1))) as never);
    const r2 = canonicalJsonStringify(evaluateR8Ladder(resolvedR8Clauses(), ctx(facts(f2))) as never);
    expect(r1).toBe(r2);
  });

  it('clause input order does not affect the result (ladder sorts by clause_id)', () => {
    const forward = resolvedR8Clauses();
    const reversed = [...forward].reverse();
    const rf = canonicalJsonStringify(evaluateR8Ladder(forward, ctx(scenarioFacts)) as never);
    const rr = canonicalJsonStringify(evaluateR8Ladder(reversed, ctx(scenarioFacts)) as never);
    expect(rf).toBe(rr);
  });

  it('per-clause payload_hash is reproducible (64-hex) for every sub-clause', () => {
    const r = evaluateR8Ladder(resolvedR8Clauses(), ctx(scenarioFacts));
    for (const c of r.perClauseResults) {
      expect(c.result.provenance.payloadHash).toHaveLength(64);
    }
    // ...and stable across a second run.
    const r2 = evaluateR8Ladder(resolvedR8Clauses(), ctx(scenarioFacts));
    expect(r.perClauseResults.map((c) => c.result.provenance.payloadHash)).toEqual(
      r2.perClauseResults.map((c) => c.result.provenance.payloadHash),
    );
  });
});

// Malformed payload / facts — typed reason, never a throw (carried from 4.1).
describe('evaluateR8Ladder — malformed input (never throws)', () => {
  it('a malformed sub-clause payload is not applied; the ladder still resolves', () => {
    // r8-b is garbage → payload_unrecognized → not applied. Facts otherwise trigger both r8-b
    // (mid-death) AND the r8 base (90% met); with r8-b inert the base becomes applicable.
    const clauses = resolvedR8Clauses({ 'niy.ninety-percent-rule.r8-b': { hello: 'world' } });
    const r = evaluateR8Ladder(
      clauses,
      ctx(
        facts({
          ...ILLNESS,
          [R7F.TOTAL_COUNT]: 10,
          [F.COMPLIANCE_PERCENT]: 90,
          [CF.MID_CONTRIBUTION_DEATH]: true,
        }),
      ),
    );
    const bEntry = r.perClauseResults.find((x) => x.clauseId === 'niy.ninety-percent-rule.r8-b');
    expect(bEntry?.applied).toBe(false);
    expect(bEntry?.result.reasonCode).toBe('rule.payload_unrecognized');
    // With R8(B) inert, the 90%-met facts still satisfy the base R8 → it becomes applicable.
    expect(r.applicableClauseId).toBe('niy.ninety-percent-rule.r8');
  });

  it('malformed (non-numeric) compliance_percent does not throw — the clause simply does not apply', () => {
    const bad: Facts = facts({ ...ILLNESS, [R7F.TOTAL_COUNT]: 10, [F.COMPLIANCE_PERCENT]: 'ninety' as unknown as number });
    const r = evaluateR8Ladder(resolvedR8Clauses(), ctx(bad));
    expect(r.applicableClauseId).toBeNull(); // fact_gte on a string fails → R8 base not applied
    expect(r.perClauseResults).toHaveLength(3);
  });
});
