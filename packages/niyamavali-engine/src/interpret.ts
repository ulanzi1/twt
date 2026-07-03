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
};

/** The registered operator names — exported so tests + 4.2–4.5 can assert the vocabulary. */
export const OPERATOR_NAMES: readonly string[] = Object.keys(OPERATORS).sort();

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
