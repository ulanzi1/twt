// Story 6.24a (`2026-10-07-292` RF5, F9) — the words of the FINAL-approval WAIT for another claim's suspicion appeal, ONCE,
// for the four approval mappers (`claims.verification-decision`, `claims.cycle-freeze`, `claims.r9-voting`,
// `claims.correction-closure` — which also serves `claims.correction-escalation`). Each maps
// `claim.SuspicionAppealPendingError` to 409 `<prefix>.suspicion_appeal_pending` `{ reason }` — ⛔ never a 500. The District
// Admin's mapper never meets it today (P1 is `step: 'district_admin'`); it maps it anyway, so a future caller can ⛔ never
// 500. These are STAFF words: they ⛔ never say the claim is refused (`-262` FQ5 A — the claim WAITS) and ⛔ never name anyone.

import type { claim } from '@twt/domain';

// Exhaustive — a new `SuspicionAppealPendingReason` must say why (a missing case is a compile error here).
const SUSPICION_APPEAL_PENDING_MESSAGES: Record<claim.SuspicionAppealPendingReason, string> = {
  appeal_not_filed:
    'Final approval waits: an earlier claim for this death was refused on suspicion, and that refusal can still be appealed (for 90 days from the refusal)',
  appeal_open:
    'Final approval waits: an earlier claim for this death was refused on suspicion, and its appeal is being decided',
};

export function suspicionAppealPendingMessage(reason: claim.SuspicionAppealPendingReason): string {
  return SUSPICION_APPEAL_PENDING_MESSAGES[reason];
}
