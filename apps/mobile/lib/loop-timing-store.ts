// 90-second loop timing — MMKV-persisted, DEBUG-GATED session store (Story 8.12, Task 2; AC1/AC2-capture).
//
// Appends completed per-session breakdowns (the pure `LoopBreakdown` from ./loop-timing) to a namespaced
// MMKV store so the ≥10-session field run's raw data can be pulled off-device (exportSessionsJson) for the
// off-device p95 aggregation (Task 4). Modeled on the lib/filed-claim.ts / lib/claim-draft.ts MMKV-backed
// helpers + their mocked-MMKV tests; its own namespace `twt-loop-90s` (mirrors lib/mmkv.ts's createMMKV).
//
// ── ZERO PII (D6) ───────────────────────────────────────────────────────────────────────────────────────
// Persists ONLY numeric durations + the `complete` flag. Never a memberId / poolId / alertId / UTR / VPA /
// tr — a stopwatch does not need identity. Keeps the store trivially shareable for analysis + the
// pii-scrape posture clean.
//
// ── DEBUG-GATED (D6) ────────────────────────────────────────────────────────────────────────────────────
// All capture + persistence is behind a single flag (`__DEV__` OR `EXPO_PUBLIC_LOOP_TIMING==='1'`). In a
// production member build BOTH are false → recordSession is a no-op, the store is never written, and the
// hot path pays nothing. The inspection/export affordance (the debug screen) is gated by the SAME flag and
// never appears on a normal member surface — Sushil never sees a stopwatch.

import { createMMKV } from 'react-native-mmkv'

import type { LoopBreakdown } from './loop-timing'

// `__DEV__` is an RN/Metro global (undefined under the node-only Vitest env) — reference it defensively.
declare const __DEV__: boolean | undefined

/** True when loop-timing capture + persistence is enabled (debug builds only). Read PER-CALL so a test (or
 *  a debug toggle) can flip `EXPO_PUBLIC_LOOP_TIMING` without a reload. A production member build has
 *  `__DEV__ === false` and no env flag → always false → the whole harness is inert. */
export function loopTimingEnabled(): boolean {
  return (typeof __DEV__ !== 'undefined' && __DEV__ === true) || process.env.EXPO_PUBLIC_LOOP_TIMING === '1'
}

// Namespaced instance (never the shared `twt-p0-5` mmkvStorage) so clearing timing data can never touch
// the app's real caches.
const store = createMMKV({ id: 'twt-loop-90s' })

const SESSIONS_KEY = 'sessions'

function readAll(): LoopBreakdown[] {
  const raw = store.getString(SESSIONS_KEY)
  if (raw === undefined) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as LoopBreakdown[]) : []
  } catch {
    return []
  }
}

/** Append one completed per-session breakdown. No-op unless the debug flag is on (production stays inert).
 *  Best-effort — a persistence failure never bubbles into the (frozen, behavior-preserving) pay flow. */
export function recordSession(breakdown: LoopBreakdown): void {
  if (!loopTimingEnabled()) return
  try {
    const rows = readAll()
    rows.push(breakdown)
    store.set(SESSIONS_KEY, JSON.stringify(rows))
  } catch {
    // Non-fatal — a dropped timing sample never affects the member's contribution.
  }
}

/** All recorded per-session breakdowns (empty array when none / disabled). */
export function listSessions(): LoopBreakdown[] {
  return readAll()
}

/** Drop every recorded session (the debug "Clear" action; also re-arms a clean field run). */
export function clearSessions(): void {
  try {
    store.remove(SESSIONS_KEY)
  } catch {
    // Non-fatal.
  }
}

/** The recorded sessions as a JSON string for pulling off-device (the debug "Copy/Share JSON" action) →
 *  fed to the Task 4 off-device p95 aggregation. Parses back exactly to listSessions(). */
export function exportSessionsJson(): string {
  return JSON.stringify(listSessions())
}
