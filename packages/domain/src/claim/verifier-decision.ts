// Verifier-decision reason codes + outcome-compatibility map — Story 6.11 (Task 1; AC1/AC4/AC7/AC8; D-F/D-G).
//
// The DECISION-METADATA vocabulary the verifier adjudication write path (approve/deny/escalate/revise)
// and its read model turn on. Two bounded, non-PII enums + ONE compatibility map:
//
//   · VERIFIER_DECISION_OUTCOMES — the three adjudication outcomes a decision row records
//     (`approved` / `denied` / `escalated`). The LIFECYCLE state is derived from the claim.verifier_*
//     event via the reducer (AC0 — the event is the lifecycle authority); this `outcome` is the
//     DECISION-METADATA authority's own label for the row (escalate has no lifecycle state, D-D).
//   · VERIFIER_REASON_CODES — the agreed-upfront, structured reason codes (UX §11 — NOT free text).
//     Bounded non-PII identifiers, safe on the audit-sink context + the trustee "actor + reason-code +
//     time_range" filter (AC4). The free-text RATIONALE is the sensitive field (Tier-1, D-G) — it lives
//     encrypted in `claim_verifier_decisions.rationale_ciphertext`, NEVER here.
//   · REASON_CODE_OUTCOME_COMPAT — the SINGLE domain source of truth (AC8): which outcomes each reason
//     code is valid for. Enforced in BOTH the contract (`packages/contracts` superRefine → 400) AND the
//     domain write-path (defense-in-depth), and it drives the `<ReasonCodeDropdown>` per-outcome options.
//
// Modelled on the `groundInspectionRefusalReasonEnum` precedent (a domain `pgEnum` + TS tuple).

import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * The three adjudication OUTCOMES a decision row records (AC8). `approved` / `denied` map to the
 * `claim.verifier_approved` / `claim.verifier_denied` lifecycle verdicts; `escalated` is the D-D
 * identity annotation (NO lifecycle state). This is the decision-table's own metadata label — claim
 * STATE is always derived from event replay, never from this column (AC0).
 */
export const VERIFIER_DECISION_OUTCOMES = ['approved', 'denied', 'escalated'] as const;
export const verifierDecisionOutcomeEnum = pgEnum('verifier_decision_outcome', VERIFIER_DECISION_OUTCOMES);
export type VerifierDecisionOutcome = (typeof VERIFIER_DECISION_OUTCOMES)[number];

/**
 * The bounded, agreed-upfront reason codes (D-F; UX §11 — structured categories, not free text).
 * Non-PII identifiers (safe on the audit context + the trustee filter). `other` is the escape hatch
 * and is valid for ANY outcome, but REQUIRES the free-text rationale (enforced in the writer/contract,
 * AC1(b)). Extend this tuple + `REASON_CODE_OUTCOME_COMPAT` together — never one without the other.
 */
export const VERIFIER_REASON_CODES = [
  // Approve family — the standing/eligibility ladder was met.
  'r5_d_natural_death',
  'r8_90pct_met',
  'concealment_flag_override', // a concealment flag was reviewed + overridden → approve
  // Deny family.
  'concealment_flag_uphold', // a concealment flag was reviewed + upheld → deny
  // Escalate family.
  'r9_routed_to_voting', // routed to State-Trustee voting/discretion → escalate
  // Any-outcome escape hatch (mandatory free-text rationale).
  'other',
] as const;
export const verifierReasonCodeEnum = pgEnum('verifier_reason_code', VERIFIER_REASON_CODES);
export type VerifierReasonCode = (typeof VERIFIER_REASON_CODES)[number];

/**
 * The SINGLE domain source of truth for outcome↔reason-code compatibility (AC8). Each reason code
 * maps to the set of outcomes it is valid for. `other` is valid for every outcome; every other code
 * is pinned to exactly the outcome(s) it makes sense for. The contract's `superRefine` and the
 * domain write-path BOTH consume `isReasonCodeValidForOutcome` over this map — do NOT hand-maintain a
 * second copy (the exact 6.9 "one named policy, not two drifting booleans" lesson).
 */
export const REASON_CODE_OUTCOME_COMPAT: Readonly<
  Record<VerifierReasonCode, readonly VerifierDecisionOutcome[]>
> = {
  r5_d_natural_death: ['approved'],
  r8_90pct_met: ['approved'],
  concealment_flag_override: ['approved'],
  concealment_flag_uphold: ['denied'],
  r9_routed_to_voting: ['escalated'],
  other: ['approved', 'denied', 'escalated'],
};

/**
 * Is `reasonCode` valid for `outcome`? The pure predicate (AC8) consumed by the contract superRefine
 * (→ 400 at the boundary) AND the domain write-path (defense-in-depth re-check before persist), and
 * used to compute the dropdown's per-outcome options. Accepts raw strings so callers needn't
 * pre-narrow; an unknown code or outcome is simply not compatible → `false` (fail-closed).
 */
export function isReasonCodeValidForOutcome(outcome: string, reasonCode: string): boolean {
  const allowed = REASON_CODE_OUTCOME_COMPAT[reasonCode as VerifierReasonCode];
  return allowed !== undefined && allowed.includes(outcome as VerifierDecisionOutcome);
}

/** The reason codes valid for a given outcome (drives the `<ReasonCodeDropdown>` options — AC8). */
export function reasonCodesForOutcome(outcome: string): VerifierReasonCode[] {
  return VERIFIER_REASON_CODES.filter((code) => isReasonCodeValidForOutcome(outcome, code));
}
