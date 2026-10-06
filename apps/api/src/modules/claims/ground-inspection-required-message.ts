// Story 6.26a (GI11) — the words of the approval WAIT for the ground inspection, ONCE, for the four approval mappers
// (`claims.verification-decision`, `claims.cycle-freeze`, `claims.r9-voting`, `claims.correction-closure` — which also
// serves `claims.correction-escalation`). Each maps `claim.GroundInspectionRequiredError` to 409
// `<prefix>.ground_inspection_required` `{ reason }`; the 6.19c closure surfaces show this message as written, so it is
// written for a reader. ⛔ It never says the claim is refused — `-263` FQ9 A: the claim WAITS.

import type { claim } from '@twt/domain';

export function groundInspectionRequiredMessage(reason: claim.GroundInspectionWaitReason): string {
  return reason === 'no_completed_inspection'
    ? 'This claim is waiting for its ground inspection — it can be approved once an inspector has completed the visit'
    : 'This claim is waiting for an inspector to see the original of its current death certificate — it can be approved once that check is complete';
}
