// Pool-onboarding first-entry gate unit tests (Story 7.10, Task 2; AC2/AC4).
//
// The gate is the AUTHORITATIVE, offline-resilient suppressor: fresh state → the tutorial should
// auto-show; after a complete OR a skip → it must never auto-show again. react-native-mmkv is a NATIVE
// module, so we mock it with an in-memory store (the claim-draft.test.ts precedent) — the gate's pure
// seen-state logic is what's under test (there is no RN component-render harness in this repo).

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

import { mmkvStorage } from '../../lib/mmkv'
import {
  POOL_ONBOARDING_SEEN_KEY,
  getPoolOnboardingOutcome,
  hasSeenPoolOnboarding,
  markPoolOnboardingCompleted,
  markPoolOnboardingSkipped,
} from '../../components/pool-onboarding/pool-onboarding-gate'

describe('pool-onboarding-gate', () => {
  beforeEach(() => {
    // Reset the mocked store between tests.
    mmkvStorage.removeItem(POOL_ONBOARDING_SEEN_KEY)
  })

  it('fresh state → not seen (tutorial should auto-show)', () => {
    expect(hasSeenPoolOnboarding()).toBe(false)
    expect(getPoolOnboardingOutcome()).toBeNull()
  })

  it('after completing → seen, outcome recorded as completed (auto-launch suppressed)', () => {
    markPoolOnboardingCompleted()
    expect(hasSeenPoolOnboarding()).toBe(true)
    expect(getPoolOnboardingOutcome()).toBe('completed')
  })

  it('after skipping → seen, outcome recorded as skipped (skipping is permitted; also suppresses)', () => {
    markPoolOnboardingSkipped()
    expect(hasSeenPoolOnboarding()).toBe(true)
    expect(getPoolOnboardingOutcome()).toBe('skipped')
  })

  it('a later completion overwrites a prior skip (re-view then finish still records completed)', () => {
    markPoolOnboardingSkipped()
    markPoolOnboardingCompleted()
    expect(getPoolOnboardingOutcome()).toBe('completed')
  })

  it('the seen key is versioned (v1) so a future rewrite can re-show by bumping the suffix', () => {
    expect(POOL_ONBOARDING_SEEN_KEY).toBe('pool-onboarding.completed.v1')
    // A different-version key is independent seen-state (a bump re-shows without touching the old flag).
    markPoolOnboardingCompleted()
    expect(mmkvStorage.getItem('pool-onboarding.completed.v2')).toBeNull()
    expect(mmkvStorage.getItem(POOL_ONBOARDING_SEEN_KEY)).toBe('completed')
  })

  it('an unrecognized stored value reads back as null outcome (defensive)', () => {
    mmkvStorage.setItem(POOL_ONBOARDING_SEEN_KEY, 'garbage')
    // hasSeen keys on presence; outcome is strict about the known values.
    expect(hasSeenPoolOnboarding()).toBe(true)
    expect(getPoolOnboardingOutcome()).toBeNull()
  })
})
