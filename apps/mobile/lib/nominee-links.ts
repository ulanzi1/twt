// A nominee who is also a member — the PURE logic of the app flow (Story 6.36e, Task 5; AC5; `2026-10-24-397` NE2, NE3, NE6).
// ⛔ React, ⛔ native modules — unit-tested in vitest (`tests/unit/nominee-links-logic.test.ts`).
//   · a form slot's MARK: a `keep` of a live link (shown with its label), or a `new` mark (a number found in the contacts,
//     picked, or typed — the SERVER resolves it at save; ⛔ a member id on the phone) → the declare body's `memberLink`;
//   · the slots' marks reconciled with the declarer's links read (V3 / TR9): a slot with ⛔ mark recorded (a fresh form, or
//     a draft written before this story) takes the rank's LIVE link as a `keep` — ⛔ "no mark", which would END it; a `keep`
//     whose link is no longer live takes the rank's current one (after a 409 `nominee.link_stale`);
//   · the server's refusal codes → copy keys (the find screen's, the save's);
//   · whether the home / notice-strip request entry shows.
// And ONE in-memory handoff (⛔ MMKV, ⛔ a query cache): the find screen's matched contacts, held for the FORM SESSION (one
// match call serves both ranks — NE3; dropped when the form unmounts), and the member's pick, handed back to the form.

import type { NomineeLinkView, NomineeMemberLink } from '@twt/contracts'

import type { ContactEntry } from './known-people'

export type NomineeRank = 1 | 2

/** A form slot's mark. `name` / `savedName` are for SHOWING only — ⛔ sent. */
export type FormMark =
  | { readonly kind: 'keep'; readonly linkId: string; readonly label: NomineeLinkView['label']; readonly name: string | null }
  | { readonly kind: 'new'; readonly mobile: string; readonly foundBy: 'contacts' | 'picker' | 'typed'; readonly savedName: string | null }

/** The declare body's `memberLink` for a slot (`undefined` ⇒ ⛔ mark — a live one on that rank ENDS). */
export function markToSubmit(mark: FormMark | null | undefined): NomineeMemberLink | undefined {
  if (!mark) return undefined
  return mark.kind === 'keep' ? { kind: 'keep', linkId: mark.linkId } : { kind: 'new', mobile: mark.mobile, foundBy: mark.foundBy }
}

const keepOf = (link: NomineeLinkView): FormMark => ({ kind: 'keep', linkId: link.linkId, label: link.label, name: link.name })

/**
 * The slots' marks against the declarer's LIVE links (rank-ordered, one per rank at most). Per slot `i` (rank `i + 1`):
 *   · `memberLink` ABSENT (a fresh slot, or a draft from before this story) ⇒ the rank's live link as a `keep`, or ⛔ mark;
 *   · a `keep` still live ⇒ kept, its label / name refreshed; a `keep` NO LONGER live ⇒ the rank's live link, or ⛔ mark;
 *   · `null` (the member removed it) and a `new` mark ⇒ unchanged.
 */
export function reconcileMarks<F extends { memberLink?: FormMark | null }>(forms: readonly F[], links: readonly NomineeLinkView[]): F[] {
  return forms.map((f, i) => {
    const onRank = links.find((l) => l.rank === i + 1)
    const m = f.memberLink
    if (m === undefined) return { ...f, memberLink: onRank ? keepOf(onRank) : null }
    if (m === null || m.kind === 'new') return f
    const still = links.find((l) => l.linkId === m.linkId)
    if (still) return { ...f, memberLink: keepOf(still) }
    return { ...f, memberLink: onRank ? keepOf(onRank) : null }
  })
}

/** The slots a FRESH form starts with (the form starts EMPTY — G14): one, or two when the declarer has a rank-2 mark. */
export function freshSlotCount(links: readonly NomineeLinkView[]): 1 | 2 {
  return links.some((l) => l.rank === 2) ? 2 : 1
}

/** The member's pick put on its slot (a pick for rank 2 on a one-slot form is dropped — the slot is gone). */
export function applyPick<F extends { memberLink?: FormMark | null }>(forms: readonly F[], rank: NomineeRank, mark: FormMark): F[] {
  return forms.map((f, i) => (i === rank - 1 ? { ...f, memberLink: mark } : f))
}

/** The name a mark shows: a new mark — the name the member SAVED (or none); a kept one — the registered name once confirmed. */
export function markName(mark: FormMark): string | null {
  return mark.kind === 'new' ? mark.savedName : mark.name
}

/** A refusal of the find screen's match call → its copy key (each its own plain message — AC5). */
export function findRefusalCopyKey(code: string | undefined): string {
  switch (code) {
    case 'known_people.daily_limit':
      return 'error.daily_limit'
    case 'known_people.monthly_limit':
      return 'error.monthly_limit'
    case 'known_people.busy':
      return 'error.busy'
    case 'known_people.not_available':
      return 'error.not_available'
    default:
      return 'error.generic'
  }
}

/** A refusal of the declare that concerns a mark → its copy key; `null` for any other code (the screen's own copy). */
export function saveRefusalCopyKey(code: string | undefined): string | null {
  switch (code) {
    case 'nominee.link_not_found':
      return 'save.not_found'
    case 'nominee.link_duplicate':
      return 'save.duplicate'
    case 'nominee.link_stale':
      return 'save.stale'
    case 'nominee.link_daily_limit':
      return 'save.daily_limit'
    default:
      return null
  }
}

/** A refusal of the answer → its copy key. */
export function answerRefusalCopyKey(code: string | undefined): string {
  switch (code) {
    case 'nominee_link.request_closed':
      return 'request.closed'
    case 'nominee_link.not_found':
      return 'request.changed'
    case 'nominee_link.not_available':
      return 'request.not_available'
    default:
      return 'error.generic'
  }
}

/** The requests query's answer when the server REFUSES the member — kept AS DATA (the 6.36b sticky denial). */
export interface DeniedNomineeLinkRequestsPage {
  readonly items: readonly never[]
  readonly nextCursor: null
  readonly hasMore: false
  readonly denied: true
}
export const DENIED_NOMINEE_LINK_REQUESTS_PAGE: DeniedNomineeLinkRequestsPage = Object.freeze({ items: [], nextCursor: null, hasMore: false, denied: true })

/** The loaded pages → one list, each link once (the later copy wins — a link answered between two page fetches). */
export function flattenNomineeLinkPages<T extends { readonly linkId: string }>(pages: readonly { readonly items: readonly T[] }[] | undefined): T[] {
  const all = (pages ?? []).flatMap((p) => p.items)
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

/** Whether the home card and the notice-strip item show: ⛔ once the server refuses the member; else while one is OPEN. */
export function nomineeLinkEntryVisible(q: {
  readonly pages: readonly { readonly items: readonly { readonly linkId: string; readonly answer: string | null }[]; readonly denied?: boolean }[] | undefined
  readonly errorCode: string | undefined
}): boolean {
  if (q.errorCode === 'nominee_link.not_available' || (q.pages ?? []).some((p) => p.denied === true)) return false
  return flattenNomineeLinkPages(q.pages).some((r) => r.answer === null)
}

// ── The form session's memory (NE3) ────────────────────────────────────────────────────────────────────────────────────

let sessionMatches: { readonly matched: readonly ContactEntry[]; readonly truncated: boolean; readonly limited: boolean } | null = null
let pendingPick: { readonly rank: NomineeRank; readonly mark: FormMark } | null = null

/** The matched contacts of THIS form session (one match call serves both ranks), or `null` before the first. */
export function nomineeLinkSessionMatches(): typeof sessionMatches {
  return sessionMatches
}

export function setNomineeLinkSessionMatches(m: NonNullable<typeof sessionMatches>): void {
  sessionMatches = m
}

/** The find screen: the member picked `mark` for `rank` — the form takes it when it regains focus. */
export function handNomineeLinkPick(rank: NomineeRank, mark: FormMark): void {
  pendingPick = { rank, mark }
}

/** The form, on focus: the pick (once), or `null`. */
export function takeNomineeLinkPick(): typeof pendingPick {
  const p = pendingPick
  pendingPick = null
  return p
}

/** The form unmounted, or the account changed: drop the matched contacts and any pick (⛔ kept beyond the session). */
export function clearNomineeLinkSession(): void {
  sessionMatches = null
  pendingPick = null
}
