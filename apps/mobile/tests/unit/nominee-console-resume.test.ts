// Nominee Console save-and-resume (UX-DR50) unit tests (Story 9.1, Task 4/5). react-native-mmkv is a
// NATIVE module, so we mock it with an in-memory store (the pool-onboarding-gate.test.ts precedent) — the
// store's pure save/restore logic is what's under test (no RN component-render harness in this repo).

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
  acknowledgeNomineeConsoleIntro,
  loadNomineeConsoleResume,
  nomineeConsoleResumeKey,
  recordNomineeConsoleVisit,
  saveNomineeConsoleResume,
} from '../../components/nominee-console/console-resume'

const POOL = 'P-2026-07-001'

describe('nominee-console save-and-resume', () => {
  beforeEach(() => {
    mmkvStorage.removeItem(nomineeConsoleResumeKey(POOL))
  })

  it('fresh state → never-visited default (introAcknowledged false, lastVisitedIso null)', () => {
    expect(loadNomineeConsoleResume(POOL)).toEqual({ introAcknowledged: false, lastVisitedIso: null })
  })

  it('recording a visit persists lastVisitedIso and returns the PRIOR state (welcome-back seam)', () => {
    const priorFirst = recordNomineeConsoleVisit(POOL, '2026-07-03T09:00:00.000Z')
    // First visit: prior was the never-visited default.
    expect(priorFirst.lastVisitedIso).toBeNull()
    expect(loadNomineeConsoleResume(POOL).lastVisitedIso).toBe('2026-07-03T09:00:00.000Z')

    // Second visit: prior now reflects the first visit's stamp (restore-on-return).
    const priorSecond = recordNomineeConsoleVisit(POOL, '2026-07-04T09:00:00.000Z')
    expect(priorSecond.lastVisitedIso).toBe('2026-07-03T09:00:00.000Z')
    expect(loadNomineeConsoleResume(POOL).lastVisitedIso).toBe('2026-07-04T09:00:00.000Z')
  })

  it('acknowledging the intro persists across reloads, preserving lastVisitedIso', () => {
    recordNomineeConsoleVisit(POOL, '2026-07-03T09:00:00.000Z')
    acknowledgeNomineeConsoleIntro(POOL)
    const state = loadNomineeConsoleResume(POOL)
    expect(state.introAcknowledged).toBe(true)
    expect(state.lastVisitedIso).toBe('2026-07-03T09:00:00.000Z')
  })

  it('is per-pool — resuming one pool does not leak into another', () => {
    recordNomineeConsoleVisit(POOL, '2026-07-03T09:00:00.000Z')
    expect(loadNomineeConsoleResume('P-2026-07-002')).toEqual({ introAcknowledged: false, lastVisitedIso: null })
  })

  it('the key is versioned (v1) + pool-scoped', () => {
    expect(nomineeConsoleResumeKey(POOL)).toBe('nominee-console.resume.v1.P-2026-07-001')
  })

  it('a corrupt stored value fails soft to the default (never an error wall for a bereaved nominee)', () => {
    mmkvStorage.setItem(nomineeConsoleResumeKey(POOL), '{ not valid json')
    expect(loadNomineeConsoleResume(POOL)).toEqual({ introAcknowledged: false, lastVisitedIso: null })
  })

  it('a partial stored value coerces missing fields to the default', () => {
    saveNomineeConsoleResume(POOL, { introAcknowledged: true, lastVisitedIso: null })
    mmkvStorage.setItem(nomineeConsoleResumeKey(POOL), JSON.stringify({ introAcknowledged: true }))
    expect(loadNomineeConsoleResume(POOL)).toEqual({ introAcknowledged: true, lastVisitedIso: null })
  })
})
