// Story 6.36e (Task 5; AC5; `2026-10-24-397` NE2, NE3, NE6) — the PURE logic of the mark flow (`lib/nominee-links.ts`):
//   · a slot's mark → the declare body's `memberLink` (a keep sends its link id ONLY; ⛔ the shown name or number label);
//   · V3 / TR9 — the slots reconciled with the marks read: a draft from BEFORE this story (⛔ `memberLink`) restores the rank's
//     live mark as a `keep` — ⛔ "no mark" — and ASKS when the slot holds a typed nominee; a removed mark stays removed; a stale
//     keep takes the rank's current mark and ASKS;
//   · ⭐ code review 2026-10-24 — the "Is this still …?" question is DERIVED from the mark (`confirmedFor` = the slot's
//     fingerprint), so it survives a draft round trip, a reconcile and a pick on the other slot; the NE3 offer of the picked
//     number as the declared mobile; a draft is stored without other members' names; the session epoch;
//   · each refusal → its own copy key; the request entry shows only while a mark is OPEN and ⛔ after a denial;
//   · the form session's memory: one set of matches for both ranks, a pick taken once, both dropped on clear; ONE metered match
//     call in flight per set of numbers (a second caller attaches to it) — round 3;
//   · round 3 (2026-10-24): the name-pending window closes on a REPLACED or CLEARED name and when a draft with a name is stored;
//     the answered row shows what the server RECORDED; the cached requests are marked answered.

import { describe, expect, it, vi } from 'vitest'

import {
  acceptMark,
  answerRefusalCopyKey,
  applyMarksPick,
  applyPick,
  buildMarksBody,
  clearNomineeLinkSession,
  completeMarkName,
  confirmMark,
  DENIED_NOMINEE_LINK_REQUESTS_PAGE,
  findRefusalCopyKey,
  flattenNomineeLinkPages,
  freshSlotCount,
  handNomineeLinkPick,
  initialMarks,
  markNeedsQuestion,
  marksDiffer,
  marksEntryVisible,
  markToSubmit,
  NEEDS_CONFIRMATION,
  nomineeLinkEntryVisible,
  nomineeLinkSessionEpoch,
  nomineeLinkSessionMatches,
  reconcileMarks,
  redactForDraft,
  saveRefusalCopyKey,
  setNomineeLinkSessionMatches,
  shareNomineeLinkCheck,
  shownRequestAnswer,
  slotFingerprint,
  takeNomineeLinkPick,
  withRequestAnswered,
  type FormMark,
} from '../../lib/nominee-links'

const L1 = '11111111-1111-4111-8111-111111111111'
const L2 = '22222222-2222-4222-8222-222222222222'
const link = (rank: 1 | 2, linkId: string, label: 'asked' | 'confirmed' | 'not_me' = 'asked', name: string | null = null) => ({ rank, linkId, label, name })
const slot = (memberLink?: FormMark | null) => ({ name: 'Asha Devi', relationship: 'spouse', mobile: '9876543210', address: '', ...(memberLink === undefined ? {} : { memberLink }) })
/** A slot nobody has filled in (a fresh form starts EMPTY — G14). */
const emptySlot = (memberLink?: FormMark | null) => ({ name: '', relationship: '', mobile: '', address: '', ...(memberLink === undefined ? {} : { memberLink }) })

describe('markToSubmit', () => {
  it('a keep sends its link id ONLY; a new mark its number + how found; ⛔ mark ⇒ undefined', () => {
    expect(markToSubmit({ kind: 'keep', linkId: L1, label: 'confirmed', name: 'Meena' })).toEqual({ kind: 'keep', linkId: L1 })
    expect(markToSubmit({ kind: 'new', mobile: '+919876500001', foundBy: 'contacts', savedName: 'Meena' })).toEqual({
      kind: 'new',
      mobile: '+919876500001',
      foundBy: 'contacts',
    })
    expect(markToSubmit(null)).toBeUndefined()
    expect(markToSubmit(undefined)).toBeUndefined()
  })
})

describe('reconcileMarks (V3, TR9)', () => {
  const links = [link(1, L1, 'confirmed', 'Meena K.'), link(2, L2)]

  it('⭐ TR9 — a draft from before this story (⛔ memberLink) with a TYPED nominee restores each rank\'s live mark as a KEEP — ⛔ "no mark" — and ASKS', () => {
    const out = reconcileMarks([slot(), slot()], links)
    expect(out.map((f) => f.memberLink)).toEqual([
      { kind: 'keep', linkId: L1, label: 'confirmed', name: 'Meena K.', confirmedFor: NEEDS_CONFIRMATION },
      { kind: 'keep', linkId: L2, label: 'asked', name: null, confirmedFor: NEEDS_CONFIRMATION },
    ])
    expect(out.every(markNeedsQuestion)).toBe(true) // we cannot vouch that the typed slot is still the marked person
  })

  it('a FRESH form (EMPTY slots) takes each rank\'s live mark confirmed for the empty slot — nothing is asked until the member types', () => {
    const out = reconcileMarks([emptySlot(), emptySlot()], links)
    expect(out.map((f) => (f.memberLink as { linkId: string }).linkId)).toEqual([L1, L2])
    expect(out.some(markNeedsQuestion)).toBe(false)
    expect(markNeedsQuestion({ ...out[0]!, name: 'A' })).toBe(true) // … and typing a name asks
  })

  it('a slot the form ADDED (`memberLink: null`) ⛔ inherits the rank\'s live mark — only an ABSENT one does', () => {
    expect(reconcileMarks([slot(null), slot(null)], links).map((f) => f.memberLink)).toEqual([null, null])
  })

  it('a REMOVED mark stays removed; a new mark is kept; a live keep is refreshed (label / name)', () => {
    const fresh: FormMark = { kind: 'new', mobile: '+919876500001', foundBy: 'typed', savedName: null }
    const out = reconcileMarks([slot(null), slot(fresh)], links)
    expect(out[0]!.memberLink).toBeNull()
    expect(out[1]!.memberLink).toBe(fresh)
    const confirmed = slotFingerprint(slot())
    expect(reconcileMarks([slot({ kind: 'keep', linkId: L1, label: 'asked', name: null, confirmedFor: confirmed })], links)[0]!.memberLink).toEqual({
      kind: 'keep',
      linkId: L1,
      label: 'confirmed',
      name: 'Meena K.',
      confirmedFor: confirmed, // the member's own confirmation is ⛔ reset by a refresh
    })
  })

  it('a STALE keep (⛔ live any more — after a 409) takes the rank\'s current mark, or ⛔ mark', () => {
    const stale: FormMark = { kind: 'keep', linkId: '99999999-9999-4999-8999-999999999999', label: 'asked', name: null }
    // … and ASKS: the slot may now name someone else (the stale mark was replaced elsewhere)
    expect(reconcileMarks([slot(stale)], links)[0]!.memberLink).toMatchObject({ kind: 'keep', linkId: L1, confirmedFor: NEEDS_CONFIRMATION })
    expect(markNeedsQuestion(reconcileMarks([slot(stale)], links)[0]!)).toBe(true)
    expect(reconcileMarks([slot(stale)], [])[0]!.memberLink).toBeNull()
  })

  it('a keep moved by the member to the OTHER slot stays on that slot (a swap carries — ⛔ re-pinned to its old rank)', () => {
    const swapped = reconcileMarks([slot({ kind: 'keep', linkId: L2, label: 'asked', name: null }), slot({ kind: 'keep', linkId: L1, label: 'asked', name: null })], links)
    expect(swapped.map((f) => (f.memberLink as { linkId: string }).linkId)).toEqual([L2, L1])
  })

  it('a fresh form starts with two slots ONLY when a rank-2 mark is live; a pick lands on its rank', () => {
    expect(freshSlotCount([])).toBe(1)
    expect(freshSlotCount([link(1, L1)])).toBe(1)
    expect(freshSlotCount(links)).toBe(2)
    const picked: FormMark = { kind: 'new', mobile: '+919876500002', foundBy: 'picker', savedName: 'Ravi' }
    expect(applyPick([slot(null), slot(null)], 2, picked).map((f) => f.memberLink)).toEqual([null, { ...picked, confirmedFor: slotFingerprint(slot()) }])
    expect(applyPick([slot(null)], 2, picked)).toEqual([slot(null)]) // the slot is gone
  })
})

describe('refusals → copy keys', () => {
  it('the save: each mark refusal its own key; any other code ⇒ null (the screen\'s own copy)', () => {
    expect(saveRefusalCopyKey('nominee.link_not_found')).toBe('save.not_found')
    expect(saveRefusalCopyKey('nominee.link_duplicate')).toBe('save.duplicate')
    expect(saveRefusalCopyKey('nominee.link_stale')).toBe('save.stale')
    expect(saveRefusalCopyKey('nominee.link_daily_limit')).toBe('save.daily_limit')
    expect(saveRefusalCopyKey('nominee.locked_claim_filed')).toBeNull()
    expect(saveRefusalCopyKey(undefined)).toBeNull()
  })

  it('the find screen and the answer', () => {
    expect(findRefusalCopyKey('known_people.daily_limit')).toBe('error.daily_limit')
    expect(findRefusalCopyKey('known_people.monthly_limit')).toBe('error.monthly_limit')
    expect(findRefusalCopyKey('known_people.busy')).toBe('error.busy')
    expect(findRefusalCopyKey('known_people.not_available')).toBe('error.not_available')
    expect(findRefusalCopyKey(undefined)).toBe('error.generic')
    expect(answerRefusalCopyKey('nominee_link.request_closed')).toBe('request.closed')
    expect(answerRefusalCopyKey('nominee_link.not_found')).toBe('request.changed')
    expect(answerRefusalCopyKey('nominee_link.not_available')).toBe('request.not_available')
  })
})

describe('the request entry', () => {
  const page = (items: { linkId: string; answer: string | null }[]) => ({ items, nextCursor: null, hasMore: false })

  it('shows only while a mark is OPEN; ⛔ after the server\'s denial (as data or as the error)', () => {
    expect(nomineeLinkEntryVisible({ pages: [page([{ linkId: L1, answer: null }])], errorCode: undefined })).toBe(true)
    expect(nomineeLinkEntryVisible({ pages: [page([{ linkId: L1, answer: 'confirmed' }])], errorCode: undefined })).toBe(false)
    expect(nomineeLinkEntryVisible({ pages: [page([{ linkId: L1, answer: null }]), DENIED_NOMINEE_LINK_REQUESTS_PAGE], errorCode: undefined })).toBe(false)
    expect(nomineeLinkEntryVisible({ pages: [page([{ linkId: L1, answer: null }])], errorCode: 'nominee_link.not_available' })).toBe(false)
    expect(nomineeLinkEntryVisible({ pages: undefined, errorCode: undefined })).toBe(false)
  })

  it('pages flatten to one list, the LATER copy of a link winning', () => {
    expect(flattenNomineeLinkPages([page([{ linkId: L1, answer: null }, { linkId: L2, answer: null }]), page([{ linkId: L1, answer: 'not_me' }])])).toEqual([
      { linkId: L2, answer: null },
      { linkId: L1, answer: 'not_me' },
    ])
  })
})

describe('the form session\'s memory (NE3)', () => {
  it('ONE set of matches serves both ranks; a pick is taken ONCE; a clear drops both', () => {
    clearNomineeLinkSession()
    expect(nomineeLinkSessionMatches()).toBeNull()
    setNomineeLinkSessionMatches({ matched: [{ key: 'k', savedName: 'Meena', number: '+919876500001' }], truncated: false, limited: false })
    expect(nomineeLinkSessionMatches()?.matched).toHaveLength(1)
    const mark: FormMark = { kind: 'new', mobile: '+919876500001', foundBy: 'contacts', savedName: 'Meena' }
    handNomineeLinkPick(2, mark)
    expect(takeNomineeLinkPick()).toEqual({ rank: 2, mark })
    expect(takeNomineeLinkPick()).toBeNull()
    handNomineeLinkPick(1, mark)
    clearNomineeLinkSession()
    expect(takeNomineeLinkPick()).toBeNull()
    expect(nomineeLinkSessionMatches()).toBeNull()
  })

  describe('shareNomineeLinkCheck — ONE metered match call in flight per set of numbers (round 3)', () => {
    const deferred = <T,>() => {
      let resolve!: (v: T) => void
      let reject!: (e: unknown) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }

    it('a second caller with the SAME numbers attaches to the call in flight — ⛔ a second start; different numbers start their own', async () => {
      clearNomineeLinkSession()
      const first = deferred<number>()
      const start = vi.fn(() => first.promise)
      const a = shareNomineeLinkCheck('n1,n2', start)
      const b = shareNomineeLinkCheck('n1,n2', start)
      expect(start).toHaveBeenCalledTimes(1)
      const other = vi.fn(() => Promise.resolve(7))
      expect(await shareNomineeLinkCheck('n1,n2,n3', other)).toBe(7)
      expect(other).toHaveBeenCalledTimes(1)
      first.resolve(42)
      expect(await Promise.all([a, b])).toEqual([42, 42])
    })

    it('different numbers start their own call and ⛔ displace the first: a later caller with the FIRST numbers still attaches (a Map, ⛔ one slot)', async () => {
      clearNomineeLinkSession()
      const first = deferred<number>()
      const startFirst = vi.fn(() => first.promise)
      const a = shareNomineeLinkCheck('n1,n2', startFirst)
      const second = deferred<number>()
      void shareNomineeLinkCheck('n1,n2,n3', () => second.promise) // the contacts changed meanwhile
      const again = vi.fn(() => Promise.resolve(99))
      const c = shareNomineeLinkCheck('n1,n2', again)
      expect(again).not.toHaveBeenCalled() // attached to the first call, which is still running
      first.resolve(5)
      expect(await Promise.all([a, c])).toEqual([5, 5])
      second.resolve(6)
    })

    it('it is released when the call SETTLES (success or failure) and when the session is cleared — a later check starts afresh', async () => {
      clearNomineeLinkSession()
      const failing = deferred<number>()
      const start = vi.fn(() => failing.promise)
      const first = shareNomineeLinkCheck('k', start)
      failing.reject(new Error('503'))
      await expect(first).rejects.toThrow('503')
      expect(await shareNomineeLinkCheck('k', () => Promise.resolve(1))).toBe(1) // released by the failure
      const pending = deferred<number>()
      void shareNomineeLinkCheck('k', () => pending.promise)
      clearNomineeLinkSession() // the form unmounted / the account changed
      const fresh = vi.fn(() => Promise.resolve(2))
      expect(await shareNomineeLinkCheck('k', fresh)).toBe(2)
      expect(fresh).toHaveBeenCalledTimes(1) // ⛔ attached to a call of a session that is gone
      pending.resolve(0)
    })
  })
})

describe('the "Is this still …?" question is DERIVED (code review 2026-10-24)', () => {
  const kept = (over: Partial<FormMark> = {}): FormMark => ({ kind: 'keep', linkId: L1, label: 'confirmed', name: 'Meena K.', confirmedFor: slotFingerprint(slot()), ...over }) as FormMark

  it('the fingerprint folds case, spacing and the +91 prefix — and an edit of the NAME or the MOBILE changes it', () => {
    expect(slotFingerprint({ name: '  asha   DEVI ', mobile: '+91 98765 43210' })).toBe(slotFingerprint({ name: 'Asha Devi', mobile: '9876543210' }))
    expect(slotFingerprint({ name: 'Asha Devi', mobile: '9876543211' })).not.toBe(slotFingerprint({ name: 'Asha Devi', mobile: '9876543210' }))
    expect(slotFingerprint({ name: 'Ravi Devi', mobile: '9876543210' })).not.toBe(slotFingerprint({ name: 'Asha Devi', mobile: '9876543210' }))
  })

  it('a slot is asked only when it HAS a mark that was ⛔ confirmed for it; *Keep the mark* confirms it for the slot as it is', () => {
    expect(markNeedsQuestion(slot(kept()))).toBe(false)
    expect(markNeedsQuestion(slot(null))).toBe(false)
    expect(markNeedsQuestion(slot())).toBe(false) // no mark ⇒ nothing to ask
    const edited = { ...slot(kept()), name: 'Asha Devix' }
    expect(markNeedsQuestion(edited)).toBe(true)
    expect(markNeedsQuestion(confirmMark(edited))).toBe(false)
    expect(markNeedsQuestion({ ...confirmMark(edited), mobile: '9000000000' })).toBe(true) // a LATER edit asks again
    expect(markNeedsQuestion(slot({ kind: 'keep', linkId: L1, label: 'asked', name: null }))).toBe(true) // an earlier build's draft
  })

  it('⭐ it SURVIVES the draft round trip, a reconcile and a pick on the OTHER slot — the mark ⛔ rides onto the new person', () => {
    const links = [link(1, L1, 'confirmed', 'Meena K.')]
    const edited = [{ ...slot(kept()), name: 'Ravi Kumar' }, slot(null)]
    expect(markNeedsQuestion(edited[0]!)).toBe(true)
    // the draft is stored redacted, restored, and reconciled with the marks read
    const resumed = reconcileMarks(JSON.parse(JSON.stringify(redactForDraft(edited))) as typeof edited, links)
    expect(markNeedsQuestion(resumed[0]!)).toBe(true)
    // the member then picks a member for the OTHER slot — the form is rebuilt from the same slots
    const picked: FormMark = { kind: 'new', mobile: '+919876500002', foundBy: 'contacts', savedName: 'Ravi' }
    const afterPick = applyPick(resumed, 2, picked)
    expect(markNeedsQuestion(afterPick[0]!)).toBe(true)
    expect(markNeedsQuestion(afterPick[1]!)).toBe(false) // the pick itself was made with the slot in front of the member
    expect((afterPick[0]!.memberLink as { linkId: string }).linkId).toBe(L1)
  })

  it('NE3 — a pick on a slot whose declared mobile is EMPTY offers the picked number as it (ten digits); a typed one is ⛔ overwritten', () => {
    const picked: FormMark = { kind: 'new', mobile: '+919876500002', foundBy: 'contacts', savedName: 'Ravi' }
    const offered = applyPick([{ ...slot(null), mobile: '' }], 1, picked)[0]!
    expect(offered.mobile).toBe('9876500002')
    expect(markNeedsQuestion(offered)).toBe(false)
    expect(applyPick([slot(null)], 1, picked)[0]!.mobile).toBe('9876543210')
    expect(applyPick([{ ...slot(null), mobile: '  ' }], 1, { ...picked, kind: 'new' })[0]!.mobile).toBe('9876500002')
  })

  it('a draft is stored WITHOUT another member\'s registered name or the name a contact was saved under — the number and the link id stay', () => {
    const out = redactForDraft([
      slot({ kind: 'keep', linkId: L1, label: 'confirmed', name: 'Meena Kumari', confirmedFor: 'x' }),
      slot({ kind: 'new', mobile: '+919876500002', foundBy: 'contacts', savedName: 'Ravi from school', confirmedFor: 'y' }),
      slot(null),
    ])
    // another member's ANSWER (`confirmed` / `not_me`) is stored as `asked` too — `reconcileMarks` re-reads it on restore
    expect(out[0]!.memberLink).toEqual({ kind: 'keep', linkId: L1, label: 'asked', name: null, confirmedFor: 'x' })
    expect(out[1]!.memberLink).toEqual({ kind: 'new', mobile: '+919876500002', foundBy: 'contacts', savedName: null, confirmedFor: 'y' })
    expect(out[2]!.memberLink).toBeNull()
    expect(JSON.stringify(out)).not.toMatch(/Meena Kumari|Ravi from school/)
  })

  it('a stored draft never RESUMES a name-pending window once a name is typed — a nameless one keeps it (round 3)', () => {
    const pending: FormMark = { kind: 'new', mobile: '+919876500002', foundBy: 'contacts', savedName: 'Ravi', confirmedFor: 'z', namePending: true }
    const input = [slot(pending), { ...emptySlot(pending) }]
    const [named, nameless] = redactForDraft(input)
    expect((named!.memberLink as { namePending?: true }).namePending).toBeUndefined()
    expect((nameless!.memberLink as { namePending?: true }).namePending).toBe(true)
    // the LIVE form keeps its window — the redaction builds the stored copy and ⛔ mutates what it was given
    expect((input[0]!.memberLink as { namePending?: true }).namePending).toBe(true)
    expect((input[0]!.memberLink as { savedName: string | null }).savedName).toBe('Ravi')
  })

  it('the session epoch moves on every clear — a match call that started before it is ⛔ stored after it', () => {
    const before = nomineeLinkSessionEpoch()
    clearNomineeLinkSession()
    expect(nomineeLinkSessionEpoch()).toBe(before + 1)
    clearNomineeLinkSession()
    expect(nomineeLinkSessionEpoch()).toBe(before + 2)
  })
})

describe('a pick made before the name is COMPLETED by the name typed next (fix-diff review 2026-10-24)', () => {
  const picked: FormMark = { kind: 'new', mobile: '+919876500002', foundBy: 'contacts', savedName: 'Ravi' }
  /** The slot after a pick on an EMPTY form: no name, the offered number, the mark confirmed for exactly that. */
  const afterPick = () => applyPick([{ ...slot(null), name: '', mobile: '' }], 1, picked)[0]!
  /** One keystroke into the name field, as the form applies it. */
  const typeName = (before: ReturnType<typeof afterPick>, name: string) => completeMarkName(before, { ...before, name })

  it('a pick on a NAMELESS slot is marked `namePending`; one on a named slot, and a KEEP, are ⛔', () => {
    expect((afterPick().memberLink as { namePending?: true }).namePending).toBe(true)
    const named = applyPick([slot(null)], 1, picked)[0]!
    expect((named.memberLink as { namePending?: true }).namePending).toBeUndefined()
  })

  it('the whole name asks ⛔ — letter by letter, however far it extends; the member made the mark seconds ago', () => {
    let slotNow = afterPick()
    expect(markNeedsQuestion(slotNow)).toBe(false)
    for (const typed of ['A', 'As', 'Ash', 'Asha', 'Asha ', 'Asha D', 'Asha Devi']) {
      slotNow = typeName(slotNow, typed)
      expect(markNeedsQuestion(slotNow), typed).toBe(false)
    }
  })

  it('⭐ round 4 — ANY shortening asks, ⛔ only a result that is no longer a prefix: edits arrive one keystroke at a time, so "Asha" → "A" → "Anil" passed every step', () => {
    const typed = typeName(afterPick(), 'Asha')
    // a backspace (a typo fixed) — the cost, recorded: one question
    expect(markNeedsQuestion(typeName(typed, 'Ash'))).toBe(true)
    // select-all and ONE letter over it: "a" is a prefix of "asha"
    const overtyped = typeName(typed, 'A')
    expect(markNeedsQuestion(overtyped)).toBe(true)
    // … and the keystrokes that follow do ⛔ swallow the question (a question open stays open)
    expect(markNeedsQuestion(typeName(overtyped, 'An'))).toBe(true)
    expect(markNeedsQuestion(typeName(typeName(overtyped, 'An'), 'Anil'))).toBe(true)
    // the member answers *Keep the mark*: the window closes (a name exists), and the next edit asks as always
    const kept = acceptMark(overtyped)
    expect(markNeedsQuestion(kept)).toBe(false)
    expect(markNeedsQuestion(typeName(kept, 'Anil'))).toBe(true)
  })

  it('⭐ round 3 — a name REPLACED by a different one, or CLEARED outright, asks: the window is for COMPLETING the name, ⛔ choosing another person', () => {
    const typed = typeName(afterPick(), 'Asha')
    expect(markNeedsQuestion(typed)).toBe(false)
    // select-all + paste: one edit from "Asha" to a different name
    expect(markNeedsQuestion(typeName(typed, 'Ravi Kumar'))).toBe(true)
    // select-all + a single letter over it
    expect(markNeedsQuestion(typeName(typed, 'R'))).toBe(true)
    // the whole name deleted (the way to type another one)
    const cleared = typeName(typed, '')
    expect(markNeedsQuestion(cleared)).toBe(true)
    // … and the member who answers *Keep the mark* on a still-NAMELESS slot has not yet been asked about the name
    const kept = acceptMark(cleared)
    expect(markNeedsQuestion(kept)).toBe(false)
    expect((kept.memberLink as { namePending?: true }).namePending).toBe(true)
    expect(markNeedsQuestion(typeName(kept, 'A'))).toBe(false) // the first letter completes, ⛔ asks
    // … but once a name exists, *Keep the mark* closes the window
    const keptNamed = acceptMark(typeName(kept, 'Asha'))
    expect((keptNamed.memberLink as { namePending?: true }).namePending).toBeUndefined()
  })

  it('an edit of the MOBILE asks — and while that question is open the name completes ⛔; the member\'s own answer closes the window', () => {
    const named = typeName(afterPick(), 'Asha')
    const edited = { ...named, mobile: '9000000000' } // the form applies a non-name edit as is
    expect(markNeedsQuestion(edited)).toBe(true)
    const stillAsked = typeName(edited, 'Ashaa') // a name keystroke while the question is open does NOT swallow it
    expect(markNeedsQuestion(stillAsked)).toBe(true)
    const accepted = acceptMark(stillAsked)
    expect(markNeedsQuestion(accepted)).toBe(false)
    expect((accepted.memberLink as { namePending?: true }).namePending).toBeUndefined() // closed: the name now ASKS
    expect(markNeedsQuestion(typeName(accepted, 'Ashaab'))).toBe(true)
  })

  it('⛔ completes anything else: a pick on a NAMED slot, a KEEP', () => {
    const named = applyPick([slot(null)], 1, picked)[0]!
    expect(markNeedsQuestion(completeMarkName(named, { ...named, name: 'Asha Devix' }))).toBe(true)
    const keep = slot({ kind: 'keep', linkId: L1, label: 'confirmed', name: 'Meena K.', confirmedFor: slotFingerprint({ name: '', mobile: '' }) })
    const emptyKeep = { ...keep, name: '', mobile: '' }
    expect(markNeedsQuestion(completeMarkName(emptyKeep, { ...emptyKeep, name: 'A' }))).toBe(true) // a KEEP is asked: it may be someone else
  })
})

describe('a request row shows the answer the server RECORDED (fix-diff review 2026-10-24, round 3)', () => {
  it('the list\'s answer wins; else the one the server recorded for the answer just given; else open', () => {
    expect(shownRequestAnswer(null, undefined)).toBeNull()
    expect(shownRequestAnswer(null, 'confirmed')).toBe('confirmed')
    expect(shownRequestAnswer(null, 'not_me')).toBe('not_me')
    expect(shownRequestAnswer('not_me', 'confirmed')).toBe('not_me') // the list has caught up — it is the record
    expect(shownRequestAnswer('confirmed', undefined)).toBe('confirmed')
  })

  it('the cached requests mark ONE request answered (every page, ⛔ the others); an absent cache stays absent', () => {
    const row = (linkId: string, answer: 'confirmed' | 'not_me' | null) => ({ linkId, answer, name: 'x' })
    const data = { pages: [{ items: [row('a', null), row('b', null)] }, { items: [row('c', 'confirmed')] }, { items: [] as ReturnType<typeof row>[], denied: true }], pageParams: [undefined, 'c1', 'c2'] }
    const out = withRequestAnswered(data, 'b', 'not_me')!
    expect(out.pages.map((p) => p.items.map((i) => i.answer))).toEqual([[null, 'not_me'], ['confirmed'], []])
    expect(out.pageParams).toEqual(data.pageParams) // the rest of the cache shape is untouched
    expect(data.pages[0]!.items[1]!.answer).toBeNull() // ⛔ mutated in place
    expect(withRequestAnswered(undefined, 'b', 'confirmed')).toBeUndefined()
  })
})

// Story 6.36f (Task 4; MK3, MK5, MK8; `2026-10-26-407`) — the marks-only MODE's pure logic: the record it starts from, "a mark
// differs", the body it sends (each entry its own `rank` + the `versionNo` the phone saw), the pick, and when the entry card shows.
describe('Story 6.36f — the marks-only mode', () => {
  const ranks = [
    { rank: 1 as const, versionNo: 3, relationship: 'spouse' as const },
    { rank: 2 as const, versionNo: 1, relationship: 'son' as const },
  ]
  const pickNew = (mobile: string): FormMark => ({ kind: 'new', mobile, foundBy: 'picker', savedName: 'Meena' })

  it('initialMarks — one entry per occupied rank: its live mark as a `keep`, else `null` (⛔ an entry for a rank without a basis)', () => {
    const rec = initialMarks({ ranks, links: [link(2, L2, 'confirmed', 'Ravi K.')] })
    expect(rec[1]).toBeNull()
    expect(rec[2]).toMatchObject({ kind: 'keep', linkId: L2, label: 'confirmed', name: 'Ravi K.' })
    expect(Object.keys(initialMarks({ ranks: [ranks[0]!], links: [link(2, L2)] }))).toEqual(['1'])
  })

  it('marksDiffer — an UNTOUCHED record cannot save; a removal, a new pick and a different keep each differ', () => {
    const start = initialMarks({ ranks, links: [link(1, L1)] })
    expect(marksDiffer(start, start)).toBe(false)
    expect(marksDiffer(start, { ...start })).toBe(false)
    expect(marksDiffer(start, { ...start, 1: { kind: 'keep', linkId: L1.toUpperCase(), label: 'asked', name: null } })).toBe(false)
    expect(marksDiffer(start, { ...start, 1: null })).toBe(true)
    expect(marksDiffer(start, { ...start, 2: pickNew('9876543210') })).toBe(true)
    expect(marksDiffer(start, { ...start, 1: { kind: 'keep', linkId: L2, label: 'asked', name: null } })).toBe(true)
  })

  it('buildMarksBody — each entry carries its OWN rank and the versionNo the phone saw; a removal sends `memberLink: null`; ⛔ a detail', () => {
    const body = buildMarksBody(ranks, { 1: null, 2: { kind: 'keep', linkId: L2, label: 'asked', name: 'shown only' } })
    expect(body).toEqual({
      marks: [
        { rank: 1, versionNo: 3, memberLink: null },
        { rank: 2, versionNo: 1, memberLink: { kind: 'keep', linkId: L2 } },
      ],
    })
    expect(JSON.stringify(body)).not.toMatch(/shown only|spouse|son/) // ⛔ a name or relationship leaves the phone
  })

  it('a SWAP is two `new` picks (⛔ a "move" control) — the body sends two `new`s, each on its own rank', () => {
    const body = buildMarksBody(ranks, { 1: pickNew('9000000002'), 2: pickNew('9000000001') })
    expect(body.marks.map((m) => [m.rank, m.memberLink?.kind, m.memberLink?.kind === 'new' ? m.memberLink.mobile : null])).toEqual([
      [1, 'new', '9000000002'],
      [2, 'new', '9000000001'],
    ])
  })

  it('applyMarksPick — the pick lands on its rank\'s entry (⛔ slot-shaped: ⛔ a mobile filled, ⛔ a name window); a rank without an entry is dropped', () => {
    const start = initialMarks({ ranks: [ranks[0]!], links: [] })
    const picked = applyMarksPick(start, 1, pickNew('9876543210'))
    expect(picked[1]).toEqual(pickNew('9876543210'))
    expect(applyMarksPick(start, 2, pickNew('9876543210'))).toBe(start)
  })

  it('marksEntryVisible — ONLY with a saved declaration, every rank a basis, ⛔ locked, ⛔ a failed status, and (a live mark OR may find)', () => {
    const ok = { nominees: 2, statusError: false, locked: false, ranks: 2, liveMarks: 0, canFind: true }
    expect(marksEntryVisible(ok)).toBe(true)
    expect(marksEntryVisible({ ...ok, canFind: false, liveMarks: 1 })).toBe(true)
    expect(marksEntryVisible({ ...ok, canFind: false })).toBe(false) // an `active-in-grace` member with ⛔ mark
    expect(marksEntryVisible({ ...ok, nominees: 0, ranks: 0 })).toBe(false)
    expect(marksEntryVisible({ ...ok, nominees: undefined })).toBe(false)
    expect(marksEntryVisible({ ...ok, ranks: 1 })).toBe(false) // a rank with ⛔ basis (pre-0119 data)
    expect(marksEntryVisible({ ...ok, ranks: undefined })).toBe(false)
    expect(marksEntryVisible({ ...ok, locked: true })).toBe(false)
    expect(marksEntryVisible({ ...ok, statusError: true })).toBe(false)
  })

  it('the two refusals have their own words', () => {
    expect(saveRefusalCopyKey('nominee.marks_stale')).toBe('save.marks_stale')
    expect(saveRefusalCopyKey('nominee.marks_no_declaration')).toBe('save.marks_no_declaration')
  })
})
