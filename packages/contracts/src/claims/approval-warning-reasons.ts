// packages/contracts/src/claims/approval-warning-reasons.ts
//
// Story 6.23a (NW16, NW17) — the Super Admin's WARNING-REASON LIST screen: read the list (active + history), ADD a
// reason, REPLACE one with a newer one. ⛔ There is ⛔ no edit and ⛔ no delete shape — a reason is ⛔ never edited or
// deleted (BigDev 2026-10-04); a replaced reason stays in the history with its own words.
// The words are STAFF POLICY TEXT (Tier-3), ⛔ not member data. ⛔ Never imports `@twt/domain`. ALL objects `.strict()`.

import { z } from 'zod';

import { ApprovalWarningReasonOption } from './verification-decision.js';

/**
 * Why an add / replace is refused — the server sends `approval_warning_reason.<it>`. ⚠ LOCKSTEP with `@twt/domain`'s
 * `APPROVAL_WARNING_REASON_WRITE_REFUSALS`, PINNED by the contracts ↔ domain test (code review round 4: the admin used
 * to keep its own hand-mirrored copy that nothing checked).
 */
export const APPROVAL_WARNING_REASON_REFUSALS = ['not_found', 'already_replaced', 'invalid_text', 'missing_display', 'code_exhausted'] as const;
export type ApprovalWarningReasonRefusal = (typeof APPROVAL_WARNING_REASON_REFUSALS)[number];

/** ⚠ LOCKSTEP with migration 0142's CHECKs and the domain constants. */
export const APPROVAL_WARNING_REASON_LABEL_MAX = 120;
export const APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX = 1000;

/**
 * At most `max` CODE POINTS — Postgres `char_length()`'s unit, which 0142's CHECKs and the domain count (code review
 * round 3). ⛔ Never zod's `.max()`: it counts UTF-16 units, so an emoji (two units) would be refused under the limit.
 */
const codePointsAtMost = (max: number) => (value: string) => [...value].length <= max;

/** `POST …/admin/approval-warning-reasons` and `POST …/:reasonId/replace` — the reason's words and its note. */
export const ApprovalWarningReasonWriteRequest = z
  .object({
    label: z
      .string()
      .trim()
      .min(1)
      .refine(codePointsAtMost(APPROVAL_WARNING_REASON_LABEL_MAX), { message: `at most ${APPROVAL_WARNING_REASON_LABEL_MAX} characters` }),
    when_to_use: z
      .string()
      .trim()
      .min(1)
      .refine(codePointsAtMost(APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX), {
        message: `at most ${APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX} characters`,
      }),
  })
  .strict();
export type ApprovalWarningReasonWriteRequest = z.output<typeof ApprovalWarningReasonWriteRequest>;

/** A REPLACED reason, kept with what replaced it. */
export const ReplacedApprovalWarningReasonView = z
  .object({
    code: z.string(),
    reasonId: z.string().uuid(),
    label: z.string(),
    whenToUse: z.string(),
    addedByDisplay: z.string(),
    addedAt: z.string(),
    replacedAt: z.string(),
    replacedByLabel: z.string().nullable(),
    replacedByDisplay: z.string().nullable(),
  })
  .strict();
export type ReplacedApprovalWarningReasonView = z.output<typeof ReplacedApprovalWarningReasonView>;

/** `GET …/admin/approval-warning-reasons` — the active list (the built-in generic first) and the history. */
export const ApprovalWarningReasonListResponse = z
  .object({
    active: z.array(ApprovalWarningReasonOption),
    history: z.array(ReplacedApprovalWarningReasonView),
  })
  .strict();
export type ApprovalWarningReasonListResponse = z.output<typeof ApprovalWarningReasonListResponse>;

/** The add / replace response — the new reason; on a replace, the id of the one it replaced. */
export const ApprovalWarningReasonWriteResponse = z
  .object({
    reason: ApprovalWarningReasonOption,
    replacedReasonId: z.string().uuid().nullable(),
  })
  .strict();
export type ApprovalWarningReasonWriteResponse = z.output<typeof ApprovalWarningReasonWriteResponse>;
