// The home reminder cards' dismissals (Story 6.36c, Task 6.3; AC6; RV7) — a per-viewer convenience kept ON THIS PHONE.
//
// MMKV key `home-cards.dismissed.v1.<accountId>` — NAMESPACED per signed-in member (fix-review): a single flat key meant
// a same-account sign-out/sign-in lost every dismissal, because sign-in defensively wiped it against a DIFFERENT
// account showing up next. A JSON map `cardKey → ISO time dismissed`, one map per account. A card stays hidden for 30
// days from its dismissal, then may show again. The key of a card names what it is ABOUT, so a new thing shows at once:
// the campaign card per `campaignId`, the suggestion card per `(requestId, workplaceId)` (a re-suggestion after a "No"
// keeps the `requestId`). ⛔ Ever sent to the server; ⛔ state that must persist (a lost store only shows a card again).
// Cleared on sign-out only (`lib/session-context.tsx`) — a real account SWITCH is already isolated by the namespaced
// key, so sign-in and a terminated / rejected refresh (whose handler cannot reliably name the OLD account — see that
// file) no longer clear it; an old account's entry simply sits there, inert, until it signs back in, at which point it
// is exactly the dismissals it left behind.

import { mmkvStorage } from './mmkv'

export const HOME_CARD_DISMISSALS_KEY_BASE = 'home-cards.dismissed.v1'
/** How long a dismissed card stays hidden. */
export const HOME_CARD_DISMISS_DAYS = 30
const DISMISS_MS = HOME_CARD_DISMISS_DAYS * 24 * 60 * 60 * 1000

/** The namespaced MMKV key holding `accountId`'s dismissals. */
export function homeCardDismissalsKey(accountId: string): string {
  return `${HOME_CARD_DISMISSALS_KEY_BASE}.${accountId}`
}

/** The storage seam (MMKV in the app; an in-memory map in tests). */
export interface SyncStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function read(storage: SyncStorage, accountId: string): Record<string, string> {
  try {
    const raw = storage.getItem(homeCardDismissalsKey(accountId))
    if (raw === null) return {}
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) if (typeof v === 'string') out[k] = v
    return out
  } catch {
    return {}
  }
}

/** `true` when `cardKey` was dismissed less than 30 days before `now`, among `accountId`'s own dismissals. */
export function isCardDismissed(cardKey: string, accountId: string, now: Date, storage: SyncStorage = mmkvStorage): boolean {
  const at = read(storage, accountId)[cardKey]
  if (at === undefined) return false
  const t = Date.parse(at)
  return Number.isFinite(t) && now.getTime() - t < DISMISS_MS
}

/** Record a dismissal of `cardKey` at `now`, for `accountId`; expired entries are dropped on the way. */
export function dismissCard(cardKey: string, accountId: string, now: Date, storage: SyncStorage = mmkvStorage): void {
  const kept: Record<string, string> = {}
  for (const [k, at] of Object.entries(read(storage, accountId))) {
    const t = Date.parse(at)
    if (Number.isFinite(t) && now.getTime() - t < DISMISS_MS) kept[k] = at
  }
  kept[cardKey] = now.toISOString()
  try {
    storage.setItem(homeCardDismissalsKey(accountId), JSON.stringify(kept))
  } catch {
    // A failed write only means the card may show again.
  }
}

/**
 * Forget `accountId`'s dismissals (sign-out — privacy/cleanup on a shared device). `undefined` is a no-op: the
 * terminated / rejected-refresh handlers register once at mount and cannot reliably name the account that just got
 * signed out (see `lib/session-context.tsx`) — harmless, since the namespaced key already isolates whichever account
 * signs in next.
 */
export function clearHomeCardDismissals(accountId: string | undefined, storage: SyncStorage = mmkvStorage): void {
  if (accountId === undefined) return
  try {
    storage.removeItem(homeCardDismissalsKey(accountId))
  } catch {
    // nothing kept
  }
}
