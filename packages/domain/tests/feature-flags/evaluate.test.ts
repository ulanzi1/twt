// The PURE evaluator's determinism + fail-closed contract — Story 10.8 (Task 3/11; AC2/AC9).
//
// These are the tests that make "deterministic evaluation" — Item 9's first capability-bar property
// (architecture.md:207-210) — a checked claim rather than a comment.

import { describe, expect, it } from 'vitest';

import { evaluateFlag, noVersionInForceDecision } from '../../src/feature-flags/evaluate.js';
import type { FlagDocument, MemberFlagContext } from '../../src/feature-flags/types.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';

function doc(overrides: Partial<FlagDocument> = {}): FlagDocument {
  return {
    flagKey: 'kyc_manual_fallback',
    pariwarId: null,
    version: 2,
    state: 'canary',
    cohortDefinition: { clauses: [] },
    fallbackDefault: true,
    ...overrides,
  };
}

const CTX: MemberFlagContext = {
  pariwarId: PARIWAR,
  memberState: 'active',
  district: 'patna',
  block: 'phulwari',
  role: 'member',
  cohortTags: ['pilot', 'urban'],
};

describe('evaluateFlag — state arms', () => {
  it('`off` and `rolled_back` are not enabled, regardless of cohort match', () => {
    const cohort = { clauses: [{ dimension: 'district', op: 'in', values: ['patna'] }] };
    for (const state of ['off', 'rolled_back'] as const) {
      const d = evaluateFlag(doc({ state, cohortDefinition: cohort }), CTX);
      expect(d.enabled).toBe(false);
      expect(d.reason).toBe('state_off');
      expect(d.matchedClauseIndex).toBeNull();
    }
  });

  it('`full` is enabled for everyone, even a member no clause matches', () => {
    const cohort = { clauses: [{ dimension: 'district', op: 'in', values: ['gaya'] }] };
    const d = evaluateFlag(doc({ state: 'full', cohortDefinition: cohort }), CTX);
    expect(d.enabled).toBe(true);
    expect(d.reason).toBe('state_full');
  });

  it('⚠ `canary`/`rollout` with an EMPTY clause list serves NOBODY (not everybody)', () => {
    // Review Pass 4. This asserted `true` — the reading under which an un-narrowed canary is
    // behaviourally identical to `full`. On `kyc_manual_fallback` that made the natural two-step
    // "flip to canary now, narrow it next" run DigiLocker hard-mandatory tenant-wide in the gap.
    // Serving nobody is the only reading under which "not yet narrowed" ≠ "narrowed to everyone".
    for (const state of ['canary', 'rollout'] as const) {
      const d = evaluateFlag(doc({ state }), CTX);
      expect(d.enabled).toBe(false);
      expect(d.reason).toBe('cohort_empty');
    }
  });

  it('⚠ an empty cohort is NOT the same as fallbackDefault — it is a decided "nobody"', () => {
    // Guards against a future "simplification" that routes the empty case through fallbackDefault:
    // an empty cohort is a COMPLETE, evaluable rule that matches no one, not an unevaluable one.
    // The distinct `cohort_empty` reason is what lets an operator tell the two apart in the audit.
    const d = evaluateFlag(doc({ state: 'canary', fallbackDefault: true }), CTX);
    expect(d.enabled).toBe(false);
    expect(d.reason).toBe('cohort_empty');
  });

  it('a staged state WITH a matching clause still serves that member', () => {
    // The counterweight: the change above must not have broken ordinary canary targeting.
    const d = evaluateFlag(
      doc({ state: 'canary', cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['patna'] }] } }),
      { ...CTX, district: 'patna' },
    );
    expect(d.enabled).toBe(true);
    expect(d.reason).toBe('cohort_matched');
  });
});

describe('evaluateFlag — cohort first-match', () => {
  it('enables on a matching clause and reports WHICH clause matched', () => {
    const d = evaluateFlag(
      doc({
        cohortDefinition: {
          clauses: [
            { dimension: 'district', op: 'in', values: ['gaya'] },
            { dimension: 'district', op: 'in', values: ['patna', 'nalanda'] },
          ],
        },
      }),
      CTX,
    );
    expect(d.enabled).toBe(true);
    expect(d.reason).toBe('cohort_matched');
    expect(d.matchedClauseIndex).toBe(1);
  });

  it('does NOT enable when no clause matches', () => {
    const d = evaluateFlag(
      doc({ cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['gaya'] }] } }),
      CTX,
    );
    expect(d.enabled).toBe(false);
    expect(d.reason).toBe('cohort_unmatched');
    expect(d.matchedClauseIndex).toBeNull();
  });

  it('ARRAY ORDER is the only precedence source — reordering changes the matched index', () => {
    const a = { dimension: 'role', op: 'eq', values: ['member'] };
    const b = { dimension: 'district', op: 'in', values: ['patna'] };
    expect(evaluateFlag(doc({ cohortDefinition: { clauses: [a, b] } }), CTX).matchedClauseIndex).toBe(0);
    expect(evaluateFlag(doc({ cohortDefinition: { clauses: [b, a] } }), CTX).matchedClauseIndex).toBe(0);
    // Both match, so index 0 either way — the point is that the WINNER is whichever is listed first,
    // never a property of the dimension itself. Narrow it so only the second can match:
    const c = { dimension: 'district', op: 'in', values: ['gaya'] };
    expect(evaluateFlag(doc({ cohortDefinition: { clauses: [c, a] } }), CTX).matchedClauseIndex).toBe(1);
  });

  it('`cohort_tag` is multi-valued — a clause matches if ANY of the member’s tags is listed', () => {
    const d = evaluateFlag(
      doc({ cohortDefinition: { clauses: [{ dimension: 'cohort_tag', op: 'in', values: ['rural', 'urban'] }] } }),
      CTX,
    );
    expect(d.enabled).toBe(true);
  });

  it('an ABSENT context dimension does not match — and is NOT treated as malformed', () => {
    const d = evaluateFlag(
      doc({ cohortDefinition: { clauses: [{ dimension: 'block', op: 'eq', values: ['x'] }] } }),
      { pariwarId: PARIWAR },
    );
    expect(d.enabled).toBe(false);
    // The distinction matters: "this member is not in that cohort" is a legitimate answer, whereas
    // an unknown DIMENSION is a rule nobody can evaluate. Conflating them would make a typo'd
    // dimension silently read as "nobody matches" instead of falling back.
    expect(d.reason).toBe('cohort_unmatched');
  });
});

describe('evaluateFlag — fail CLOSED, never throw (AC2)', () => {
  it('an unknown DIMENSION falls back to fallbackDefault with a typed reason', () => {
    for (const fallbackDefault of [true, false]) {
      const d = evaluateFlag(
        doc({
          fallbackDefault,
          cohortDefinition: { clauses: [{ dimension: 'astrological_sign', op: 'in', values: ['leo'] }] },
        }),
        CTX,
      );
      expect(d.enabled).toBe(fallbackDefault);
      expect(d.reason).toBe('malformed_clause_fallback');
    }
  });

  it('an unknown OP falls back to fallbackDefault', () => {
    const d = evaluateFlag(
      doc({
        fallbackDefault: false,
        cohortDefinition: { clauses: [{ dimension: 'district', op: 'regex', values: ['pat.*'] }] },
      }),
      CTX,
    );
    expect(d.enabled).toBe(false);
    expect(d.reason).toBe('malformed_clause_fallback');
  });

  it('`eq` with multiple values is malformed (use `in` for a set)', () => {
    const d = evaluateFlag(
      doc({ cohortDefinition: { clauses: [{ dimension: 'district', op: 'eq', values: ['patna', 'gaya'] }] } }),
      CTX,
    );
    expect(d.reason).toBe('malformed_clause_fallback');
  });

  it('a malformed clause SHORT-CIRCUITS — a later matching clause does not rescue it', () => {
    // Reading past a malformed clause would let clause[1] decide an outcome that the author's
    // (unparseable) clause[0] was supposed to decide first — a "safe" fallback quietly becoming the
    // wrong answer. Falling back is the honest response to "this rule is not evaluable."
    const d = evaluateFlag(
      doc({
        fallbackDefault: false,
        cohortDefinition: {
          clauses: [
            { dimension: 'unknown_dim', op: 'in', values: ['x'] },
            { dimension: 'district', op: 'in', values: ['patna'] },
          ],
        },
      }),
      CTX,
    );
    expect(d.enabled).toBe(false);
    expect(d.reason).toBe('malformed_clause_fallback');
  });

  it('NEVER throws — even on a structurally hostile document', () => {
    const hostile = doc({
      state: 'canary',
      cohortDefinition: {
        clauses: [
          { dimension: '', op: '', values: [] },
          { dimension: 'district', op: 'in', values: [] },
        ],
      },
    });
    expect(() => evaluateFlag(hostile, CTX)).not.toThrow();
    expect(() => evaluateFlag(hostile, {})).not.toThrow();
  });

  // ── Review Pass 2: documents that are STRUCTURALLY INCOMPLETE, not merely semantically wrong ─────
  //
  // The case above passes well-TYPED clauses with empty values — a document that is still
  // structurally complete. It never omits a key, so it never exercised the dereferences that
  // actually threw. Every document below was verified to throw a TypeError before the fix:
  //
  //   {clauses:[{dimension:'district',op:'in'}]}  → Cannot read properties of undefined ('includes')
  //   {}                                          → Cannot read properties of undefined ('length')
  //
  // These are REACHABLE, not theoretical: `cohort_definition` is opaque jsonb, `flagVersionInForce`
  // casts the row straight to `CohortDefinitionJson` with no read-time guard, and the migration's own
  // header establishes that GLOBAL rows are authored by a service-pool/seed path that never calls
  // `validateFlagVersionInput`. A throw here lands on the member request path — the exact failure the
  // module's "NEVER throws" contract exists to prevent, on the surface the flag was meant to gate.
  //
  // ⚠ Each asserts the FALLBACK VALUE too, not just the absence of a throw: returning `enabled: true`
  // without throwing would technically satisfy "never throws" while still being the wrong answer.
  it.each([
    ['a clause missing `values` entirely', { clauses: [{ dimension: 'district', op: 'in' }] }],
    ['a clause missing `dimension`', { clauses: [{ op: 'in', values: ['patna'] }] }],
    ['a null clause', { clauses: [null] }],
    ['a non-object clause', { clauses: ['district=patna'] }],
    ['`values` that is not an array', { clauses: [{ dimension: 'district', op: 'in', values: 'patna' }] }],
    ['an empty cohort_definition object', {}],
    ['`clauses` that is null', { clauses: null }],
    ['`clauses` that is not an array', { clauses: { district: 'patna' } }],
  ])('does not throw on %s — it falls back to fallbackDefault', (_label, cohortDefinition) => {
    const broken = doc({
      state: 'canary',
      cohortDefinition: cohortDefinition as never,
      fallbackDefault: false,
    });
    expect(() => evaluateFlag(broken, CTX)).not.toThrow();
    const d = evaluateFlag(broken, CTX);
    expect(d.reason).toBe('malformed_clause_fallback');
    expect(d.enabled).toBe(false); // the document's own fallbackDefault, not a hard-coded value
  });

  it('a broken document with fallbackDefault TRUE falls back to true (the value is read, not assumed)', () => {
    const broken = doc({ state: 'canary', cohortDefinition: {} as never, fallbackDefault: true });
    expect(evaluateFlag(broken, CTX).enabled).toBe(true);
  });

  it('a structurally broken document on an `off` flag is still simply off (state decides first)', () => {
    const broken = doc({ state: 'off', cohortDefinition: {} as never });
    expect(evaluateFlag(broken, CTX).reason).toBe('state_off');
  });

  it('an unknown STATE (a row from another deploy) falls back rather than throwing', () => {
    const fromTheFuture = { ...doc(), state: 'shadow_mode' } as unknown as FlagDocument;
    const d = evaluateFlag(fromTheFuture, CTX);
    expect(d.reason).toBe('malformed_clause_fallback');
    expect(d.enabled).toBe(true); // the doc()'s fallbackDefault
  });
});

describe('evaluateFlag — determinism (AC2)', () => {
  it('100 identical evaluations produce byte-identical decisions', () => {
    const d = doc({
      state: 'rollout',
      cohortDefinition: {
        clauses: [
          { dimension: 'cohort_tag', op: 'in', values: ['urban', 'pilot'] },
          { dimension: 'district', op: 'in', values: ['patna'] },
        ],
      },
    });
    const first = JSON.stringify(evaluateFlag(d, CTX));
    for (let i = 0; i < 100; i += 1) {
      expect(JSON.stringify(evaluateFlag(d, CTX))).toBe(first);
    }
  });

  it('is free of hidden state — interleaving different inputs does not perturb results', () => {
    const enabled = doc({ cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['patna'] }] } });
    const disabled = doc({ cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['gaya'] }] } });
    for (let i = 0; i < 50; i += 1) {
      expect(evaluateFlag(enabled, CTX).enabled).toBe(true);
      expect(evaluateFlag(disabled, CTX).enabled).toBe(false);
    }
  });

  it('does not MUTATE its inputs (a shared flag document is reused across requests)', () => {
    const d = doc({ cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['patna'] }] } });
    const before = JSON.stringify(d);
    const ctxBefore = JSON.stringify(CTX);
    evaluateFlag(d, CTX);
    expect(JSON.stringify(d)).toBe(before);
    expect(JSON.stringify(CTX)).toBe(ctxBefore);
  });

  it('replay: the same document at the same version always yields the same decision object', () => {
    const d = doc({ version: 7, state: 'canary', cohortDefinition: { clauses: [{ dimension: 'role', op: 'eq', values: ['member'] }] } });
    expect(evaluateFlag(d, CTX)).toEqual({
      flagKey: 'kyc_manual_fallback',
      flagVersion: 7,
      enabled: true,
      matchedClauseIndex: 0,
      reason: 'cohort_matched',
    });
  });
});

describe('noVersionInForceDecision', () => {
  it('carries the caller default and a typed reason (not an untyped undefined)', () => {
    expect(noVersionInForceDecision('some_flag', true)).toEqual({
      flagKey: 'some_flag',
      flagVersion: null,
      enabled: true,
      matchedClauseIndex: null,
      reason: 'no_version_in_force',
    });
  });
});
