// Shepherd-assigned claim-event payload schema + identity-reducer case — pure, DB-free (Story 6.12, Task 8).
//
// Covers the annotation/identity event 6.12 owns: ClaimShepherdAssignedPayloadSchema — the 28th claim
// event. It is `requireIdentityTransition` (`.strict()` + from_state === to_state) and carries NON-PII
// routing coordinates ONLY (shepherd_actor_id + previous_shepherd_actor_id + assignment_reason +
// supersedes_assignment_id + district) — there is no field to smuggle a name/phone/WhatsApp into
// (`.strict()` rejects unknown keys, AC8). `supersedes_assignment_id` is REQUIRED-but-nullable so the AC5
// reassignment back-reference actually rides the timeline. Also asserts the reducer treats it as identity.

import { describe, expect, it } from 'vitest';

import {
  CLAIM_EVENT_PAYLOAD_SCHEMAS,
  CLAIM_EVENT_TYPES,
  ClaimShepherdAssignedPayloadSchema,
} from '../../src/claim/events.js';
import { replayClaimState } from '../../src/claim/state.js';

const assignedBase = {
  from_state: 'verification_in_progress',
  to_state: 'verification_in_progress',
  trigger: 'claim_verification_shepherd_auto_assign',
  actor: 'system',
  shepherd_actor_id: '11111111-1111-1111-1111-111111111111',
  previous_shepherd_actor_id: null,
  assignment_reason: 'initial',
  supersedes_assignment_id: null,
  district: 'Jaipur',
} as const;

describe('ClaimShepherdAssignedPayloadSchema (the 28th claim event)', () => {
  it('is registered as a claim event type + bound in the payload-schema map', () => {
    expect(CLAIM_EVENT_TYPES).toContain('claim.shepherd_assigned');
    expect(CLAIM_EVENT_TYPES).toHaveLength(30); // Story 6.15 added the 30th (claim.concealment_assessed)
    expect(CLAIM_EVENT_PAYLOAD_SCHEMAS['claim.shepherd_assigned']).toBe(ClaimShepherdAssignedPayloadSchema);
  });

  it('accepts a valid INITIAL (auto) payload — previous + supersedes null', () => {
    expect(ClaimShepherdAssignedPayloadSchema.parse(assignedBase)).toMatchObject({
      assignment_reason: 'initial',
      previous_shepherd_actor_id: null,
      supersedes_assignment_id: null,
    });
  });

  it('accepts a REASSIGNMENT payload carrying the previous + supersedes back-reference (AC5)', () => {
    const parsed = ClaimShepherdAssignedPayloadSchema.parse({
      ...assignedBase,
      trigger: 'claim_shepherd_manual_reassign',
      actor: 'operator',
      assignment_reason: 'reassignment',
      previous_shepherd_actor_id: '22222222-2222-2222-2222-222222222222',
      supersedes_assignment_id: '33333333-3333-3333-3333-333333333333',
    });
    expect(parsed.previous_shepherd_actor_id).toBe('22222222-2222-2222-2222-222222222222');
    expect(parsed.supersedes_assignment_id).toBe('33333333-3333-3333-3333-333333333333');
  });

  it('accepts the fallback reason', () => {
    expect(
      ClaimShepherdAssignedPayloadSchema.parse({ ...assignedBase, assignment_reason: 'fallback' }).assignment_reason,
    ).toBe('fallback');
  });

  it('REQUIRES supersedes_assignment_id to be present (nullable, not optional) so the linkage rides the event', () => {
    const { supersedes_assignment_id, ...withoutSupersedes } = assignedBase;
    void supersedes_assignment_id;
    expect(() => ClaimShepherdAssignedPayloadSchema.parse(withoutSupersedes)).toThrow();
  });

  it('REJECTS an out-of-vocabulary assignment_reason', () => {
    expect(() =>
      ClaimShepherdAssignedPayloadSchema.parse({ ...assignedBase, assignment_reason: 'manual' }),
    ).toThrow();
  });

  it('REJECTS an empty district (a reachable shepherd is always districted)', () => {
    expect(() => ClaimShepherdAssignedPayloadSchema.parse({ ...assignedBase, district: '' })).toThrow();
  });

  it('REJECTS an unknown key (.strict — no name/phone/WhatsApp smuggled into events_log, AC8)', () => {
    expect(() =>
      ClaimShepherdAssignedPayloadSchema.parse({ ...assignedBase, shepherd_display: 'Anita Sharma' }),
    ).toThrow();
    expect(() =>
      ClaimShepherdAssignedPayloadSchema.parse({ ...assignedBase, shepherd_contact_phone: '+919000000000' }),
    ).toThrow();
  });

  it('REJECTS a non-identity transition (from_state !== to_state)', () => {
    expect(() =>
      ClaimShepherdAssignedPayloadSchema.parse({ ...assignedBase, to_state: 'verifier_review' }),
    ).toThrow();
  });
});

describe('reducer treats claim.shepherd_assigned as identity (no lifecycle state)', () => {
  it('leaves the state unchanged from any state (replay-robustness)', () => {
    const rows = [
      {
        eventType: 'claim.intake_initiated',
        payload: {
          from_state: null,
          to_state: 'intake_pending',
          trigger: 't',
          actor: 'member',
          deceased_member_id: '44444444-4444-4444-4444-444444444444',
          intake_channel: 'member_app',
          claimant_actor_id: null,
        },
      },
      { eventType: 'claim.shepherd_assigned', payload: assignedBase },
    ] as never;
    expect(replayClaimState(rows)).toBe('intake_pending');
  });
});
