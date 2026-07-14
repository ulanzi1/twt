// State-Trustee cycle-freeze decision vocabulary — Story 6.13 (Task 1; AC0/AC2/AC3/AC4/AC4b/AC5; D-F).
//
// The DECISION-METADATA vocabulary the State-Trustee cycle-freeze write paths (vote / route-to-R9 /
// resolve-escalation / commit) and their read model turn on. This is the trustee-scoped SIBLING of the
// 6.11 `verifier-decision.ts` vocabulary — a DISTINCT, trustee-OWNED set (NOT a reuse of the
// `VerifierReasonCode`/`VerifierDecisionOutcome` enums, D-F). Four bounded, non-PII enums + ONE
// required-per-outcome/compat map:
//
//   · STATE_TRUSTEE_DECISION_PHASES — the four PHASE slots a claim's decision rows occupy across the flow
//     (`frozen_vote` | `commit` | `escalation_resolution` | `routing`). A claim legitimately accrues
//     MULTIPLE rows (a frozen vote, then a commit; an escalation resolution; a routing exclusion), so
//     uniqueness is PER-PHASE, not one-live-per-claim (the 6.11 partial-unique does NOT transfer — D-F,
//     other suggestion #5). The `claim_state_trustee_decisions` partial-unique keys `(claim_case_id, phase)`.
//   · STATE_TRUSTEE_DECISION_OUTCOMES — the decision-row outcome label (`approved` | `denied` |
//     `routed_to_r9`). The LIFECYCLE state is derived from the paired claim.* event (AC0 — the event is
//     the lifecycle authority); `routed_to_r9` has NO lifecycle event (routing is metadata-only, AC4/AC0).
//   · STATE_TRUSTEE_REASON_CODES — the agreed-upfront, structured trustee reason codes (bounded non-PII;
//     the free-text RATIONALE is the sensitive Tier-1 field, encrypted in
//     `claim_state_trustee_decisions.rationale_ciphertext`, NEVER here).
//   · REASON_CODE_OUTCOME_COMPAT + isReasonCodeValidForOutcome — the SINGLE domain source of truth (D-F):
//     which outcomes each reason code is valid for. Enforced in BOTH the contract (`packages/contracts`
//     superRefine → 400) AND the domain write-path (defense-in-depth). REQUIRED for `denied` +
//     `routed_to_r9`; OPTIONAL/ABSENT for `approved` (the D-F presence rule).
//
// Modelled on the `verifier-decision.ts` precedent (a domain `pgEnum` + TS tuple + compat map). The
// contract re-declares value-aligned mirrors (the browser-bundle rule); the lockstep test pins them.

import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * The four decision PHASES (D-F, other suggestion #5). Each is a claim's own clean, queryable,
 * supersedable slot: `frozen_vote` (the per-claim approve/deny vote during an open freeze, AC2/AC3);
 * `commit` (the bulk `claim.approved` milestone, AC5); `escalation_resolution` (a trustee resolving a
 * verifier escalation, AC4b); `routing` (the durable route-to-R9 exclusion, AC4). Uniqueness is
 * `(claim_case_id, phase) WHERE superseded_at IS NULL` — at most one LIVE row per phase.
 */
export const STATE_TRUSTEE_DECISION_PHASES = [
  'frozen_vote',
  'commit',
  'escalation_resolution',
  'routing',
  // Story 6.14 (AC4) — the R9 panel outcome slot. `finalizeR9Outcome` writes ONE live `r9_outcome` row per
  // claim into the trustee transcript alongside the paired claim.r9_outcome event + the session-outcome row,
  // so the R9 resolution is queryable on the same decision surface as the freeze/vote/commit/routing phases.
  // Added to the `state_trustee_decision_phase` pgEnum via migration 0064 (ALTER TYPE ADD VALUE).
  'r9_outcome',
] as const;
export const stateTrusteeDecisionPhaseEnum = pgEnum(
  'state_trustee_decision_phase',
  STATE_TRUSTEE_DECISION_PHASES,
);
export type StateTrusteeDecisionPhase = (typeof STATE_TRUSTEE_DECISION_PHASES)[number];

/**
 * The three decision OUTCOMES a trustee decision row records. `approved` / `denied` map to the paired
 * lifecycle events (state_trustee_approved / state_trustee_denied for a frozen vote; verifier_approved /
 * verifier_denied for an escalation resolution; claim.approved for a commit); `routed_to_r9` is the
 * metadata-only routing outcome (NO lifecycle event — AC0/AC4). Claim STATE is always derived from event
 * replay, never from this column (AC0).
 */
export const STATE_TRUSTEE_DECISION_OUTCOMES = ['approved', 'denied', 'routed_to_r9'] as const;
export const stateTrusteeDecisionOutcomeEnum = pgEnum(
  'state_trustee_decision_outcome',
  STATE_TRUSTEE_DECISION_OUTCOMES,
);
export type StateTrusteeDecisionOutcome = (typeof STATE_TRUSTEE_DECISION_OUTCOMES)[number];

/**
 * The bounded, agreed-upfront trustee reason codes (D-F — a NEW trustee-scoped set, NOT the 6.11
 * `VerifierReasonCode`). Non-PII identifiers (safe on the audit context + the trustee filter). `other`
 * is the escape hatch (valid for a deny or a route), which — like the 6.11 `other` — carries the
 * free-text rationale. Extend this tuple + `REASON_CODE_OUTCOME_COMPAT` together — never one without the
 * other.
 */
export const STATE_TRUSTEE_REASON_CODES = [
  // Deny family — the trustee denied the claim during the freeze / on escalation.
  'standing_not_met', // eligibility ladder (R5/R8 standing) not satisfied on trustee review
  'documents_insufficient', // death certificate / supporting documents inadequate
  'concealment_upheld', // a concealment flag was reviewed and upheld → deny
  // Route-to-R9 family — the trustee judged this an R9 special-case for panel voting (Story 6.14).
  'r9_special_case',
  // R9 panel-outcome family (Story 6.14 AC4, code review 2026-07-14) — the `phase='r9_outcome'` decision row
  // `finalizeR9Outcome` writes on a panel DENIAL. Distinct from the deny-family codes above (those are a
  // single trustee's administrative-review grounds; this is a PANEL VOTE outcome — the per-voter rationale
  // already lives on each `claim_r9_votes` row, AC3). Keeps this writer consistent with the D-F "reason code
  // required for denied" rule every other trustee-decision writer enforces via `assertReasonCode`.
  // Added to the `state_trustee_reason_code` pgEnum via migration 0065 (ALTER TYPE ADD VALUE).
  'r9_panel_denied',
  // Any-outcome (deny/route) escape hatch — mandatory free-text rationale.
  'other',
] as const;
export const stateTrusteeReasonCodeEnum = pgEnum('state_trustee_reason_code', STATE_TRUSTEE_REASON_CODES);
export type StateTrusteeReasonCode = (typeof STATE_TRUSTEE_REASON_CODES)[number];

/**
 * The SINGLE domain source of truth for outcome↔reason-code compatibility (D-F). Each reason code maps
 * to the set of outcomes it is valid for. NOTE the D-F PRESENCE rule is enforced SEPARATELY
 * (`reasonCodeRequiredForOutcome`): `approved` requires NO reason code (optional/absent), so no code is
 * pinned to `approved` here — a supplied code on an approve is rejected as incompatible (an approve
 * takes no ground). The contract's `superRefine` and the domain write-path BOTH consume
 * `isReasonCodeValidForOutcome` over this map — do NOT hand-maintain a second copy.
 */
// NOTE the DISTINCT names (`TRUSTEE_` / `isTrustee…`): the 6.11 `verifier-decision.ts` already exports the
// generic `REASON_CODE_OUTCOME_COMPAT` / `isReasonCodeValidForOutcome` / `reasonCodesForOutcome` names, and
// both modules are re-exported via `export *` from the claim barrel — trustee-scoped names avoid the collision.
export const TRUSTEE_REASON_CODE_OUTCOME_COMPAT: Readonly<
  Record<StateTrusteeReasonCode, readonly StateTrusteeDecisionOutcome[]>
> = {
  standing_not_met: ['denied'],
  documents_insufficient: ['denied'],
  concealment_upheld: ['denied'],
  r9_special_case: ['routed_to_r9'],
  r9_panel_denied: ['denied'],
  other: ['denied', 'routed_to_r9'],
};

/**
 * Does `outcome` REQUIRE a reason code (D-F presence rule)? `denied` and `routed_to_r9` require one (the
 * appeal / R9 record needs the ground); `approved` does NOT (optional/absent). Pure — consumed by the
 * contract superRefine (→ 400) AND the domain write-path (defense-in-depth).
 */
export function trusteeReasonCodeRequiredForOutcome(outcome: string): boolean {
  return outcome === 'denied' || outcome === 'routed_to_r9';
}

/**
 * Is `reasonCode` valid for `outcome`? The pure predicate consumed by the contract superRefine (→ 400)
 * AND the domain write-path (defense-in-depth). Accepts raw strings so callers needn't pre-narrow; an
 * unknown code or outcome is simply not compatible → `false` (fail-closed).
 */
export function isTrusteeReasonCodeValidForOutcome(outcome: string, reasonCode: string): boolean {
  const allowed = TRUSTEE_REASON_CODE_OUTCOME_COMPAT[reasonCode as StateTrusteeReasonCode];
  return allowed !== undefined && allowed.includes(outcome as StateTrusteeDecisionOutcome);
}

/** The reason codes valid for a given outcome (drives the trustee reason-code dropdown options). */
export function trusteeReasonCodesForOutcome(outcome: string): StateTrusteeReasonCode[] {
  return STATE_TRUSTEE_REASON_CODES.filter((code) => isTrusteeReasonCodeValidForOutcome(outcome, code));
}
