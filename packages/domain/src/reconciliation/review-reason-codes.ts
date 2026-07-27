// Reconciliation-review outcomes + reason codes + the outcome↔reason-code compatibility map — Story 9.8
// (Task 2; AC3/AC4/AC5/AC6/AC7). The DECISION-METADATA vocabulary the four trustee actions
// (confirm / reject / facilitate-recovery / review-and-reverse) turn on.
//
// ── Why a `z.enum`, NOT a `pgEnum` (the reconciliation.* precedent) ──────────────────────────────────
// The 6.11 verifier reason codes are a Postgres `pgEnum` because they type a real relational column
// (`claim_verifier_decisions.reason_code`). Story 9.8 stores NO decision row — the reason code rides in
// the JSONB event payload (`reconciliation.contribution-rejected` / `reconciliation.confirmation-reversed`)
// and the NON-PII audit context ONLY (Decision D5: "metadata-is-an-event, minimize new schema"). So this
// vocabulary follows the SIBLING reconciliation-event enums (`ReconciliationActorRole` /
// `ReconciliationFallbackReason` in events.ts — plain `z.enum`, no pgEnum), NOT the claim pattern. There
// is no column to type, so no pgEnum + no migration (a pgEnum type no column references is dead schema).
//
// ── Contracts mirror ─────────────────────────────────────────────────────────────────────────────────
// A value-aligned copy lives in `@twt/contracts` (reconciliation-review.ts) because a contracts SOURCE
// file MUST NOT import `@twt/domain` (the browser-bundle rule). THIS domain copy is the canonical source
// of truth + the defense-in-depth enforcement point; the contracts copy produces the 400 at the boundary
// and drives the `<ReasonCodeDropdown>`. Keep the two in lockstep (the BankCode / verifier precedent).
//
// The bounded reason codes are NON-PII machine tokens (safe on the audit context); any free-text rationale
// is the sensitive field and is NEVER carried in an event payload or audit line.

import { z } from 'zod';

/**
 * The four trustee ACTIONS a reconciliation-review decision records (AC3–AC6):
 *   · `confirm` → reuses the existing `appendConfirmedContribution` (the ONLY manual confirm path, D2);
 *   · `reject`  → the new `reconciliation.contribution-rejected` verdict (D1); member stays red, case closes;
 *   · `recover` → facilitate-recovery: an audited action + Epic-10 helpdesk seam, NO outcome event (D7);
 *   · `reverse` → `reconciliation.confirmation-reversed`: walk a confirmed contribution back to `held` (D3).
 */
export const RECONCILIATION_REVIEW_OUTCOMES = ['confirm', 'reject', 'recover', 'reverse'] as const;
export const ReconciliationReviewOutcome = z.enum(RECONCILIATION_REVIEW_OUTCOMES);
export type ReconciliationReviewOutcome = (typeof RECONCILIATION_REVIEW_OUTCOMES)[number];

/**
 * The bounded, agreed-upfront reason codes (BigDev-approved 2026-07-27; structured categories, not free
 * text). Non-PII identifiers (safe on the audit context). `other` is the escape hatch, valid for ANY
 * outcome, and REQUIRES the free-text rationale. Extend this tuple + `REASON_CODE_OUTCOME_COMPAT`
 * together — never one without the other.
 */
export const RECONCILIATION_REVIEW_REASON_CODES = [
  // reject family — the attestation could not be reconciled to a real, in-window, correct-pool payment.
  'wrong_pool', // paid, but into the wrong pool (Story 7.6 wrong-pool deposit)
  'amount_mismatch', // a statement entry exists but the amount does not match the pool's fixed amount
  'no_statement_entry', // no bank-statement entry found in the reconciliation window
  'no_evidence', // no screenshot / statement / any evidence supports the attestation
  // confirm family — evidence supports the payment; the trustee confirms manually.
  'screenshot_verified', // the member's self-verify screenshot substantiates the payment
  'statement_matched_manually', // a statement entry matches once read by a human
  // recover family — the case needs off-band human resolution; it stays OPEN (D7).
  'member_contacted', // the member has been reached to resolve the discrepancy
  'awaiting_correction', // waiting on a corrected payment / statement before the case can close
  // reverse family — walk back an already-confirmed contribution (the rare monotonic exception, D3).
  'confirmed_in_error', // the prior confirmation was made in error
  'duplicate', // the confirmation double-counts a payment already confirmed elsewhere
  // Any-outcome escape hatch (mandatory free-text rationale).
  'other',
] as const;
export const ReconciliationReviewReasonCode = z.enum(RECONCILIATION_REVIEW_REASON_CODES);
export type ReconciliationReviewReasonCode = (typeof RECONCILIATION_REVIEW_REASON_CODES)[number];

/**
 * The SINGLE domain source of truth for outcome↔reason-code compatibility (AC7). Each reason code maps
 * to the outcome(s) it is valid for. `other` is valid for every outcome; every other code is pinned to
 * exactly the outcome it makes sense for. The contract `superRefine` (→ 400) and the domain/handler
 * write-path BOTH consume `isReasonCodeValidForOutcome` over this map — do NOT hand-maintain a second
 * copy (the 6.11 "one named policy, not two drifting booleans" lesson).
 */
export const REASON_CODE_OUTCOME_COMPAT: Readonly<
  Record<ReconciliationReviewReasonCode, readonly ReconciliationReviewOutcome[]>
> = {
  wrong_pool: ['reject'],
  amount_mismatch: ['reject'],
  no_statement_entry: ['reject'],
  no_evidence: ['reject'],
  screenshot_verified: ['confirm'],
  statement_matched_manually: ['confirm'],
  member_contacted: ['recover'],
  awaiting_correction: ['recover'],
  confirmed_in_error: ['reverse'],
  duplicate: ['reverse'],
  other: ['confirm', 'reject', 'recover', 'reverse'],
};

/**
 * The outcomes that REQUIRE a free-text rationale (the "high-severity" member-consequential actions): a
 * `reject` denies the member's attestation, a `reverse` walks back money already counted. `confirm` and
 * `recover` do not force a rationale (the verifier "rationale required on a Deny" analog — reject/reverse
 * are the deny-equivalents here). `other` forces a rationale regardless of outcome (below).
 */
export const RATIONALE_REQUIRED_OUTCOMES: readonly ReconciliationReviewOutcome[] = ['reject', 'reverse'];

/** Max rationale length (mirrors the verifier VERIFIER_RATIONALE_MAX_CHARS). */
export const RECONCILIATION_REVIEW_RATIONALE_MAX_CHARS = 500;

/**
 * Is `reasonCode` valid for `outcome`? The pure predicate (AC7) consumed by the contract superRefine
 * (→ 400 at the boundary) AND the handler write-path (defense-in-depth). Accepts raw strings so callers
 * needn't pre-narrow; an unknown code or outcome is simply not compatible → `false` (fail-closed).
 */
export function isReasonCodeValidForOutcome(outcome: string, reasonCode: string): boolean {
  const allowed = REASON_CODE_OUTCOME_COMPAT[reasonCode as ReconciliationReviewReasonCode];
  return allowed !== undefined && allowed.includes(outcome as ReconciliationReviewOutcome);
}

/** The reason codes valid for a given outcome (drives the `<ReasonCodeDropdown>` per-outcome options). */
export function reasonCodesForOutcome(outcome: string): ReconciliationReviewReasonCode[] {
  return RECONCILIATION_REVIEW_REASON_CODES.filter((code) => isReasonCodeValidForOutcome(outcome, code));
}

/** Does this (outcome, reasonCode) pair require a non-empty rationale? (`other` OR a reject/reverse.) */
export function isRationaleRequired(outcome: string, reasonCode: string): boolean {
  return (
    reasonCode === 'other' ||
    RATIONALE_REQUIRED_OUTCOMES.includes(outcome as ReconciliationReviewOutcome)
  );
}
