// Save-and-resume claim-draft unit tests (Story 6.2, Task 9; AC6).
//
// The grief-paced flow must restore in-progress work on re-entry and clear it on submit, keyed per
// deceased member (no cross-account leakage). react-native-mmkv is a NATIVE module, so we mock it
// with an in-memory store — the draft store's pure save/merge/load/clear logic is what's under test.

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

import { clearClaimDraft, loadClaimDraft, saveClaimDraft } from '../../lib/claim-draft'

const MEMBER_A = 'member-aaaa'
const MEMBER_B = 'member-bbbb'

describe('claim-draft', () => {
  beforeEach(() => {
    clearClaimDraft(MEMBER_A)
    clearClaimDraft(MEMBER_B)
  })

  it('returns an empty draft when none exists', () => {
    expect(loadClaimDraft(MEMBER_A)).toEqual({})
  })

  it('merges partial updates and restores them on re-entry (save-and-resume)', () => {
    saveClaimDraft(MEMBER_A, { relationship: 'spouse' })
    saveClaimDraft(MEMBER_A, { documentStage: 'deferred', lastStep: 'document' })
    expect(loadClaimDraft(MEMBER_A)).toEqual({
      relationship: 'spouse',
      documentStage: 'deferred',
      lastStep: 'document',
    })
  })

  it('stamps the claimCaseId after intake so a resume skips the freeze-firing step', () => {
    saveClaimDraft(MEMBER_A, { relationship: 'child', claimCaseId: 'claim-1234' })
    expect(loadClaimDraft(MEMBER_A).claimCaseId).toBe('claim-1234')
  })

  it('is keyed per deceased member (no cross-account leakage)', () => {
    saveClaimDraft(MEMBER_A, { relationship: 'parent' })
    expect(loadClaimDraft(MEMBER_B)).toEqual({})
  })

  it('clears the draft on submit', () => {
    saveClaimDraft(MEMBER_A, { relationship: 'sibling' })
    clearClaimDraft(MEMBER_A)
    expect(loadClaimDraft(MEMBER_A)).toEqual({})
  })
})
