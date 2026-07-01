// Life Events save-and-resume draft store (Story 3.9, Task 8; UX-DR50 / UX spec §12).
//
// The grief-paced flows (medical disclosure after a death; nominee changes following a bereavement)
// must let a member start an update, leave, and return WITHOUT losing work (AC2). This persists the
// in-progress form state to the app's LOCAL synchronous store and restores it on return to the same
// screen.
//
// ── Storage backend note ──────────────────────────────────────────────────────────────────
// The UX spec (§12 line 2366) says "write to local AsyncStorage; sync when network returns". This
// app standardized on MMKV (architecture §4.5: JSI-based synchronous store, ~10-30× faster than
// AsyncStorage, the app's AsyncStorage-equivalent) — so we persist through the existing `mmkvStorage`
// seam rather than adding an AsyncStorage dependency. The SMS/email deep-link resume (also in UX
// spec §12) is EXPLICITLY DEFERRED — out of scope for v1-S/v1-M (see the story Dev Agent Record).
//
// ── Key namespace ─────────────────────────────────────────────────────────────────────────
// Keys are scoped by `memberId` to prevent cross-account draft leakage on shared devices
// (review P1). Format: `life-events-draft:<memberId>:<screenKey>`.
// `clearAllMemberDrafts(memberId)` must be called on signOut (session-context.tsx).

import { mmkvStorage } from '../../lib/mmkv'

const DRAFT_PREFIX = 'life-events-draft:'

// The exhaustive set of screen keys that store drafts — used by clearAllMemberDrafts.
const MEMBER_DRAFT_SCREEN_KEYS = ['nominees', 'medical'] as const

function draftKey(memberId: string, screenKey: string): string {
  return DRAFT_PREFIX + memberId + ':' + screenKey
}

/** Load a persisted draft for a screen, or null when none exists / it cannot be parsed. */
export function loadDraft<T>(memberId: string, screenKey: string): T | null {
  const raw = mmkvStorage.getItem(draftKey(memberId, screenKey))
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** Persist the in-progress form state for a screen (best-effort; a serialize failure is swallowed). */
export function saveDraft<T>(memberId: string, screenKey: string, value: T): void {
  try {
    mmkvStorage.setItem(draftKey(memberId, screenKey), JSON.stringify(value))
  } catch {
    // Non-fatal — a dropped draft simply means the member re-enters their work.
  }
}

/** Clear a screen's draft (on successful submit or when the member chooses to start fresh). */
export function clearDraft(memberId: string, screenKey: string): void {
  mmkvStorage.removeItem(draftKey(memberId, screenKey))
}

/** Remove all life-events drafts for a member (call on signOut to prevent cross-account leakage). */
export function clearAllMemberDrafts(memberId: string): void {
  for (const screenKey of MEMBER_DRAFT_SCREEN_KEYS) {
    mmkvStorage.removeItem(draftKey(memberId, screenKey))
  }
}
