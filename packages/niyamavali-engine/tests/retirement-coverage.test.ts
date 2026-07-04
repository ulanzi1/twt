// Pure R12 retirement-coverage tests — Story 4.5 (Task 5; DB-free determinism + FR-12 matrix).
//
// Mirrors the 4.1/4.2/4.3/4.4 determinism style (AR-57): no `fast-check`; determinism is proven by
// REPEATED evaluation → byte-identical bytes across an explicit scenario matrix. Story 4.6 runs the
// pure core 100× across threads and fails CI as a P0 on any byte-variance — the new `computed.values`
// channel must hash byte-stably (values `CanonicalJsonValue`, keys explicitly sorted).
//
// The payload below is a contractual EXAMPLE mirroring packages/domain/seed/niyamavali-v1-clauses.sql
// (the Story 4.5 R12 block) — it pins the fact-key names/types/semantics the rule depends on; it is
// NOT a mock of the future tenure/retirement producer (Story 4.6 Validity Service).
//
// LOAD-BEARING: R12 COMPUTES `granted_years` (never a boolean decision) and EXTENDS eligibility —
// a non-retired member, or one below the min-years gate, is NOT-APPLICABLE, never a deny.
// `granted_years` = the tenure-derived `years_of_coverage_earned` (PRD FR-12A), independent of
// `is_retired`; `is_retired` is echoed separately (Story 4.6 gates `active` on it + the date projection).

import { canonicalJsonStringify, ids, type CanonicalJsonValue } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  interpretClause,
  R12_CLAUSE_ID,
  R12_GRANTED_YEARS_KEY,
  R12_IS_RETIRED_KEY,
  R12_MEMBER_FACT_KEYS,
  RETIREMENT_COVERAGE_COMPUTED,
  RETIREMENT_COVERAGE_NOT_APPLICABLE,
} from '../src/index.js';
import type { EvaluationResult, Facts, ResolvedClause, ResolvedEvaluationContext } from '../src/index.js';
import {
  NO_RETIREMENT_FACTS,
  R12_PAYLOAD,
  R12_VERSION_ID,
} from './fixtures/retirement-coverage-clauses.js';

const MF = R12_MEMBER_FACT_KEYS;

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const AT = new Date('2025-06-01T00:00:00.000Z');

/** Build the resolved R12 clause (optionally overriding the payload). */
function resolvedR12(payload: Record<string, unknown> = { ...R12_PAYLOAD }): ResolvedClause {
  return {
    clauseId: ids.clauseId(R12_CLAUSE_ID),
    clauseVersionId: ids.clauseVersionId(R12_VERSION_ID),
    payload,
    benefitMechanism: 'pool' as const,
  };
}

function ctx(facts: Facts): ResolvedEvaluationContext {
  return {
    pariwarId: PARIWAR,
    memberId: MEMBER,
    memberState: 'active',
    facts,
    evaluatedAt: AT,
    resolvedClauseVersionIds: [ids.clauseVersionId(R12_VERSION_ID)],
  };
}

/** A fact set for a member with `years` valid membership + the given retirement flag. */
function facts(years: number, isRetired: boolean): Facts {
  return {
    ...(NO_RETIREMENT_FACTS as Facts),
    [MF.VALID_MEMBERSHIP_YEARS]: years,
    [MF.IS_RETIRED]: isRetired,
  };
}

function grantedYears(r: EvaluationResult): CanonicalJsonValue | undefined {
  return r.result.computed?.values[R12_GRANTED_YEARS_KEY];
}

describe('R12 grant ladder — the FR-12 worked examples (retired members)', () => {
  const cases: Array<{ years: number; granted: number }> = [
    { years: 5, granted: 1 }, //  5yr → +1
    { years: 10, granted: 2 }, // 10yr → +2
    { years: 15, granted: 3 }, // 15yr → +3 (the epic's worked example, epics.md:1974)
    { years: 20, granted: 4 }, // 20yr → +4 (ladder continues; no cap in v1)
  ];

  for (const c of cases) {
    it(`${c.years}yr valid membership (retired) → +${c.granted} year(s), computed`, () => {
      const r = interpretClause(resolvedR12(), ctx(facts(c.years, true)));
      expect(r.result.decision).toBe(RETIREMENT_COVERAGE_COMPUTED);
      expect(grantedYears(r)).toBe(c.granted);
      expect(r.result.computed?.values[R12_IS_RETIRED_KEY]).toBe(true);
      expect(r.reasonCode).toBe(`rule.${RETIREMENT_COVERAGE_COMPUTED}`);
    });
  }
});

describe('R12 grant ladder — boundary integers (floor + min_years gate)', () => {
  const cases: Array<{ years: number; granted: number; applicable: boolean }> = [
    { years: 0, granted: 0, applicable: false },
    { years: 4, granted: 0, applicable: false }, //  below min_years (5) → 0 / not-applicable
    { years: 5, granted: 1, applicable: true }, //   exactly at the gate → +1
    { years: 6, granted: 1, applicable: true },
    { years: 9, granted: 1, applicable: true }, //   floor(9/5)=1
    { years: 10, granted: 2, applicable: true }, //  floor(10/5)=2
    { years: 14, granted: 2, applicable: true },
    { years: 15, granted: 3, applicable: true },
  ];

  for (const c of cases) {
    it(`${c.years}yr (retired) → granted ${c.granted}, ${c.applicable ? 'computed' : 'not-applicable'}`, () => {
      const r = interpretClause(resolvedR12(), ctx(facts(c.years, true)));
      expect(grantedYears(r)).toBe(c.granted);
      expect(r.result.decision).toBe(
        c.applicable ? RETIREMENT_COVERAGE_COMPUTED : RETIREMENT_COVERAGE_NOT_APPLICABLE,
      );
    });
  }
});

describe('R12 — extension, never a denial (Epic 4 never-auto-deny posture)', () => {
  it('a retired member below the min-years gate is not-applicable, NOT ineligible', () => {
    const r = interpretClause(resolvedR12(), ctx(facts(3, true)));
    expect(r.result.decision).toBe(RETIREMENT_COVERAGE_NOT_APPLICABLE);
    expect(grantedYears(r)).toBe(0);
    expect(r.result.decision).not.toMatch(/deny|ineligible|reject/i);
    expect(r.result.specialFlags).toEqual([]);
  });

  it('a NON-retired member is not-applicable — but granted_years still reflects EARNED coverage (PRD years_of_coverage_earned)', () => {
    // granted_years is a pure function of tenure (D2-i formula reads valid_membership_years only);
    // is_retired is echoed separately so Story 4.6 gates `active` + the date projection on it.
    const r = interpretClause(resolvedR12(), ctx(facts(10, false)));
    expect(r.result.decision).toBe(RETIREMENT_COVERAGE_NOT_APPLICABLE);
    expect(grantedYears(r)).toBe(2); // earned by 10 years of tenure, even though not yet retired
    expect(r.result.computed?.values[R12_IS_RETIRED_KEY]).toBe(false);
    expect(r.result.decision).not.toMatch(/deny|ineligible|reject/i);
  });
});

describe('R12 — the engine emits granted_years ONLY (no engine date projection — D2-i)', () => {
  it('computed.values carries EXACTLY [granted_years, is_retired] in sorted order — no coverage_through/days_remaining/active', () => {
    const r = interpretClause(resolvedR12(), ctx(facts(15, true)));
    expect(r.result.computed).toBeDefined();
    // Keys emitted in explicitly sorted order (never hash-map order): granted_years < is_retired.
    expect(Object.keys(r.result.computed!.values)).toEqual([R12_GRANTED_YEARS_KEY, R12_IS_RETIRED_KEY]);
    // The date projection (coverage_through / days_remaining / active) is Story 4.6's job — NOT here.
    for (const k of ['coverage_through', 'days_remaining', 'active']) {
      expect(r.result.computed!.values).not.toHaveProperty(k);
    }
  });

  it('a conditional-rule result carries NO computed channel (byte-unchanged 4.1–4.4 shape)', () => {
    // Sanity: the computed channel is additive/optional — a non-computed clause never gets it.
    const conditional = {
      rule_kind: 'conditional',
      all_of: [{ op: 'member_state_in', states: ['active'] }],
      on_pass: 'ok',
      on_fail: 'no',
    };
    const r = interpretClause(resolvedR12(conditional), ctx(facts(15, true)));
    expect(r.result.computed).toBeUndefined();
  });
});

describe('R12 — determinism (AR-57)', () => {
  it('same (clause, ctx) → byte-identical result across repeated runs', () => {
    const build = () => canonicalJsonStringify(interpretClause(resolvedR12(), ctx(facts(15, true))) as never);
    const a = build();
    const b = build();
    const c = build();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('fact insertion order does not affect the result (canonical hashing)', () => {
    const f1: Facts = {};
    f1[MF.VALID_MEMBERSHIP_YEARS] = 15;
    f1[MF.IS_RETIRED] = true;
    const f2: Facts = {};
    f2[MF.IS_RETIRED] = true;
    f2[MF.VALID_MEMBERSHIP_YEARS] = 15;
    const r1 = canonicalJsonStringify(interpretClause(resolvedR12(), ctx(f1)) as never);
    const r2 = canonicalJsonStringify(interpretClause(resolvedR12(), ctx(f2)) as never);
    expect(r1).toBe(r2);
  });

  it('payload_hash is a reproducible 64-hex digest', () => {
    const r1 = interpretClause(resolvedR12(), ctx(facts(15, true)));
    const r2 = interpretClause(resolvedR12(), ctx(facts(15, true)));
    expect(r1.provenance.payloadHash).toHaveLength(64);
    expect(r1.provenance.payloadHash).toBe(r2.provenance.payloadHash);
  });
});

describe('R12 — malformed input never throws (typed reasons, no silent zero)', () => {
  it('a malformed computed payload → rule.payload_unrecognized (no computed channel)', () => {
    const r = interpretClause(resolvedR12({ rule_kind: 'computed', hello: 'world' }), ctx(facts(15, true)));
    expect(r.reasonCode).toBe('rule.payload_unrecognized');
    expect(r.result.computed).toBeUndefined();
  });

  it('an unknown computation vocabulary → rule.payload_unrecognized (never a throw)', () => {
    const bad = { ...R12_PAYLOAD, computation: 'no_such_computation' };
    const r = interpretClause(resolvedR12(bad), ctx(facts(15, true)));
    expect(r.reasonCode).toBe('rule.payload_unrecognized');
    expect(r.result.computed).toBeUndefined();
  });

  it('ABSENT input facts → rule.inputs_unavailable, NOT a silent granted_years:0 (CR-4.5-D1)', () => {
    // The whole point of CR-4.5-D1: an absent fact (producer has not derived it) must be
    // distinguishable from a genuine zero-tenure non-retiree — never silently computed as 0.
    const r = interpretClause(resolvedR12(), ctx({} as Facts));
    expect(r.reasonCode).toBe('rule.inputs_unavailable');
    expect(r.result.computed).toBeUndefined(); // no computed channel → NOT granted_years:0
    expect(r.result.decision).not.toMatch(/deny|ineligible/i);
  });

  it('a partially-present input set (only tenure, is_retired absent) → rule.inputs_unavailable', () => {
    const r = interpretClause(resolvedR12(), ctx({ [MF.VALID_MEMBERSHIP_YEARS]: 15 } as Facts));
    expect(r.reasonCode).toBe('rule.inputs_unavailable');
    expect(r.result.computed).toBeUndefined();
  });

  it('a present-but-wrong-type tenure (non-integer) → rule.inputs_unavailable, never a throw', () => {
    const r = interpretClause(
      resolvedR12(),
      ctx({ [MF.VALID_MEMBERSHIP_YEARS]: '15' as unknown as number, [MF.IS_RETIRED]: true } as Facts),
    );
    expect(r.reasonCode).toBe('rule.inputs_unavailable');
    expect(r.result.computed).toBeUndefined();
  });

  it('a non-integer numeric tenure (float) → rule.inputs_unavailable (producer contract: integer years)', () => {
    const r = interpretClause(resolvedR12(), ctx(facts(7.5, true)));
    expect(r.reasonCode).toBe('rule.inputs_unavailable');
    expect(r.result.computed).toBeUndefined();
  });
});
