// The fee-date / death-date comparison of the membership check (Story 6.39, Task 2.1; DL2; N3; AC2).
//
// `2026-10-31-430` Q1 B: *"staff compare the date of death on the certificate with the date the fee was paid, and
// ⛔ drive opens if the fee was paid after the death."* The SYSTEM computes it (N3); the District Admin sees both
// dates and the result, and records the check.
//
// ⭐ IMPORT-FREE but for `holiday-resolver.ts` (itself ZERO imports) — so the API handler, the tests and any module
// graph can reach it without touching drizzle, `db.ts` or the claim event graph (TR6). ⛔ It is NOT in the gate leaf
// (`membership-check-approval.ts`): the gate reads the recorded OUTCOME and never a date (N3, TR3).

import { type CalendarDateString, isRealCalendarDate, istDateOf } from '../cycle-calendar/holiday-resolver.js';

/** ⚠ LOCKSTEP with `MEMBERSHIP_CHECK_FEE_OUTCOMES` (schema/claim_membership_checks.ts) — the same three, same order. */
export type FeeDeathDateOutcome = 'before_death' | 'same_day' | 'after_death';

/**
 * Compare the joining fee's date with the certificate's date of death.
 *
 *   · the FEE date is the INDIAN calendar date of `paidAt` — a certificate's date is a local date, and the Panel's
 *     own day boundary (`2026-09-20-235` Y) is an Indian calendar day. ⚠ `paidAt` is the SERVER instant the member
 *     attested the UTR, ⛔ the bank's time (PQ1 (b), open with the Panel);
 *   · the DEATH date is the `YYYY-MM-DD` the District Admin entered on the accepted certificate review;
 *   · two `YYYY-MM-DD` strings compare correctly as strings.
 *
 * `same_day` is its OWN outcome, ⛔ folded into either neighbour: what a fee paid ON the day of death means is
 * decided by the gate, in ONE place — `2026-11-21-473` Q1 B ruled it counts as after (it stops the drive).
 *
 * @throws when `deathDate` is not a real calendar date, or `paidAt` is not a valid instant. The caller (the API
 *   handler) turns an unreadable / anonymized date into a typed 409 BEFORE calling — this throw is a programming
 *   error, ⛔ a user-facing refusal.
 */
export function compareFeeDateWithDeathDate(paidAt: Date, deathDate: CalendarDateString): FeeDeathDateOutcome {
  if (!isRealCalendarDate(deathDate)) {
    throw new Error('compareFeeDateWithDeathDate: the death date is not a real YYYY-MM-DD calendar date');
  }
  if (!(paidAt instanceof Date) || Number.isNaN(paidAt.getTime())) {
    throw new Error('compareFeeDateWithDeathDate: paidAt is not a valid instant');
  }
  const feeDate = istDateOf(paidAt);
  if (feeDate < deathDate) return 'before_death';
  if (feeDate > deathDate) return 'after_death';
  return 'same_day';
}

/** The fee's Indian calendar date, as shown to staff beside the certificate's date (the preview, DL10). */
export function feeDateOf(paidAt: Date): CalendarDateString {
  return istDateOf(paidAt);
}
