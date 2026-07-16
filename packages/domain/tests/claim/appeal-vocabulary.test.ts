// Appeal vocabulary unit tests — Story 6.16 (Task 11). Pure, no DB.
//
// The FROZEN Stage-2 tie rule (AC3 — the burden of persuasion): `computeAppealOutcome` reverses ONLY on a
// strict reverse-majority over the PANEL SIZE (`reverse_count ≥ ⌊N/2⌋+1`); a tie or any quorum-met
// sub-majority advances; abstention-by-non-voting counts AGAINST reversal. Tested across odd/even sizes.
// Plus the ciphertext-boundary brand + the SLA-config default shape.

import { describe, expect, it } from 'vitest'

import {
  AppealCiphertextStorageError,
  APPEAL_PANEL_MIN_MEMBERS,
  appealQuorumFor,
  computeAppealOutcome,
  DEFAULT_APPEAL_STAGE_SLA_DAYS,
  prepareAppealCiphertext,
} from '../../src/claim/appeal.js'

const votes = (r: number, d: number) => [
  ...Array.from({ length: r }, () => ({ vote: 'reverse' as const })),
  ...Array.from({ length: d }, () => ({ vote: 'deny' as const })),
]

describe('computeAppealOutcome — the FROZEN tie rule (AC3)', () => {
  it('reverses ONLY on a strict reverse-majority over the panel size (odd panels)', () => {
    // N=3 → threshold ⌊3/2⌋+1 = 2.
    expect(computeAppealOutcome(votes(2, 1), 3).outcome).toBe('reversed')
    expect(computeAppealOutcome(votes(1, 2), 3).outcome).toBe('advance')
    // N=5 → threshold 3.
    expect(computeAppealOutcome(votes(3, 2), 5).outcome).toBe('reversed')
    expect(computeAppealOutcome(votes(2, 3), 5).outcome).toBe('advance')
  })

  it('an exact tie on an EVEN panel advances (a tie never reverses)', () => {
    // N=4 → threshold ⌊4/2⌋+1 = 3. A 2/2 tie is a sub-majority → advance.
    expect(computeAppealOutcome(votes(2, 2), 4).outcome).toBe('advance')
    // N=2 → threshold 2. A 1/1 tie → advance; a 2/0 sweep → reversed.
    expect(computeAppealOutcome(votes(1, 1), 2).outcome).toBe('advance')
    expect(computeAppealOutcome(votes(2, 0), 2).outcome).toBe('reversed')
  })

  it('abstention-by-non-voting counts AGAINST reversal (denominator is the panel size, not cast votes)', () => {
    // N=5, only 2 members vote reverse (a bare plurality of the cast, but NOT a panel-size majority) → advance.
    expect(computeAppealOutcome(votes(2, 0), 5).outcome).toBe('advance')
    // N=5, 3 reverse (a panel-size majority) even with 2 absent → reversed.
    expect(computeAppealOutcome(votes(3, 0), 5).outcome).toBe('reversed')
  })

  it('returns the honest tally alongside the outcome', () => {
    const r = computeAppealOutcome(votes(2, 1), 3)
    expect(r).toEqual({ outcome: 'reversed', reverse_count: 2, deny_count: 1 })
  })
})

describe('appealQuorumFor + bounds', () => {
  it('is a strict majority of the panel (⌊N/2⌋+1)', () => {
    expect(appealQuorumFor(2)).toBe(2)
    expect(appealQuorumFor(3)).toBe(2)
    expect(appealQuorumFor(4)).toBe(3)
    expect(appealQuorumFor(5)).toBe(3)
  })
  it('the panel minimum is 2 (D-B — stricter than R9)', () => {
    expect(APPEAL_PANEL_MIN_MEMBERS).toBe(2)
  })
})

describe('prepareAppealCiphertext — storage-safety boundary', () => {
  it('accepts a non-empty within-ceiling ciphertext', () => {
    expect(prepareAppealCiphertext('enc:v1:abc')).toBe('enc:v1:abc')
  })
  it('rejects an empty ciphertext', () => {
    expect(() => prepareAppealCiphertext('')).toThrow(AppealCiphertextStorageError)
  })
  it('rejects an oversized ciphertext', () => {
    expect(() => prepareAppealCiphertext('x'.repeat(9000))).toThrow(AppealCiphertextStorageError)
  })
})

describe('DEFAULT_APPEAL_STAGE_SLA_DAYS (D-H)', () => {
  it('has a per-stage duration for all three stages', () => {
    expect(DEFAULT_APPEAL_STAGE_SLA_DAYS.stage1).toBeGreaterThan(0)
    expect(DEFAULT_APPEAL_STAGE_SLA_DAYS.stage2).toBeGreaterThan(0)
    expect(DEFAULT_APPEAL_STAGE_SLA_DAYS.stage3).toBeGreaterThan(0)
  })
})
