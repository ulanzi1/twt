// 90-second loop timing — the in-flight SESSION orchestrator (Story 8.12, Task 3; AC1).
//
// The capture wiring at the four phase boundaries (_layout `app_open`, ActiveContributionCard `card_render`
// + `cta_tap`, UPIIntentButton `intent_fire`, pay.tsx `upi_return`/`utr_confirm`/`yellow_pill`) writes into
// ONE transient in-flight session held here — distinct from the persisted store (which holds COMPLETED
// breakdowns). On a finished loop the pay screen calls finalizeLoopSession() → computeLoopBreakdown →
// recordSession → reset, so the next cold-start attempt begins clean.
//
// GOVERNANCE: every entry point is a no-op unless loopTimingEnabled() (debug builds only). A mark is a
// wall-clock read; nothing here changes the pay flow's behavior (D6).

import { computeLoopBreakdown, type LoopPhaseMark, type LoopSession } from './loop-timing'
import { loopTimingEnabled, recordSession } from './loop-timing-store'

// The single in-flight session. Mutable module singleton — the loop is human-driven, one attempt at a time.
let current: { marks: Partial<Record<LoopPhaseMark, number>> } = { marks: {} }

/** Stamp a phase mark with the current wall-clock (`performance.now()`), or an explicit `at` (tests).
 *  `once: true` (used for app_open / card_render) refuses to overwrite an already-set mark, so a stray
 *  re-render or a future query refetch can never re-stamp the boundary mid-loop and corrupt segment (a). */
export function markLoopPhase(mark: LoopPhaseMark, opts?: { once?: boolean; at?: number }): void {
  if (!loopTimingEnabled()) return
  if (opts?.once && current.marks[mark] !== undefined) return
  current.marks[mark] = opts?.at ?? performance.now()
}

/** Stamp `cta_tap` — the card's contribute CTA press. Distinguishes a genuine RETRY (the member already
 *  drove a prior attempt to `intent_fire` and is starting over) from a rapid DOUBLE-PRESS of the same
 *  attempt (Review finding, 2026-07-25 code review):
 *  - If `intent_fire` is already set, a previous attempt already reached the UPI hand-off — this new tap
 *    is unambiguously a fresh attempt, not a double-press. Reset first so the STALE `app_open`/`card_render`
 *    from the abandoned attempt can never leak into the new session's `memberThinkMs`/`totalMs`. RootLayout
 *    and the card won't re-stamp `app_open`/`card_render` within the same JS process, so the new session is
 *    correctly excluded as incomplete (safe-by-omission) rather than silently polluted.
 *  - Else if `cta_tap` is already set (no `intent_fire` yet), this is a double-press of the SAME attempt —
 *    ignore it so the timestamp is never overwritten mid-navigation. */
export function markCtaTap(at?: number): void {
  if (!loopTimingEnabled()) return
  if (current.marks.intent_fire !== undefined) {
    resetLoopSession()
  } else if (current.marks.cta_tap !== undefined) {
    return
  }
  current.marks.cta_tap = at ?? performance.now()
}

/** Stamp `upi_return` — but ONLY the FIRST background→active transition AFTER `intent_fire` (the return
 *  from the UPI app). A background→active before intent_fire (the member alt-tabbed while reading) or a
 *  later resume is ignored, so the excluded round-trip = upi_return − intent_fire stays honest. */
export function markUpiReturn(at?: number): void {
  if (!loopTimingEnabled()) return
  if (current.marks.intent_fire === undefined) return // not yet handed off to the UPI app
  if (current.marks.upi_return !== undefined) return // first return only
  current.marks.upi_return = at ?? performance.now()
}

/** Whether a given mark has been stamped in the current in-flight session. */
export function hasLoopMark(mark: LoopPhaseMark): boolean {
  return current.marks[mark] !== undefined
}

/** The current in-flight session (read-only snapshot) — for a debug inspector, not the hot path. */
export function currentLoopSession(): LoopSession {
  return { marks: { ...current.marks } }
}

/** Clear the in-flight session (an explicit new-session boundary / re-arm). */
export function resetLoopSession(): void {
  current = { marks: {} }
}

/** Finalize the loop: record the derived breakdown (complete or not — the store keeps it, aggregation
 *  filters; incomplete already-attested-shortcut sessions land here per D1a) and re-arm for the next
 *  attempt. No-op when timing is disabled. */
export function finalizeLoopSession(): void {
  if (!loopTimingEnabled()) return
  recordSession(computeLoopBreakdown(current))
  resetLoopSession()
}
