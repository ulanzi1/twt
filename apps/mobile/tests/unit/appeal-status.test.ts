// deriveAppealView unit tests — Story 6.16 (Task 9; AC7). Pure display-logic over the server-computed
// MemberAppealStatusResponse. NO deadline logic (D-E). The external-remedy disclosure rides the exhausted view.

import { describe, expect, it } from 'vitest'

import { type MemberAppealStatus, deriveAppealView } from '../../lib/appeal-status'

const base: MemberAppealStatus = {
  claim_state: 'denied',
  can_initiate: false,
  appeal_status: null,
  current_stage: null,
  appeal_exhausted: false,
}

describe('deriveAppealView (AC7)', () => {
  it('a denied claim with no prior journey shows the file affordance (no deadline, D-E)', () => {
    const v = deriveAppealView({ ...base, can_initiate: true })
    expect(v.showFileAffordance).toBe(true)
    expect(v.statusKey).toBeNull()
    expect(v.showReversed).toBe(false)
    expect(v.showExhausted).toBe(false)
  })

  it('an in-progress appeal shows the stage-specific status key, not the file affordance', () => {
    expect(deriveAppealView({ ...base, claim_state: 'appeal_stage_1', appeal_status: 'open', current_stage: '1' }).statusKey).toBe('appeal.status_stage1')
    expect(deriveAppealView({ ...base, claim_state: 'appeal_stage_2', appeal_status: 'open', current_stage: '2' }).statusKey).toBe('appeal.status_stage2')
    expect(deriveAppealView({ ...base, claim_state: 'appeal_stage_3', appeal_status: 'open', current_stage: '3' }).statusKey).toBe('appeal.status_stage3')
    expect(deriveAppealView({ ...base, appeal_status: 'open', current_stage: '2' }).showFileAffordance).toBe(false)
  })

  it('a reversed appeal shows the reversed message', () => {
    const v = deriveAppealView({ ...base, claim_state: 'reversed', appeal_status: 'reversed' })
    expect(v.showReversed).toBe(true)
    expect(v.showExhausted).toBe(false)
  })

  it('a Stage-3 uphold shows the exhausted view + the external-remedy disclosure (AC4/AC7)', () => {
    const v = deriveAppealView({ ...base, appeal_status: 'upheld_final', appeal_exhausted: true })
    expect(v.showExhausted).toBe(true)
    expect(v.showExternalRemedy).toBe(true)
    expect(v.showFileAffordance).toBe(false)
  })

  it('never derives a deadline gate — a denied claim with an existing journey cannot re-initiate (D-F)', () => {
    // can_initiate is server-computed (denied AND no journey); an existing journey ⇒ false, regardless of time.
    const v = deriveAppealView({ ...base, claim_state: 'denied', can_initiate: false, appeal_status: 'upheld_final', appeal_exhausted: true })
    expect(v.showFileAffordance).toBe(false)
  })
})
