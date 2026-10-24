// Story 6.36e (Task 5; AC5; `2026-10-24-397` NE2, NE3, NE6) — the PURE logic of the mark flow (`lib/nominee-links.ts`):
//   · a slot's mark → the declare body's `memberLink` (a keep sends its link id ONLY; ⛔ the shown name or number label);
//   · V3 / TR9 — the slots reconciled with the marks read: a draft from BEFORE this story (⛔ `memberLink`) restores the rank's
//     live mark as a `keep` — ⛔ "no mark"; a removed mark stays removed; a stale keep takes the rank's current mark;
//   · each refusal → its own copy key; the request entry shows only while a mark is OPEN and ⛔ after a denial;
//   · the form session's memory: one set of matches for both ranks, a pick taken once, both dropped on clear.

import { describe, expect, it } from 'vitest'

import {
  answerRefusalCopyKey,
  applyPick,
  clearNomineeLinkSession,
  DENIED_NOMINEE_LINK_REQUESTS_PAGE,
  findRefusalCopyKey,
  flattenNomineeLinkPages,
  freshSlotCount,
  handNomineeLinkPick,
  markToSubmit,
  nomineeLinkEntryVisible,
  nomineeLinkSessionMatches,
  reconcileMarks,
  saveRefusalCopyKey,
  setNomineeLinkSessionMatches,
  takeNomineeLinkPick,
  type FormMark,
} from '../../lib/nominee-links'

const L1 = '11111111-1111-4111-8111-111111111111'
const L2 = '22222222-2222-4222-8222-222222222222'
const link = (rank: 1 | 2, linkId: string, label: 'asked' | 'confirmed' | 'not_me' = 'asked', name: string | null = null) => ({ rank, linkId, label, name })
const slot = (memberLink?: FormMark | null) => ({ name: 'Asha Devi', relationship: 'spouse', mobile: '9876543210', address: '', ...(memberLink === undefined ? {} : { memberLink }) })

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

  it('⭐ TR9 — a draft from before this story (⛔ memberLink) restores each rank\'s live mark as a KEEP — ⛔ "no mark"', () => {
    expect(reconcileMarks([slot(), slot()], links).map((f) => f.memberLink)).toEqual([
      { kind: 'keep', linkId: L1, label: 'confirmed', name: 'Meena K.' },
      { kind: 'keep', linkId: L2, label: 'asked', name: null },
    ])
  })

  it('a REMOVED mark stays removed; a new mark is kept; a live keep is refreshed (label / name)', () => {
    const fresh: FormMark = { kind: 'new', mobile: '+919876500001', foundBy: 'typed', savedName: null }
    const out = reconcileMarks([slot(null), slot(fresh)], links)
    expect(out[0]!.memberLink).toBeNull()
    expect(out[1]!.memberLink).toBe(fresh)
    expect(reconcileMarks([slot({ kind: 'keep', linkId: L1, label: 'asked', name: null })], links)[0]!.memberLink).toEqual({
      kind: 'keep',
      linkId: L1,
      label: 'confirmed',
      name: 'Meena K.',
    })
  })

  it('a STALE keep (⛔ live any more — after a 409) takes the rank\'s current mark, or ⛔ mark', () => {
    const stale: FormMark = { kind: 'keep', linkId: '99999999-9999-4999-8999-999999999999', label: 'asked', name: null }
    expect(reconcileMarks([slot(stale)], links)[0]!.memberLink).toMatchObject({ kind: 'keep', linkId: L1 })
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
    expect(applyPick([slot(null), slot(null)], 2, picked).map((f) => f.memberLink)).toEqual([null, picked])
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
})
