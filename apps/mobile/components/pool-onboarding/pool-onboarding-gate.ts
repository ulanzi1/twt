// Pool-onboarding first-entry gate — the AUTHORITATIVE, offline-resilient suppressor (Story 7.10,
// Task 2; AC2/AC4).
//
// A tiny MMKV-backed store recording whether the member has already seen the pool-engine onboarding
// tutorial (completed OR skipped — either outcome suppresses the auto-launch). This local flag is the
// authoritative first-entry gate: it is set BEFORE / independently of the best-effort analytics POST,
// so a member who completes the tutorial offline is never re-prompted (the server event may sync late
// or be lost — acceptable for analytics; the flag is truth for suppression).
//
// ── Why MMKV, not AsyncStorage (memory [[project_mmkv_asyncstorage_equivalent]]) ────────────────
// The app standardized on MMKV (architecture §4.5, the app's AsyncStorage-equivalent). We persist
// through the shared `mmkvStorage` seam (lib/mmkv.ts), the same pattern as claim-draft.ts — never a
// new AsyncStorage dependency.
//
// ── Versioned key ───────────────────────────────────────────────────────────────────────────────
// `pool-onboarding.completed.v1`. The `v1` suffix lets a future material rewrite of the tutorial
// re-show it to everyone by bumping to `.v2` (a new key ⇒ fresh seen-state) WITHOUT migrating or
// clearing the old flag. The stored value records WHICH outcome suppressed it ('completed' | 'skipped')
// for local debugging; only presence matters to `hasSeenPoolOnboarding`.

import { mmkvStorage } from '../../lib/mmkv'

/** The current tutorial version's seen-state key. Bump the suffix to re-show after a material rewrite. */
export const POOL_ONBOARDING_SEEN_KEY = 'pool-onboarding.completed.v1'

/** The recorded first-entry outcome (either value suppresses the auto-launch). */
export type PoolOnboardingOutcome = 'completed' | 'skipped'

/** True once the member has completed OR skipped the tutorial — the authoritative auto-launch suppressor. */
export function hasSeenPoolOnboarding(): boolean {
  return mmkvStorage.getItem(POOL_ONBOARDING_SEEN_KEY) !== null
}

/** Read the recorded outcome, or `null` if the member has not yet seen the tutorial. */
export function getPoolOnboardingOutcome(): PoolOnboardingOutcome | null {
  const raw = mmkvStorage.getItem(POOL_ONBOARDING_SEEN_KEY)
  return raw === 'completed' || raw === 'skipped' ? raw : null
}

/** Record that the member finished the tutorial (Done on Screen 3). Suppresses future auto-launch. */
export function markPoolOnboardingCompleted(): void {
  mmkvStorage.setItem(POOL_ONBOARDING_SEEN_KEY, 'completed')
}

/** Record that the member skipped the tutorial (confirmed Skip). Skipping is permitted; also suppresses. */
export function markPoolOnboardingSkipped(): void {
  mmkvStorage.setItem(POOL_ONBOARDING_SEEN_KEY, 'skipped')
}
