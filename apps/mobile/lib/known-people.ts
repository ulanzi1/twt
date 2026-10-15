// People who know me — the PURE logic of the app flow (Story 6.36b, Task 4; 6.36a SW10–SW14). ⛔ React, ⛔ native modules —
// unit-tested in vitest (`tests/unit/known-people-logic.test.ts`).
//   · the contacts → the entries checked (normalised on the phone, de-duplicated, at most 1,000) and the ones left over;
//   · the server's matched POSITIONS → the matched entries (shown under their SAVED names) and the checked non-matches
//     (the invite list — ⛔ ever a contact beyond the first 1,000);
//   · the search over saved names; the slot arithmetic (tick up to `freeSlots`);
//   · the permission-state machine (granted / limited / denied → read, read + "only shared", or the fallback);
//   · the server's refusal codes and the list labels → copy keys.

import { normalizeMobileOnPhone } from './phone-normalize'

/** At most this many numbers in ONE matching request (⚠ by-value twin of the contract's `KNOWN_PEOPLE_MATCH_MAX_NUMBERS`). */
export const MATCH_MAX_NUMBERS = 1000

/** A phone contact as the contacts module returns it (only the two fields read). */
export interface PhoneContact {
  readonly id?: string
  readonly name?: string | null
  readonly phoneNumbers?: readonly { readonly number?: string | null; readonly digits?: string | null }[] | null
}

/** One distinct number, with the name the member saved for it. Held in MEMORY only. */
export interface ContactEntry {
  /** A stable key for the list (the canonical number — ⛔ rendered). */
  readonly key: string
  readonly savedName: string
  /** `+91XXXXXXXXXX` — sent for matching, then dropped. */
  readonly number: string
}

export interface PreparedContacts {
  /** The entries sent for matching, in order (index = the position the server answers with). */
  readonly checked: readonly ContactEntry[]
  /** True when more than 1,000 distinct mobiles were found — the screen says *"We checked 1,000 of your contacts"*. */
  readonly truncated: boolean
}

/** Normalise every number on the phone, keep Indian mobiles, drop duplicates (first saved name wins), ≤ 1,000. */
export function prepareContacts(contacts: readonly PhoneContact[], max = MATCH_MAX_NUMBERS): PreparedContacts {
  const seen = new Set<string>()
  const checked: ContactEntry[] = []
  let truncated = false
  for (const contact of contacts) {
    const savedName = (contact.name ?? '').trim()
    for (const phone of contact.phoneNumbers ?? []) {
      const raw = phone.number ?? phone.digits ?? ''
      const number = normalizeMobileOnPhone(raw)
      if (number === null || seen.has(number)) continue
      if (checked.length >= max) {
        truncated = true
        continue
      }
      seen.add(number)
      checked.push({ key: number, savedName: savedName === '' ? number : savedName, number })
    }
  }
  return { checked, truncated }
}

/** The server's POSITIONS → the matched entries, and the CHECKED entries that did ⛔ match (the invite list). */
export function applyMatches(checked: readonly ContactEntry[], positions: readonly number[]): { matched: ContactEntry[]; notMatched: ContactEntry[] } {
  const hit = new Set(positions.filter((p) => Number.isInteger(p) && p >= 0 && p < checked.length))
  return {
    matched: checked.filter((_, i) => hit.has(i)),
    notMatched: checked.filter((_, i) => !hit.has(i)),
  }
}

/** Case- and accent-insensitive substring search over the SAVED names. */
export function filterBySavedName(entries: readonly ContactEntry[], query: string): ContactEntry[] {
  const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  const q = fold(query.trim())
  if (q === '') return [...entries]
  return entries.filter((e) => fold(e.savedName).includes(q))
}

/** Tick / untick `key`; a tick beyond `freeSlots` is refused (the selection is returned unchanged). */
export function toggleSelection(selected: ReadonlySet<string>, key: string, freeSlots: number): Set<string> {
  const next = new Set(selected)
  if (next.has(key)) next.delete(key)
  else if (next.size < Math.max(0, freeSlots)) next.add(key)
  return next
}

/** What the contacts permission allows. */
export type ContactsAccess = 'all' | 'limited' | 'denied'

/** The permission response → the access (iOS 18 `accessPrivileges: 'limited'` ⇒ only the shared contacts). */
export function contactsAccessOf(perm: { readonly status?: string; readonly granted?: boolean; readonly accessPrivileges?: string }): ContactsAccess {
  const granted = perm.granted === true || perm.status === 'granted'
  if (!granted) return 'denied'
  return perm.accessPrivileges === 'limited' ? 'limited' : 'all'
}

/** Without the permission: iOS offers the system contact picker (⛔ permission needed — SF3); Android a typed number. */
export function fallbackFor(platform: string): 'picker' | 'typed' {
  return platform === 'ios' ? 'picker' : 'typed'
}

/** The server's refusal code → its copy key (each 429 / 404 / 409 its own plain message — AC9). */
export function refusalCopyKey(code: string | undefined): string {
  switch (code) {
    case 'known_people.daily_limit':
      return 'error.daily_limit'
    case 'known_people.monthly_limit':
      return 'error.monthly_limit'
    case 'known_people.busy':
      return 'error.busy'
    case 'known_people.not_a_member':
      return 'error.not_a_member'
    case 'known_people.self':
      return 'error.self'
    case 'known_people.cannot_ask_now':
      return 'error.cannot_ask_now'
    case 'known_people.limit_reached':
      return 'error.limit_reached'
    case 'known_people.request_closed':
      return 'error.request_closed'
    case 'known_people.not_available':
      return 'error.not_available'
    default:
      return 'error.generic'
  }
}

/** The namer's list label → its copy key. */
export function labelCopyKey(label: 'asked' | 'accepted' | 'not_accepted' | 'unavailable'): string {
  return `label.${label}`
}

/**
 * The name a namer's row shows: `accepted` — the registered name from the server; `unavailable` — ⛔ a name (⛔ why);
 * `asked` / `not_accepted` — the name the member SAVED on this phone, or a neutral fallback.
 */
export function rowName(
  item: { readonly linkId: string; readonly label: string; readonly name: string | null },
  savedNames: Readonly<Record<string, string>>,
  fallbacks: { readonly saved: string; readonly unavailable: string },
): string {
  if (item.label === 'unavailable') return fallbacks.unavailable
  if (item.label === 'accepted' && item.name) return item.name
  return savedNames[item.linkId] ?? fallbacks.saved
}
