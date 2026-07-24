// The 15-day tone-gradient selector — Story 8.2 (Task 5; AC3).
//
// ── RELOCATED to @twt/contracts by Story 8.8 (Task 2; D1) — this module is now a thin re-export ─────
// Story 8.8 sends the deadline-reminder push, and its tone band MUST equal the band this card shows on
// the same day (the coherence invariant: the push a member receives on day D can never be more urgent
// than the card they open on day D). The server cannot import `apps/mobile`, so the selector moved to
// `packages/contracts/src/alerts/contribution-loop-templates.ts` — contracts is already a mobile
// dependency, so no boundary is crossed and no `@twt/domain` leak reaches the Metro bundle
// ([[project_contracts_domain_bundle_boundary]]). ONE authority beats a guarded duplicate.
//
// The implementation is byte-identical to 8.2's, including the deliberate `closing` (not "urgent") key
// name — the microcopy gate's panic pattern `\bURGENT\b` scans this namespace, so the literal word is
// banned even as an internal key. This file keeps its path + exported names so `ActiveContributionCard`
// and the existing mobile unit tests are untouched.
//
// ── Spec reconciliation (unchanged from 8.2) — the range numbers are DAY-OF-CYCLE, not days-remaining ─
// AC3 lists the ranges as "Day 0–10 calm · Day 11–13 factual · Day 14–15 gently-urgent", and its urgent
// template is "Last day — please contribute". In a 15-day window the "last day" is when the window is
// nearly ELAPSED — so the range numbers are the DAY OF CYCLE (days elapsed since the pool opened). The
// server hands the client `daysRemaining` (D5, counts down 15→0); the component derives the
// day-of-cycle from it — `cycleDay = windowDays − daysRemaining`.

export type { ToneRangeKey } from '@twt/contracts';
export {
  /** The 15-day contribution window (the server's CYCLE_WINDOW_DAYS seam — D5). */
  CYCLE_WINDOW_DAYS,
  /** Derive the 0-based DAY OF CYCLE from the server's `daysRemaining`. Clamped to the window. */
  cycleDayFromDaysRemaining,
  /** Select the tone-gradient template key for a DAY OF CYCLE (0–10 calm, 11–13 factual, 14+ closing). */
  selectToneGradientKey,
  /** Convenience: select the tone directly from the server's `daysRemaining` (the card's composition). */
  toneKeyForDaysRemaining,
} from '@twt/contracts';
