// PURE claim-entry redirect decision — Story 6.21b (`-249` §2; Task 2; BW-B2). All FIVE
// `ClaimEntryReadOutcome` inputs, plus the "no pointer" / "never fetched" cases.

import { afterEach, describe, expect, it, vi } from 'vitest'

import { boundClaimEntryRead, resolveClaimEntryDecision, type ClaimEntryReadOutcome } from '../../lib/claim-entry-gate'

describe('resolveClaimEntryDecision', () => {
  it('no filed-claim pointer ⇒ wizard, regardless of outcome', () => {
    expect(resolveClaimEntryDecision(false, { kind: 'live' })).toEqual({ kind: 'wizard' })
    expect(resolveClaimEntryDecision(false, null)).toEqual({ kind: 'wizard' })
  })

  it('a pointer exists but was never fetched (outcome null) ⇒ wizard', () => {
    expect(resolveClaimEntryDecision(true, null)).toEqual({ kind: 'wizard' })
  })

  it('a pointer + a LIVE read ⇒ shepherd (the only redirect case)', () => {
    expect(resolveClaimEntryDecision(true, { kind: 'live' })).toEqual({ kind: 'shepherd' })
  })

  const fallThrough: ClaimEntryReadOutcome[] = [
    { kind: 'terminal' },
    { kind: 'offline' },
    { kind: 'error' },
    { kind: 'not_found' },
  ]
  for (const outcome of fallThrough) {
    it(`a pointer + ${outcome.kind} ⇒ wizard, UNCHANGED (never traps a -239 (b) refile)`, () => {
      expect(resolveClaimEntryDecision(true, outcome)).toEqual({ kind: 'wizard' })
    })
  }
})

describe('boundClaimEntryRead — a stalled read never holds the claim entry (code review 2026-09-27)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('a read that never settles resolves `offline` after the bound ⇒ the wizard, unchanged', async () => {
    vi.useFakeTimers()
    const bounded = boundClaimEntryRead(new Promise<ClaimEntryReadOutcome>(() => undefined), 5000)
    await vi.advanceTimersByTimeAsync(5000)
    const outcome = await bounded
    expect(outcome).toEqual({ kind: 'offline' })
    expect(resolveClaimEntryDecision(true, outcome)).toEqual({ kind: 'wizard' })
  })

  it('a read that settles in time wins (positive control)', async () => {
    await expect(boundClaimEntryRead(Promise.resolve({ kind: 'live' }), 5000)).resolves.toEqual({ kind: 'live' })
  })
})
