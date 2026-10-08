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
  closed_no_response: false,
}

describe('deriveAppealView (AC7)', () => {
  it('⭐ Story 6.24a — a journey CLOSED with its claim shows ⛔ no affordance, ⛔ no status line, ⛔ no outcome', () => {
    // Even were the server's `can_initiate` / `appeal_exhausted` true, the closure wins (the `closed_no_response`
    // precedent, same isolation): the guard must be `appeal_status`-keyed, ⛔ never riding only on those fields.
    const v = deriveAppealView({ ...base, claim_state: 'closed', appeal_status: 'closed', current_stage: '1', can_initiate: true, appeal_exhausted: true })
    expect(v).toEqual({ showFileAffordance: false, statusKey: null, showReversed: false, showExhausted: false, showExternalRemedy: false })
  })

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

  it('⭐ Story 6.19c (AC7, `-273` §9) — a claim CLOSED for no response shows ⛔ no appeal affordance and ⛔ no external-remedy disclosure (a display rule — it refuses nothing)', () => {
    // Even were the server's `can_initiate` true, the closure wins; a closure is ⛔ an exhausted appeal.
    const v = deriveAppealView({ ...base, can_initiate: true, closed_no_response: true })
    expect(v.showFileAffordance).toBe(false)
    expect(v.showExhausted).toBe(false)
    expect(v.showExternalRemedy).toBe(false)
    expect(v.statusKey).toBeNull()
  })

  it('never derives a deadline gate — a denied claim with an existing journey cannot re-initiate (D-F)', () => {
    // can_initiate is server-computed (denied AND no journey); an existing journey ⇒ false, regardless of time.
    const v = deriveAppealView({ ...base, claim_state: 'denied', can_initiate: false, appeal_status: 'upheld_final', appeal_exhausted: true })
    expect(v.showFileAffordance).toBe(false)
  })
})
