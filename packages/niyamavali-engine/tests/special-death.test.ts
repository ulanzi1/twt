// Pure special-death + concealment tests — Story 4.4 (Task 6; DB-free determinism + matrix).
//
// Mirrors the 4.1/4.2/4.3 determinism style (AR-57): no `fast-check`; determinism is proven by
// REPEATED evaluation → byte-identical bytes across an explicit scenario matrix. Story 4.6 runs
// this family 100× across threads and fails CI as a P0 on any byte-variance.
//
// The payloads below are contractual EXAMPLES mirroring packages/domain/seed/niyamavali-v1-clauses.sql
// (the Story 4.4 special-death block + amended r14) — they pin the fact-key names/types/semantics
// the family depends on; they are NOT a mock of the future claim/disclosure subsystems.
//
// LOAD-BEARING (SM-1 C7): every applicable decision is a ROUTING slug or a FLAG — NEVER a deny.

import { canonicalJsonStringify, ids } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  CONCEALMENT_CLAUSE_ID,
  CONCEALMENT_FACT_KEYS,
  CONCEALMENT_REVIEW_FLAG,
  evaluateSpecialDeathLadder,
  interpretClause,
  SPECIAL_DEATH_CLAIM_FACT_KEYS,
  SPECIAL_DEATH_CLAUSE_IDS,
  SPECIAL_DEATH_NOT_APPLICABLE,
} from '../src/index.js';
import type { ResolvedClause, ResolvedEvaluationContext, Facts } from '../src/index.js';
import {
  CONCEALMENT_PAYLOAD,
  CONCEALMENT_VERSION_ID,
  NO_SPECIAL_DEATH_FACTS,
  SPECIAL_DEATH_FIXTURE_CLAUSE_IDS,
  SPECIAL_DEATH_PAYLOADS,
  SPECIAL_DEATH_VERSION_IDS,
} from './fixtures/special-death-clauses.js';

const CF = SPECIAL_DEATH_CLAIM_FACT_KEYS;
const XF = CONCEALMENT_FACT_KEYS;

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const AT = new Date('2025-06-01T00:00:00.000Z');

/** The routing/flag decision vocabulary the family is allowed to emit — NEVER a deny/ineligible. */
const ALLOWED_DECISIONS = new Set([
  'route_actual_cause_governs',
  'route_core_team_discretion',
  'route_state_trustee_review',
  'route_recovery_assistance',
  'route_r9_voting',
  SPECIAL_DEATH_NOT_APPLICABLE,
]);

/** Build the seven resolved special-death clauses (optionally overriding one clause's payload). */
function resolvedFamily(overrides: Record<string, Record<string, unknown>> = {}): ResolvedClause[] {
  return SPECIAL_DEATH_CLAUSE_IDS.map((cid) => ({
    clauseId: ids.clauseId(cid),
    clauseVersionId: ids.clauseVersionId(SPECIAL_DEATH_VERSION_IDS[cid]!),
    payload: overrides[cid] ?? SPECIAL_DEATH_PAYLOADS[cid]!,
    benefitMechanism: 'pool' as const,
  }));
}

/** Build the resolved R14 concealment clause (its own single-clause family — no ladder). */
function resolvedConcealment(payload: Record<string, unknown> = { ...CONCEALMENT_PAYLOAD }): ResolvedClause {
  return {
    clauseId: ids.clauseId(CONCEALMENT_CLAUSE_ID),
    clauseVersionId: ids.clauseVersionId(CONCEALMENT_VERSION_ID),
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
    resolvedClauseVersionIds: SPECIAL_DEATH_CLAUSE_IDS.map((cid) =>
      ids.clauseVersionId(SPECIAL_DEATH_VERSION_IDS[cid]!),
    ),
  };
}

function facts(overrides: Facts): Facts {
  return { ...(NO_SPECIAL_DEATH_FACTS as Facts), ...overrides };
}

describe('special-death fixtures — sanity', () => {
  it('SPECIAL_DEATH_FIXTURE_CLAUSE_IDS covers exactly the seven family clause ids', () => {
    expect(SPECIAL_DEATH_FIXTURE_CLAUSE_IDS).toEqual([...SPECIAL_DEATH_CLAUSE_IDS]);
  });
});

describe('evaluateSpecialDeathLadder — stable structure', () => {
  it('emits all seven sub-clause results sorted by clause_id (never hash-map order)', () => {
    const r = evaluateSpecialDeathLadder(resolvedFamily(), ctx(facts({})));
    expect(r.perClauseResults.map((c) => c.clauseId)).toEqual([...SPECIAL_DEATH_CLAUSE_IDS]);
  });

  it('resolves to no applicable clause when no special-death precondition is met', () => {
    const r = evaluateSpecialDeathLadder(resolvedFamily(), ctx(facts({})));
    expect(r.applicableClauseId).toBeNull();
    expect(r.applicableResult).toBeNull();
    expect(r.perClauseResults.every((c) => !c.applied)).toBe(true);
    expect(r.missingClauseIds).toEqual([]);
  });
});

// AC1 / AC3 — facts satisfying exactly one sub-clause identify that special-case path.
describe('evaluateSpecialDeathLadder — one applicable sub-clause', () => {
  const cases: Array<{ label: string; clauseId: string; decision: string; facts: Facts }> = [
    {
      label: 'R5(C.2) honestly-declared pre-existing',
      clauseId: 'niy.special-death.r5-c-2',
      decision: 'route_actual_cause_governs',
      facts: facts({ [CF.HONESTLY_DECLARED_PREEXISTING]: true }),
    },
    {
      label: 'R5(D) core-team discretion',
      clauseId: 'niy.special-death.r5-d',
      decision: 'route_core_team_discretion',
      facts: facts({ [CF.LEGAL_CLAIM_ASSERTED]: true }),
    },
    {
      label: 'R5(E) multi-nominee dispute',
      clauseId: 'niy.special-death.r5-e',
      decision: 'route_state_trustee_review',
      facts: facts({ [CF.MULTI_NOMINEE_DISPUTE]: true }),
    },
    {
      label: 'R5(F) erroneous excess transfer',
      clauseId: 'niy.special-death.r5-f',
      decision: 'route_recovery_assistance',
      facts: facts({ [CF.ERRONEOUS_EXCESS_TRANSFER]: true }),
    },
    {
      label: 'R9 suicide → voting',
      clauseId: 'niy.special-death.r9',
      decision: 'route_r9_voting',
      facts: facts({ [CF.DEATH_CLASSIFICATION]: 'suicide' }),
    },
    {
      label: 'R9(A) multiple deaths same date',
      clauseId: 'niy.special-death.r9-a',
      decision: 'route_r9_voting',
      facts: facts({ [CF.MULTIPLE_DEATHS_SAME_DATE]: true }),
    },
    {
      label: 'Mar-2025 murder + nominee accused',
      clauseId: 'niy.special-death.r9-suicide-murder',
      // murder + nominee-accused satisfies BOTH R9 (∈ {suicide,murder}) and Mar-2025; Mar-2025 wins.
      decision: 'route_r9_voting',
      facts: facts({ [CF.DEATH_CLASSIFICATION]: 'murder', [CF.NOMINEE_ACCUSED]: true }),
    },
  ];

  for (const c of cases) {
    it(`${c.label} applies → ${c.decision}`, () => {
      const r = evaluateSpecialDeathLadder(resolvedFamily(), ctx(c.facts));
      expect(r.applicableClauseId).toBe(c.clauseId);
      expect(r.applicableResult?.result.decision).toBe(c.decision);
    });
  }
});

// AC3 — R9 special-case routes to voting; the applicable sub-clause + voting metadata are carried.
describe('evaluateSpecialDeathLadder — R9 voting route (AC3)', () => {
  it('a plain suicide (nominee not accused) routes to R9 voting via the R9 base clause', () => {
    const r = evaluateSpecialDeathLadder(
      resolvedFamily(),
      ctx(facts({ [CF.DEATH_CLASSIFICATION]: 'suicide' })),
    );
    expect(r.applicableClauseId).toBe('niy.special-death.r9');
    expect(r.applicableResult?.result.decision).toBe('route_r9_voting');
    // AC3 scope (mirrors D4's AC2 narrowing): the engine's result carries provenance ONLY — the
    // consumer re-fetches `voting_required`/`majority_required` from the payload via
    // `clauseVersionId`. Assert the REAL provenance handle, not the static fixture against itself.
    expect(r.applicableResult?.provenance.clauseVersionId).toBe(
      SPECIAL_DEATH_VERSION_IDS['niy.special-death.r9'],
    );
    expect(SPECIAL_DEATH_PAYLOADS['niy.special-death.r9']!['voting_required']).toBe(true);
    expect(SPECIAL_DEATH_PAYLOADS['niy.special-death.r9']!['majority_required']).toBe(true);
  });
});

// Precedence resolves overlaps by DATA (exceptions/most-specific win): Mar-2025 80 > R9 60 > R9(A) 50.
describe('evaluateSpecialDeathLadder — overlap resolved by payload precedence', () => {
  it('murder + nominee accused → both R9 and Mar-2025 apply → Mar-2025 wins (80 > 60)', () => {
    const r = evaluateSpecialDeathLadder(
      resolvedFamily(),
      ctx(facts({ [CF.DEATH_CLASSIFICATION]: 'murder', [CF.NOMINEE_ACCUSED]: true })),
    );
    const applied = r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId).sort();
    expect(applied).toEqual(['niy.special-death.r9', 'niy.special-death.r9-suicide-murder']);
    expect(r.applicableClauseId).toBe('niy.special-death.r9-suicide-murder');
  });

  it('suicide + multiple-deaths-same-date → R9 (60) beats R9(A) (50)', () => {
    const r = evaluateSpecialDeathLadder(
      resolvedFamily(),
      ctx(facts({ [CF.DEATH_CLASSIFICATION]: 'suicide', [CF.MULTIPLE_DEATHS_SAME_DATE]: true })),
    );
    const applied = r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId).sort();
    expect(applied).toEqual(['niy.special-death.r9', 'niy.special-death.r9-a']);
    expect(r.applicableClauseId).toBe('niy.special-death.r9');
  });

  it('a suicide with nominee NOT accused does not trip Mar-2025 (only R9 applies)', () => {
    const r = evaluateSpecialDeathLadder(
      resolvedFamily(),
      ctx(facts({ [CF.DEATH_CLASSIFICATION]: 'suicide', [CF.NOMINEE_ACCUSED]: false })),
    );
    const applied = r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId);
    expect(applied).toEqual(['niy.special-death.r9']);
  });
});

// Tie-break: equal precedence → deterministic lowest clause_id (never insertion/hash-map order).
describe('evaluateSpecialDeathLadder — precedence tie-break (lowest clause_id wins)', () => {
  it('equal precedence between two applied clauses resolves to the lowest clause_id', () => {
    // Override R9(A)'s precedence to match R9's (60) — both apply on a suicide + multi-death.
    const tied = { ...SPECIAL_DEATH_PAYLOADS['niy.special-death.r9-a']!, precedence: 60 };
    const r = evaluateSpecialDeathLadder(
      resolvedFamily({ 'niy.special-death.r9-a': tied }),
      ctx(facts({ [CF.DEATH_CLASSIFICATION]: 'suicide', [CF.MULTIPLE_DEATHS_SAME_DATE]: true })),
    );
    const applied = r.perClauseResults.filter((x) => x.applied).map((x) => x.clauseId).sort();
    expect(applied).toEqual(['niy.special-death.r9', 'niy.special-death.r9-a']);
    // 'niy.special-death.r9' < 'niy.special-death.r9-a' lexicographically → R9 wins the tie.
    expect(r.applicableClauseId).toBe('niy.special-death.r9');
  });
});

// SM-1 C7 — the load-bearing invariant: the family NEVER produces a deny/ineligible decision.
describe('evaluateSpecialDeathLadder — NEVER auto-deny (SM-1 C7)', () => {
  it('no family payload has a deny/ineligible on_pass/on_fail slug', () => {
    for (const cid of SPECIAL_DEATH_CLAUSE_IDS) {
      const p = SPECIAL_DEATH_PAYLOADS[cid]!;
      expect(ALLOWED_DECISIONS.has(p['on_pass'] as string)).toBe(true);
      expect(p['on_fail']).toBe(SPECIAL_DEATH_NOT_APPLICABLE);
      expect(String(p['on_pass'])).not.toMatch(/deny|ineligible|reject/i);
      expect(p['never_auto_deny']).toBe(true);
    }
  });

  it('across every single-clause scenario, the applicable decision is always a routing slug', () => {
    const scenarios: Facts[] = [
      facts({ [CF.HONESTLY_DECLARED_PREEXISTING]: true }),
      facts({ [CF.LEGAL_CLAIM_ASSERTED]: true }),
      facts({ [CF.MULTI_NOMINEE_DISPUTE]: true }),
      facts({ [CF.ERRONEOUS_EXCESS_TRANSFER]: true }),
      facts({ [CF.DEATH_CLASSIFICATION]: 'suicide' }),
      facts({ [CF.MULTIPLE_DEATHS_SAME_DATE]: true }),
      facts({ [CF.DEATH_CLASSIFICATION]: 'murder', [CF.NOMINEE_ACCUSED]: true }),
    ];
    for (const f of scenarios) {
      const r = evaluateSpecialDeathLadder(resolvedFamily(), ctx(f));
      expect(r.applicableResult).not.toBeNull();
      expect(ALLOWED_DECISIONS.has(r.applicableResult!.result.decision)).toBe(true);
      expect(r.applicableResult!.result.decision).not.toMatch(/deny|ineligible/i);
    }
  });
});

// SM-1 C7 — R14 concealment-flagged evaluation (scoped per D4: flag + clause_id/version only).
describe('R14 concealment — flag, never a deny verdict (SM-1 C7; D4 scope)', () => {
  it('undeclared IMA condition linked to death → concealment_review_required flag + routing slug', () => {
    const r = interpretClause(
      resolvedConcealment(),
      ctx(facts({ [XF.CONCEALED_IMA_CONDITION_LINKED]: true })),
    );
    // NOT a deny verdict — the decision is a routing slug.
    expect(r.result.decision).toBe('route_state_trustee_review');
    expect(r.result.decision).not.toMatch(/deny|ineligible/i);
    // The special flag surfaces via the interpreter's flag_if_true seam.
    expect(r.result.specialFlags).toEqual([CONCEALMENT_REVIEW_FLAG]);
    // References clause_id niy.concealment.r14 + carries clauseVersionId provenance (D4 scope).
    expect(r.provenance.clauseId).toBe('niy.concealment.r14');
    expect(r.provenance.clauseVersionId).toBe(CONCEALMENT_VERSION_ID);
    // D4: provenance carries fact KEYS only (PII-free) — never fact VALUES / a disclosure-event list.
    const summary = r.provenance.inputsSummary as { fact_keys: string[] };
    expect(summary.fact_keys).toContain(XF.CONCEALED_IMA_CONDITION_LINKED);
  });

  it('R5(C.2) honest declaration → NO concealment flag (complementary, not conflicting)', () => {
    // The honest-declarer's producer sets concealed=false → the concealment clause does not fire…
    const honestFacts = facts({
      [CF.HONESTLY_DECLARED_PREEXISTING]: true,
      [XF.CONCEALED_IMA_CONDITION_LINKED]: false,
    });
    const conc = interpretClause(resolvedConcealment(), ctx(honestFacts));
    expect(conc.result.decision).toBe('concealment_not_applicable');
    expect(conc.result.specialFlags).toEqual([]);
    // …and R5(C.2) affirms eligibility via the actual cause (the two are complementary).
    const fam = evaluateSpecialDeathLadder(resolvedFamily(), ctx(honestFacts));
    expect(fam.applicableClauseId).toBe('niy.special-death.r5-c-2');
    expect(fam.applicableResult?.result.decision).toBe('route_actual_cause_governs');
  });

  it('concealment on_pass/on_fail are routing/flag slugs — never a deny', () => {
    expect(CONCEALMENT_PAYLOAD['on_pass']).toBe('route_state_trustee_review');
    expect(CONCEALMENT_PAYLOAD['on_fail']).toBe('concealment_not_applicable');
    expect(CONCEALMENT_PAYLOAD['never_auto_deny']).toBe(true);
    expect(String(CONCEALMENT_PAYLOAD['on_pass'])).not.toMatch(/deny|ineligible/i);
  });
});

// Determinism (AR-57) — byte-identical repeated evaluation + reproducible hashes.
describe('evaluateSpecialDeathLadder — determinism (AR-57)', () => {
  const scenarioFacts = facts({
    [CF.DEATH_CLASSIFICATION]: 'murder',
    [CF.NOMINEE_ACCUSED]: true,
    [CF.MULTIPLE_DEATHS_SAME_DATE]: true,
  });

  it('same (clauses, ctx) → byte-identical result across repeated runs', () => {
    const build = () =>
      canonicalJsonStringify(evaluateSpecialDeathLadder(resolvedFamily(), ctx(scenarioFacts)) as never);
    const a = build();
    const b = build();
    const c = build();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('fact insertion order does not affect the result (canonical hashing)', () => {
    const f1: Facts = {};
    f1[CF.DEATH_CLASSIFICATION] = 'murder';
    f1[CF.NOMINEE_ACCUSED] = true;
    const f2: Facts = {};
    f2[CF.NOMINEE_ACCUSED] = true;
    f2[CF.DEATH_CLASSIFICATION] = 'murder';
    const r1 = canonicalJsonStringify(evaluateSpecialDeathLadder(resolvedFamily(), ctx(facts(f1))) as never);
    const r2 = canonicalJsonStringify(evaluateSpecialDeathLadder(resolvedFamily(), ctx(facts(f2))) as never);
    expect(r1).toBe(r2);
  });

  it('clause input order does not affect the result (ladder sorts by clause_id)', () => {
    const forward = resolvedFamily();
    const reversed = [...forward].reverse();
    const rf = canonicalJsonStringify(evaluateSpecialDeathLadder(forward, ctx(scenarioFacts)) as never);
    const rr = canonicalJsonStringify(evaluateSpecialDeathLadder(reversed, ctx(scenarioFacts)) as never);
    expect(rf).toBe(rr);
  });

  it('per-clause payload_hash is reproducible (64-hex) for every sub-clause', () => {
    const r = evaluateSpecialDeathLadder(resolvedFamily(), ctx(scenarioFacts));
    for (const c of r.perClauseResults) {
      expect(c.result.provenance.payloadHash).toHaveLength(64);
    }
    const r2 = evaluateSpecialDeathLadder(resolvedFamily(), ctx(scenarioFacts));
    expect(r.perClauseResults.map((c) => c.result.provenance.payloadHash)).toEqual(
      r2.perClauseResults.map((c) => c.result.provenance.payloadHash),
    );
  });
});

// Malformed payload / facts — typed reason, never a throw (carried from 4.1).
describe('evaluateSpecialDeathLadder — malformed input (never throws)', () => {
  it('a malformed sub-clause payload is not applied; the ladder still resolves', () => {
    // r9 is garbage → payload_unrecognized → not applied. Facts otherwise trigger r9 (suicide) AND
    // r9-a (multi-death); with r9 inert, r9-a (precedence 50) becomes applicable.
    const clauses = resolvedFamily({ 'niy.special-death.r9': { hello: 'world' } });
    const r = evaluateSpecialDeathLadder(
      clauses,
      ctx(facts({ [CF.DEATH_CLASSIFICATION]: 'suicide', [CF.MULTIPLE_DEATHS_SAME_DATE]: true })),
    );
    const r9Entry = r.perClauseResults.find((x) => x.clauseId === 'niy.special-death.r9');
    expect(r9Entry?.applied).toBe(false);
    expect(r9Entry?.result.reasonCode).toBe('rule.payload_unrecognized');
    expect(r.applicableClauseId).toBe('niy.special-death.r9-a');
  });

  it('missing facts never throw — the family simply does not apply', () => {
    // Empty facts: no precondition can pass. interpret must not throw on absent facts.
    const r = evaluateSpecialDeathLadder(resolvedFamily(), ctx({} as Facts));
    expect(r.applicableClauseId).toBeNull();
    expect(r.perClauseResults).toHaveLength(7);
  });

  it('a malformed (non-string) death_classification does not throw — the clause does not apply', () => {
    const bad = facts({ [CF.DEATH_CLASSIFICATION]: 42 as unknown as string });
    const r = evaluateSpecialDeathLadder(resolvedFamily(), ctx(bad));
    expect(r.perClauseResults.find((x) => x.clauseId === 'niy.special-death.r9')?.applied).toBe(false);
    expect(r.applicableClauseId).toBeNull();
  });
});
