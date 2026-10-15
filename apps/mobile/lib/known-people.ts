// People who know me — the PURE logic of the app flow (Story 6.36b, Task 4; 6.36a SW10–SW14). ⛔ React, ⛔ native modules —
// unit-tested in vitest (`tests/unit/known-people-logic.test.ts`).
//   · the contacts → the entries checked (normalised on the phone, de-duplicated, at most 1,000) and the ones left over;
//   · the server's matched POSITIONS → the matched entries (shown under their SAVED names) and the checked non-matches
//     (the invite list — ⛔ ever a contact beyond the first 1,000);
//   · the search over saved names; the slot arithmetic (tick up to `freeSlots`);
//   · the permission-state machine (granted / limited / denied → read, read + "only shared", or the fallback);
//   · the server's refusal codes and the list labels → copy keys; a completed action → its spoken confirmation;
//   · the requests naming the member, page by page → one list; whether the home card / notice-strip item shows.

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
    // review round 2, P3 — a link that changed elsewhere (or the member's own earlier tap that landed) — and a tap still
    // being handled: each its own plain message (AC9), ⛔ "Something went wrong".
    case 'known_people.not_found':
      return 'error.changed'
    case 'known_people.idempotency_in_progress':
      return 'error.in_progress'
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

/** A completed request action → its confirmation copy key (shown AND spoken — checklist 13 (d); review 2026-10-15 R5). */
export type KnownPeopleAction = 'accept' | 'decline' | 'remove' | 'withdraw'
export function successCopyKey(action: KnownPeopleAction): string {
  switch (action) {
    case 'accept':
      return 'done.accepted'
    case 'decline':
      return 'done.declined'
    case 'remove':
      return 'done.removed'
    case 'withdraw':
      return 'done.withdrawn'
  }
}

/**
 * The loaded pages of the requests naming the member → ONE list, each link once (review 2026-10-15 R3). A link whose
 * state changed between two page fetches (an open ask accepted elsewhere) can sit on both pages; the LATER copy — the
 * fresher fetch, in its new place — stays (fix-diff review F2). Any write refetches from page 1.
 */
export function flattenRequestPages<T extends { readonly linkId: string }>(pages: readonly { readonly items: readonly T[] }[] | undefined): T[] {
  const all = (pages ?? []).flatMap((page) => page.items)
  const seen = new Set<string>()
  const out: T[] = []
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const item = all[i]!
    if (seen.has(item.linkId)) continue
    seen.add(item.linkId)
    out.push(item)
  }
  return out.reverse()
}

/**
 * The requests query's answer when the server REFUSES the member (`known_people.not_available` — no longer `active`): kept
 * AS DATA, so the denial stands until the next SUCCESSFUL fetch. As an error it lasted only until the next failure of any
 * other kind (offline, a 5xx) replaced it — while TanStack still held the pre-denial pages, whose open request then
 * showed again (fix-diff review E1, the R4 symptom back).
 */
export interface DeniedRequestsPage {
  readonly items: readonly never[]
  readonly nextCursor: null
  readonly hasMore: false
  readonly denied: true
}
export const DENIED_REQUESTS_PAGE: DeniedRequestsPage = Object.freeze({ items: [], nextCursor: null, hasMore: false, denied: true })

/** How many ENDED links (`not_accepted`) the app asks the namer's list for — the server's own bound (review R2). */
export const KNOWN_PEOPLE_LIST_HISTORY_LIMIT = 50

/**
 * The link ids whose SAVED names the namer's list still needs — or `null` when it cannot say: a denial's empty list says
 * nothing about the links (pruning against it erased every saved name — round-4 review H1), and a history AT its bound
 * may have left out an older `not_accepted` row that comes back into view as newer ones age out (round-5 review). A live
 * link is always listed (R2), so pruning against a complete list drops only links that are gone for good.
 */
export function savedNameLinkIdsToKeep(
  data: { readonly items: readonly { readonly linkId: string; readonly label: string }[] } | undefined,
  historyLimit = KNOWN_PEOPLE_LIST_HISTORY_LIMIT,
): string[] | null {
  if (data === undefined || isDenied(data)) return null
  if (data.items.filter((i) => i.label === 'not_accepted').length >= historyLimit) return null
  return data.items.map((i) => i.linkId)
}

/** The namer's-list query's answer for a REFUSED member — the same sticky denial (fix-diff review G3). */
export interface DeniedMyKnownPeople {
  readonly items: readonly never[]
  readonly freeSlots: 0
  readonly denied: true
}
export const DENIED_MY_KNOWN_PEOPLE: DeniedMyKnownPeople = Object.freeze({ items: [], freeSlots: 0, denied: true })

/** Whether a query's data is (or, for the paged list, holds) the server's denial. */
export function isDenied(data: object | undefined): boolean {
  return data !== undefined && 'denied' in data && data.denied === true
}

/** Whether the loaded pages hold the server's denial. */
export function requestsDenied(pages: readonly object[] | undefined): boolean {
  return (pages ?? []).some(isDenied)
}

/**
 * Whether the home card and the notice-strip item show (AC6, AC10): ⛔ once the server REFUSES the member — TanStack
 * KEEPS the previous `data` when a refetch fails, so reading `data` alone showed a member who had left `active` their old
 * open request (review 2026-10-15 R4); the denial is read from the pages (`DENIED_REQUESTS_PAGE` — sticky, E1) and from
 * the error — and otherwise only while a loaded request is OPEN. ⭐ Only the DENIAL hides it: a network blip or a failed
 * *"Show more"* says nothing about the member (it flickered the card off; fix-diff review F3).
 */
export function requestEntryVisible(q: {
  readonly pages: readonly { readonly items: readonly { readonly linkId: string; readonly state: string }[]; readonly denied?: boolean }[] | undefined
  readonly errorCode: string | undefined
}): boolean {
  if (q.errorCode === 'known_people.not_available' || requestsDenied(q.pages)) return false
  return flattenRequestPages(q.pages).some((r) => r.state === 'asked')
}
