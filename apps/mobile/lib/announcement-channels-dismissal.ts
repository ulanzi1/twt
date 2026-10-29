// The Trust's announcement channels — the home card's dismissal (Story 5.14, Task 7; `2026-10-29-417` FS10 (a)).
//
// ONCE per device per member: "Not now", or a successful open of either link, hides the card FOR GOOD on this phone for that account
// (⛔ expiry — the 6.36c 30-day re-show would be the nagging the UX spec rules out). MMKV key
// `announcement-channels.card-dismissed.v1.<memberId>` — per member, so a second account on a shared phone is asked once too. Its OWN
// module (⛔ `home-card-dismissals.ts`, which prunes every entry older than 30 days from its shared map on each dismissal — F10).
// Cleared on sign-out (`lib/session-context.tsx`) for the same privacy / cleanup reason as `clearHomeCardDismissals`. ⛔ Ever sent to
// the server; a lost store only shows the card once more (FS10 (a)'s accepted cost). The settings entry is ⛔ affected.

import { mmkvStorage } from './mmkv'

export const ANNOUNCEMENT_CARD_DISMISSED_KEY_BASE = 'announcement-channels.card-dismissed.v1'

export function announcementCardDismissedKey(memberId: string): string {
  return `${ANNOUNCEMENT_CARD_DISMISSED_KEY_BASE}.${memberId}`
}

/** The storage seam (MMKV in the app; an in-memory map in tests) — the per-module seam of `home-card-dismissals.ts`. */
export interface SyncStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** `true` once this member dismissed (or opened a link from) the card on this phone — for good. */
export function isAnnouncementCardDismissed(memberId: string, storage: SyncStorage = mmkvStorage): boolean {
  try {
    return storage.getItem(announcementCardDismissedKey(memberId)) !== null
  } catch {
    return false
  }
}

/** Hide the card for good on this phone for `memberId` (the value is only the moment, for a human reading the store). */
export function dismissAnnouncementCard(memberId: string, now: Date = new Date(), storage: SyncStorage = mmkvStorage): void {
  try {
    storage.setItem(announcementCardDismissedKey(memberId), now.toISOString())
  } catch {
    // A failed write only means the card may show once more.
  }
}

/** Forget `memberId`'s dismissal (sign-out). `undefined` is a no-op. */
export function clearAnnouncementCardDismissal(memberId: string | undefined, storage: SyncStorage = mmkvStorage): void {
  if (memberId === undefined) return
  try {
    storage.removeItem(announcementCardDismissedKey(memberId))
  } catch {
    // Nothing to do — the entry is inert without its account.
  }
}
