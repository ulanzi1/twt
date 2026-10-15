// The names the member SAVED in their phone for the people they asked (Story 6.36b, Task 4; 6.36a SW14).
//
// The namer's list shows an `asked` link under the name THEY saved — the server holds ⛔ name for it (⛔ number either).
// That name is kept ONLY on this phone, in MMKV under `known-people.saved-names.v1`, keyed by the link id and tagged with
// the member it belongs to; ⛔ ever sent. It is cleared with the other member caches — on sign-out AND on a terminated
// or rejected refresh (`lib/session-context.tsx`). A store written by another member reads as empty.
// ⛔ The contact list itself is ⛔ stored here (it is held in memory only, by the find screen).

import { mmkvStorage } from './mmkv'

export const SAVED_NAMES_KEY = 'known-people.saved-names.v1'

interface Stored {
  readonly memberId: string
  readonly names: Record<string, string>
}

/** The storage seam (MMKV in the app; an in-memory map in tests). */
export interface SyncStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function read(storage: SyncStorage, memberId: string): Record<string, string> {
  try {
    const raw = storage.getItem(SAVED_NAMES_KEY)
    if (raw === null) return {}
    const parsed = JSON.parse(raw) as Partial<Stored>
    if (parsed.memberId !== memberId || typeof parsed.names !== 'object' || parsed.names === null) return {}
    return { ...parsed.names }
  } catch {
    return {}
  }
}

/** The saved names of `memberId`'s links (`linkId → name`). */
export function loadSavedNames(memberId: string, storage: SyncStorage = mmkvStorage): Record<string, string> {
  return read(storage, memberId)
}

/** Remember the saved name of a new link. Best-effort — a storage failure only loses a display name. */
export function saveSavedName(memberId: string, linkId: string, name: string, storage: SyncStorage = mmkvStorage): void {
  try {
    const names = read(storage, memberId)
    names[linkId] = name
    storage.setItem(SAVED_NAMES_KEY, JSON.stringify({ memberId, names } satisfies Stored))
  } catch {
    // ⛔ a thrown storage error never breaks the ask
  }
}

/** Keep only the links still on the member's list (a removed or vanished link's saved name is dropped). */
export function pruneSavedNames(memberId: string, liveLinkIds: readonly string[], storage: SyncStorage = mmkvStorage): void {
  try {
    const names = read(storage, memberId)
    const keep = new Set(liveLinkIds)
    const kept = Object.fromEntries(Object.entries(names).filter(([id]) => keep.has(id)))
    if (Object.keys(kept).length === Object.keys(names).length) return
    storage.setItem(SAVED_NAMES_KEY, JSON.stringify({ memberId, names: kept } satisfies Stored))
  } catch {
    // best-effort
  }
}

/** Forget every saved name (sign-out, a terminated or rejected refresh). */
export function clearSavedNames(storage: SyncStorage = mmkvStorage): void {
  try {
    storage.removeItem(SAVED_NAMES_KEY)
  } catch {
    // best-effort
  }
}
