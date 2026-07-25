// 90-second contribution-loop timing — the PURE per-session breakdown module (Story 8.12, Task 1; AC1).
//
// GOVERNANCE-only: this observes the already-shipped 8.2→8.4→8.13 loop, it never changes it. A "mark" is a
// wall-clock `performance.now()` read taken by the capture wiring (Task 3) at each named phase boundary;
// THIS module does no timing itself — it is dependency-free arithmetic over the marks it is handed, so it
// unit-tests in the node-only Vitest env and can never leak `pg` / RN into the Metro bundle
// ([[project_contracts_domain_bundle_boundary]]). No RN imports, no @twt/* imports — keep it that way.
//
// ── The three DISJOINT buckets (D1 — get these right; the whole story rides on it) ──────────────────────
// The loop wall-clock splits into three non-overlapping buckets, NOT two:
//   (a) app_open → card_render                 → TWT-portion
//       card_render → cta_tap  (member think)  → SEPARATE (reading the card + deciding; neither TWT nor
//                                                 round-trip — so it can never silently inflate the TWT-
//                                                 portion nor hide a slow render)
//   (b) cta_tap → intent_fire                  → TWT-portion   (/pay nav + POST /intent fetch; D5 — this
//                                                 is where 8.13's KMS-on-hot-path would show up)
//       intent_fire → upi_return (round-trip)  → EXCLUDED (the member's UPI app + bank + network — outside
//                                                 TWT's control)
//   (c-ui) upi_return → utr_confirm            → TWT-portion   (member pastes the UTR on TWT's surface)
//   (d) utr_confirm → yellow_pill              → TWT-portion   (attest write → pill render)
// TWT-portion = (a) + (b) + (c-ui) + (d).  Total observed = app_open → yellow_pill (all three buckets).
// The classic error is TWT-portion = total − round-trip: that WRONGLY folds member think-time in and can
// fail the ≤60s gate on the member's own deliberation. Sum only the four TWT segments; report think
// separately.

/** The seven wall-clock phase boundaries of one continuous contribution attempt. */
export type LoopPhaseMark =
  | 'app_open' // cold-start / home mount
  | 'card_render' // <ActiveContributionCard> first paints the assigned live pool
  | 'cta_tap' // the card's contribute CTA press
  | 'intent_fire' // immediately after Linking.openURL(upiUrl) resolves — last TWT instant before hand-off
  | 'upi_return' // AppState background→active after intent_fire — first TWT instant after hand-off
  | 'utr_confirm' // /attest completed
  | 'yellow_pill' // the attested pill rendered

/** Canonical mark ordering — used for both the presence check and the monotonic-order check. */
export const LOOP_PHASE_ORDER = [
  'app_open',
  'card_render',
  'cta_tap',
  'intent_fire',
  'upi_return',
  'utr_confirm',
  'yellow_pill',
] as const satisfies readonly LoopPhaseMark[]

/** A session under capture. Marks are monotonic `performance.now()` ms; any subset may be present while a
 *  session is in flight (or permanently, for the D1a already-attested shortcut paths). */
export interface LoopSession {
  readonly marks: Partial<Record<LoopPhaseMark, number>>
}

/** One derived per-session breakdown. Every duration is `number | null` — `null` (never `NaN`) whenever an
 *  endpoint mark is absent, so an incomplete session can be persisted/inspected without polluting the p95.
 *  A row is only aggregated when `complete === true`, at which point every field is a real number. */
export interface LoopBreakdown {
  /** (a) app_open → card_render — TWT-portion. */
  segA_ms: number | null
  /** (b) cta_tap → intent_fire — TWT-portion. */
  segB_ms: number | null
  /** (c-ui) upi_return → utr_confirm — TWT-portion. */
  segCui_ms: number | null
  /** (d) utr_confirm → yellow_pill — TWT-portion. */
  segD_ms: number | null
  /** (a)+(b)+(c-ui)+(d) — the budgeted TWT-portion (≤60s p95 gate). `null` if any TWT segment is absent. */
  twtPortionMs: number | null
  /** intent_fire → upi_return — the EXCLUDED UPI-app round-trip (reported, never budgeted). */
  upiRoundTripMs: number | null
  /** card_render → cta_tap — the SEPARATE member think-time bucket (neither TWT nor round-trip). */
  memberThinkMs: number | null
  /** app_open → yellow_pill — the total observed loop (all three buckets; ≤90s gate). */
  totalMs: number | null
  /** True iff all seven marks are present AND monotonically non-decreasing. Only complete sessions aggregate. */
  complete: boolean
}

/** A single segment `to − from`, or `null` if either endpoint mark is absent (never `NaN`). */
function seg(
  marks: Partial<Record<LoopPhaseMark, number>>,
  from: LoopPhaseMark,
  to: LoopPhaseMark,
): number | null {
  const a = marks[from]
  const b = marks[to]
  if (a === undefined || b === undefined) return null
  return b - a
}

/** Derive the three-bucket breakdown from a captured session (AC1). Pure — the same session always yields
 *  the same breakdown. */
export function computeLoopBreakdown(session: LoopSession): LoopBreakdown {
  const m = session.marks

  const segA_ms = seg(m, 'app_open', 'card_render')
  const memberThinkMs = seg(m, 'card_render', 'cta_tap')
  const segB_ms = seg(m, 'cta_tap', 'intent_fire')
  const upiRoundTripMs = seg(m, 'intent_fire', 'upi_return')
  const segCui_ms = seg(m, 'upi_return', 'utr_confirm')
  const segD_ms = seg(m, 'utr_confirm', 'yellow_pill')
  const totalMs = seg(m, 'app_open', 'yellow_pill')

  // Sum the four TWT segments ONLY when all four are present — a partial sum would be a lie.
  const twtPortionMs =
    segA_ms !== null && segB_ms !== null && segCui_ms !== null && segD_ms !== null
      ? segA_ms + segB_ms + segCui_ms + segD_ms
      : null

  const allPresent = LOOP_PHASE_ORDER.every((k) => m[k] !== undefined)
  const monotonic =
    allPresent &&
    LOOP_PHASE_ORDER.every((k, i) => {
      if (i === 0) return true
      const prev = LOOP_PHASE_ORDER[i - 1]!
      return (m[prev] as number) <= (m[k] as number)
    })
  const complete = allPresent && monotonic

  return {
    segA_ms,
    segB_ms,
    segCui_ms,
    segD_ms,
    twtPortionMs,
    upiRoundTripMs,
    memberThinkMs,
    totalMs,
    complete,
  }
}
