// 90-second loop timing — pure per-session breakdown unit tests (Story 8.12, Task 1; AC1).
//
// The LOAD-BEARING test of this story: the four-TWT-segment math, the TWT-portion sum, the round-trip
// EXCLUSION, the member-think-time as its OWN third bucket, and the `complete` gate (all seven marks
// present AND monotonically ordered) that keeps incomplete / already-attested-shortcut sessions (D1a)
// out of the p95. The module is framework-free (no RN, no @twt/* imports) so it runs in the node-only
// Vitest env and never touches the Metro bundle boundary ([[project_contracts_domain_bundle_boundary]]).

import { describe, expect, it } from 'vitest'

import { computeLoopBreakdown, LOOP_PHASE_ORDER, type LoopSession } from '../../lib/loop-timing'

/** A clean, monotonically-ordered continuous session (ms marks). Segments chosen so every bucket is a
 *  distinct round number → the arithmetic is unambiguous:
 *   app_open=0 → card_render=5000 (segA 5000, TWT)
 *              → cta_tap=13000     (think 8000, SEPARATE — reading the card + deciding)
 *              → intent_fire=16000 (segB 3000, TWT — /pay nav + intent fetch)
 *              → upi_return=46000  (round-trip 30000, EXCLUDED — member's UPI app + bank + network)
 *              → utr_confirm=52000 (segC-ui 6000, TWT — paste UTR on TWT's surface)
 *              → yellow_pill=53000 (segD 1000, TWT — attest → pill render)
 *  TWT-portion = 5000 + 3000 + 6000 + 1000 = 15000; total = 53000; round-trip = 30000; think = 8000. */
function completeSession(): LoopSession {
  return {
    marks: {
      app_open: 0,
      card_render: 5000,
      cta_tap: 13000,
      intent_fire: 16000,
      upi_return: 46000,
      utr_confirm: 52000,
      yellow_pill: 53000,
    },
  }
}

describe('computeLoopBreakdown — the three-bucket decomposition (AC1 / D1)', () => {
  it('derives the four TWT segments and sums them into the TWT-portion', () => {
    const b = computeLoopBreakdown(completeSession())
    expect(b.segA_ms).toBe(5000)
    expect(b.segB_ms).toBe(3000)
    expect(b.segCui_ms).toBe(6000)
    expect(b.segD_ms).toBe(1000)
    expect(b.twtPortionMs).toBe(15000)
    expect(b.complete).toBe(true)
  })

  it('captures the UPI round-trip SEPARATELY and EXCLUDES it from the TWT-portion', () => {
    const b = computeLoopBreakdown(completeSession())
    expect(b.upiRoundTripMs).toBe(30000)
    // The round-trip is not part of the TWT-portion budget — the member's app/bank/network, not ours.
    expect(b.twtPortionMs).not.toBe(b.twtPortionMs! + b.upiRoundTripMs!)
  })

  it('captures member think-time as its OWN third bucket (never folded into the TWT-portion)', () => {
    const b = computeLoopBreakdown(completeSession())
    expect(b.memberThinkMs).toBe(8000)
    // The classic mistake: TWT-portion = total − round-trip. That WRONGLY folds think-time (8000) in.
    // Guard it explicitly: with a non-zero think-time the two are provably different.
    expect(b.twtPortionMs).toBe(15000)
    expect(b.totalMs! - b.upiRoundTripMs!).toBe(23000) // = 15000 TWT + 8000 think
    expect(b.twtPortionMs).not.toBe(b.totalMs! - b.upiRoundTripMs!)
  })

  it('reports the total as app_open → yellow_pill (all three buckets)', () => {
    const b = computeLoopBreakdown(completeSession())
    expect(b.totalMs).toBe(53000)
    // Total is exactly the sum of the three disjoint buckets.
    expect(b.twtPortionMs! + b.memberThinkMs! + b.upiRoundTripMs!).toBe(b.totalMs)
  })
})

describe('computeLoopBreakdown — the `complete` gate (never a NaN in a results row)', () => {
  it('marks a session missing utr_confirm (the already-attested shortcut, D1a) incomplete — no NaN', () => {
    const s = completeSession()
    delete s.marks.utr_confirm
    const b = computeLoopBreakdown(s)
    expect(b.complete).toBe(false)
    // A TWT segment that lost an endpoint is null (excluded), NEVER NaN.
    expect(b.segCui_ms).toBeNull()
    expect(b.segD_ms).toBeNull()
    expect(b.twtPortionMs).toBeNull()
    expect(Number.isNaN(b.twtPortionMs as unknown as number)).toBe(false)
  })

  it('marks a session missing cta_tap (no-Contribute-CTA already-attested card, D1a) incomplete', () => {
    const s = completeSession()
    delete s.marks.cta_tap
    const b = computeLoopBreakdown(s)
    expect(b.complete).toBe(false)
    expect(b.memberThinkMs).toBeNull()
    expect(b.segB_ms).toBeNull()
  })

  it('marks an OUT-OF-ORDER session (upi_return before intent_fire) incomplete even with all marks', () => {
    const s = completeSession()
    s.marks.upi_return = 15000 // before intent_fire (16000) — a clock/ordering anomaly
    const b = computeLoopBreakdown(s)
    expect(LOOP_PHASE_ORDER.every((k) => s.marks[k] !== undefined)).toBe(true)
    expect(b.complete).toBe(false)
  })

  // Review finding, 2026-07-25 code review: the hand-picked upi_return/intent_fire inversion above was the
  // ONLY out-of-order case exercised, despite this module being the story's load-bearing test. Walk every
  // adjacent pair in LOOP_PHASE_ORDER so every boundary's ordering check is proven, not just one.
  it.each(LOOP_PHASE_ORDER.slice(1).map((mark, i) => [LOOP_PHASE_ORDER[i]!, mark] as const))(
    'marks an OUT-OF-ORDER session (%s after %s) incomplete even with all marks present',
    (prevMark, curMark) => {
      const s = completeSession()
      // Swap the two adjacent marks' timestamps so `curMark` lands strictly before `prevMark`.
      const prevAt = s.marks[prevMark]!
      const curAt = s.marks[curMark]!
      s.marks[curMark] = prevAt - 1
      s.marks[prevMark] = curAt
      const b = computeLoopBreakdown(s)
      expect(LOOP_PHASE_ORDER.every((k) => s.marks[k] !== undefined)).toBe(true)
      expect(b.complete).toBe(false)
    },
  )

  it('an empty session is incomplete with every bucket null (no NaN)', () => {
    const b = computeLoopBreakdown({ marks: {} })
    expect(b.complete).toBe(false)
    for (const v of [b.segA_ms, b.segB_ms, b.segCui_ms, b.segD_ms, b.twtPortionMs, b.upiRoundTripMs, b.memberThinkMs, b.totalMs]) {
      expect(v).toBeNull()
    }
  })
})
