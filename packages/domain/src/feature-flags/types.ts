// Feature-flag domain types — Story 10.8 (Task 2; AC1/AC2).
//
// The shapes the registry persists and the PURE evaluator consumes. Deliberately free of any DB or
// HTTP type: `evaluateFlag` takes a `FlagDocument` + a `MemberFlagContext` and nothing else, which
// is what makes it trivially replayable (AC2).

import type {
  CohortDefinitionJson,
  CohortDimension,
  FeatureFlagState,
} from '../schema/feature_flag_versions.js';

export type { CohortDefinitionJson, CohortDimension, FeatureFlagState };
export {
  COHORT_DIMENSIONS,
  COHORT_OPERATORS,
  FEATURE_FLAG_STATES,
} from '../schema/feature_flag_versions.js';

/**
 * The resolved flag document — everything `evaluateFlag` needs, and NOTHING more. Note what is
 * ABSENT: no `effective_from`/`effective_until`. The time window is resolved by the version-in-force
 * LOOKUP (`flagVersionInForce`), never inside the evaluator — the `computeTicketSlaDueDates` split.
 * If the window were in here, the evaluator would need a clock and replay determinism would be gone.
 */
export interface FlagDocument {
  flagKey: string;
  /** NULL = this is the GLOBAL row; non-null = a Pariwar's override. */
  pariwarId: string | null;
  version: number;
  state: FeatureFlagState;
  cohortDefinition: CohortDefinitionJson;
  /** The offline-resilience default: what evaluation returns when the cohort cannot be resolved. */
  fallbackDefault: boolean;
}

/**
 * The member context a cohort clause is evaluated against. One optional field per
 * {@link CohortDimension}, so an absent dimension is representable without a sentinel. A dimension
 * whose context value is absent simply does not match (it does NOT fail closed — an absent value is
 * a legitimate "this member is not in that cohort" answer, whereas an unknown DIMENSION is a
 * malformed rule).
 */
export interface MemberFlagContext {
  pariwarId?: string;
  memberState?: string;
  district?: string;
  block?: string;
  role?: string;
  cohortTags?: string[];
}

/** Why a decision came out the way it did — carried on every {@link FlagDecision} so the decision is
 *  audit-replayable (AC2) and an operator can tell "off" from "not in the cohort" from "malformed". */
export type FlagDecisionReason =
  /** `state` is `off` or `rolled_back` — the flag is not serving, cohort irrelevant. */
  | 'state_off'
  /** `state` is `full` — serving everyone, cohort irrelevant. */
  | 'state_full'
  /** `state` is `canary`/`rollout` and a cohort clause matched this member. */
  | 'cohort_matched'
  /** `state` is `canary`/`rollout` and NO cohort clause matched this member. */
  | 'cohort_unmatched'
  /** `state` is `canary`/`rollout` with an EMPTY clause list — no narrowing was authored. */
  | 'cohort_empty'
  /** A clause named a dimension or op outside the bounded enum → fell back to `fallbackDefault`. */
  | 'malformed_clause_fallback'
  /** No version was in force for this flag at this instant → the caller's own default applies. */
  | 'no_version_in_force'
  /** The lookup itself failed (a backend error) → the caller's own default applies, unevaluated. */
  | 'lookup_error';

/**
 * The evaluation result. `enabled` is the answer; everything else exists so the answer can be
 * EXPLAINED and REPLAYED — `flagVersion` + `matchedClauseIndex` together pin exactly which rule in
 * which version produced it.
 */
export interface FlagDecision {
  enabled: boolean;
  flagKey: string;
  /** The version that decided, or `null` when no version was in force. */
  flagVersion: number | null;
  /** Index into `cohortDefinition.clauses` of the clause that matched; `null` if none did. */
  matchedClauseIndex: number | null;
  reason: FlagDecisionReason;
}
