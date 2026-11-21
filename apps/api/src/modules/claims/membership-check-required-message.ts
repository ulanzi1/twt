// Story 6.39 (DL5, DL12; G16) — the words of the approval WAIT for the membership check, ONCE, for the four approval
// mappers (`claims.verification-decision`, `claims.cycle-freeze`, `claims.r9-voting`, `claims.correction-closure` — which
// also serves `claims.correction-escalation`). Each maps `claim.MembershipCheckRequiredError` to 409
// `<prefix>.membership_check_required` `{ reason }`; the 6.19c closure surfaces show this message AS WRITTEN (the admin's
// `closureErrorText`), so it is written for a reader — the staff copy BigDev approved word for word (`2026-11-21-472`
// DL12). ⛔ It never says the claim is refused — the claim WAITS (N5) — and for a fee paid after the death it carries
// ⛔ instruction: neither denial on the closure / R9 surfaces takes the `fee_paid_after_death` reason (the console and
// the cycle-freeze page add their own instruction, in the admin's copy).

import type { claim } from '@twt/domain';

// Exhaustive — a new `MembershipCheckWaitReason` must say why: a missing case is a compile error here, never a
// silently wrong message on all the approval routes.
const MEMBERSHIP_CHECK_REQUIRED_MESSAGES: Record<claim.MembershipCheckWaitReason, string> = {
  not_checked: 'Membership check needed before approval.',
  stale: 'The certificate changed since the membership check — check again.',
  fee_after_death:
    'The joining fee was not paid before the date of death on the certificate. No drive can open for this claim.',
  identity_not_confirmed: "The person's identity has not been confirmed.",
};

export function membershipCheckRequiredMessage(reason: claim.MembershipCheckWaitReason): string {
  return MEMBERSHIP_CHECK_REQUIRED_MESSAGES[reason];
}

/** The deny-reason guard's refusal (DL9, DL12) — `<prefix>.fee_paid_after_death_not_shown`. */
export const FEE_PAID_AFTER_DEATH_NOT_SHOWN_MESSAGE =
  'This reason can be used only when the membership check found the fee was paid after the death.';
