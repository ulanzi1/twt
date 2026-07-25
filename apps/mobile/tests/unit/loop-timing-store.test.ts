// 90-second loop timing store — MMKV-persisted, debug-gated session store unit tests (Story 8.12, Task 2).
//
// Mirrors the filed-claim.test.ts / claim-draft.test.ts mocked-MMKV precedent: react-native-mmkv is a
// NATIVE module, so we mock it with an in-memory store and exercise the pure append/list/clear/export
// round-trip. The load-bearing governance assertion here is NO-PII: the store persists ONLY numeric
// breakdowns — never a memberId / poolId / alertId / UTR / VPA (a stopwatch does not need identity, D6).

import { beforeEach, describe, expect, it, vi } from 'vitest'

// The store is debug-gated (`__DEV__ || EXPO_PUBLIC_LOOP_TIMING==='1'`); enable it via the env flag BEFORE
// importing the module under test (the flag is read per-call, but set it up-front for clarity).
process.env.EXPO_PUBLIC_LOOP_TIMING = '1'

// Mock the native MMKV module BEFORE the store (which calls createMMKV at load) is imported.
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

import { computeLoopBreakdown, type LoopSession } from '../../lib/loop-timing'
import {
  clearSessions,
  exportSessionsJson,
  listSessions,
  loopTimingEnabled,
  recordSession,
} from '../../lib/loop-timing-store'

function completeSession(offset = 0): LoopSession {
  return {
    marks: {
      app_open: 0 + offset,
      card_render: 5000 + offset,
      cta_tap: 13000 + offset,
      intent_fire: 16000 + offset,
      upi_return: 46000 + offset,
      utr_confirm: 52000 + offset,
      yellow_pill: 53000 + offset,
    },
  }
}

describe('loop-timing-store (debug-gated MMKV session store)', () => {
  beforeEach(() => {
    clearSessions()
  })

  it('is enabled under the EXPO_PUBLIC_LOOP_TIMING flag', () => {
    expect(loopTimingEnabled()).toBe(true)
  })

  it('starts empty, appends, and lists recorded sessions in order', () => {
    expect(listSessions()).toEqual([])
    recordSession(computeLoopBreakdown(completeSession(0)))
    recordSession(computeLoopBreakdown(completeSession(1000)))
    const rows = listSessions()
    expect(rows).toHaveLength(2)
    expect(rows[0]!.twtPortionMs).toBe(15000)
    expect(rows[0]!.totalMs).toBe(53000)
    expect(rows[1]!.twtPortionMs).toBe(15000)
  })

  it('clearSessions empties the store', () => {
    recordSession(computeLoopBreakdown(completeSession()))
    expect(listSessions()).toHaveLength(1)
    clearSessions()
    expect(listSessions()).toEqual([])
  })

  it('exportSessionsJson round-trips: parse(export) === listSessions()', () => {
    recordSession(computeLoopBreakdown(completeSession(0)))
    recordSession(computeLoopBreakdown(completeSession(500)))
    const json = exportSessionsJson()
    expect(JSON.parse(json)).toEqual(listSessions())
  })

  it('persists ONLY the numeric breakdown keys — NEVER any PII (D6)', () => {
    recordSession(computeLoopBreakdown(completeSession()))
    const json = exportSessionsJson()
    // The exact allowed key set — every key is a duration or the `complete` flag.
    const allowed = new Set([
      'segA_ms',
      'segB_ms',
      'segCui_ms',
      'segD_ms',
      'twtPortionMs',
      'upiRoundTripMs',
      'memberThinkMs',
      'totalMs',
      'complete',
    ])
    for (const row of JSON.parse(json) as Array<Record<string, unknown>>) {
      // The allowlist IS the no-PII guarantee: every persisted key is a duration or the `complete` flag —
      // there is no identity field (memberId / poolId / alertId / UTR / VPA / tr) the store could ever hold.
      for (const key of Object.keys(row)) {
        expect(allowed.has(key)).toBe(true)
      }
      // Every value is a number or boolean — never a string that could smuggle an identity token.
      for (const value of Object.values(row)) {
        expect(['number', 'boolean', 'object'].includes(typeof value)).toBe(true) // object = JSON null
      }
    }
  })

  it('records incomplete sessions too (D1a) — aggregation, not the store, filters them', () => {
    const s = completeSession()
    delete s.marks.utr_confirm
    recordSession(computeLoopBreakdown(s))
    const rows = listSessions()
    expect(rows).toHaveLength(1)
    expect(rows[0]!.complete).toBe(false)
  })
})

describe('loop-timing-store — disabled path (production member build is inert)', () => {
  it('recordSession is a no-op when the debug flag is off', () => {
    delete process.env.EXPO_PUBLIC_LOOP_TIMING
    clearSessions()
    recordSession(computeLoopBreakdown(completeSession()))
    expect(listSessions()).toEqual([])
    expect(loopTimingEnabled()).toBe(false)
    process.env.EXPO_PUBLIC_LOOP_TIMING = '1' // restore for any later files
  })
})
