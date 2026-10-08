// PURE claim-entry redirect decision — Story 6.21b (`-249` §2; Task 2; BW-B2). All SIX
// `ClaimEntryReadOutcome` inputs (Story 6.19c added `refile_needs_confirmation`), plus the "no pointer" / "never
// fetched" cases.

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

  // ⭐ Story 6.19c (`-273` §9) — the ONE terminal claim that does ⛔ not fall through: closed for no response with ⛔ no
  // re-file confirmation. The server computes the bit (D19's guard); it is false once a confirmation is recorded (the
  // read is then `terminal` ⇒ the wizard) and once a new claim is live (the old pointer ⛔ never traps the family).
  it('a pointer + refile_needs_confirmation ⇒ the calm helpline state (⛔ the wizard, which would only 409)', () => {
    expect(resolveClaimEntryDecision(true, { kind: 'refile_needs_confirmation' })).toEqual({ kind: 'refile_helpline' })
  })

  it('after the confirmation is recorded (or consumed by a live new claim) the bit is false ⇒ the wizard again', () => {
    // The server's two answers once the guard no longer holds: the closed claim is plain `terminal`.
    expect(resolveClaimEntryDecision(true, { kind: 'terminal' })).toEqual({ kind: 'wizard' })
  })

  it('⭐ Story 6.24a — a pointer + a CLOSED claim ⇒ its calm helpline screen (⛔ not the wizard); ⛔ no pointer ⇒ the wizard', () => {
    expect(resolveClaimEntryDecision(true, { kind: 'closed' })).toEqual({ kind: 'closed_helpline' })
    expect(resolveClaimEntryDecision(false, { kind: 'closed' })).toEqual({ kind: 'wizard' })
  })

  it('no pointer ⇒ the wizard even for a guarded death (its submit maps the 409 to the same state)', () => {
    expect(resolveClaimEntryDecision(false, { kind: 'refile_needs_confirmation' })).toEqual({ kind: 'wizard' })
  })
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
