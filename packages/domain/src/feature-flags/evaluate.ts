// Deterministic feature-flag evaluator — Story 10.8 (Task 3; AC2).
//
// `evaluateFlag(flagDoc, memberContext)` is a PURE first-match over an EXPLICITLY-ORDERED clause
// list — the `resolveRoute` contract, verbatim: same `(flagDoc, memberContext)` → the same
// `FlagDecision` on every machine, every replay. The `(pariwar_id, flag_key, version)` pin pins the
// WHOLE decision (clause list + first-match semantics + the state arms) — that IS the replay
// identity. This is Item 9's first capability-bar property, "same cohort + same flag identity + same
// version yields the same result; output is reproducible for replay" (architecture.md:207-210).
//
// The determinism killers this avoids (the determinism test asserts each): `Object.keys()`/`Map`/
// `Set` iteration order deciding precedence, `Date.now()`/randomness, async scheduling, mutable
// module state. Clauses are a plain ARRAY (explicit order); nothing here reads a clock or does I/O.
//
// ⚠ TIME LIVES IN THE LOOKUP, NOT HERE. `effective_from`/`effective_until` windowing happens in
// `flagVersionInForce` (registry.ts) — the `resolveRoute` / `computeTicketSlaDueDates` split. A
// `FlagDocument` deliberately carries no window: if the evaluator took a clock, two replays of the
// same version could disagree and the replay-safety property would be gone.
//
// ⚠ AND THIS NEVER THROWS. A flag evaluation sits on the hot path of real member requests. An
// unknown dimension or op resolves to the flag's `fallbackDefault` with a `malformed_clause_fallback`
// reason — a malformed cohort rule must not take down the surface it was meant to gate. That is the
// per-flag offline-resilience default (architecture.md:217-219) doing its job. See errors.ts.
//
// ⚠ AND IT IS INTERPRETATION, NEVER LOGIC. The evaluator reads the cohort DATA; it must never grow
// a `switch (flagKey)` arm (the niyamavali ladder.ts rule, [[project_niyamavali_precedence_is_provenance]]).
// A behaviour that needs bespoke code is not a feature flag — it is a code change.

import type { CohortClauseJson, CohortDefinitionJson } from '../schema/feature_flag_versions.js';
import { COHORT_DIMENSIONS, COHORT_OPERATORS } from '../schema/feature_flag_versions.js';
import type { FlagDecision, FlagDocument, MemberFlagContext } from './types.js';

/** The result of testing one clause: matched, didn't match, or the clause itself was malformed. */
type ClauseOutcome = 'match' | 'no_match' | 'malformed';

/**
 * The member-context value(s) a dimension reads. Returns an ARRAY because `cohort_tag` is
 * inherently multi-valued (a member can carry several tags) — a clause matches if ANY context value
 * is in the clause's value set. An absent dimension yields `[]`, which matches nothing: that is a
 * legitimate "this member is not in that cohort", NOT a malformed rule.
 *
 * An exhaustive switch on the dimension enum — a new `CohortDimension` without an arm is a COMPILE
 * error via `never`, so the bounded predicate can never silently grow a dimension nobody evaluates.
 */
function contextValuesFor(dimension: string, ctx: MemberFlagContext): string[] | null {
  if (!(COHORT_DIMENSIONS as readonly string[]).includes(dimension)) return null;
  const known = dimension as (typeof COHORT_DIMENSIONS)[number];
  switch (known) {
    case 'pariwar_id':
      return ctx.pariwarId === undefined ? [] : [ctx.pariwarId];
    case 'member_state':
      return ctx.memberState === undefined ? [] : [ctx.memberState];
    case 'district':
      return ctx.district === undefined ? [] : [ctx.district];
    case 'block':
      return ctx.block === undefined ? [] : [ctx.block];
    case 'role':
      return ctx.role === undefined ? [] : [ctx.role];
    case 'cohort_tag':
      return ctx.cohortTags ?? [];
    default: {
      const unreachable: never = known;
      throw new Error(`[evaluateFlag] unhandled cohort dimension: ${String(unreachable)}`);
    }
  }
}

/**
 * Test one clause against the member context. `in` and `eq` are both set-membership (`eq` is `in`
 * with one value; both are kept so a trustee reading the rule in a PR sees the author's intent).
 * An unknown dimension OR op is `malformed` — the caller then falls back, it does not skip the
 * clause: a rule nobody can evaluate must not be silently treated as "didn't match".
 */
function testClause(clause: CohortClauseJson, ctx: MemberFlagContext): ClauseOutcome {
  if (!(COHORT_OPERATORS as readonly string[]).includes(clause.op)) return 'malformed';
  const contextValues = contextValuesFor(clause.dimension, ctx);
  if (contextValues === null) return 'malformed';
  if (clause.op === 'eq' && clause.values.length !== 1) return 'malformed';
  // Plain array scans, not a Set: the value lists are tiny and bounded (MAX_CLAUSE_VALUES), and an
  // array keeps the whole evaluation free of any hash-iteration order.
  const matched = contextValues.some((v) => clause.values.includes(v));
  return matched ? 'match' : 'no_match';
}

/**
 * First-match over the clause array. Returns the matched index, `-1` for no match, or `null` when a
 * clause was malformed (the caller falls back). ⚠ A malformed clause SHORT-CIRCUITS — evaluation
 * stops at the first one rather than reading past it. Reading on would let a later clause decide an
 * outcome the author's intended (unparseable) earlier clause was supposed to have taken first,
 * which is precisely how a "safe" fallback silently becomes the wrong answer.
 */
function firstMatchingClauseIndex(definition: CohortDefinitionJson, ctx: MemberFlagContext): number | null {
  for (const [i, clause] of definition.clauses.entries()) {
    const outcome = testClause(clause, ctx);
    if (outcome === 'malformed') return null;
    if (outcome === 'match') return i;
  }
  return -1;
}

/**
 * Evaluate a flag for a member (AC2). PURE: no clock, no randomness, no I/O, no async, no mutable
 * state, never throws.
 *
 * The state arms — `state` decides first, the cohort only narrows:
 *   · `off` / `rolled_back` → NOT enabled, cohort irrelevant. (A `rolled_back` flag is off; the
 *     distinct state exists so the inventory/audit can tell a rollback from a never-launched flag.)
 *   · `full`               → enabled for everyone, cohort irrelevant.
 *   · `canary` / `rollout` → enabled iff a cohort clause matches. An EMPTY clause list means no
 *     narrowing was authored, so it is enabled (a staged rollout with no cohort is a rollout to all
 *     — the operator narrows it by authoring clauses, and the inventory shows the empty definition).
 */
export function evaluateFlag(flagDoc: FlagDocument, memberContext: MemberFlagContext): FlagDecision {
  const base = { flagKey: flagDoc.flagKey, flagVersion: flagDoc.version };

  switch (flagDoc.state) {
    case 'off':
    case 'rolled_back':
      return { ...base, enabled: false, matchedClauseIndex: null, reason: 'state_off' };
    case 'full':
      return { ...base, enabled: true, matchedClauseIndex: null, reason: 'state_full' };
    case 'canary':
    case 'rollout':
      break;
    default: {
      // Exhaustive — a new FeatureFlagState without an arm is a compile error via `never`. At
      // runtime (a row written by an older/newer deploy) fall back rather than throw.
      const unreachable: never = flagDoc.state;
      void unreachable;
      return {
        ...base,
        enabled: flagDoc.fallbackDefault,
        matchedClauseIndex: null,
        reason: 'malformed_clause_fallback',
      };
    }
  }

  if (flagDoc.cohortDefinition.clauses.length === 0) {
    return { ...base, enabled: true, matchedClauseIndex: null, reason: 'cohort_empty' };
  }

  const matchedIndex = firstMatchingClauseIndex(flagDoc.cohortDefinition, memberContext);
  if (matchedIndex === null) {
    return {
      ...base,
      enabled: flagDoc.fallbackDefault,
      matchedClauseIndex: null,
      reason: 'malformed_clause_fallback',
    };
  }
  if (matchedIndex === -1) {
    return { ...base, enabled: false, matchedClauseIndex: null, reason: 'cohort_unmatched' };
  }
  return { ...base, enabled: true, matchedClauseIndex: matchedIndex, reason: 'cohort_matched' };
}

/**
 * The decision for a flag with NO version in force — the caller's own default applies. Used by the
 * consumer seams (Task 9) so "the flag subsystem said nothing" is a first-class, explainable
 * outcome carrying a reason, rather than an untyped `undefined` each call site re-interprets.
 */
export function noVersionInForceDecision(flagKey: string, callerDefault: boolean): FlagDecision {
  return {
    flagKey,
    flagVersion: null,
    enabled: callerDefault,
    matchedClauseIndex: null,
    reason: 'no_version_in_force',
  };
}
