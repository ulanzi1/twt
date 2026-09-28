// Claim step-order unit tests (Story 6.2, Task 9; AC6).
//
// The ordered flow drives the "Step N of M" progress + the reserved 6.9 consent slot. These lock
// the epic-AC order (handover-trust BEFORE the intake-emitting relationship step) + the progress math.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CLAIM_STEPS, claimStepProgress, nextClaimStep } from '../../lib/claim-steps'

describe('claim-steps', () => {
  it('orders handover-trust BEFORE the freeze-firing relationship step (epic AC, not the UX diagram)', () => {
    const otpIdx = CLAIM_STEPS.indexOf('handover-otp')
    const relIdx = CLAIM_STEPS.indexOf('relationship')
    expect(otpIdx).toBeGreaterThanOrEqual(0)
    expect(otpIdx).toBeLessThan(relIdx)
  })

  it('runs relationship (intake) → consent → document → nominee-review → contact → acknowledgement (Story 6.19a)', () => {
    expect([...CLAIM_STEPS]).toEqual([
      'handover-otp',
      'relationship',
      'consent',
      'document',
      'nominee-review',
      'contact',
      'acknowledgement',
    ])
  })

  it('claimStepProgress gives 1-based position + total for a step', () => {
    expect(claimStepProgress('handover-otp')).toEqual({ current: 1, total: 7 })
    expect(claimStepProgress('contact')).toEqual({ current: 6, total: 7 })
    expect(claimStepProgress('acknowledgement')).toEqual({ current: 7, total: 7 })
  })

  it('claimStepProgress returns current:1 for the entry gate (a non-step segment)', () => {
    expect(claimStepProgress('index')).toEqual({ current: 1, total: 7 })
  })

  it('nextClaimStep returns the following step, and undefined past the last step (resume support)', () => {
    expect(nextClaimStep('handover-otp')).toBe('relationship')
    expect(nextClaimStep('relationship')).toBe('consent')
    expect(nextClaimStep('consent')).toBe('document')
    expect(nextClaimStep('document')).toBe('nominee-review')
    expect(nextClaimStep('nominee-review')).toBe('contact')
    expect(nextClaimStep('contact')).toBe('acknowledgement')
    expect(nextClaimStep('acknowledgement')).toBeUndefined()
  })

  // ⭐ Story 6.19a — the resume gap: EVERY recorded step resumes at the step after it. The entry gate is a
  // switch over `nextClaimStep`'s result; its `never` default makes a step without a branch a typecheck error,
  // and this pins that each step has its OWN branch (⛔ a fall-through to the handover OTP).
  it('⭐ the entry gate resumes EVERY step at nextClaimStep (⛔ no fall-through to the handover OTP)', () => {
    const src = readFileSync(join(__dirname, '../../app/(claim)/index.tsx'), 'utf8')
    for (const step of CLAIM_STEPS) {
      if (step === 'handover-otp') continue
      expect(src, step).toContain(`case '${step}':\n        router.push('/(claim)/${step}')`)
    }
    expect(src).toContain('const unhandled: never = next')
  })
})
