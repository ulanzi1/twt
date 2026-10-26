// A nominee who is also a member — the PURE logic of the app flow (Story 6.36e, Task 5; AC5; `2026-10-24-397` NE2, NE3, NE6).
// ⛔ React, ⛔ native modules — unit-tested in vitest (`tests/unit/nominee-links-logic.test.ts`).
//   · a form slot's MARK: a `keep` of a live link (shown with its label), or a `new` mark (a number found in the contacts,
//     picked, or typed — the SERVER resolves it at save; ⛔ a member id on the phone) → the declare body's `memberLink`;
//   · the slots' marks reconciled with the declarer's links read (V3 / TR9): a slot with ⛔ mark recorded (a fresh form, or
//     a draft written before this story) takes the rank's LIVE link as a `keep` — ⛔ "no mark", which would END it; a `keep`
//     whose link is no longer live takes the rank's current one (after a 409 `nominee.link_stale`);
//   · ⭐ the V3 question "Is this still …?" is DERIVED, ⛔ held in a component's state (code review 2026-10-24: a remount — a
//     pick on the other slot, a stale reload, a resumed draft — reset it, and a mark rode onto a different person): every
//     mark carries `confirmedFor`, the {@link slotFingerprint} of the slot it was last confirmed for; the question is open
//     whenever the slot no longer matches it. It rides the draft and the remount with the mark itself;
//   · the server's refusal codes → copy keys (the find screen's, the save's);
//   · whether the home / notice-strip request entry shows;
//   · Story 6.36f (MK8, `2026-10-26-407`) — the MARKS-ONLY mode: its record (one entry per occupied rank), "a mark differs", the
//     body it sends (each rank's mark + the `versionNo` the phone saw — ⛔ a detail), the pick, and when its entry card shows.
// And ONE in-memory handoff (⛔ MMKV, ⛔ a query cache): the find screen's matched contacts, held for the FORM SESSION (one
// match call serves both ranks — NE3; dropped when the form unmounts), the member's pick, handed back to the form, and the ONE
// metered match call in flight per set of numbers (a second caller with the same numbers attaches to it — `shareNomineeLinkCheck`).

import type { NomineeLinkView, NomineeMarksRankView, NomineeMarksSaveRequest, NomineeMemberLink } from '@twt/contracts'

import type { ContactEntry } from './known-people'

export type NomineeRank = 1 | 2

/**
 * A form slot's mark. `name` / `savedName` are for SHOWING only — ⛔ sent. `confirmedFor` — the {@link slotFingerprint} of the
 * slot the mark was last confirmed for (absent on a draft written before it existed ⇒ the question is asked).
 */
export type FormMark =
  | {
      readonly kind: 'keep'
      readonly linkId: string
      readonly label: NomineeLinkView['label']
      readonly name: string | null
      readonly confirmedFor?: string
    }
  | {
      readonly kind: 'new'
      readonly mobile: string
      readonly foundBy: 'contacts' | 'picker' | 'typed'
      readonly savedName: string | null
      readonly confirmedFor?: string
      /** Picked on a slot with NO NAME yet: the name typed next COMPLETES the slot (see {@link completeMarkName}). */
      readonly namePending?: true
    }

/** What a form slot needs to be a mark's owner: the nominee's name and mobile as typed, and the mark. */
export interface MarkedSlot {
  readonly name: string
  readonly mobile: string
  readonly memberLink?: FormMark | null
}

/** The declare body's `memberLink` for a slot (`undefined` ⇒ ⛔ mark — a live one on that rank ENDS). */
export function markToSubmit(mark: FormMark | null | undefined): NomineeMemberLink | undefined {
  if (!mark) return undefined
  return mark.kind === 'keep' ? { kind: 'keep', linkId: mark.linkId } : { kind: 'new', mobile: mark.mobile, foundBy: mark.foundBy }
}

/**
 * What identifies the nominee a slot holds: the NAME (spacing and case folded) and the MOBILE (its last ten digits — `+91 98765
 * 43210` and `9876543210` are one number). A slot that has not been filled in is {@link EMPTY_SLOT}.
 */
export function slotFingerprint(slot: { readonly name: string; readonly mobile: string }): string {
  return `${foldName(slot.name)}|${slot.mobile.replace(/\D/g, '').slice(-10)}`
}

/** A name with its spacing and case folded — what two spellings of one name share. */
const foldName = (name: string): string => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()

/** The mark with its name-pending window CLOSED (a later name edit is a change, and asks). */
function closeNameWindow(m: Extract<FormMark, { kind: 'new' }>): FormMark {
  return { kind: 'new', mobile: m.mobile, foundBy: m.foundBy, savedName: m.savedName, ...(m.confirmedFor === undefined ? {} : { confirmedFor: m.confirmedFor }) }
}

const EMPTY_SLOT = '|'
/** A `confirmedFor` no slot can match: the mark is attached to a slot we cannot vouch for, so the member is ASKED. */
export const NEEDS_CONFIRMATION = 'needs-confirmation'

/** The "Is this still …?" question is open: the slot has a mark and no longer matches the one it was confirmed for. */
export function markNeedsQuestion(slot: MarkedSlot): boolean {
  const m = slot.memberLink
  return !!m && m.confirmedFor !== slotFingerprint(slot)
}

/** The member said *"Keep the mark"*: it is now confirmed for the slot as it is. */
export function confirmMark<F extends MarkedSlot>(slot: F): F {
  const m = slot.memberLink
  return m ? { ...slot, memberLink: { ...m, confirmedFor: slotFingerprint(slot) } } : slot
}

/**
 * The member answered *"Keep the mark"*: confirmed for the slot as it is. The name-pending window (if any) is CLOSED once the slot
 * has a name — and stays OPEN while it has none: the member answered a question about the MOBILE, the name is still to come, and
 * asking again at the first letter would be a question about their own act.
 */
export function acceptMark<F extends MarkedSlot>(slot: F): F {
  const confirmed = confirmMark(slot)
  const m = confirmed.memberLink
  if (!m || m.kind !== 'new' || m.namePending === undefined || slot.name.trim() === '') return confirmed
  return { ...confirmed, memberLink: closeNameWindow(m) }
}

/**
 * A draft is persisted on the phone: ⛔ another member's registered name, ⛔ ANOTHER MEMBER'S ANSWER (a kept mark's label — stored
 * as `asked`; `reconcileMarks` re-reads it on restore), ⛔ the name the member saved a contact under, ⛔ a name-pending window
 * once a name is typed (a draft restored later is a new sitting: a name edit then asks). The picked NUMBER stays — a `new` mark
 * IS a number, and the draft stores the mark (AC5). ⚠ Residual, recorded: it is the number of a person the member picked, and
 * when that person signs in on a DIFFERENT number than the one declared the draft holds a number it would not otherwise
 * (unencrypted, until saved or discarded) — the member's own phone; a Panel question, ⛔ answered here.
 */
export function redactForDraft<F extends { readonly name?: string; readonly memberLink?: FormMark | null }>(forms: readonly F[]): F[] {
  return forms.map((f) => {
    const m = f.memberLink
    if (!m) return f
    if (m.kind === 'keep') return { ...f, memberLink: { ...m, name: null, label: 'asked' as const } }
    const base = m.namePending !== undefined && (f.name ?? '').trim() !== '' ? closeNameWindow(m) : m
    return { ...f, memberLink: { ...base, savedName: null } as FormMark }
  })
}

/**
 * A `new` mark picked on a slot with NO NAME yet (`namePending`) is COMPLETED — not changed — by the name typed next, however many
 * keystrokes it takes: the member chose this person seconds ago (NE3 pre-fills the number, which invites picking first), so
 * asking "Is this still …?" at the first letter is a question about their own act. It lasts only while (a) the mobile is the one
 * the mark was confirmed for and no question is pending, and (b) the name only EXTENDS what is there (typing on) — or there was
 * none yet. ANY other change asks: a shortening (a backspace, a name cleared outright), a replacement (a paste over a selection,
 * "A" typed over "Asha"). A shortening is judged ⛔ by whether the result is still a prefix of the old name: edits arrive one
 * keystroke at a time, so "Asha" → "A" → "Anil" would pass every step and hand the mark to another person. Cost, recorded
 * (fix-diff review round 4): a typo fixed by a backspace asks once; *Keep the mark* (`acceptMark`) closes the window once a name
 * exists. An edit of the MOBILE asks as always. `before` / `after` are the slot around ONE edit.
 */
export function completeMarkName<F extends MarkedSlot>(before: F, after: F): F {
  const m = before.memberLink
  if (!m || m.kind !== 'new' || m.namePending !== true) return after
  if (m.confirmedFor !== slotFingerprint(before)) return after
  if (slotFingerprint({ name: '', mobile: after.mobile }) !== slotFingerprint({ name: '', mobile: before.mobile })) return after
  const was = foldName(before.name)
  if (was !== '' && !foldName(after.name).startsWith(was)) return after
  return confirmMark(after)
}

const keepOf = (link: NomineeLinkView, confirmedFor: string): FormMark => ({
  kind: 'keep',
  linkId: link.linkId,
  label: link.label,
  name: link.name,
  confirmedFor,
})

/**
 * The slots' marks against the declarer's LIVE links (rank-ordered, one per rank at most). Per slot `i` (rank `i + 1`):
 *   · `memberLink` ABSENT ⇒ the rank's live link as a `keep`, or ⛔ mark. A slot nobody has filled in is confirmed as it is
 *     (a fresh form starts EMPTY — G14); a slot holding a typed nominee (a draft from before this story) is ⛔ vouched for —
 *     the question is asked. A slot the form ADDED is `null`, ⛔ absent (it has no mark, and must not inherit the rank's);
 *   · a `keep` still live ⇒ kept, its label / name refreshed, its confirmation untouched; a `keep` NO LONGER live ⇒ the
 *     rank's current link, ⛔ vouched for (the slot may now name someone else — after a 409 `nominee.link_stale`), or ⛔ mark;
 *   · `null` (the member removed it / a new slot) and a `new` mark ⇒ unchanged.
 */
export function reconcileMarks<F extends MarkedSlot>(forms: readonly F[], links: readonly NomineeLinkView[]): F[] {
  return forms.map((f, i) => {
    const onRank = links.find((l) => l.rank === i + 1)
    const m = f.memberLink
    if (m === undefined) {
      const here = slotFingerprint(f)
      return { ...f, memberLink: onRank ? keepOf(onRank, here === EMPTY_SLOT ? here : NEEDS_CONFIRMATION) : null }
    }
    if (m === null || m.kind === 'new') return f
    const still = links.find((l) => l.linkId === m.linkId)
    if (still) return { ...f, memberLink: { ...keepOf(still, m.confirmedFor ?? NEEDS_CONFIRMATION) } }
    return { ...f, memberLink: onRank ? keepOf(onRank, NEEDS_CONFIRMATION) : null }
  })
}

/** The slots a FRESH form starts with (the form starts EMPTY — G14): one, or two when the declarer has a rank-2 mark. */
export function freshSlotCount(links: readonly NomineeLinkView[]): 1 | 2 {
  return links.some((l) => l.rank === 2) ? 2 : 1
}

/**
 * The member's pick put on its slot (a pick for rank 2 on a one-slot form is dropped — the slot is gone). NE3: when the slot's
 * declared `mobile` is EMPTY the picked number is offered as it (ten digits, editable — G8 / TR1); the pick is confirmed for
 * the slot as it then is, so ⛔ the question asks about what the member has not yet seen.
 */
export function applyPick<F extends MarkedSlot>(forms: readonly F[], rank: NomineeRank, mark: FormMark): F[] {
  return forms.map((f, i) => {
    if (i !== rank - 1) return f
    const mobile = f.mobile.trim() === '' && mark.kind === 'new' ? mark.mobile.replace(/\D/g, '').slice(-10) : f.mobile
    const slot = { ...f, mobile }
    // A pick on a slot with no name yet is completed by the name typed next (see `completeMarkName`).
    const pending = mark.kind === 'new' && f.name.trim() === '' ? { namePending: true as const } : {}
    return { ...slot, memberLink: { ...mark, ...pending, confirmedFor: slotFingerprint(slot) } }
  })
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
    // Story 6.36f (MK3) — the marks-only save's two refusals
    case 'nominee.marks_stale':
      return 'save.marks_stale'
    case 'nominee.marks_no_declaration':
      return 'save.marks_no_declaration'
    default:
      return null
  }
}

// ── The marks-only mode (Story 6.36f, MK8) ──────────────────────────────────────────────────────────────────────────────

/** Marks mode's state: one entry per occupied rank (the links read's `ranks`) — its mark, or `null` (none). */
export type MarksRecord = Readonly<Partial<Record<NomineeRank, FormMark | null>>>

/**
 * The record marks mode starts from: per rank of `ranks` (each has a basis — MK3), its LIVE mark as a `keep`, else `null`. ⛔ The V3
 * question in marks mode (⛔ editable details), so `confirmedFor` is the empty slot's — it never asks.
 */
export function initialMarks(view: { readonly ranks: readonly NomineeMarksRankView[]; readonly links: readonly NomineeLinkView[] }): MarksRecord {
  const out: Partial<Record<NomineeRank, FormMark | null>> = {}
  for (const r of view.ranks) {
    const live = view.links.find((l) => l.rank === r.rank)
    out[r.rank] = live ? keepOf(live, EMPTY_SLOT) : null
  }
  return out
}

/** The same mark — ⛔ a mark and ⛔ a mark; one `keep` of one link (case folded). A `new` pick is always a change. */
function sameMark(a: FormMark | null | undefined, b: FormMark | null | undefined): boolean {
  if (!a || !b) return !a && !b
  return a.kind === 'keep' && b.kind === 'keep' && a.linkId.toLowerCase() === b.linkId.toLowerCase()
}

/** *Save marks* stays disabled until a mark differs from the one the mode started from (MK5 — ⛔ a save that changes nothing). */
export function marksDiffer(initial: MarksRecord, current: MarksRecord): boolean {
  return ([1, 2] as const).some((rank) => !sameMark(initial[rank], current[rank]))
}

/**
 * The marks-only body (MK1): one entry per rank of the basis, its OWN `rank` (⛔ an array position — TR11) and the `versionNo` the
 * phone saw (MK3 — a stale one ⇒ 409 `marks_stale`); the mark or `null`. ⛔ A name, relationship, mobile or address leaves the phone.
 */
export function buildMarksBody(ranks: readonly NomineeMarksRankView[], record: MarksRecord): NomineeMarksSaveRequest {
  return { marks: ranks.map((r) => ({ rank: r.rank, versionNo: r.versionNo, memberLink: markToSubmit(record[r.rank]) ?? null })) }
}

/** The find screen's pick, in marks mode: ON its rank's entry, as picked (⛔ `applyPick` — slot-shaped); ⛔ entry ⇒ dropped. */
export function applyMarksPick(record: MarksRecord, rank: NomineeRank, mark: FormMark): MarksRecord {
  if (!(rank in record)) return record
  return { ...record, [rank]: mark }
}

/**
 * Whether the marks-only entry card shows (MK8): a SAVED declaration (`nominees` > 0) whose every rank has a basis (`ranks` ===
 * `nominees` — MK3), the status read ⛔ failed, ⛔ locked, and something to do — a live mark to change or remove, OR the member may
 * find one (`canNamePeople`; an `active-in-grace` member with ⛔ mark gets ⛔ card).
 */
export function marksEntryVisible(q: {
  readonly nominees: number | undefined
  readonly statusError: boolean
  readonly locked: boolean
  readonly ranks: number | undefined
  readonly liveMarks: number
  readonly canFind: boolean
}): boolean {
  if (q.nominees === undefined || q.nominees === 0 || q.statusError || q.locked) return false
  if (q.ranks !== q.nominees) return false
  return q.liveMarks > 0 || q.canFind
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

/**
 * The answer a request row SHOWS: the server's once the list has it, else the one the server RECORDED for the answer just given
 * (the list is reloaded in the background — ⛔ waited on, a stalled reload used to hold every button busy forever — so until it
 * lands the row would still offer Yes / No and a second tap would be refused "can no longer be answered"). It is the RECORDED
 * answer, ⛔ the tapped one: a replay of an earlier answer returns the first.
 */
export function shownRequestAnswer(server: 'confirmed' | 'not_me' | null, recorded: 'confirmed' | 'not_me' | undefined): 'confirmed' | 'not_me' | null {
  return server ?? recorded ?? null
}

/** The requests cache's shape, as far as an answer needs it (a denied page carries `items: []`, so one `map` serves every page). */
export interface RequestPagesData {
  readonly pages: readonly { readonly items: readonly { readonly linkId: string; readonly answer: 'confirmed' | 'not_me' | null }[] }[]
}

/**
 * The cached requests with one request marked ANSWERED — set the moment the server confirms it, so the home card and the notice
 * strip (which read the same cache) stop offering it before the background reload lands (or when it stalls). `undefined` stays.
 */
export function withRequestAnswered<D extends RequestPagesData>(data: D | undefined, linkId: string, answer: 'confirmed' | 'not_me'): D | undefined {
  if (data === undefined) return data
  return { ...data, pages: data.pages.map((pg) => ({ ...pg, items: pg.items.map((i) => (i.linkId === linkId ? { ...i, answer } : i)) })) }
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
let sessionEpoch = 0
const inFlightChecks = new Map<string, Promise<unknown>>()

/**
 * The form session's metered match calls in flight, ONE per set of numbers (the shared 3-a-day budget — NE3): a second caller with
 * the SAME numbers (the member left the find screen mid-check and opened it again, or retried after the read bound gave up on a
 * request that cannot be aborted) attaches to the first's promise instead of spending another check; different numbers (contacts
 * changed meanwhile) start their own and ⛔ displace it. It is held until the RAW call settles — ⛔ until a caller's own bound
 * does — so callers bound themselves separately. Cleared when it settles and with the session.
 */
export function shareNomineeLinkCheck<T>(key: string, start: () => Promise<T>): Promise<T> {
  const held = inFlightChecks.get(key)
  if (held !== undefined) return held as Promise<T>
  const promise: Promise<T> = start().finally(() => {
    if (inFlightChecks.get(key) === promise) inFlightChecks.delete(key)
  })
  inFlightChecks.set(key, promise)
  return promise
}

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

/**
 * The session's generation: it moves every time the session is cleared. The find screen reads it BEFORE its (slow) match call
 * and drops the answer if it moved — ⛔ a late response refilling a session the form or the account has left (code review
 * 2026-10-24; 6.36b guards the same class with `savedNamesGeneration`).
 */
export function nomineeLinkSessionEpoch(): number {
  return sessionEpoch
}

/** The form unmounted, or the account changed: drop the matched contacts and any pick (⛔ kept beyond the session). */
export function clearNomineeLinkSession(): void {
  sessionMatches = null
  pendingPick = null
  inFlightChecks.clear()
  sessionEpoch += 1
}
