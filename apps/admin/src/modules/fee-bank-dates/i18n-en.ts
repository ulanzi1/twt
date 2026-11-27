// The finance officer's BANK-DATE page — staff copy (Story 6.39a, DL11; author-commit `2026-11-27-510`). ENGLISH-ONLY
// (staff copy is English-only). Every line marked DL11 is the copy BigDev APPROVED word for word at Task 0.2 / 0.4 — ⛔
// reword it without a new decision. The few lines NOT marked are the page's own control labels, written from the approved
// phrases (the 6.39 control's posture: "the rest are the control's own labels, written to match").
//
// ⚠ `microcopy.yaml` scans ALL of `apps/admin/src/**`, comments and test ids included: the whole words it forbids stay out
// of this file and every component that renders it — "payment" and "bank statement" are the words. ⛔ A name, ⛔ the date of
// death, ⛔ the check's outcome anywhere on this page (N2).

export const feeBankDatesEn = {
  nav: 'Joining fee bank dates', // DL11
  heading: 'Joining fees to check against the bank statement', // DL11
  intro:
    "These claims are held because the joining fee was recorded on or after the date of death. If the Trust's bank statement shows the payment arrived earlier, record the date it arrived.", // DL11
  loading: 'Loading…',
  loadError: 'The list could not be loaded.',
  empty: 'No claim is held on its joining fee.', // DL11
  truncated: 'Only the longest-held claims are shown.', // DL11
  recordedHeading: 'Bank dates already recorded on claims whose check now passes', // DL11
  forbidden: 'You do not have permission to record bank dates.', // DL11
  /** `{date}`, `{amount}`, `{last4}` are VALUES. DL11. */
  row: 'Recorded on {date} · ₹{amount} · reference ending {last4}',
  district: 'District',
  liveRecord: 'Bank date recorded',
  liveBy: 'by',
  open: 'Record the bank date',
  close: 'Close',
  fields: {
    reference: 'Payment reference, as shown on the statement', // DL11
    date: 'Date the money arrived, as shown on the statement', // DL11
    reasonLegend: 'Why the recorded date is wrong', // DL11
    note: 'Note — which statement, and what you saw', // DL11
  },
  reasons: {
    recorded_late_by_member: 'The member recorded the payment late', // DL11
    recorded_by_family_after_death: 'The family recorded the payment after the death', // DL11
    other: 'Other', // DL11
  } as Record<string, string>,
  // The form's prompts for a missing or malformed field — DL11 (approved with Task 0.4, 2026-11-27).
  prompts: {
    referenceEmpty: 'Enter the payment reference as it appears on the statement.',
    referenceShape: 'A payment reference is 12 digits, or 22 letters and digits.',
    date: 'Enter the date the money arrived, as a real date.',
    reason: 'Choose why the recorded date is wrong.',
    note: 'Write a note — which statement, and what you saw.',
  },
  submit: 'Record the bank date',
  recorded: 'Recorded. The District Admin must now check the claim again.', // DL11
  // Each `fee_bank_date.<reason>` refusal — DL11 (⛔ a raw code on screen).
  refused: {
    reference_mismatch:
      'This reference does not match the payment recorded for the member. Check that you have the right line on the statement.',
    before_joining: 'That date is before the member joined. Check the date on the statement.',
    in_future: 'That date is in the future.',
    not_held: 'This claim is not held on its joining fee.',
    window_closed: 'A bank date can no longer be recorded on this claim.',
    stale: 'This claim changed since you opened it. It has been reloaded — check again.',
    not_found: 'This claim could not be found. Reload the page.',
    no_fee_receipt:
      "The record of the member's joining fee cannot be identified, so a bank date cannot be recorded. Please tell the Super Admin.",
    missing_display: 'Your account has no display name, so a bank date cannot be attributed to you. Ask a Super Admin to set it.',
    // ⚠ ⛔ a line of its own in DL11: the writer's defence code reuses DL11's approved 400 line (the contract answers 400 first).
    invalid_reason: 'Something in the form is not right. Check each field and try again.',
  } as Record<string, string>,
  invalid: 'Something in the form is not right. Check each field and try again.', // DL11 — a 400
  sessionExpired: 'Your session has ended. Sign in again, then record the bank date.', // DL11 — a 401
  // The route's session gate (the 6.19d page's lines, ⛔ in DL11 — listed for BigDev in deferred-work).
  checkingSession: 'Checking your session…',
  redirecting: 'Redirecting to sign in…',
  // ⭐ `2026-11-27-512` D2 (approved word for word) — a write with ⛔ typed answer (a lost response, a 5xx): it may have landed.
  lostWrite: 'The bank date may not have been recorded. The list has been reloaded — check the claim before you record it again.',
} as const;
