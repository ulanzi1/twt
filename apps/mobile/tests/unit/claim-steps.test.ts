// Claim step-order unit tests (Story 6.2, Task 9; AC6).
//
// The ordered flow drives the "Step N of M" progress + the reserved 6.9 consent slot. These lock
// the epic-AC order (handover-trust BEFORE the intake-emitting relationship step) + the progress math.

import { describe, expect, it } from 'vitest'

import { CLAIM_STEPS, claimStepProgress, nextClaimStep } from '../../lib/claim-steps'

describe('claim-steps', () => {
  it('orders handover-trust BEFORE the freeze-firing relationship step (epic AC, not the UX diagram)', () => {
    const otpIdx = CLAIM_STEPS.indexOf('handover-otp')
    const relIdx = CLAIM_STEPS.indexOf('relationship')
    expect(otpIdx).toBeGreaterThanOrEqual(0)
    expect(otpIdx).toBeLessThan(relIdx)
  })

  it('runs relationship (intake) → document → nominee-review → acknowledgement', () => {
    expect([...CLAIM_STEPS]).toEqual([
      'handover-otp',
      'relationship',
      'document',
      'nominee-review',
      'acknowledgement',
    ])
  })

  it('claimStepProgress gives 1-based position + total for a step', () => {
    expect(claimStepProgress('handover-otp')).toEqual({ current: 1, total: 5 })
    expect(claimStepProgress('acknowledgement')).toEqual({ current: 5, total: 5 })
  })

  it('claimStepProgress returns current:1 for the entry gate (a non-step segment)', () => {
    expect(claimStepProgress('index')).toEqual({ current: 1, total: 5 })
  })

  it('nextClaimStep returns the following step, and undefined past the last step (resume support)', () => {
    expect(nextClaimStep('handover-otp')).toBe('relationship')
    expect(nextClaimStep('relationship')).toBe('document')
    expect(nextClaimStep('document')).toBe('nominee-review')
    expect(nextClaimStep('nominee-review')).toBe('acknowledgement')
    expect(nextClaimStep('acknowledgement')).toBeUndefined()
  })
})
