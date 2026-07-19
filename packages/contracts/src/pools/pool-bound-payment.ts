// packages/contracts/src/pools/pool-bound-payment.ts
//
// Pool-bound payment enforcement — transport DTOs (Story 7.6, FR-16/17/18; architectural-freeze row 7).
// The `.strict()` wire shapes three later epics consume: Epic 8 (<UPIIntentButton> button state), Epic 9
// (the reconciliation matcher that records a deposit valid/wrong_pool), Epic 10 (the helpdesk console).
//
// ── Contracts discipline (the fixed-amount.ts / deep-link.ts precedent) ────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle / turbo-cycle rule). So the
// verdict + reason-code enums are RE-DECLARED here, value-aligned with the domain
// `CONTRIBUTION_VALIDITY_VERDICTS` / `CONTRIBUTION_VALIDITY_REASON_CODES` tuples; a cross-package LOCKSTEP
// test (tests/pool-bound-payment.test.ts) pins them. ALL objects `.strict()`.
//
// ── The verdict union is OPEN BY DESIGN, but ships ONLY two values ──────────────────────────────────
// A TS/Zod union — NOT a DB enum (enum-width / no-dead-surface discipline; Epic 9's contribution record
// maps it to a DB enum when the record lands). Epic 7.7 extends it with `amount_mismatch`; 7.6 ships only
// `valid | wrong_pool`.
//
// ── OpenAPI posture ────────────────────────────────────────────────────────────────────────────────
// Internal render/consumer seam, NOT a live 7.6 HTTP endpoint → NO `.openapi()` registration (the
// deep-link.ts / alerts/ posture). Add it only if a live 7.6 route is introduced.

import { z } from 'zod';

import { UuidString } from '../_common/primitives.js';

// ── verdict + reason-code (value-aligned with @twt/domain; lockstep-pinned) ─────────────────────────

/** The contribution-validity verdict. `wrong_pool` iff a deposit landed in a non-assigned pool. Open by
 *  design (Epic 7.7 adds `amount_mismatch`); ships ONLY these two now. */
export const ContributionValidityVerdict = z.enum(['valid', 'wrong_pool']);
export type ContributionValidityVerdict = z.output<typeof ContributionValidityVerdict>;

/** The machine reason code accompanying each verdict. */
export const ContributionValidityReasonCode = z.enum([
  'assigned_pool_match',
  'deposited_to_non_assigned_pool',
]);
export type ContributionValidityReasonCode = z.output<typeof ContributionValidityReasonCode>;

/** The 1:1 verdict → reason-code pairing the domain classifier guarantees. A DTO carrying a mismatched
 *  pair (e.g. `valid` + `deposited_to_non_assigned_pool`) is a producer bug; the refine below rejects it
 *  so Epic 9 can never record an inconsistent verdict/reason. EXTEND this map in lockstep with the verdict
 *  union (Epic 7.7's `amount_mismatch` adds its own reason-code entry). */
const VERDICT_REASON_PAIRING: Record<ContributionValidityVerdict, ContributionValidityReasonCode> = {
  valid: 'assigned_pool_match',
  wrong_pool: 'deposited_to_non_assigned_pool',
};

/** The classifier's typed result (Epic 9 records this against the contribution). The verdict and
 *  reason-code are 1:1 (see {@link VERDICT_REASON_PAIRING}) — enforced, not just independently enumerated. */
export const ContributionValidityResult = z
  .object({
    verdict: ContributionValidityVerdict,
    reason_code: ContributionValidityReasonCode,
  })
  .strict()
  .refine((r) => VERDICT_REASON_PAIRING[r.verdict] === r.reason_code, {
    message: 'reason_code does not match its verdict (valid↔assigned_pool_match, wrong_pool↔deposited_to_non_assigned_pool)',
    path: ['reason_code'],
  });
export type ContributionValidityResult = z.output<typeof ContributionValidityResult>;

// ── the pool-binding response DTO (Epic 8 pre-fills the intent from this) ───────────────────────────

/** One collection account (the claim's nominee bank account #1/#2), CIPHERTEXT AS STORED — transport-free,
 *  decryption-free. The consumer decrypts under its own encryption context (Epic 8's <UPIIntentButton>). */
export const PoolCollectionAccount = z
  .object({
    /** 1 = primary (#1), 2 = secondary (#2). */
    account_rank: z.union([z.literal(1), z.literal(2)]),
    account_holder_name_ciphertext: z.string(),
    account_number_ciphertext: z.string(),
    ifsc_ciphertext: z.string(),
    /** Tier-3 plaintext (public, IFSC-derived, non-identifying). */
    bank_name: z.string(),
    branch: z.string().nullable(),
    ifsc_validated: z.boolean(),
  })
  .strict();
export type PoolCollectionAccount = z.output<typeof PoolCollectionAccount>;

/** The resolved member-cycle collection binding: the assigned pool + its claim's nominee bank accounts
 *  (#1 → #2, ciphertext AS STORED). `collection_accounts` is `[]` when not yet collected, else EXACTLY TWO. */
export const MemberContributionBinding = z
  .object({
    assigned: z.literal(true),
    pool_id: UuidString,
    claim_case_id: UuidString,
    pool_index: z.number().int().nonnegative(),
    pool_canonical_identifier: z.string(),
    collection_accounts: z
      .array(PoolCollectionAccount)
      .refine((accounts) => accounts.length === 0 || accounts.length === 2, {
        message: 'collection_accounts must be empty (not yet collected) or exactly two (#1, #2)',
      }),
  })
  .strict();
export type MemberContributionBinding = z.output<typeof MemberContributionBinding>;

/** The first-class "not assigned" absence signal (AC1.4) — never a throw-as-flow. */
export const MemberContributionBindingNotAssigned = z
  .object({ assigned: z.literal(false) })
  .strict();
export type MemberContributionBindingNotAssigned = z.output<typeof MemberContributionBindingNotAssigned>;

/** The binding result — the full binding OR the absence signal (discriminated on `assigned`). */
export const MemberContributionBindingResult = z.discriminatedUnion('assigned', [
  MemberContributionBinding,
  MemberContributionBindingNotAssigned,
]);
export type MemberContributionBindingResult = z.output<typeof MemberContributionBindingResult>;

// ── the CLOSED helpdesk-action set (AC3.10) ─────────────────────────────────────────────────────────
// The helpdesk operator's ALLOWED actions are exactly, and ONLY, these four. A closed `.strict()` enum
// so any cross-pool remap / auto-reassign / phantom-record operation is UNREPRESENTABLE — it does not
// type-check (the facilitated-recovery invariant enforced by ABSENCE, D4). Recovery is helpdesk-mediated,
// off-band, logged — NEVER an automated fund movement.

export const HelpdeskWrongPoolAction = z.enum([
  /** (i) confirm the wrong-pool record as `invalid` with a documented reason. */
  'confirm_invalid_with_reason',
  /** (ii) facilitate a manual refund discussion OFF-BAND (logged, not automated). */
  'facilitate_offband_refund_logged',
  /** (iii) document the family/member conversation. */
  'document_family_conversation',
  /** (iv) close the case with a documented outcome. */
  'close_case_with_documented_outcome',
]);
export type HelpdeskWrongPoolAction = z.output<typeof HelpdeskWrongPoolAction>;

/** The full closed action set as a runtime array (consumers iterate it; lockstep-pinned to the enum). */
export const HELPDESK_WRONG_POOL_ACTIONS = HelpdeskWrongPoolAction.options;

// ── the trustee-attestable-correction SEAM (AC3.11) ─────────────────────────────────────────────────
// The ONLY sanctioned path that may alter a wrong-pool payment record / assignment — rare, audit-logged,
// signed by ≥ 2 trustees (the claim.correct_nominee_bank tier-2 + Story 7.5 emergency-attestation
// precedent). NO LIVE ROUTE IN EPIC 7: the seam + the invariant + the gate ship now; the live surface
// lands with the Epic-9 record it would correct. The corrected record is referenced by its future
// `ContributionId` (a pre-reserved brand); typed as a UUID string here (no live record yet).

/** Min attesting trustees for a correction — a lone actor can never self-authorize (the ≥2 discipline). */
export const TRUSTEE_CORRECTION_MIN_ATTESTERS = 2;
/** Max attesting trustees — value-aligned with the APPEAL_PANEL_MAX_MEMBERS / R9_PANEL_MAX_MEMBERS panel
 *  upper-bound convention (claims/appeal.ts, claims/r9-voting.ts): a sanity ceiling, not a policy limit. */
export const TRUSTEE_CORRECTION_MAX_ATTESTERS = 25;
/** Max documented-reason length — policy/operational justification (never member-specific). */
export const TRUSTEE_CORRECTION_REASON_MAX_CHARS = 1000;

export const TrusteeAttestableCorrectionRequest = z
  .object({
    /** The wrong-pool contribution record being corrected (Epic 9's ContributionId, uuid wire-shape). */
    wrong_pool_contribution_ref: UuidString,
    /** Policy/operational justification for the correction — NEVER member-specific information. */
    documented_reason: z.string().trim().min(1).max(TRUSTEE_CORRECTION_REASON_MAX_CHARS),
    /** The attesting trustee roster — actor IDs only, ≥2, no duplicates. The dedup is CASE-INSENSITIVE:
     *  `UuidString` (`z.string().uuid()`) does not canonicalize hex case, so the same trustee submitted as
     *  `…ABCD` and `…abcd` must not inflate the ≥2 consensus past the lone-actor floor. */
    attesting_trustee_ids: z
      .array(UuidString)
      .min(TRUSTEE_CORRECTION_MIN_ATTESTERS)
      .max(TRUSTEE_CORRECTION_MAX_ATTESTERS)
      .refine((ids) => new Set(ids.map((id) => id.toLowerCase())).size === ids.length, {
        message: 'attesting_trustee_ids must not contain duplicate actor ids (case-insensitive)',
      }),
  })
  .strict();
export type TrusteeAttestableCorrectionRequest = z.output<typeof TrusteeAttestableCorrectionRequest>;
