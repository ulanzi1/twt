// packages/contracts/src/reconciliation/reconciliation-review.ts
//
// The reconciliation review-queue transport DTOs — Story 9.8 (the trustee ADJUDICATION surface). The
// wire shapes for:
//   · GET  /api/v1/admin/reconciliation-review/queue                 → the deadline-ordered open-case list
//   · GET  /api/v1/admin/reconciliation-review/cases/:caseKey        → one case's full review context
//   · POST /api/v1/admin/reconciliation-review/cases/:caseKey/confirm|reject|recover|reverse
//
// ── Contracts discipline (the verification-decision.ts / reconciliation events precedent) ────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). So the outcome +
// reason-code enums AND the outcome↔reason-code compat map are RE-DECLARED here, value-aligned with the
// domain `reconciliation.review-reason-codes` source of truth. The DOMAIN copy is canonical + the
// defense-in-depth enforcement point (the handler re-checks even if the boundary is bypassed); THIS is
// the value-aligned wire mirror that produces the 400 at the boundary + drives the `<ReasonCodeDropdown>`.
// Kept in lockstep by `packages/contracts/tests/reconciliation-review.test.ts`. ALL request objects
// `.strict()`.
//
// ── The request carries NO actor identity, NO free-text PII beyond the bounded rationale ─────────────
// The deciding actor id + `display_name` are server-derived (never client-supplied); `.strict()` rejects
// a smuggled actor field. The optional `rationale` (≤500 chars) is required on `other` + on a reject/
// reverse (the member-consequential outcomes). Reason codes are NON-PII machine tokens.

import { z } from 'zod';

/** The four trustee actions (value-aligned with the domain `RECONCILIATION_REVIEW_OUTCOMES`). */
export const RECONCILIATION_REVIEW_OUTCOMES = ['confirm', 'reject', 'recover', 'reverse'] as const;
export const ReconciliationReviewOutcome = z.enum(RECONCILIATION_REVIEW_OUTCOMES);
export type ReconciliationReviewOutcome = z.output<typeof ReconciliationReviewOutcome>;

/** The bounded reason codes (value-aligned with the domain `RECONCILIATION_REVIEW_REASON_CODES`). */
export const RECONCILIATION_REVIEW_REASON_CODES = [
  'wrong_pool',
  'amount_mismatch',
  'no_statement_entry',
  'no_evidence',
  'screenshot_verified',
  'statement_matched_manually',
  'member_contacted',
  'awaiting_correction',
  'confirmed_in_error',
  'duplicate',
  'other',
] as const;
export const ReconciliationReviewReasonCode = z.enum(RECONCILIATION_REVIEW_REASON_CODES);
export type ReconciliationReviewReasonCode = z.output<typeof ReconciliationReviewReasonCode>;

/** Max rationale length (mirrors the domain RECONCILIATION_REVIEW_RATIONALE_MAX_CHARS). */
export const RECONCILIATION_REVIEW_RATIONALE_MAX_CHARS = 500;

/**
 * The wire mirror of the domain `REASON_CODE_OUTCOME_COMPAT`. Which outcomes each reason code is valid
 * for. Keep value-aligned with packages/domain/src/reconciliation/review-reason-codes.ts (the canonical
 * source). `other` is valid for any outcome.
 */
export const RECONCILIATION_REASON_CODE_OUTCOME_COMPAT: Readonly<
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

/** The outcomes that REQUIRE a rationale (value-aligned with the domain RATIONALE_REQUIRED_OUTCOMES). */
export const RECONCILIATION_RATIONALE_REQUIRED_OUTCOMES: readonly ReconciliationReviewOutcome[] = [
  'reject',
  'reverse',
];

/** Is `reasonCode` valid for `outcome`? Fail-closed on unknown pairs (the boundary superRefine uses it).
 *  Reconciliation-scoped name (the claims contract owns the generic `isReasonCodeValidForOutcome`). */
export function isReconciliationReasonCodeValidForOutcome(outcome: string, reasonCode: string): boolean {
  const allowed = RECONCILIATION_REASON_CODE_OUTCOME_COMPAT[reasonCode as ReconciliationReviewReasonCode];
  return allowed !== undefined && allowed.includes(outcome as ReconciliationReviewOutcome);
}

/** The reason codes valid for a given outcome (drives the `<ReasonCodeDropdown>` per-outcome options). */
export function reconciliationReasonCodesForOutcome(outcome: string): ReconciliationReviewReasonCode[] {
  return ReconciliationReviewReasonCode.options.filter((code) =>
    isReconciliationReasonCodeValidForOutcome(outcome, code),
  );
}

/** Does this (outcome, reasonCode) pair require a non-empty rationale? (`other` OR reject/reverse.) */
export function isReconciliationRationaleRequired(outcome: string, reasonCode: string): boolean {
  return (
    reasonCode === 'other' ||
    RECONCILIATION_RATIONALE_REQUIRED_OUTCOMES.includes(outcome as ReconciliationReviewOutcome)
  );
}

// ── The case-type vocabulary (the reserved-seam sources the queue gathers) ───────────────────────────

/** The kinds of open reconciliation case the queue surfaces (each closes a reserved Epic-9 seam). */
export const RECONCILIATION_CASE_TYPES = [
  'mismatch', // contribution.reconciliation-mismatch (red; incl. reason='wrong_pool') — Story 7.6/9.4
  'self_verify', // reconciliation.self-verify-screenshot-uploaded — Story 9.7
  'manual_transcription', // reconciliation.manual_transcription_requested — Story 9.3
  'takeover', // computeStaffTakeover-eligible pool — Story 9.1
] as const;
export const ReconciliationCaseType = z.enum(RECONCILIATION_CASE_TYPES);
export type ReconciliationCaseType = z.output<typeof ReconciliationCaseType>;

/** The lifecycle status of a resolved case (open queue rows are always `open`; detail can be any). */
export const RECONCILIATION_CASE_STATUSES = ['open', 'confirmed', 'rejected'] as const;
export const ReconciliationCaseStatus = z.enum(RECONCILIATION_CASE_STATUSES);
export type ReconciliationCaseStatus = z.output<typeof ReconciliationCaseStatus>;

// ── Read responses ───────────────────────────────────────────────────────────────────────────────────

/** One open-case row in the deadline-ordered queue list. NON-PII (ids + machine tokens + instants). */
export const ReconciliationQueueRow = z
  .object({
    /** A stable synthetic key `${caseType}:${alertId ?? poolId}` — the case-detail + action path segment. */
    case_key: z.string().min(1),
    case_type: ReconciliationCaseType,
    pool_id: z.string().uuid(),
    /** The alert stream the case rode; null for a pure pool-stream case with no derivable live alert. */
    alert_id: z.string().uuid().nullable(),
    /** The contributing member the case concerns; null for a pool-level case (transcription/takeover). */
    member_id: z.string().uuid().nullable(),
    /** The machine mismatch reason for a red case; null for the other case types. */
    mismatch_reason: z.string().nullable(),
    /** The derived reconciliation-tail deadline (calendar-aware); null when not yet derivable. */
    deadline_at: z.string().datetime().nullable(),
    /** When the case-marking event was raised. */
    raised_at: z.string().datetime(),
    /** Best-effort marker that a facilitate-recovery action has been logged for this case (D7). */
    in_recovery: z.boolean(),
  })
  .strict();
export type ReconciliationQueueRow = z.output<typeof ReconciliationQueueRow>;

export const ReconciliationQueueResponse = z
  .object({
    rows: z.array(ReconciliationQueueRow),
    /** True when the bounded scan hit its clamp — the operator is told the list may be truncated. */
    truncated: z.boolean(),
  })
  .strict();
export type ReconciliationQueueResponse = z.output<typeof ReconciliationQueueResponse>;

/** A bank-statement entry near the case window (amounts are integer paise). */
export const ReconciliationBankEntryView = z
  .object({
    entry_id: z.string(),
    amount_paise: z.number().int(),
    value_date: z.string().nullable(),
    description: z.string().nullable(),
  })
  .strict();
export type ReconciliationBankEntryView = z.output<typeof ReconciliationBankEntryView>;

/** A provenance note surfaced on the case (statement-upload / manual-transcription context). */
export const ReconciliationCaseNote = z
  .object({
    kind: z.string(),
    at: z.string().datetime(),
    detail: z.string().nullable(),
  })
  .strict();
export type ReconciliationCaseNote = z.output<typeof ReconciliationCaseNote>;

/**
 * The full one-screen review context (AC2). Member identity is decrypted fail-soft at the API boundary
 * (a null field = "unavailable", never a 500). `confirmed_event_id` is present only for a `confirmed`
 * case — it is the exact `contribution.confirmed` event id the `reverse` action names (AC6).
 */
export const ReconciliationCaseDetail = z
  .object({
    case_key: z.string().min(1),
    case_type: ReconciliationCaseType,
    status: ReconciliationCaseStatus,
    pool_id: z.string().uuid(),
    alert_id: z.string().uuid().nullable(),
    member_id: z.string().uuid().nullable(),
    mismatch_reason: z.string().nullable(),
    deadline_at: z.string().datetime().nullable(),
    /** When the case-marking event was raised; null when not derivable (e.g. a `takeover` case has no
     *  mismatch/self-verify/transcription marker to date it — see reconciliation-review-read.ts). */
    raised_at: z.string().datetime().nullable(),
    in_recovery: z.boolean(),
    /** Decrypted member identity (fail-soft) — either field may be null if undecryptable/unavailable. */
    member: z
      .object({ name: z.string().nullable(), mobile: z.string().nullable() })
      .strict()
      .nullable(),
    /** The member's UTR attestation for this cycle, if any. */
    attestation: z
      .object({
        utr: z.string().nullable(),
        tr: z.string().nullable(),
        attested_at: z.string().datetime().nullable(),
        expected_amount_inr: z.number().int().nullable(),
      })
      .strict()
      .nullable(),
    bank_entries: z.array(ReconciliationBankEntryView),
    /** A signed read URL for the self-verify screenshot (minted on demand, short TTL); null if none. */
    screenshot_url: z.string().nullable(),
    notes: z.array(ReconciliationCaseNote),
    /** The confirmed event id (reverse target) — non-null only for a `confirmed` case (AC6). */
    confirmed_event_id: z.string().uuid().nullable(),
  })
  .strict();
export type ReconciliationCaseDetail = z.output<typeof ReconciliationCaseDetail>;

// ── Read query + action requests ─────────────────────────────────────────────────────────────────────

/** Max queue rows returned (the bounded scan clamp; mirrors the r9-voting/cycle-freeze queue ceiling). */
export const RECONCILIATION_QUEUE_MAX_LIMIT = 200;

export const ReconciliationQueueQuery = z
  .object({
    limit: z.coerce.number().int().positive().max(RECONCILIATION_QUEUE_MAX_LIMIT).optional(),
  })
  .strict();
export type ReconciliationQueueQuery = z.output<typeof ReconciliationQueueQuery>;

/** The shared action superRefine: compat (for the bound outcome) + rationale-required + ≤500 chars. */
function applyActionRefinements<T extends { reason_code: string; rationale?: string }>(
  outcome: ReconciliationReviewOutcome,
  schema: z.ZodType<T>,
): z.ZodEffects<z.ZodType<T>> {
  return schema.superRefine((val, ctx) => {
    if (!isReconciliationReasonCodeValidForOutcome(outcome, val.reason_code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason_code'],
        message: `reason_code '${val.reason_code}' is not valid for outcome '${outcome}'`,
      });
    }
    const rationale = val.rationale?.trim() ?? '';
    if (isReconciliationRationaleRequired(outcome, val.reason_code) && rationale === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rationale'],
        message: `a rationale is required for the "other" reason code and for a ${outcome}`,
      });
    }
    if ((val.rationale?.length ?? 0) > RECONCILIATION_REVIEW_RATIONALE_MAX_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        path: ['rationale'],
        maximum: RECONCILIATION_REVIEW_RATIONALE_MAX_CHARS,
        type: 'string',
        inclusive: true,
        message: `rationale must be at most ${RECONCILIATION_REVIEW_RATIONALE_MAX_CHARS} characters`,
      });
    }
  });
}

const baseActionShape = {
  reason_code: ReconciliationReviewReasonCode,
  rationale: z.string().max(RECONCILIATION_REVIEW_RATIONALE_MAX_CHARS).optional(),
};

/**
 * confirm — the outcome is fixed by the route. In addition to reason + rationale, a manual confirm MUST
 * name the bank-statement entry (the deposit) it reconciles: `contribution.confirmed`'s match provenance
 * requires a real `bankStatementEntryId` (the confirmed-money invariant — green = confirmed money, a real
 * deposit, never a bare member claim). The trustee picks it from the case detail's bank-entry list.
 */
export const ReconciliationConfirmRequest = applyActionRefinements(
  'confirm',
  z
    .object({
      ...baseActionShape,
      /** The bank-statement entry (deposit) the confirmation reconciles — the confirmed-money link. */
      bank_statement_entry_id: z.string().uuid(),
    })
    .strict(),
);
export type ReconciliationConfirmRequest = z.output<typeof ReconciliationConfirmRequest>;

export const ReconciliationRejectRequest = applyActionRefinements(
  'reject',
  z.object(baseActionShape).strict(),
);
export type ReconciliationRejectRequest = z.output<typeof ReconciliationRejectRequest>;

export const ReconciliationRecoverRequest = applyActionRefinements(
  'recover',
  z.object(baseActionShape).strict(),
);
export type ReconciliationRecoverRequest = z.output<typeof ReconciliationRecoverRequest>;

/** reverse — additionally names the exact confirmation being walked back (AC6). */
export const ReconciliationReverseRequest = applyActionRefinements(
  'reverse',
  z
    .object({
      ...baseActionShape,
      /** The `contribution.confirmed` event id to reverse (the monotonic link). */
      reversed_confirmed_event_id: z.string().uuid(),
    })
    .strict(),
);
export type ReconciliationReverseRequest = z.output<typeof ReconciliationReverseRequest>;

/** The action response — NON-PII decision metadata only (never the rationale). */
export const ReconciliationActionResponse = z
  .object({
    case_key: z.string().min(1),
    outcome: ReconciliationReviewOutcome,
    reason_code: ReconciliationReviewReasonCode,
    /** The decision-time actor_display SNAPSHOT — server-resolved, never client-supplied. */
    actor_display: z.string(),
    decided_at: z.string(),
    /** The appended event id (confirm/reject/reverse); null for recover (no outcome event, D7). */
    event_id: z.string().uuid().nullable(),
    /** The case's status after the action. */
    status: ReconciliationCaseStatus,
  })
  .strict();
export type ReconciliationActionResponse = z.output<typeof ReconciliationActionResponse>;
