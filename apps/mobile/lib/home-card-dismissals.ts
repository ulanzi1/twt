// The home reminder cards' dismissals (Story 6.36c, Task 6.3; AC6; RV7) — a per-viewer convenience kept ON THIS PHONE.
//
// MMKV key `home-cards.dismissed.v1`: a JSON map `cardKey → ISO time dismissed`. A card stays hidden for 30 days from its
// dismissal, then may show again. The key of a card names what it is ABOUT, so a new thing shows at once: the campaign
// card per `campaignId`, the suggestion card per `(requestId, workplaceId)` (a re-suggestion after a "No" keeps the
// `requestId`). ⛔ Ever sent to the server; ⛔ state that must persist (a lost store only shows a card again). Cleared with
// the other member caches on sign-in, sign-out and a terminated / rejected refresh (`lib/session-context.tsx`).

import { mmkvStorage } from './mmkv'

export const HOME_CARD_DISMISSALS_KEY = 'home-cards.dismissed.v1'
/** How long a dismissed card stays hidden. */
export const HOME_CARD_DISMISS_DAYS = 30
const DISMISS_MS = HOME_CARD_DISMISS_DAYS * 24 * 60 * 60 * 1000

/** The storage seam (MMKV in the app; an in-memory map in tests). */
export interface SyncStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function read(storage: SyncStorage): Record<string, string> {
  try {
    const raw = storage.getItem(HOME_CARD_DISMISSALS_KEY)
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

/** `true` when `cardKey` was dismissed less than 30 days before `now`. */
export function isCardDismissed(cardKey: string, now: Date, storage: SyncStorage = mmkvStorage): boolean {
  const at = read(storage)[cardKey]
  if (at === undefined) return false
  const t = Date.parse(at)
  return Number.isFinite(t) && now.getTime() - t < DISMISS_MS
}

/** Record a dismissal of `cardKey` at `now`; expired entries are dropped on the way. */
export function dismissCard(cardKey: string, now: Date, storage: SyncStorage = mmkvStorage): void {
  const kept: Record<string, string> = {}
  for (const [k, at] of Object.entries(read(storage))) {
    const t = Date.parse(at)
    if (Number.isFinite(t) && now.getTime() - t < DISMISS_MS) kept[k] = at
  }
  kept[cardKey] = now.toISOString()
  try {
    storage.setItem(HOME_CARD_DISMISSALS_KEY, JSON.stringify(kept))
  } catch {
    // A failed write only means the card may show again.
  }
}

/** Forget every dismissal (an account change). */
export function clearHomeCardDismissals(storage: SyncStorage = mmkvStorage): void {
  try {
    storage.removeItem(HOME_CARD_DISMISSALS_KEY)
  } catch {
    // nothing kept
  }
}
