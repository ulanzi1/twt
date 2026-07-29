// Helpdesk save-and-resume draft unit tests (Story 10.2, Task 8; AC1/AC4).
//
// The dignified filing flow restores in-progress text on re-entry and clears it on submit, keyed per
// member (no cross-account leakage). react-native-mmkv is a NATIVE module, so we mock it with an
// in-memory store — the draft store's pure save/merge/load/clear logic is what's under test (the
// claim-draft.test.ts precedent).

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the native MMKV module BEFORE lib/mmkv (which calls createMMKV at load) is imported.
vi.mock('react-native-mmkv', () => {
  const store = new Map<string, string>()
  return {
    createMMKV: () => ({
      getString: (k: string): string | undefined => store.get(k),
      set: (k: string, v: string): void => {
        store.set(k, v)
      },
      remove: (k: string): void => {
        store.delete(k)
      },
    }),
  }
})

import { clearHelpdeskDraft, loadHelpdeskDraft, saveHelpdeskDraft } from '../../lib/helpdesk-draft'

const MEMBER_A = 'member-aaaa'
const MEMBER_B = 'member-bbbb'

describe('helpdesk-draft', () => {
  beforeEach(() => {
    clearHelpdeskDraft(MEMBER_A)
    clearHelpdeskDraft(MEMBER_B)
  })

  it('returns an empty draft when none exists', () => {
    expect(loadHelpdeskDraft(MEMBER_A)).toEqual({})
  })

  it('merges partial updates and restores them on re-entry (save-and-resume)', () => {
    saveHelpdeskDraft(MEMBER_A, { category: 'kyc-trouble' })
    saveHelpdeskDraft(MEMBER_A, { subject: 'Photo fails' })
    saveHelpdeskDraft(MEMBER_A, { body: 'It will not verify.' })
    expect(loadHelpdeskDraft(MEMBER_A)).toEqual({
      category: 'kyc-trouble',
      subject: 'Photo fails',
      body: 'It will not verify.',
    })
  })

  it('keeps drafts isolated per member (no cross-account leakage)', () => {
    saveHelpdeskDraft(MEMBER_A, { subject: 'A only' })
    expect(loadHelpdeskDraft(MEMBER_B)).toEqual({})
  })

  it('clears the draft on submit', () => {
    saveHelpdeskDraft(MEMBER_A, { subject: 'Draft' })
    clearHelpdeskDraft(MEMBER_A)
    expect(loadHelpdeskDraft(MEMBER_A)).toEqual({})
  })
})
