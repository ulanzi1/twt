// Story 6.39 — the staff MEMBERSHIP CHECK before any drive (Task 3.1; DL2, DL4, DL5, DL8, DL10).
//
// `2026-10-31-424` Q1 (a) C: an identity nobody has checked is checked first, by staff, before any drive opens.
// `2026-10-31-430` Q1 B: staff compare the certificate's date of death with the date the joining fee was paid, and
// ⛔ drive opens if the fee was paid after the death.
//
// ⭐ The request carries ⛔ DATE: the server reads both dates and computes the comparison (N3) — a client cannot
// supply or override either. It carries only the certificate review the staff member saw (the currency token) and
// their identity judgment.
// ⚠ The request is deliberately LOOSE on the outcome ⇔ reason ⇔ note coherence: the domain writer owns those
// refusals (`membership_check.invalid_outcome`), so each is audited rather than an anonymous 400 here.
// ⚠ MIRRORED, ⛔ imported: the domain owns every tuple below (`@twt/domain` — the schema's outcome / reason tuples,
// `claim/errors.ts` `MEMBERSHIP_CHECK_WAIT_REASONS`, `claim/membership-check-approval.ts` `MEMBERSHIP_CHECK_KYC_ROUTES`);
// contracts ⛔ never imports `@twt/domain` (the browser-bundle rule; a turbo cycle).
// `packages/contracts/tests/claims-membership-check.test.ts` pins each pair equal. ALL objects `.strict()`.

import { z } from 'zod';

/** The fee half's result: the joining fee's Indian calendar date against the certificate's date of death. */
export const MEMBERSHIP_CHECK_FEE_OUTCOMES = ['before_death', 'same_day', 'after_death'] as const;
export const MembershipCheckFeeOutcome = z.enum(MEMBERSHIP_CHECK_FEE_OUTCOMES);
export type MembershipCheckFeeOutcome = z.output<typeof MembershipCheckFeeOutcome>;

/** The identity half's result — `not_required` iff the identity was already checked. */
export const MEMBERSHIP_CHECK_IDENTITY_OUTCOMES = ['not_required', 'confirmed', 'not_confirmed'] as const;
export const MembershipCheckIdentityOutcome = z.enum(MEMBERSHIP_CHECK_IDENTITY_OUTCOMES);
export type MembershipCheckIdentityOutcome = z.output<typeof MembershipCheckIdentityOutcome>;

/** Why the identity could not be confirmed — `not_confirmed` only. */
export const MEMBERSHIP_CHECK_IDENTITY_REASONS = [
  'name_differs',
  'age_or_birth_date_differs',
  'document_unreadable',
  'other',
] as const;
export const MembershipCheckIdentityReason = z.enum(MEMBERSHIP_CHECK_IDENTITY_REASONS);
export type MembershipCheckIdentityReason = z.output<typeof MembershipCheckIdentityReason>;

/**
 * Why an approval WAITS on the membership check, in precedence order — `details.reason` of every
 * `<prefix>.membership_check_required` 409 (`verifier_decision.` / `cycle_freeze.` / `r9_voting.` / `closure.`).
 */
export const MEMBERSHIP_CHECK_WAIT_REASONS = ['not_checked', 'stale', 'fee_after_death', 'identity_not_confirmed'] as const;
export const MembershipCheckWaitReason = z.enum(MEMBERSHIP_CHECK_WAIT_REASONS);
export type MembershipCheckWaitReason = z.output<typeof MembershipCheckWaitReason>;

/** Is `value` one of the four wait reasons? (The admin's guard before it picks a reason's line.) */
export function isMembershipCheckWaitReason(value: unknown): value is MembershipCheckWaitReason {
  return typeof value === 'string' && (MEMBERSHIP_CHECK_WAIT_REASONS as readonly string[]).includes(value);
}

/** The suffix every approval route's 409 ends with (each route PREFIXES its own — ⛔ a bare `claim.` code exists). */
export const MEMBERSHIP_CHECK_REQUIRED_CODE_SUFFIX = '.membership_check_required';
/** The suffix of the deny-reason guard's 409 (`verifier_decision.` / `cycle_freeze.`). */
export const FEE_PAID_AFTER_DEATH_NOT_SHOWN_CODE_SUFFIX = '.fee_paid_after_death_not_shown';

/** How the deceased's identity record stands — plaintext, ⛔ a name. */
export const MEMBERSHIP_CHECK_KYC_ROUTES = [
  'digilocker',
  'trustee_verified',
  'typed_in_unchecked',
  'unverified',
  'no_record',
] as const;
export const MembershipCheckKycRoute = z.enum(MEMBERSHIP_CHECK_KYC_ROUTES);
export type MembershipCheckKycRoute = z.output<typeof MembershipCheckKycRoute>;

/** A `YYYY-MM-DD` calendar date. */
const DateShape = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'a YYYY-MM-DD calendar date');

/** `POST …/admin/claims/:claimCaseId/membership-check`. ⛔ No date field — the server computes the comparison. */
export const MembershipCheckRequest = z
  .object({
    /** The ACCEPTED certificate review the staff member saw (the preview's `expected_live_review_id`). */
    expected_live_review_id: z.string().uuid(),
    identity_outcome: MembershipCheckIdentityOutcome,
    /** `not_confirmed` only — the writer refuses it elsewhere, and refuses `not_confirmed` without it. */
    identity_reason: MembershipCheckIdentityReason.optional(),
    /** Required for `not_confirmed`, optional otherwise. Tier-1 at rest. */
    note: z.string().trim().max(2000).optional(),
  })
  .strict();
export type MembershipCheckRequest = z.output<typeof MembershipCheckRequest>;

export const MembershipCheckWriteResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    check_id: z.string().uuid(),
    death_certificate_review_id: z.string().uuid(),
    fee_outcome: MembershipCheckFeeOutcome,
    identity_required: z.boolean(),
    identity_outcome: MembershipCheckIdentityOutcome,
    identity_reason: MembershipCheckIdentityReason.nullable(),
    superseded_check_id: z.string().uuid().nullable(),
    event_version: z.number().int().positive(),
  })
  .strict();
export type MembershipCheckWriteResponse = z.output<typeof MembershipCheckWriteResponse>;

/** The claim's LIVE check, as the preview shows it. ⛔ The note is never returned. */
export const MembershipCheckLiveCheck = z
  .object({
    check_id: z.string().uuid(),
    fee_outcome: MembershipCheckFeeOutcome,
    identity_required: z.boolean(),
    identity_outcome: MembershipCheckIdentityOutcome,
    identity_reason: MembershipCheckIdentityReason.nullable(),
    has_note: z.boolean(),
    decided_by_display: z.string(),
    decided_at: z.string().datetime(),
  })
  .strict();
export type MembershipCheckLiveCheck = z.output<typeof MembershipCheckLiveCheck>;

/**
 * `GET …/admin/claims/:claimCaseId/membership-check` — what the staff member sees before recording the check.
 * The two dates are shown so they can SEE the comparison the system made (`-430`: *"staff compare"*); the
 * deceased's name and date of birth are NOT here — the verifier console's packet already carries them (DL8: ⛔ a
 * second place that opens them).
 */
export const MembershipCheckPreviewResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    /** The claim is in the window in which a check may be recorded. */
    window_open: z.boolean(),
    /**
     * The claim's CURRENT accepted certificate review — `null` while there is none (missing, awaiting review or
     * rejected): the control is disabled and says a certificate must be accepted first.
     */
    expected_live_review_id: z.string().uuid().nullable(),
    /** The date of death on the accepted certificate, as the District Admin entered it. `null` with no accepted review. */
    date_of_death: DateShape.nullable(),
    /** The joining fee's date, Indian calendar. `null` when the joining receipt cannot be identified. */
    fee_paid_on: DateShape.nullable(),
    /** `false` ⇒ the member's joining receipt cannot be identified: the check cannot be recorded (escalate). */
    fee_receipt_found: z.boolean(),
    /** The computed comparison — `null` unless both dates are known. */
    fee_outcome: MembershipCheckFeeOutcome.nullable(),
    /** Must the staff member judge the identity? */
    identity_required: z.boolean(),
    kyc_route: MembershipCheckKycRoute,
    /** The deceased's latest posting district (plaintext) — may be absent. */
    latest_posting_district: z.string().nullable(),
    live_check: MembershipCheckLiveCheck.nullable(),
    /** The approval gate's own answer for this claim right now. */
    gate: z.object({ passed: z.boolean(), reason: MembershipCheckWaitReason.nullable() }).strict(),
  })
  .strict();
export type MembershipCheckPreviewResponse = z.output<typeof MembershipCheckPreviewResponse>;

/**
 * The verifier console packet's section (DL10) — NON-PII: does the approval wait for the membership check, why,
 * and may THIS viewer record one. Computed with the SAME state function as the approval gate
 * (`membershipCheckApprovalState`), so the console can never offer an Approve that 409s
 * `…membership_check_required`.
 */
export const MembershipCheckGateStatus = z
  .object({
    /** `false` ⇒ the section could ⛔ not be read — Approve is disabled with "could not be checked" words. */
    available: z.boolean(),
    passed: z.boolean(),
    reason: MembershipCheckWaitReason.nullable(),
    /** Judged SERVER-SIDE: the claim is in the window AND the actor holds `claim.check_membership` for the deceased's district. */
    viewer: z.object({ canCheckMembership: z.boolean() }).strict(),
  })
  .strict();
export type MembershipCheckGateStatus = z.output<typeof MembershipCheckGateStatus>;
