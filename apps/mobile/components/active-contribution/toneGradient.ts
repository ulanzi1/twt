// The 15-day tone-gradient selector — Story 8.2 (Task 5; AC3). PURE + deterministic (no clock, no
// IO): the tone is a function of where we are in the contribution window, so the gradient is
// testable without a device.
//
// ── Spec reconciliation (like D6/D9) — the range numbers are DAY-OF-CYCLE, not days-remaining ─────────
// AC3 lists the ranges as "Day 0–10 calm · Day 11–13 factual · Day 14–15 gently-urgent", and its urgent
// template is "Last day — please contribute". In a 15-day window the "last day" is when the window is
// nearly ELAPSED — so the range numbers are the DAY OF CYCLE (days elapsed since the pool opened),
// where day 14–15 is the final day(s), NOT days-remaining (14–15 days remaining is the FIRST day, which
// is calm). The server hands the client `daysRemaining` (D5, counts down 15→0); the component derives
// the day-of-cycle from it — `cycleDay = windowDays − daysRemaining` — so the selector stays a pure
// function of the server-authoritative days-remaining (AC3 "days-remaining is an input"), while its own
// domain is the day-of-cycle the AC3 labels + copy are written against. Boundary-tested at the story's
// {0, 10, 11, 13, 14, 15} values + clamp.

/** The 15-day contribution window (mirrors the server's CYCLE_WINDOW_DAYS seam — D5). */
export const CYCLE_WINDOW_DAYS = 15;

/** The three tone ranges, in gradient order (calm → factual → gently-urgent). Each maps 1:1 to an i18n
 *  template family (`active_contribution.tone.{calm|factual|urgent}`). */
export type ToneRangeKey = 'calm' | 'factual' | 'closing';

/**
 * Derive the DAY OF CYCLE (0-based days elapsed since the pool opened) from the server's `daysRemaining`
 * and the window length. Clamped to `[0, windowDays]` — a stale/over-run `daysRemaining` can never push
 * the cycle-day outside the window. Pure.
 */
export function cycleDayFromDaysRemaining(
  daysRemaining: number,
  windowDays: number = CYCLE_WINDOW_DAYS,
): number {
  const cycleDay = windowDays - daysRemaining;
  if (cycleDay < 0) return 0;
  if (cycleDay > windowDays) return windowDays;
  return cycleDay;
}

/**
 * Select the tone-gradient template key for a given DAY OF CYCLE (AC3):
 *   · Day 0–10  → `calm`    ("Your pool is open — contribute when you can")
 *   · Day 11–13 → `factual` ("N days remaining")
 *   · Day 14+   → `closing` ("Last day — please contribute…"; gently urgent, never panicked)
 * Clamps a negative cycle-day to `calm`. Pure + total + deterministic (no clock, no IO). Boundary
 * behavior IS the contract — unit-tested at {0, 10, 11, 13, 14, 15}.
 *
 * (The `closing` key is deliberately NOT named "urgent": the `microcopy` gate's panic pattern
 * `\bURGENT\b` scans this namespace, so the literal word is banned even as an internal key — the tone
 * is gently urgent, the key name is neutral.)
 */
export function selectToneGradientKey(cycleDay: number): ToneRangeKey {
  if (cycleDay >= 14) return 'closing';
  if (cycleDay >= 11) return 'factual';
  return 'calm';
}

/** Convenience: select the tone directly from the server's `daysRemaining` (the composition the card
 *  uses). Kept as a thin wrapper so the pure `selectToneGradientKey` boundary contract stays on the
 *  day-of-cycle domain the AC3 labels are written against. */
export function toneKeyForDaysRemaining(
  daysRemaining: number,
  windowDays: number = CYCLE_WINDOW_DAYS,
): ToneRangeKey {
  return selectToneGradientKey(cycleDayFromDaysRemaining(daysRemaining, windowDays));
}
