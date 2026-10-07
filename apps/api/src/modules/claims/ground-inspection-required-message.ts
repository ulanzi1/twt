// Story 6.26a (GI11) — the words of the approval WAIT for the ground inspection, ONCE, for the four approval mappers
// (`claims.verification-decision`, `claims.cycle-freeze`, `claims.r9-voting`, `claims.correction-closure` — which also
// serves `claims.correction-escalation`). Each maps `claim.GroundInspectionRequiredError` to 409
// `<prefix>.ground_inspection_required` `{ reason }`; the 6.19c closure surfaces show this message as written, so it is
// written for a reader. ⛔ It never says the claim is refused — `-263` FQ9 A: the claim WAITS.

import type { claim } from '@twt/domain';

// Exhaustive (review 2026-10-07) — a new `GroundInspectionWaitReason` must say why, like its sibling
// `NOT_REVISABLE_MESSAGES` (`claims.verification-decision.handlers.ts`): a missing case is a compile error here,
// never a silently wrong message on all five approval routes.
const GROUND_INSPECTION_REQUIRED_MESSAGES: Record<claim.GroundInspectionWaitReason, string> = {
  no_completed_inspection:
    'This claim is waiting for its ground inspection — it can be approved once an inspector has completed the visit',
  certificate_check_required:
    'This claim is waiting for an inspector to see the original of its current death certificate — it can be approved once that check is complete',
};

export function groundInspectionRequiredMessage(reason: claim.GroundInspectionWaitReason): string {
  return GROUND_INSPECTION_REQUIRED_MESSAGES[reason];
}
