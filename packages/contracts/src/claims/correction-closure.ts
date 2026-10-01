// The correction CLOSURE — the request / response shapes (Story 6.19c; AC6, AC8c, AC14, AC15, AC17).
//
//   District Admin (key (2) / (8) / (1)):
//     · POST …/admin/claims/:claimCaseId/correction/closure/request                     — ask for a closure
//     · POST …/admin/claims/:claimCaseId/correction/no-correction-needed                — record "no correction needed"
//     · GET  …/admin/correction/closure-letters                                         — the closure letters owed
//     · POST …/admin/claims/:claimCaseId/correction/closure-letters                     — record a posted closure letter
//     · POST …/admin/claims/:claimCaseId/correction/closure-letters/:letterId/delivery  — its delivery (multipart)
//     · GET  …/admin/claims/:claimCaseId/correction/closure-letters/address?person_key= — the address (step-up)
//     · GET  …/admin/claims/:claimCaseId/correction/closure-letters/:letterId/screenshot
//   Pariwar Admin (key (3); D27's approve / keep under `cycle.freeze`):
//     · GET  …/admin/correction/closure-queue                                           — pending requests + D27 records
//     · POST …/admin/claims/:claimCaseId/correction/closure/decision                    — approve / decline (a note)
//     · POST …/admin/claims/:claimCaseId/correction/no-correction-needed/approve | /keep
//   Super Admin (key (5) / (4)):
//     · GET  …/admin/correction/escalations                                             — the held claims
//     · GET  …/admin/claims/:claimCaseId/correction/escalation                           — one, for the decision surface
//     · POST …/admin/claims/:claimCaseId/correction/escalation/review | /directions | /decision
//   The directee (`claim.view_nominee_name_check` + the identity check):
//     · GET  …/admin/correction/directions/mine ; POST …/directions/:directionId/response
//   District Admin / helpline (key (6)):
//     · POST …/admin/claims/:claimCaseId/refile-confirmation
//
// ⛔ Contracts never import `@twt/domain` ([[project_contracts_domain_bundle_boundary]]) — every vocabulary is
// RE-DECLARED here and pinned to the domain by `correction-closure-lockstep.test.ts`. ⚠ This module imports only
// `correction-chase.ts` (which imports nothing back); `nominee-name-check.ts` and `cycle-freeze.ts` import THIS one —
// ⛔ never a back-edge.
// PII: every note / direction / response / tracking number in a request is Tier-1 at rest (the route encrypts);
// the decrypted notes in a response go ONLY to the authorized staff route. ⛔ No name, ⛔ no number, ⛔ no address
// except the gated address read.

import { z } from 'zod';

import { CorrectionMustAct, CorrectionPersonKey, isRealCalendarDate } from './correction-chase.js';

const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'a calendar date, YYYY-MM-DD')
  .refine(isRealCalendarDate, 'not a real calendar date');

/** Every staff note's cap (the trustee-rationale cap). */
export const CORRECTION_CLOSURE_NOTE_MAX_CHARS = 1000;

const RequiredNote = z
  .string()
  .max(CORRECTION_CLOSURE_NOTE_MAX_CHARS)
  .refine((v) => v.trim().length > 0, 'a note is required');

// ── The vocabularies (⚠ LOCKSTEP with the domain — `correction-closure-lockstep.test.ts`) ─────────────────────

export const ClosureOrigin = z.enum(['declined_closure', 'staff_case']);
export type ClosureOrigin = z.infer<typeof ClosureOrigin>;

export const ClosureState = z.enum(['requested', 'lapsed', 'escalated', 'under_review', 'closed', 'refused', 'approved']);
export type ClosureState = z.infer<typeof ClosureState>;

/** `-273` §10 — the closure-scoped reasons, per Super Admin decision. */
export const CLOSURE_SUPER_ADMIN_REASONS = {
  close: ['family_silent_after_reached'],
  refuse: ['claim_not_payable', 'other'],
  approve: ['name_difference_accepted', 'details_verified', 'other'],
} as const;
export const ClosureSuperAdminReason = z.enum([
  'family_silent_after_reached',
  'claim_not_payable',
  'name_difference_accepted',
  'details_verified',
  'other',
]);
export type ClosureSuperAdminReason = z.infer<typeof ClosureSuperAdminReason>;

/** The trustee reason codes a Super Admin REFUSAL may carry (the domain's `isSuperAdminRefusalReasonCode`). */
export const SuperAdminRefusalReasonCode = z.enum(['standing_not_met', 'documents_insufficient', 'other']);
export type SuperAdminRefusalReasonCode = z.infer<typeof SuperAdminRefusalReasonCode>;

/**
 * Why a closure REQUEST would refuse now — AC6's codes in their order, plus D14's `claim_contact_required`. ⛔ `null` on
 * the wire means a request would be accepted.
 */
export const ClosureRequestBlocker = z.enum([
  'no_live_return',
  'escalated',
  'request_pending',
  'not_family_action',
  'too_early',
  'claim_routed_to_r9',
  'claim_corrected',
  'not_reached',
  'claim_contact_required',
  /** A person's CURRENT number could not be checked just now — D22 cannot be judged (retryable, ⛔ a refusal). */
  'number_unverified',
]);
export type ClosureRequestBlocker = z.infer<typeof ClosureRequestBlocker>;

export const NotReachedDto = z
  .object({ count: z.number().int().nonnegative(), roles: z.array(z.enum(['nominee', 'claimant'])) })
  .strict();

export const DirectionRole = z.enum(['district_admin', 'pariwar_admin']);
export const DirectionKind = z.enum(['restart_family_reminders', 'other']);

/** `-273` §7 — the highlight on a Super Admin approval made without a current passing name check. */
export const ApprovalNameHighlight = z.enum(['approved_without_passing_check', 'approved_despite_name_mismatch']);
export type ApprovalNameHighlight = z.infer<typeof ApprovalNameHighlight>;

// ── The District Admin's queue column (AC8c) ─────────────────────────────────────────────────────────────────

/** The closure state of ONE correction-queue row — the state, and why a request would refuse (⛔ `null` ⇒ it would pass). */
export const CorrectionClosureStateDto = z
  .object({
    state: ClosureState.nullable(),
    origin: ClosureOrigin.nullable(),
    requested_at: z.string().nullable(),
    requested_by: z.string().nullable(),
    blocker: ClosureRequestBlocker.nullable(),
    not_reached: NotReachedDto.nullable(),
    /** The latest family / direction run's day number today (open or ended), or `null`. */
    family_run_day: z.number().int().nullable(),
  })
  .strict();
export type CorrectionClosureStateDto = z.output<typeof CorrectionClosureStateDto>;

// ── Requests ─────────────────────────────────────────────────────────────────────────────────────────────────

export const RequestCorrectionClosureRequest = z.object({ note: RequiredNote }).strict();
export type RequestCorrectionClosureRequest = z.output<typeof RequestCorrectionClosureRequest>;

export const CorrectionClosureDecisionRequest = z
  .object({
    decision: z.enum(['approve', 'decline']),
    /** REQUIRED on a decline (`-232` H) — enforced here AND by the domain's CHECK. */
    note: z.string().max(CORRECTION_CLOSURE_NOTE_MAX_CHARS).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.decision === 'decline' && (v.note === undefined || v.note.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['note'], message: 'a note is required to decline a closure' });
    }
  });
export type CorrectionClosureDecisionRequest = z.output<typeof CorrectionClosureDecisionRequest>;

export const EscalatedClosureDecisionRequest = z
  .object({
    decision: z.enum(['close', 'refuse', 'approve']),
    reason: ClosureSuperAdminReason,
    note: RequiredNote,
    /** REQUIRED on a refusal — the trustee reason code on the decision row (D17). */
    refusal_reason_code: SuperAdminRefusalReasonCode.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!(CLOSURE_SUPER_ADMIN_REASONS[v.decision] as readonly string[]).includes(v.reason)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: `the reason is not one for '${v.decision}'` });
    }
    if (v.decision === 'refuse' && v.refusal_reason_code === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['refusal_reason_code'], message: 'a refusal needs its reason code' });
    }
    if (v.decision !== 'refuse' && v.refusal_reason_code !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['refusal_reason_code'], message: 'only a refusal carries a reason code' });
    }
  });
export type EscalatedClosureDecisionRequest = z.output<typeof EscalatedClosureDecisionRequest>;

export const ClosureReviewRequest = z.object({ note: RequiredNote }).strict();
export type ClosureReviewRequest = z.output<typeof ClosureReviewRequest>;

export const ClosureDirectionRequest = z
  .object({ directed_to_actor: z.string().uuid(), directed_to_role: DirectionRole, kind: DirectionKind, text: RequiredNote })
  .strict();
export type ClosureDirectionRequest = z.output<typeof ClosureDirectionRequest>;

export const ClosureDirectionResponseRequest = z.object({ response: RequiredNote }).strict();
export type ClosureDirectionResponseRequest = z.output<typeof ClosureDirectionResponseRequest>;

export const NoCorrectionNeededRequest = z.object({ note: RequiredNote }).strict();
export type NoCorrectionNeededRequest = z.output<typeof NoCorrectionNeededRequest>;

export const NoCorrectionNeededApproveRequest = z.object({}).strict();
export type NoCorrectionNeededApproveRequest = z.output<typeof NoCorrectionNeededApproveRequest>;

export const NoCorrectionNeededKeepRequest = z.object({ must_act: CorrectionMustAct, note: RequiredNote }).strict();
export type NoCorrectionNeededKeepRequest = z.output<typeof NoCorrectionNeededKeepRequest>;

export const RecordClosureLetterRequest = z
  .object({
    person_key: CorrectionPersonKey,
    posted_on: IsoDate,
    tracking_number: z
      .string()
      .max(64)
      .refine((v) => v.trim().length > 0, 'a tracking number is required'),
  })
  .strict();
export type RecordClosureLetterRequest = z.output<typeof RecordClosureLetterRequest>;

export const RefileConfirmationRequest = z.object({ note: RequiredNote }).strict();
export type RefileConfirmationRequest = z.output<typeof RefileConfirmationRequest>;

// ── Responses ────────────────────────────────────────────────────────────────────────────────────────────────

/** A closures row as the acting staff member sees it after an act. ⛔ No note. */
export const CorrectionClosureDto = z
  .object({
    closure_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    origin: ClosureOrigin,
    state: ClosureState,
    requested_at: z.string().nullable(),
    escalated_at: z.string().nullable(),
    under_review_since: z.string().nullable(),
    super_admin_decision: z.enum(['closed', 'refused', 'approved']).nullable(),
    super_admin_reason: ClosureSuperAdminReason.nullable(),
    closed_at: z.string().nullable(),
    /** `-274` 2 — the people owed a closure letter (role keys, ⛔ names). */
    closure_letter_person_keys: z.array(CorrectionPersonKey),
    /** `-273` §7 — on an approval made without a current passing name check. */
    name_highlight: ApprovalNameHighlight.nullable(),
  })
  .strict();
export type CorrectionClosureDto = z.output<typeof CorrectionClosureDto>;

/** A decrypted staff note on a read surface — or `unreadable` (a KMS fault: the row still shows). */
export const StaffNoteDto = z.discriminatedUnion('state', [
  z.object({ state: z.literal('readable'), value: z.string() }).strict(),
  z.object({ state: z.literal('unreadable') }).strict(),
]);
export type StaffNoteDto = z.output<typeof StaffNoteDto>;

export const PariwarClosureQueueItemDto = z
  .object({
    kind: z.enum(['closure_request', 'no_correction_needed']),
    claim_case_id: z.string().uuid(),
    deceased_member_id: z.string().uuid(),
    short_reference: z.string(),
    at: z.string(),
    by: z.string(),
    note: StaffNoteDto,
    family_run_day0: IsoDate.nullable(),
    checked_after_record: z.boolean().nullable(),
    held: z.boolean(),
  })
  .strict();
export const PariwarClosureQueueResponse = z.object({ items: z.array(PariwarClosureQueueItemDto) }).strict();
export type PariwarClosureQueueResponse = z.output<typeof PariwarClosureQueueResponse>;

export const EscalatedClosureItemDto = z
  .object({
    closure_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    deceased_member_id: z.string().uuid(),
    short_reference: z.string(),
    origin: ClosureOrigin,
    state: ClosureState,
    escalated_at: z.string(),
    under_review_since: z.string().nullable(),
    open_directions: z.number().int().nonnegative(),
  })
  .strict();
export const EscalatedClosuresResponse = z.object({ items: z.array(EscalatedClosureItemDto) }).strict();
export type EscalatedClosuresResponse = z.output<typeof EscalatedClosuresResponse>;

export const ClosureDirectionDto = z
  .object({
    direction_id: z.string().uuid(),
    directed_to_actor: z.string(),
    directed_to_role: DirectionRole,
    kind: DirectionKind,
    text: StaffNoteDto,
    created_by: z.string(),
    created_at: z.string(),
    opened_run: z.boolean(),
    response: StaffNoteDto.nullable(),
    responded_at: z.string().nullable(),
    responded_by: z.string().nullable(),
  })
  .strict();
export type ClosureDirectionDto = z.output<typeof ClosureDirectionDto>;

export const EscalatedClosureMarkDto = z
  .object({
    must_act: CorrectionMustAct,
    is_return_mark: z.boolean(),
    set_at: z.string(),
    set_by: z.string(),
    set_by_role: z.string(),
    note: StaffNoteDto.nullable(),
  })
  .strict();

/** ONE held claim for the Super Admin's decision surface (AC14). */
export const EscalatedClosureDetailResponse = z
  .object({
    closure: CorrectionClosureDto,
    deceased_member_id: z.string().uuid(),
    short_reference: z.string(),
    claim_state: z.string(),
    request_note: StaffNoteDto.nullable(),
    requested_by: z.string().nullable(),
    pariwar_decision_note: StaffNoteDto.nullable(),
    pariwar_decided_by: z.string().nullable(),
    review_note: StaffNoteDto.nullable(),
    marks: z.array(EscalatedClosureMarkDto),
    directions: z.array(ClosureDirectionDto),
    resubmitted: z.boolean(),
    family_part_done: z.boolean(),
    name_check_state: z.enum(['passing', 'never_checked', 'stale', 'does_not_match', 'accounts_missing', 'undetermined']),
    /** Which writer an APPROVE would run (`-273` §8): the `-251` waiver, or the full gate. */
    approve_path: z.enum(['name_waived_251', 'full_gate']),
  })
  .strict();
export type EscalatedClosureDetailResponse = z.output<typeof EscalatedClosureDetailResponse>;

export const DirectionInboxItemDto = z
  .object({ claim_case_id: z.string().uuid(), short_reference: z.string(), still_held: z.boolean(), direction: ClosureDirectionDto })
  .strict();
export const DirectionInboxResponse = z.object({ items: z.array(DirectionInboxItemDto) }).strict();
export type DirectionInboxResponse = z.output<typeof DirectionInboxResponse>;

export const ClosureLetterDto = z
  .object({
    letter_id: z.string().uuid(),
    person_key: CorrectionPersonKey,
    posted_on: IsoDate,
    delivered_on: IsoDate.nullable(),
    overdue: z.boolean(),
    has_screenshot: z.boolean(),
  })
  .strict();
export type ClosureLetterDto = z.output<typeof ClosureLetterDto>;

export const ClosureLettersOwedItemDto = z
  .object({
    claim_case_id: z.string().uuid(),
    deceased_member_id: z.string().uuid(),
    short_reference: z.string(),
    closed_on: IsoDate,
    days_since_closure: z.number().int(),
    people: z.array(z.object({ person_key: CorrectionPersonKey, letter: ClosureLetterDto.omit({ person_key: true }).nullable() }).strict()),
  })
  .strict();
export const ClosureLettersOwedResponse = z.object({ items: z.array(ClosureLettersOwedItemDto) }).strict();
export type ClosureLettersOwedResponse = z.output<typeof ClosureLettersOwedResponse>;

export const ClosureLetterAddressQuery = z.object({ person_key: CorrectionPersonKey }).strict();
export const ClosureLetterAddressResponse = z.object({ person_key: CorrectionPersonKey, address: z.string() }).strict();
export const ClosureLetterScreenshotResponse = z
  .object({ url: z.string().url(), expires_in_seconds: z.number().int().positive() })
  .strict();

export const NoCorrectionNeededResponse = z
  .object({ claim_case_id: z.string().uuid(), record_id: z.string().uuid(), must_act: CorrectionMustAct })
  .strict();
export type NoCorrectionNeededResponse = z.output<typeof NoCorrectionNeededResponse>;

export const ClosureDecisionClaimResponse = z
  .object({ claim_case_id: z.string().uuid(), claim_state: z.string(), closure: CorrectionClosureDto.nullable() })
  .strict();
export type ClosureDecisionClaimResponse = z.output<typeof ClosureDecisionClaimResponse>;

export const ClosureDirectionResponse = z
  .object({ claim_case_id: z.string().uuid(), direction: ClosureDirectionDto })
  .strict();
export type ClosureDirectionResponse = z.output<typeof ClosureDirectionResponse>;

export const RefileConfirmationResponse = z
  .object({ confirmation_id: z.string().uuid(), closed_claim_case_id: z.string().uuid(), via: z.enum(['district_admin', 'helpline']) })
  .strict();
export type RefileConfirmationResponse = z.output<typeof RefileConfirmationResponse>;
