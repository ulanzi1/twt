// Story 6.36b (Task 4) — the people-who-know-me PURE logic: contacts → the ≤ 1,000 entries checked (normalised on the
// phone, de-duplicated); positions → matches and the invite list (⛔ ever a contact beyond those checked); the search
// over saved names; the slot arithmetic; the permission-state machine; the refusal codes and labels → copy keys; the
// saved-names store (⛔ another member's names; cleared).

import { describe, expect, it, vi } from 'vitest'

// The default storage is MMKV (a native module) — the tests pass their own in-memory store.
vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))

import {
  applyMatches,
  contactsAccessOf,
  fallbackFor,
  filterBySavedName,
  labelCopyKey,
  MATCH_MAX_NUMBERS,
  prepareContacts,
  refusalCopyKey,
  rowName,
  toggleSelection,
  type PhoneContact,
} from '../../lib/known-people'
import { clearSavedNames, loadSavedNames, pruneSavedNames, SAVED_NAMES_KEY, saveSavedName, type SyncStorage } from '../../lib/known-people-saved-names'

const contact = (name: string, ...numbers: string[]): PhoneContact => ({ name, phoneNumbers: numbers.map((number) => ({ number })) })

describe('prepareContacts', () => {
  it('normalises on the phone, keeps Indian mobiles, drops duplicates (the first saved name wins)', () => {
    const { checked, truncated } = prepareContacts([
      contact('Meena', '+91 98765 43210', '0802 345 678', '+1 555 0100'),
      contact('Meena (school)', '09876543210'),
      contact('Ravi', '0091 70123 45678'),
      contact('', '६०००००००००'),
      { name: 'No numbers' },
    ])
    expect(checked.map((c) => [c.savedName, c.number])).toEqual([
      ['Meena', '+919876543210'],
      ['Ravi', '+917012345678'],
      ['+916000000000', '+916000000000'], // ⛔ a saved name ⇒ the number stands in (⛔ rendered blank)
    ])
    expect(truncated).toBe(false)
  })

  it('at most 1,000 distinct mobiles; more ⇒ truncated (the screen says "We checked 1,000 of your contacts")', () => {
    const many = Array.from({ length: MATCH_MAX_NUMBERS + 5 }, (_, i) => contact(`C${i}`, `9${String(100000000 + i)}`))
    const { checked, truncated } = prepareContacts(many)
    expect(checked).toHaveLength(1000)
    expect(truncated).toBe(true)
  })
})

describe('applyMatches', () => {
  it('positions → the matched entries; the invite list is ONLY the checked non-matches', () => {
    const { checked } = prepareContacts([contact('A', '9000000001'), contact('B', '9000000002'), contact('C', '9000000003')])
    const { matched, notMatched } = applyMatches(checked, [1, 7, -1])
    expect(matched.map((m) => m.savedName)).toEqual(['B'])
    expect(notMatched.map((m) => m.savedName)).toEqual(['A', 'C'])
  })
})

describe('the search, the slots', () => {
  it('searches SAVED names, case- and accent-insensitively', () => {
    const { checked } = prepareContacts([contact('Meena Kumari', '9000000001'), contact('Ravi', '9000000002'), contact('Méera', '9000000003')])
    expect(filterBySavedName(checked, 'mee').map((c) => c.savedName)).toEqual(['Meena Kumari', 'Méera'])
    expect(filterBySavedName(checked, '  ')).toHaveLength(3)
  })

  it('ticks up to freeSlots; a tick beyond is refused; an untick always works', () => {
    let s = toggleSelection(new Set(), 'a', 2)
    s = toggleSelection(s, 'b', 2)
    expect([...toggleSelection(s, 'c', 2)]).toEqual(['a', 'b'])
    expect([...toggleSelection(s, 'a', 2)]).toEqual(['b'])
    expect([...toggleSelection(new Set(), 'a', 0)]).toEqual([])
  })
})

describe('the permission-state machine', () => {
  it('granted ⇒ all; iOS 18 limited ⇒ limited; anything else ⇒ denied', () => {
    expect(contactsAccessOf({ status: 'granted', granted: true, accessPrivileges: 'all' })).toBe('all')
    expect(contactsAccessOf({ status: 'granted', granted: true })).toBe('all')
    expect(contactsAccessOf({ status: 'granted', granted: true, accessPrivileges: 'limited' })).toBe('limited')
    expect(contactsAccessOf({ status: 'denied', granted: false })).toBe('denied')
    expect(contactsAccessOf({ status: 'undetermined', granted: false })).toBe('denied')
  })

  it('the fallback: iOS the system picker, Android (and anything else) a typed number', () => {
    expect(fallbackFor('ios')).toBe('picker')
    expect(fallbackFor('android')).toBe('typed')
    expect(fallbackFor('web')).toBe('typed')
  })
})

describe('copy keys and row names', () => {
  it('each refusal has its own message; an unknown code is generic', () => {
    const codes = ['daily_limit', 'monthly_limit', 'busy', 'not_a_member', 'self', 'cannot_ask_now', 'limit_reached', 'request_closed', 'not_available']
    for (const c of codes) expect(refusalCopyKey(`known_people.${c}`)).toBe(`error.${c}`)
    expect(refusalCopyKey('http.500')).toBe('error.generic')
    expect(refusalCopyKey(undefined)).toBe('error.generic')
    expect(labelCopyKey('not_accepted')).toBe('label.not_accepted')
  })

  it('accepted ⇒ the registered name; unavailable ⇒ ⛔ a name; asked / not_accepted ⇒ the SAVED name', () => {
    const fb = { saved: 'A person you asked', unavailable: 'Someone you named' }
    const saved = { l1: 'Meena (school)', l3: 'Ravi' }
    expect(rowName({ linkId: 'l1', label: 'asked', name: null }, saved, fb)).toBe('Meena (school)')
    expect(rowName({ linkId: 'l2', label: 'accepted', name: 'Meena K.' }, saved, fb)).toBe('Meena K.')
    expect(rowName({ linkId: 'l3', label: 'unavailable', name: null }, saved, fb)).toBe('Someone you named')
    expect(rowName({ linkId: 'l4', label: 'not_accepted', name: null }, saved, fb)).toBe('A person you asked')
  })
})

describe('the saved names (MMKV — ⛔ ever sent)', () => {
  const memory = (): SyncStorage & { map: Map<string, string> } => {
    const map = new Map<string, string>()
    return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) }
  }

  it('saved per link, read back for the SAME member only, pruned, cleared', () => {
    const s = memory()
    saveSavedName('m1', 'l1', 'Meena', s)
    saveSavedName('m1', 'l2', 'Ravi', s)
    expect(loadSavedNames('m1', s)).toEqual({ l1: 'Meena', l2: 'Ravi' })
    expect(loadSavedNames('m2', s)).toEqual({}) // another member on this phone reads nothing
    pruneSavedNames('m1', ['l2'], s)
    expect(loadSavedNames('m1', s)).toEqual({ l2: 'Ravi' })
    expect(s.map.has(SAVED_NAMES_KEY)).toBe(true)
    clearSavedNames(s)
    expect(s.map.has(SAVED_NAMES_KEY)).toBe(false)
  })

  it('a corrupt store reads as empty; a throwing store never throws', () => {
    const s = memory()
    s.map.set(SAVED_NAMES_KEY, '{not json')
    expect(loadSavedNames('m1', s)).toEqual({})
    const broken: SyncStorage = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') }, removeItem: () => { throw new Error('x') } }
    expect(() => saveSavedName('m1', 'l1', 'A', broken)).not.toThrow()
    expect(() => clearSavedNames(broken)).not.toThrow()
  })
})
