// Pure interpreter tests — Story 4.1 (Task 8, DB-free determinism spine).
//
// interpretClause is the determinism heart: Story 4.6 runs it 100× across threads and
// fails CI as a P0 on any byte-variance. These prove: byte-identical result across
// repeated runs, stable sub-clause ordering, reproducible payload_hash, a malformed /
// unknown-operator payload → typed reason_code (never a throw), the special-flag seam
// (a flag is DATA, not an auto-deny), and the registered operator vocabulary.

import { canonicalJsonStringify, ids } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { sha256Hex } from '../src/hash.js';
import { interpretClause, OPERATOR_NAMES } from '../src/index.js';
import type {
  ResolvedClause,
  ResolvedEvaluationContext,
  Facts,
} from '../src/index.js';

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const CLAUSE = ids.clauseId('niy.test.fixture');
const CLAUSE_VERSION = ids.clauseVersionId('33333333-3333-3333-3333-333333333333');
const AT = new Date('2025-06-01T00:00:00.000Z');

/** A representative fixture clause — the interpreter proven WITHOUT any production rule logic. */
const FIXTURE_PAYLOAD = {
  rule_kind: 'conditional',
  // Structural display keys the registry/seed carries — tolerated via .passthrough().
  rule_code: 'FIXTURE-R0',
  title_en: 'Representative fixture rule',
  provisional: true,
  benefit_mechanism: 'pool',
  on_pass: 'eligible',
  on_fail: 'ineligible',
  all_of: [
    { op: 'member_state_in', states: ['active', 'active-in-grace'] },
    {
      op: 'fact_equals',
      fact: 'death_classification',
      value: 'natural',
      flag_if_false: 'manual_review_required',
    },
  ],
} as const;

function clause(payload: Record<string, unknown> = FIXTURE_PAYLOAD): ResolvedClause {
  return {
    clauseId: CLAUSE,
    clauseVersionId: CLAUSE_VERSION,
    payload,
    benefitMechanism: 'pool',
  };
}

function ctx(
  memberState: ResolvedEvaluationContext['memberState'],
  facts: Facts = {},
): ResolvedEvaluationContext {
  return {
    pariwarId: PARIWAR,
    memberId: MEMBER,
    memberState,
    facts,
    evaluatedAt: AT,
    resolvedClauseVersionIds: [CLAUSE_VERSION],
  };
}

describe('interpretClause — outcome', () => {
  it('all conditions pass → on_pass decision + rule.<decision> reason + no flags', () => {
    const r = interpretClause(clause(), ctx('active', { death_classification: 'natural' }));
    expect(r.result.decision).toBe('eligible');
    expect(r.reasonCode).toBe('rule.eligible');
    expect(r.result.specialFlags).toEqual([]);
    expect(r.subClauseResults.map((s) => s.passed)).toEqual([true, true]);
    expect(r.provenance.benefitMechanism).toBe('pool');
    expect(r.provenance.clauseVersionId).toBe(CLAUSE_VERSION);
  });

  it('a failing condition → on_fail decision AND emits the flag as DATA (never an auto-deny)', () => {
    const r = interpretClause(clause(), ctx('active', { death_classification: 'suicide' }));
    expect(r.result.decision).toBe('ineligible');
    expect(r.reasonCode).toBe('rule.ineligible');
    // The concealment/review seam: the engine produces a FLAG, it does not itself deny.
    expect(r.result.specialFlags).toEqual(['manual_review_required']);
    expect(r.subClauseResults.map((s) => s.passed)).toEqual([true, false]);
  });

  it('member_state_in reflects the resolved state', () => {
    const r = interpretClause(clause(), ctx('lapsed-unpaid', { death_classification: 'natural' }));
    expect(r.result.decision).toBe('ineligible'); // state not in [active, active-in-grace]
    expect(r.subClauseResults[0]!.passed).toBe(false);
  });
});

describe('interpretClause — determinism', () => {
  it('same (clause, ctx) → byte-identical result across repeated runs', () => {
    const build = () => interpretClause(clause(), ctx('active', { death_classification: 'natural' }));
    const a = canonicalJsonStringify(build() as never);
    const b = canonicalJsonStringify(build() as never);
    const c = canonicalJsonStringify(build() as never);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('fact insertion order does not affect the result (canonical hashing)', () => {
    const f1: Facts = {};
    f1['death_classification'] = 'natural';
    f1['z_other'] = 1;
    const f2: Facts = {};
    f2['z_other'] = 1;
    f2['death_classification'] = 'natural';
    const r1 = canonicalJsonStringify(interpretClause(clause(), ctx('active', f1)) as never);
    const r2 = canonicalJsonStringify(interpretClause(clause(), ctx('active', f2)) as never);
    expect(r1).toBe(r2);
  });

  it('sub_clause_results preserve the payload array order (stable, explicit)', () => {
    const r = interpretClause(clause(), ctx('active', { death_classification: 'natural' }));
    expect(r.subClauseResults.map((s) => s.op)).toEqual(['member_state_in', 'fact_equals']);
  });

  it('payload_hash = sha256hex(canonicalJsonStringify(payload)) and is reproducible', () => {
    const expected = sha256Hex(canonicalJsonStringify(FIXTURE_PAYLOAD as never));
    const r = interpretClause(clause(), ctx('active', { death_classification: 'natural' }));
    expect(r.provenance.payloadHash).toBe(expected);
    expect(r.provenance.evaluatedAt).toBe('2025-06-01T00:00:00.000Z');
  });
});

describe('interpretClause — malformed / unknown vocabulary (never throws)', () => {
  it('a non-rule payload → rule.payload_unrecognized + indeterminate', () => {
    const r = interpretClause(clause({ hello: 'world' }), ctx('active'));
    expect(r.reasonCode).toBe('rule.payload_unrecognized');
    expect(r.result.decision).toBe('indeterminate');
    expect(r.subClauseResults).toEqual([]);
    // Provenance is still fully populated (hash + version) for auditability.
    expect(r.provenance.payloadHash).toHaveLength(64);
  });

  it('an unknown operator → rule.payload_unrecognized (typed, not a throw)', () => {
    const payload = {
      rule_kind: 'conditional',
      on_pass: 'eligible',
      on_fail: 'ineligible',
      all_of: [{ op: 'no_such_operator', foo: 1 }],
    };
    const r = interpretClause(clause(payload), ctx('active'));
    expect(r.reasonCode).toBe('rule.payload_unrecognized');
  });

  it('fact_gte reads a numeric fact (the snapshot-days exemplar shape)', () => {
    const payload = {
      rule_kind: 'conditional',
      on_pass: 'locked',
      on_fail: 'unlocked',
      all_of: [{ op: 'fact_gte', fact: 'snapshot.lock_in_days', min: 30 }],
    };
    expect(interpretClause(clause(payload), ctx('active', { 'snapshot.lock_in_days': 30 })).result.decision).toBe('locked');
    expect(interpretClause(clause(payload), ctx('active', { 'snapshot.lock_in_days': 29 })).result.decision).toBe('unlocked');
  });
});

describe('operator registry', () => {
  it('exposes exactly the 4.1 minimal proven operator set (sorted)', () => {
    expect(OPERATOR_NAMES).toEqual(['fact_equals', 'fact_gte', 'fact_in', 'member_state_in']);
  });
});
