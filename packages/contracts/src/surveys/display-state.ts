// Pure survey display-state derivation, browser-safe — Story 10.15 (Task 5; AC2).
//
// ── Why this function exists TWICE ───────────────────────────────────────────────────────────
// `@twt/domain`'s `surveys/status.ts` owns `deriveSurveyDisplayState` for the server. `apps/admin` is
// a browser bundle that CANNOT import @twt/domain (it would pull `pg` in), and @twt/domain cannot
// import @twt/contracts (a cycle). 10.9 resolved the same tension by relocating the derivation into
// contracts and leaving domain without one; this story keeps a copy on each side instead, because the
// domain's own read/write paths need it (`isSurveyOpen` gates the response write — AC2) and a
// server-side call into a wire-shaped module would mean converting a row to a DTO to ask a question
// about it.
//
// ⚠ TWO IMPLEMENTATIONS, ONE ASSERTED BEHAVIOUR: `tests/surveys.test.ts` runs both over the same
// boundary matrix and requires identical output. That test is the only thing keeping them honest —
// ⛔ do not edit one of these without the other.

import { SURVEY_DISPLAY_STATES, type SurveyDisplayState, type SurveyStatus } from './enums.js';

export { SURVEY_DISPLAY_STATES, type SurveyDisplayState };

/** The minimum a DTO must carry for its display state to be derived. ISO-8601 strings on the wire. */
export interface SurveyWindowShape {
  status: SurveyStatus;
  valid_from: string;
  valid_until: string;
}

/**
 * PURE: the display state of a survey at instant `now`.
 *
 * `closed` and `draft` win over the clock — a closed survey is closed whether or not its window ran
 * out, and an unpublished draft whose window has passed is still a draft, because its author has not
 * asked anything yet. Only a `published` row consults the clock:
 *
 *   · `now <  valid_from`                     → `scheduled`
 *   · `valid_from <= now < valid_until`       → `open`
 *   · `now >= valid_until`                    → `expired`
 *
 * ⭐ `valid_from` INCLUSIVE, `valid_until` EXCLUSIVE — the same boundary convention the domain read
 * filter and the response WRITE path enforce.
 */
export function deriveSurveyDisplayState(row: SurveyWindowShape, now: Date): SurveyDisplayState {
  if (row.status === 'closed') return 'closed';
  if (row.status === 'draft') return 'draft';
  const t = now.getTime();
  if (t < Date.parse(row.valid_from)) return 'scheduled';
  if (t < Date.parse(row.valid_until)) return 'open';
  return 'expired';
}

/** PURE: is this survey accepting responses at `now`? The console's "still collecting" indicator. */
export function isSurveyOpen(row: SurveyWindowShape, now: Date): boolean {
  return deriveSurveyDisplayState(row, now) === 'open';
}
