// Story 6.36b (Task 4) — the contacts READS with `expo-contacts` mocked (the `vi.hoisted` shape of
// `peer-questionnaire-render.test.ts`): the permission prompt FIRST; on granted (or iOS 18 limited) ONLY the numbers and
// names are read; denied ⇒ ⛔ read; the iOS picker returns ONE contact; the access picker's failure is swallowed.

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  isAvailableAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  getContactsAsync: vi.fn(),
  presentContactPickerAsync: vi.fn(),
  presentAccessPickerAsync: vi.fn(),
}))

vi.mock('expo-contacts', () => ({
  ...mock,
  Fields: { PhoneNumbers: 'phoneNumbers', Name: 'name' },
}))

import { pickOneContact, readContactsForMatching, shareMoreContacts } from '../../lib/known-people-contacts'

beforeEach(() => {
  for (const fn of Object.values(mock)) fn.mockReset()
  mock.isAvailableAsync.mockResolvedValue(true)
})

describe('readContactsForMatching', () => {
  it('granted ⇒ reads ONLY phone numbers + names, normalised and de-duplicated', async () => {
    mock.requestPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true, accessPrivileges: 'all' })
    mock.getContactsAsync.mockResolvedValue({
      data: [{ id: '1', name: 'Meena', phoneNumbers: [{ number: '+91 98765 43210' }, { number: '09876543210' }] }],
      hasNextPage: false,
    })
    const r = await readContactsForMatching()
    expect(mock.getContactsAsync).toHaveBeenCalledWith({ fields: ['phoneNumbers', 'name'] })
    expect(r).toEqual({ kind: 'read', access: 'all', prepared: { checked: [{ key: '+919876543210', savedName: 'Meena', number: '+919876543210' }], truncated: false } })
  })

  it('iOS 18 limited ⇒ reads the shared contacts and says so', async () => {
    mock.requestPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true, accessPrivileges: 'limited' })
    mock.getContactsAsync.mockResolvedValue({ data: [], hasNextPage: false })
    expect(await readContactsForMatching()).toMatchObject({ kind: 'read', access: 'limited' })
  })

  it('denied ⇒ ⛔ contacts are read', async () => {
    mock.requestPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false, canAskAgain: false })
    expect(await readContactsForMatching()).toEqual({ kind: 'denied' })
    expect(mock.getContactsAsync).not.toHaveBeenCalled()
  })

  it('unavailable ⇒ ⛔ prompt', async () => {
    mock.isAvailableAsync.mockResolvedValue(false)
    expect(await readContactsForMatching()).toEqual({ kind: 'unavailable' })
    expect(mock.requestPermissionsAsync).not.toHaveBeenCalled()
  })
})

describe('the iOS pickers', () => {
  it('pickOneContact: ONE contact, its numbers; a cancel ⇒ null', async () => {
    mock.presentContactPickerAsync.mockResolvedValueOnce({ id: '9', name: 'Ravi', phoneNumbers: [{ number: '7012345678' }] })
    expect(await pickOneContact()).toEqual({ checked: [{ key: '+917012345678', savedName: 'Ravi', number: '+917012345678' }], truncated: false })
    mock.presentContactPickerAsync.mockResolvedValueOnce(null)
    expect(await pickOneContact()).toBeNull()
    expect(mock.requestPermissionsAsync).not.toHaveBeenCalled()
  })

  it('shareMoreContacts: a rejection (Android, iOS < 18) resolves false', async () => {
    mock.presentAccessPickerAsync.mockRejectedValueOnce(new Error('unsupported'))
    expect(await shareMoreContacts()).toBe(false)
    mock.presentAccessPickerAsync.mockResolvedValueOnce(['c1'])
    expect(await shareMoreContacts()).toBe(true)
  })

  it('shareMoreContacts: a picker that shared NOTHING new (cancelled) resolves false — ⛔ a re-check (review round 2, P5)', async () => {
    mock.presentAccessPickerAsync.mockResolvedValueOnce([])
    expect(await shareMoreContacts()).toBe(false)
  })
})
