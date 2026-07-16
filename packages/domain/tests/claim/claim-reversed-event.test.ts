// claim.reversed event + reducer + overlay unit tests — Story 6.16 (Task 11; AC5/D-A). Pure, no DB.
//
// The 31st claim event: the Sahyog Vivran PUBLISH HOOK (D-A). Registered + bound in the payload-schema map,
// a requireIdentityTransition (from_state === to_state === 'reversed'), carrying reversed_at_stage + a NON-PII
// disposition_category ONLY. Reducer identity (advances nothing). Deliberately ABSENT from the account-frozen
// overlay's unfreeze set (a reversed claim re-enters approval — the freeze persists until settled).

import { describe, expect, it } from 'vitest'

import { CLAIM_EVENT_PAYLOAD_SCHEMAS, CLAIM_EVENT_TYPES, ClaimReversedPayloadSchema } from '../../src/claim/events.js'
import { replayClaimState } from '../../src/claim/state.js'
import { ACCOUNT_UNFREEZE_EVENT_TYPES } from '../../src/member/overlay.js'

const valid = {
  from_state: 'reversed' as const,
  to_state: 'reversed' as const,
  trigger: 'appeal_stage3_reverse_publish_hook',
  actor: 'trustee' as const,
  reversed_at_stage: 3 as const,
  disposition_category: 'new_evidence_presented' as const,
}

describe('claim.reversed — the 31st event (D-A)', () => {
  it('is the 31st registered claim event, bound in the payload-schema map', () => {
    expect(CLAIM_EVENT_TYPES).toHaveLength(31)
    expect(CLAIM_EVENT_TYPES).toContain('claim.reversed')
    expect(CLAIM_EVENT_PAYLOAD_SCHEMAS['claim.reversed']).toBe(ClaimReversedPayloadSchema)
  })

  it('accepts a valid identity payload carrying reversed_at_stage + disposition_category', () => {
    expect(ClaimReversedPayloadSchema.safeParse(valid).success).toBe(true)
    expect(ClaimReversedPayloadSchema.safeParse({ ...valid, reversed_at_stage: 1, disposition_category: 'procedural_correction' }).success).toBe(true)
  })

  it('rejects a non-identity transition (from_state !== to_state)', () => {
    expect(ClaimReversedPayloadSchema.safeParse({ ...valid, from_state: 'appeal_stage_3' }).success).toBe(false)
  })

  it('rejects a missing disposition_category (D-A — always present on a reversal)', () => {
    const noDisposition = { from_state: valid.from_state, to_state: valid.to_state, trigger: valid.trigger, actor: valid.actor, reversed_at_stage: valid.reversed_at_stage }
    expect(ClaimReversedPayloadSchema.safeParse(noDisposition).success).toBe(false)
  })

  it('rejects an out-of-range reversed_at_stage', () => {
    expect(ClaimReversedPayloadSchema.safeParse({ ...valid, reversed_at_stage: 4 }).success).toBe(false)
  })

  it('rejects an unknown extra key (strict) — no PII smuggling', () => {
    expect(ClaimReversedPayloadSchema.safeParse({ ...valid, reviewer_name: 'Anita' }).success).toBe(false)
  })
})

describe('claim.reversed — reducer identity', () => {
  it('leaves the claim state unchanged when the claim is already reversed', () => {
    // replayClaimState reads only row.eventType + row.payload; the other EventRow fields are irrelevant here.
    const rows = [{ eventType: 'claim.reversed', payload: valid }] as unknown as Parameters<typeof replayClaimState>[0]
    // Replayed in isolation from the initial state, an identity annotation is a no-op → still initial.
    expect(replayClaimState(rows)).toBe('intake_pending')
  })
})

describe('claim.reversed — NOT an unfreeze event (D-A)', () => {
  it('is deliberately absent from ACCOUNT_UNFREEZE_EVENT_TYPES (the freeze persists on a reversal)', () => {
    expect((ACCOUNT_UNFREEZE_EVENT_TYPES as readonly string[])).not.toContain('claim.reversed')
    expect(ACCOUNT_UNFREEZE_EVENT_TYPES).toEqual(['claim.settled', 'claim.denied_no_appeal'])
  })
})
