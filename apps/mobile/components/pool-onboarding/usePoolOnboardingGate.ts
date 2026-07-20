// usePoolOnboardingGate — the FORWARD-COMPAT hook Epic 8's "My Pool" card will call to auto-launch the
// pool-engine onboarding tutorial on the member's first entry (Story 7.10, Task 2; AC2/AC4).
//
// ── This is a seam, NOT a live call site ────────────────────────────────────────────────────────
// The My Pool card does NOT exist yet — it is Epic 8. This story ships the hook (+ the MMKV gate it
// reads) so Epic 8 can wire `if (shouldAutoShow) router.push('/(pool-onboarding)')` at that surface
// without re-deriving the suppression logic. This story deliberately does NOT hook a nonexistent card.
// The ONLY live launch path 7.10 wires is the settings re-view entry (Task 4). This mirrors exactly the
// lock-in widget's Epic-8 My-Pool hand-off framing (components/lock-in/LockInClockWidget.tsx:10) and the
// build-the-seam-now / live-call-site-later channels-dispatch pattern
// ([[project_channels_no_live_dispatch_yet]]).
//
// ── Behaviour ───────────────────────────────────────────────────────────────────────────────────
// `shouldAutoShow` is `true` only when the member has NEITHER completed NOR skipped the tutorial (the
// MMKV gate is authoritative + offline-resilient). `markCompleted` / `markSkipped` write the gate and
// flip `shouldAutoShow` to `false` locally so the calling surface re-renders and stops auto-showing —
// no re-read race. Recording the best-effort analytics event is the tutorial component's job (it owns
// the api-client call), not this gate hook's.

import { useCallback, useState } from 'react'

import {
  hasSeenPoolOnboarding,
  markPoolOnboardingCompleted,
  markPoolOnboardingSkipped,
} from './pool-onboarding-gate'

export interface PoolOnboardingGate {
  /** True only when the member has neither completed nor skipped — Epic 8 gates auto-launch on this. */
  shouldAutoShow: boolean
  /** Record completion in the authoritative gate + suppress future auto-launch. */
  markCompleted: () => void
  /** Record a (permitted) skip in the authoritative gate + suppress future auto-launch. */
  markSkipped: () => void
}

export function usePoolOnboardingGate(): PoolOnboardingGate {
  // Read the gate once on mount (synchronous MMKV) — `shouldAutoShow` is the negation of "already seen".
  const [seen, setSeen] = useState<boolean>(() => hasSeenPoolOnboarding())

  const markCompleted = useCallback((): void => {
    markPoolOnboardingCompleted()
    setSeen(true)
  }, [])

  const markSkipped = useCallback((): void => {
    markPoolOnboardingSkipped()
    setSeen(true)
  }, [])

  return { shouldAutoShow: !seen, markCompleted, markSkipped }
}
