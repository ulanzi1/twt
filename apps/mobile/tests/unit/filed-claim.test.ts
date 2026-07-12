// Filed-claim pointer + offline shepherd cache unit tests (Story 6.12, Task 8; AC3 / R3).
//
// The PURE-LOGIC half of the mobile shepherd work (the <ShepherdContactCard> mount itself has no RN render
// harness in this repo — see vitest.config.ts). Covers the persistent post-filing pointer the home-surface
// entry reads (R3) + the offline read-only cache of the last successful shepherd read. react-native-mmkv
// is a NATIVE module, so we mock it with an in-memory store — the store's pure set/get/cache logic is under test.

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

import {
  cacheShepherd,
  clearCachedShepherd,
  getFiledClaimCaseId,
  loadCachedShepherd,
  setFiledClaimCaseId,
} from '../../lib/filed-claim'

const MEMBER_A = 'member-aaaa'
const MEMBER_B = 'member-bbbb'
const CLAIM_1 = 'claim-1111'

describe('filed-claim pointer (R3 persistent post-filing entry)', () => {
  it('returns null before any claim is filed', () => {
    expect(getFiledClaimCaseId('member-never-filed')).toBeNull()
  })

  it('stamps + reads back the filed claim id per member (no cross-member leakage)', () => {
    setFiledClaimCaseId(MEMBER_A, CLAIM_1)
    expect(getFiledClaimCaseId(MEMBER_A)).toBe(CLAIM_1)
    expect(getFiledClaimCaseId(MEMBER_B)).toBeNull()
  })
})

describe('offline shepherd cache (AC3 read-only cached view)', () => {
  beforeEach(() => {
    // Overwrite with a fresh value each run — the mock store persists across tests in one file.
  })

  it('returns null when nothing is cached', () => {
    expect(loadCachedShepherd('claim-uncached')).toBeNull()
  })

  it('round-trips an assigned shepherd read for the offline fallback', () => {
    const assigned = {
      status: 'assigned' as const,
      display_name: 'Anita Sharma',
      role_label: 'District Admin',
      contact: { phone: '+919000000001', whatsapp: null },
    }
    cacheShepherd(CLAIM_1, assigned)
    expect(loadCachedShepherd(CLAIM_1)).toEqual(assigned)
  })

  it('round-trips the not_assigned state', () => {
    cacheShepherd('claim-2222', { status: 'not_assigned' })
    expect(loadCachedShepherd('claim-2222')).toEqual({ status: 'not_assigned' })
  })

  it('clearCachedShepherd drops a cached read (Review Finding — never serve stale data past a genuine 403/404)', () => {
    cacheShepherd('claim-3333', { status: 'not_assigned' })
    expect(loadCachedShepherd('claim-3333')).not.toBeNull()
    clearCachedShepherd('claim-3333')
    expect(loadCachedShepherd('claim-3333')).toBeNull()
  })

  it('clearCachedShepherd is a no-op (never throws) when nothing was cached', () => {
    expect(() => clearCachedShepherd('claim-never-cached')).not.toThrow()
  })
})
