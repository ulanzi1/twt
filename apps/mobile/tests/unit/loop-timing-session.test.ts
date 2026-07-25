// 90-second loop timing — in-flight session orchestrator unit tests (Story 8.12, Task 3).
//
// The capture wiring (_layout / ActiveContributionCard / UPIIntentButton / pay.tsx) writes marks into ONE
// transient in-flight session via markLoopPhase; on a complete loop it finalizes → records to the store.
// This tests the orchestration LOGIC deterministically (marks take an explicit `at` timestamp) — the RN
// mount points themselves are verified by typecheck + lint (the 8.4/8.13 no-mount-harness posture).

import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.EXPO_PUBLIC_LOOP_TIMING = '1'

vi.mock('react-native-mmkv', () => {
  const store = new Map<string, string>()
  return {
    createMMKV: () => ({
      getString: (k: string): string | undefined => store.get(k),
      set: (k: string, v: string): void => {
        store.set(k, v)
      },
      remove: (k: string): void => {
        store.delete(k)
      },
    }),
  }
})

import { clearSessions, listSessions } from '../../lib/loop-timing-store'
import {
  finalizeLoopSession,
  hasLoopMark,
  markCtaTap,
  markLoopPhase,
  markUpiReturn,
  resetLoopSession,
} from '../../lib/loop-timing-session'

beforeEach(() => {
  resetLoopSession()
  clearSessions()
})

describe('in-flight loop session orchestration (Task 3)', () => {
  it('records a complete, ordered session to the store on finalize', () => {
    markLoopPhase('app_open', { once: true, at: 0 })
    markLoopPhase('card_render', { once: true, at: 5000 })
    markLoopPhase('cta_tap', { at: 13000 })
    markLoopPhase('intent_fire', { at: 16000 })
    markUpiReturn(46000)
    markLoopPhase('utr_confirm', { at: 52000 })
    markLoopPhase('yellow_pill', { at: 53000 })
    finalizeLoopSession()

    const rows = listSessions()
    expect(rows).toHaveLength(1)
    expect(rows[0]!.complete).toBe(true)
    expect(rows[0]!.twtPortionMs).toBe(15000)
    expect(rows[0]!.upiRoundTripMs).toBe(30000)
    expect(rows[0]!.memberThinkMs).toBe(8000)
  })

  it('mark-once ignores a re-fire of app_open/card_render (no mid-loop re-stamp corrupting segment a)', () => {
    markLoopPhase('app_open', { once: true, at: 0 })
    markLoopPhase('app_open', { once: true, at: 999 }) // a stray re-render / refetch must NOT overwrite
    markLoopPhase('card_render', { once: true, at: 5000 })
    markLoopPhase('card_render', { once: true, at: 9999 })
    markLoopPhase('cta_tap', { at: 13000 })
    markLoopPhase('intent_fire', { at: 16000 })
    markUpiReturn(46000)
    markLoopPhase('utr_confirm', { at: 52000 })
    markLoopPhase('yellow_pill', { at: 53000 })
    finalizeLoopSession()

    expect(listSessions()[0]!.segA_ms).toBe(5000) // 5000 − 0, not corrupted by the re-fires
  })

  it('markUpiReturn only stamps the FIRST background→active after intent_fire', () => {
    markLoopPhase('app_open', { once: true, at: 0 })
    markLoopPhase('card_render', { once: true, at: 5000 })
    markLoopPhase('cta_tap', { at: 13000 })

    // A background→active BEFORE intent_fire (e.g. the member alt-tabbed while reading) is ignored.
    markUpiReturn(14000)
    expect(hasLoopMark('upi_return')).toBe(false)

    markLoopPhase('intent_fire', { at: 16000 })
    markUpiReturn(46000) // the real return from the UPI app
    expect(hasLoopMark('upi_return')).toBe(true)
    markUpiReturn(48000) // a later resume must not overwrite the first return
    markLoopPhase('utr_confirm', { at: 52000 })
    markLoopPhase('yellow_pill', { at: 53000 })
    finalizeLoopSession()

    expect(listSessions()[0]!.upiRoundTripMs).toBe(30000) // 46000 − 16000
  })

  it('finalize resets the in-flight session so the next attempt starts clean', () => {
    markLoopPhase('app_open', { once: true, at: 0 })
    markLoopPhase('card_render', { once: true, at: 5000 })
    markLoopPhase('cta_tap', { at: 13000 })
    markLoopPhase('intent_fire', { at: 16000 })
    markUpiReturn(46000)
    markLoopPhase('utr_confirm', { at: 52000 })
    markLoopPhase('yellow_pill', { at: 53000 })
    finalizeLoopSession()
    expect(hasLoopMark('app_open')).toBe(false) // reset
    expect(listSessions()).toHaveLength(1)
  })

  it('finalizing an incomplete session (already-attested shortcut, D1a) still records it, marked incomplete', () => {
    // Member arrives already-attested → yellow_pill fires but cta_tap / utr_confirm never did.
    markLoopPhase('app_open', { once: true, at: 0 })
    markLoopPhase('card_render', { once: true, at: 5000 })
    markLoopPhase('yellow_pill', { at: 7000 })
    finalizeLoopSession()
    const rows = listSessions()
    expect(rows).toHaveLength(1)
    expect(rows[0]!.complete).toBe(false)
  })

  it('markCtaTap ignores a rapid double-press of the same attempt (Review finding, 2026-07-25)', () => {
    markLoopPhase('app_open', { once: true, at: 0 })
    markLoopPhase('card_render', { once: true, at: 5000 })
    markCtaTap(13000)
    markCtaTap(13050) // a double-press before navigation away — must NOT overwrite
    expect(hasLoopMark('cta_tap')).toBe(true)

    markLoopPhase('intent_fire', { at: 16000 })
    markUpiReturn(46000)
    markLoopPhase('utr_confirm', { at: 52000 })
    markLoopPhase('yellow_pill', { at: 53000 })
    finalizeLoopSession()

    expect(listSessions()[0]!.segB_ms).toBe(3000) // 16000 − 13000, the FIRST tap
  })

  it('markCtaTap re-arms a stale session on a genuine retry (Review finding, 2026-07-25)', () => {
    // First attempt reaches intent_fire but is abandoned (no attest — the member backgrounds and gives up).
    markLoopPhase('app_open', { once: true, at: 0 })
    markLoopPhase('card_render', { once: true, at: 5000 })
    markCtaTap(13000)
    markLoopPhase('intent_fire', { at: 16000 })

    // The member retries — a fresh cta_tap fires while intent_fire is still stamped from the abandoned
    // attempt. This must reset the stale session rather than let app_open/card_render leak into the retry.
    markCtaTap(90000)
    expect(hasLoopMark('app_open')).toBe(false)
    expect(hasLoopMark('card_render')).toBe(false)
    expect(hasLoopMark('intent_fire')).toBe(false)
    expect(hasLoopMark('cta_tap')).toBe(true)

    // The retry can never regain app_open/card_render within this JS process, so it stays incomplete —
    // excluded from aggregation (safe-by-omission), never silently polluting memberThinkMs/totalMs.
    markLoopPhase('intent_fire', { at: 91000 })
    markUpiReturn(95000)
    markLoopPhase('utr_confirm', { at: 96000 })
    markLoopPhase('yellow_pill', { at: 97000 })
    finalizeLoopSession()

    expect(listSessions()[0]!.complete).toBe(false)
  })
})
