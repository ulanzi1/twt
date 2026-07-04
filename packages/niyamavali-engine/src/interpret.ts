// Pure interpreter core — Story 4.1 (Task 3; AC1.3, AC1.4).
//
// `interpretClause` is the FIRST and ONLY interpreter of the opaque
// `clause_versions.payload` (freeze row 14 — the registry stores/diffs/resolves it but
// NEVER interprets it). It generalizes the mini-interpreter precedents
// (`medical/ima-list.ts`, `member/lock-in.ts`: `resolveByClauseId` → `.safeParse` →
// consumed fields) from "one field of one known clause" to "a declarative rule spec
// interpreted from ANY clause."
//
// ── PURE + DETERMINISTIC + IDEMPOTENT (determinism epic — load-bearing) ───────────
// No Date.now(), no new Date(), no Math.random(), no mutable module state, no I/O.
// Time is passed IN (`ctx.evaluatedAt`, DB-authoritative). Story 4.6 runs this 100×
// across threads and fails CI as a P0 on any byte-variance — every collection is
// emitted in an explicitly-stable order (never hash-map iteration order).
//
// ── The NO-hardcoded-logic contract (AC1.4) ──────────────────────────────────────
// A rule INSTANCE (R7(A), R8, the lock-in policy) is entirely DATA in `payload` — the
// engine interprets it; adding a rule = adding a clause, ZERO engine change. The
// operator REGISTRY below is CODE (the interpreter vocabulary): adding a new operator
// is an ADDITIVE engine extension that must not change how any existing clause
// evaluates. There is deliberately NO `switch (clauseId)` / `switch (ruleCode)` — that
// IS the hardcoded-logic anti-pattern the freeze forbids. Even the `decision` value
// and `reasonCode` suffix come from the payload (`on_pass`/`on_fail`), not from code.
//
// Scope for 4.1: the interpreter FRAMEWORK + a MINIMAL proven operator set, validated
// against a representative fixture clause. Stories 4.2–4.5 each ADD the operators their
// rules need (R7/R8/R5/R9/R12) — this file is not the place to pre-build that vocabulary.
//
// ── Two rule kinds (Story 4.5) ────────────────────────────────────────────────────
// `rule_kind: 'conditional'` (4.1–4.4): boolean operators over facts → a decision slug +
// optional flags. `rule_kind: 'computed'` (4.5, R12): the FIRST rule that COMPUTES AND
// RETURNS A VALUE — a pure integer/`CanonicalJsonValue` computation (declared as DATA:
// input fact keys + params + a named computation) whose output lands in
// `result.computed.values`. Like operators, the COMPUTATION registry is CODE (extended
// additively, never keyed by clause id); the +N/5 grant params are DATA in the payload.
// The computed branch stays Date-free + pure — the calendar date projection is Story 4.6's.

import { canonicalJsonStringify, type CanonicalJsonValue } from '@twt/domain';
import { z } from 'zod';

import { sha256Hex } from './hash.js';
import type {
  EvaluationResult,
  Facts,
  Provenance,
  ResolvedClause,
  ResolvedEvaluationContext,
  SubClauseResult,
} from './types.js';

// ── Interpreter vocabulary (operator registry) ───────────────────────────────────

/** What an operator reads: the resolved member state + the (possibly snapshot-widened) facts. */
interface OperatorContext {
  memberState: string;
  facts: Facts;
}

/** An operator's verdict + a PII-FREE detail (never echoes a fact VALUE). */
interface OperatorResult {
  passed: boolean;
  detail: CanonicalJsonValue;
}

/** A registered interpreter primitive. `cond` is the passthrough-parsed condition object. */
type Operator = (cond: Record<string, unknown>, ctx: OperatorContext) => OperatorResult;

/**
 * Canonical equality: two values are equal iff their canonical-JSON encodings match.
 * `undefined` (an absent fact) never equals anything; the canonicalizer throws on
 * Date/bigint/non-finite → treated as not-equal (safe, non-throwing).
 */
function canonicalEqual(a: unknown, b: unknown): boolean {
  if (a === undefined || b === undefined) return false;
  try {
    return canonicalJsonStringify(a) === canonicalJsonStringify(b);
  } catch {
    return false;
  }
}

function hasFact(facts: Facts, fact: string): boolean {
  return Object.prototype.hasOwnProperty.call(facts, fact);
}

/**
 * The MINIMAL proven operator set (4.1 scope). Each is pure + deterministic. Keys are
 * the `op` discriminator a clause payload references; the set is CODE, extended
 * additively by 4.2–4.5 — never keyed by clause id / rule code.
 */
const OPERATORS: Readonly<Record<string, Operator>> = {
  /** member's resolved lifecycle state ∈ `states[]`. */
  member_state_in(cond, ctx) {
    const states = Array.isArray(cond['states']) ? (cond['states'] as unknown[]) : [];
    return {
      passed: states.includes(ctx.memberState),
      detail: { op: 'member_state_in', observed_state: ctx.memberState },
    };
  },
  /** facts[fact] deep-equals `value`. */
  fact_equals(cond, ctx) {
    const fact = String(cond['fact']);
    const passed = hasFact(ctx.facts, fact) && canonicalEqual(ctx.facts[fact], cond['value']);
    return { passed, detail: { op: 'fact_equals', fact } };
  },
  /** facts[fact] ∈ `values[]`. */
  fact_in(cond, ctx) {
    const fact = String(cond['fact']);
    const values = Array.isArray(cond['values']) ? (cond['values'] as unknown[]) : [];
    const passed =
      hasFact(ctx.facts, fact) && values.some((v) => canonicalEqual(ctx.facts[fact], v));
    return { passed, detail: { op: 'fact_in', fact } };
  },
  /** numeric facts[fact] >= `min` (the snapshot-days exemplar reads `snapshot.lock_in_days`). */
  fact_gte(cond, ctx) {
    const fact = String(cond['fact']);
    const min = cond['min'];
    const actual = ctx.facts[fact];
    const passed = typeof actual === 'number' && typeof min === 'number' && actual >= min;
    return { passed, detail: { op: 'fact_gte', fact } };
  },
  /**
   * numeric facts[fact] < `max` (the strict-upper-bound mirror of `fact_gte`; Story 4.2).
   * The ONLY new vocabulary R7 strictly needs — R7(A)'s `total_count < 10` / `r7a_restorations_used < 2`
   * lifetime caps. PII-free `detail` echoes the fact KEY, never the (potentially PII) value.
   */
  fact_lt(cond, ctx) {
    const fact = String(cond['fact']);
    const max = cond['max'];
    const actual = ctx.facts[fact];
    const passed = typeof actual === 'number' && typeof max === 'number' && actual < max;
    return { passed, detail: { op: 'fact_lt', fact } };
  },
};

/** The registered operator names — exported so tests + 4.2–4.5 can assert the vocabulary. */
export const OPERATOR_NAMES: readonly string[] = Object.keys(OPERATORS).sort();

// ── Computation registry (the `rule_kind: 'computed'` vocabulary — Story 4.5) ──────
//
// A computed rule's arithmetic. Like the operator registry above this is CODE (the
// interpreter vocabulary), extended ADDITIVELY and NEVER keyed by clause id — the +N/5
// grant PARAMS are DATA in the payload, so re-tuning the policy (e.g. +1 per 4 years) is
// a clause amendment with ZERO engine change. Each computation is PURE integer/finite
// arithmetic ONLY — no Date, no Math.random, no mutable state (determinism epic). It
// returns a raw number the caller places under `result.computed.values`.

/** Grant-ladder params (R12): `+years_per_grant` per `grant_every_years`, gated by `min_years`. */
interface GrantLadderParams {
  grant_every_years: number;
  years_per_grant: number;
  min_years: number;
  /** Optional hard cap on the granted total (R12 declares none in v1). */
  cap?: number;
}

/** A registered computation: pure `(tenureYears, params) → grantedYears` integer arithmetic. */
type Computation = (tenureYears: number, params: GrantLadderParams) => number;

const COMPUTATIONS: Readonly<Record<string, Computation>> = {
  /**
   * FR-12 retirement-coverage grant ladder:
   *   granted = min(cap?, floor(tenureYears / grant_every_years) * years_per_grant),
   *   gated by tenureYears >= min_years (below the gate → 0).
   * Pure integer arithmetic — the load-bearing FR-12 on-the-fly computation. Below-`min_years`
   * (or negative/short tenure) yields 0, NEVER a denial (retirement coverage is an EXTENSION).
   */
  grant_ladder(tenureYears, params) {
    if (tenureYears < params.min_years) return 0;
    const raw = Math.floor(tenureYears / params.grant_every_years) * params.years_per_grant;
    const capped = params.cap != null ? Math.min(params.cap, raw) : raw;
    return Math.max(0, capped);
  },
};

/** The registered computation names — exported so tests + future computed rules assert the vocabulary. */
export const COMPUTATION_NAMES: readonly string[] = Object.keys(COMPUTATIONS).sort();

// ── Rule-spec envelope (the interpreter-vocabulary subset of the opaque payload) ──
//
// `.passthrough()` tolerates the structural display keys the seed/registry carries
// (`rule_code`, `title_en`, `provisional`, `benefit_mechanism`) — the same discipline
// as `ima-list.ts` / `lock-in.ts`. A malformed / unknown-shape payload yields a typed
// `reason_code`, NEVER a throw.

const OUTCOME_SLUG = /^[a-z0-9_]+$/;

const RuleConditionSchema = z.object({ op: z.string().min(1) }).passthrough();

const ConditionalRuleSchema = z
  .object({
    rule_kind: z.literal('conditional'),
    all_of: z.array(RuleConditionSchema).min(1),
    on_pass: z.string().regex(OUTCOME_SLUG),
    on_fail: z.string().regex(OUTCOME_SLUG),
  })
  .passthrough();

/**
 * The `rule_kind: 'computed'` envelope (Story 4.5, R12). Declares its arithmetic as DATA:
 * a named `computation` (looked up in the CODE registry above), the `inputs` fact keys it
 * reads, the numeric `params`, and the `output_key`/`retirement_output_key` its values land
 * under in `result.computed.values`. `on_computed`/`on_not_applicable` are the DATA decision
 * slugs (routing/status, NEVER a deny — retirement coverage EXTENDS eligibility). Nested
 * objects `.passthrough()` for descriptive keys; a malformed/unknown-shape payload yields the
 * typed `rule.payload_unrecognized` outcome, NEVER a throw.
 */
const ComputedRuleSchema = z
  .object({
    rule_kind: z.literal('computed'),
    computation: z.string().min(1),
    inputs: z
      .object({
        tenure_years: z.string().min(1),
        retirement_flag: z.string().min(1),
      })
      .passthrough()
      .refine((v) => v.tenure_years !== v.retirement_flag, {
        message: 'inputs.tenure_years and inputs.retirement_flag must be distinct fact keys',
      }),
    params: z
      .object({
        grant_every_years: z.number().int().positive(),
        years_per_grant: z.number().int().positive(),
        min_years: z.number().int().nonnegative(),
        cap: z.number().int().nonnegative().optional(),
      })
      .passthrough(),
    output_key: z.string().min(1),
    retirement_output_key: z.string().min(1),
    on_computed: z.string().regex(OUTCOME_SLUG),
    on_not_applicable: z.string().regex(OUTCOME_SLUG),
  })
  .passthrough()
  .refine((v) => v.output_key !== v.retirement_output_key, {
    message: 'output_key and retirement_output_key must be distinct — otherwise one computed value silently overwrites the other',
  });

/** PII-FREE canonical summary of the inputs — hashed into the audit digest + carried in provenance. */
function buildInputsSummary(
  clause: ResolvedClause,
  ctx: ResolvedEvaluationContext,
  evaluatedAtIso: string,
): CanonicalJsonValue {
  return {
    clause_id: clause.clauseId,
    clause_version_id: clause.clauseVersionId,
    member_state: ctx.memberState,
    // Fact KEYS only — never the (potentially PII) values (the values feed the memo hash, not this).
    fact_keys: Object.keys(ctx.facts).sort(),
    resolved_clause_version_ids: [...ctx.resolvedClauseVersionIds].sort(),
    evaluated_at: evaluatedAtIso,
    // §1.13 Hook 1: every eligibility-check audit line must record which mechanism it served.
    benefit_mechanism: clause.benefitMechanism,
  };
}

/**
 * Interpret a resolved clause against a resolved context → a deterministic
 * `EvaluationResult`. PURE: same `(clause, ctx)` → byte-identical result on every run.
 * A malformed payload or an unknown operator produces a typed `rule.payload_unrecognized`
 * outcome — the engine NEVER throws into the caller.
 */
export function interpretClause(
  clause: ResolvedClause,
  ctx: ResolvedEvaluationContext,
): EvaluationResult {
  const payloadHash = sha256Hex(canonicalJsonStringify(clause.payload as CanonicalJsonValue));
  const evaluatedAtIso = ctx.evaluatedAt.toISOString();
  const provenance: Provenance = {
    clauseId: clause.clauseId,
    clauseVersionId: clause.clauseVersionId,
    payloadHash,
    evaluatedAt: evaluatedAtIso,
    inputsSummary: buildInputsSummary(clause, ctx, evaluatedAtIso),
    benefitMechanism: clause.benefitMechanism,
  };

  const unrecognized = (): EvaluationResult => ({
    result: { decision: 'indeterminate', specialFlags: [] },
    provenance,
    subClauseResults: [],
    reasonCode: 'rule.payload_unrecognized',
  });

  // Dispatch on the DATA `rule_kind` (peer branches, never a `switch (clauseId)`). The
  // computed branch (4.5) is a sibling of the conditional branch, not a new operator.
  if (clause.payload['rule_kind'] === 'computed') {
    return interpretComputedClause(clause, ctx, provenance, unrecognized);
  }

  const parsed = ConditionalRuleSchema.safeParse(clause.payload);
  if (!parsed.success) return unrecognized();
  const spec = parsed.data;

  const opCtx: OperatorContext = { memberState: ctx.memberState, facts: ctx.facts };
  const subClauseResults: SubClauseResult[] = [];
  const flags = new Set<string>();

  // Array order IS the stable, explicitly-sorted observable order (determinism epic).
  for (const rawCond of spec.all_of) {
    const cond = rawCond as Record<string, unknown>;
    const operator = OPERATORS[rawCond.op];
    if (!operator) return unrecognized(); // unknown vocabulary → typed reason, not a throw
    const { passed, detail } = operator(cond, opCtx);
    subClauseResults.push({ op: rawCond.op, passed, detail });
    const flagIfTrue = cond['flag_if_true'];
    const flagIfFalse = cond['flag_if_false'];
    if (passed && typeof flagIfTrue === 'string') flags.add(flagIfTrue);
    if (!passed && typeof flagIfFalse === 'string') flags.add(flagIfFalse);
  }

  const allPassed = subClauseResults.every((r) => r.passed);
  const decision = allPassed ? spec.on_pass : spec.on_fail;

  return {
    result: { decision, specialFlags: [...flags].sort() },
    provenance,
    subClauseResults,
    reasonCode: `rule.${decision}`,
  };
}

/**
 * The `rule_kind: 'computed'` branch (Story 4.5, R12) — a PURE integer computation whose
 * output lands in `result.computed.values`. It reads the two declared input facts, runs the
 * registered `computation`, and emits `granted_years` (+ echoes `is_retired`). NO date math
 * (Date-free — the `coverage_through`/`days_remaining`/`active` projection is Story 4.6's);
 * NO boolean operators (so `subClauseResults` is empty and `OPERATOR_NAMES` is untouched).
 *
 * ── Absent-input handling (CR-4.5-D1; the same class as CR-4.4-D3) ─────────────────
 * `fact_equals`/`fact_in` treat an ABSENT fact identically to an explicit `false`/`0`. R12
 * must NOT: a missing `member.valid_membership_years`/`member.is_retired` (producer hasn't
 * derived it yet) routes to the DISTINCT, typed, non-throwing `rule.inputs_unavailable`
 * outcome (no `computed` field) — never a silent `granted_years: 0` indistinguishable from a
 * genuine zero-tenure non-retiree. A present-but-wrong-type input takes the same path.
 */
function interpretComputedClause(
  clause: ResolvedClause,
  ctx: ResolvedEvaluationContext,
  provenance: Provenance,
  unrecognized: () => EvaluationResult,
): EvaluationResult {
  const parsed = ComputedRuleSchema.safeParse(clause.payload);
  if (!parsed.success) return unrecognized();
  const spec = parsed.data;

  // `hasOwnProperty`-gated lookup (not a bare `COMPUTATIONS[spec.computation]` truthiness check): a
  // plain object literal inherits `Object.prototype`, so an unconstrained payload string like
  // "toString" or "constructor" would otherwise resolve to a real, callable inherited member and
  // silently corrupt `computed.values` instead of hitting the typed `rule.payload_unrecognized`
  // fallback.
  const computation = Object.prototype.hasOwnProperty.call(COMPUTATIONS, spec.computation)
    ? COMPUTATIONS[spec.computation]
    : undefined;
  if (!computation) return unrecognized(); // unknown computation vocabulary → typed reason, not a throw

  // Absent (or present-but-wrong-type) inputs → a DISTINCT typed outcome, never a silent 0/false.
  const inputsUnavailable = (): EvaluationResult => ({
    result: { decision: 'indeterminate', specialFlags: [] },
    provenance,
    subClauseResults: [],
    reasonCode: 'rule.inputs_unavailable',
  });

  const { tenure_years: tenureKey, retirement_flag: flagKey } = spec.inputs;
  if (!hasFact(ctx.facts, tenureKey) || !hasFact(ctx.facts, flagKey)) return inputsUnavailable();
  const tenureRaw = ctx.facts[tenureKey];
  const flagRaw = ctx.facts[flagKey];
  // A negative tenure is only reachable via a producer bug — never a legitimate value. Route it
  // through the same typed `inputs_unavailable` path as a wrong-type input rather than silently
  // flooring it to `granted_years: 0`, indistinguishable from a genuine zero-tenure non-retiree.
  if (
    typeof tenureRaw !== 'number' ||
    !Number.isInteger(tenureRaw) ||
    tenureRaw < 0 ||
    typeof flagRaw !== 'boolean'
  ) {
    return inputsUnavailable();
  }

  const grantedYears = computation(tenureRaw, spec.params);
  const isRetired = flagRaw;

  // Decision (DATA slugs): applicable iff the member is retired AND has earned coverage.
  // A non-retired member, or one below the min-years gate, is NOT-APPLICABLE — never a deny.
  const applicable = isRetired && grantedYears > 0;
  const decision = applicable ? spec.on_computed : spec.on_not_applicable;

  // `computed.values` keys emitted in EXPLICITLY SORTED order (determinism — never hash-map order).
  const rawEntries: Array<[string, CanonicalJsonValue]> = [
    [spec.output_key, grantedYears],
    [spec.retirement_output_key, isRetired],
  ];
  const values: Record<string, CanonicalJsonValue> = {};
  for (const [key, value] of [...rawEntries].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
    values[key] = value;
  }

  return {
    result: { decision, specialFlags: [], computed: { values } },
    provenance,
    subClauseResults: [],
    reasonCode: `rule.${decision}`,
  };
}
