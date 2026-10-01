// The correction CLOSURE's wire mappers — Story 6.19c (AC8c, AC14). A LEAF: it imports ⛔ no handler file, so the
// correction queue (`claims.nominee-name-check.handlers.ts`) and the closure routes both call it without a cycle.
// ⛔ No note, ⛔ no name, ⛔ no number: the readiness and the closures row carry states, dates, actor displays and codes.

import {
  ClosureRequestBlocker,
  type ApprovalNameHighlight,
  type CorrectionClosureDto,
  type CorrectionClosureStateDto,
} from '@twt/contracts';
import type { claim, schema } from '@twt/domain';

/**
 * The domain's blocker is the WHOLE refusal union (a defensive superset); the wire carries AC6's codes. A code outside
 * them is a programming error (the readiness runs only the request's own checks) — ⛔ never a silent `null`, which would
 * read as "a request would pass".
 */
function blockerDto(blocker: claim.ClosureRequestBlocker | null): ClosureRequestBlocker | null {
  if (blocker === null) return null;
  const parsed = ClosureRequestBlocker.safeParse(blocker);
  if (!parsed.success) throw new Error(`[correction-closure] readiness returned a non-request refusal: ${blocker}`);
  return parsed.data;
}

/** The correction queue's closure column (AC8c). */
export function closureStateDto(r: claim.ClosureReadiness): CorrectionClosureStateDto {
  return {
    state: r.state,
    origin: r.origin,
    requested_at: r.requestedAt?.toISOString() ?? null,
    requested_by: r.requestedByDisplay,
    blocker: blockerDto(r.blocker),
    not_reached: r.notReached === null ? null : { count: r.notReached.count, roles: [...r.notReached.roles] },
    family_run_day: r.familyRunDay,
  };
}

/** A closures row as the acting staff member sees it after an act. ⛔ No note. */
export function toClosureDto(row: schema.ClaimCorrectionClosureRow, highlight: ApprovalNameHighlight | null): CorrectionClosureDto {
  return {
    closure_id: row.closureId,
    claim_case_id: row.claimCaseId,
    origin: row.origin,
    state: row.state,
    requested_at: row.requestedAt?.toISOString() ?? null,
    escalated_at: row.escalatedAt?.toISOString() ?? null,
    under_review_since: row.underReviewSince?.toISOString() ?? null,
    super_admin_decision: row.superAdminDecision ?? null,
    super_admin_reason: row.superAdminReason ?? null,
    closed_at: row.closedAt?.toISOString() ?? null,
    closure_letter_person_keys: [...row.closureLetterPersonKeys],
    name_highlight: highlight,
  };
}
