// Ground-inspection claim-event payload schemas — pure, DB-free unit tests (Story 6.7, Task 7).
//
// Covers the two annotation/identity payloads 6.7 owns:
//   · ClaimGroundInspectionScheduledPayloadSchema (ENRICHED — the 6.7 first-emitter fields)
//   · ClaimGroundInspectionCompletedPayloadSchema (the 22nd claim event, NEW)
// Both are `requireIdentityTransition` — `.strict()` (unknown key rejected) + identity refinement
// (from_state === to_state). They carry ids + non-PII metadata ONLY; there is no PII field to
// smuggle a name/phone/address into (the "reject PII/unknown keys" AC is enforced by `.strict()`).

import { describe, expect, it } from 'vitest';

import {
  CLAIM_EVENT_PAYLOAD_SCHEMAS,
  CLAIM_EVENT_TYPES,
  ClaimGroundInspectionCompletedPayloadSchema,
  ClaimGroundInspectionScheduledPayloadSchema,
} from '../../src/claim/events.js';

const GID = '11111111-1111-1111-1111-111111111111';
const OLD_GID = '22222222-2222-2222-2222-222222222222';

const scheduledBase = {
  from_state: 'verification_in_progress',
  to_state: 'verification_in_progress',
  trigger: 'admin_schedule_ground_inspection',
  actor: 'operator',
  ground_inspection_id: GID,
  district: 'Patna',
  inspector_actor_id: 'inspector-actor-1',
  scheduled_at: '2026-07-10T12:00:00.000Z',
  supersedes_ground_inspection_id: null,
} as const;

describe('ClaimGroundInspectionScheduledPayloadSchema (enriched, 6.7 first emitter)', () => {
  it('accepts a valid fresh-schedule payload (supersedes = null)', () => {
    expect(ClaimGroundInspectionScheduledPayloadSchema.parse(scheduledBase)).toMatchObject({
      ground_inspection_id: GID,
      district: 'Patna',
      supersedes_ground_inspection_id: null,
    });
  });

  it('accepts a reschedule payload carrying the supersedes back-reference (#4)', () => {
    const parsed = ClaimGroundInspectionScheduledPayloadSchema.parse({
      ...scheduledBase,
      supersedes_ground_inspection_id: OLD_GID,
    });
    expect(parsed.supersedes_ground_inspection_id).toBe(OLD_GID);
  });

  it('REJECTS an unknown key (.strict — no PII/free-text smuggled into events_log)', () => {
    expect(() =>
      ClaimGroundInspectionScheduledPayloadSchema.parse({
        ...scheduledBase,
        family_contact: '+919999999999', // PII must NEVER ride the event payload
      }),
    ).toThrow();
  });

  it('REJECTS a non-identity transition (from_state !== to_state)', () => {
    expect(() =>
      ClaimGroundInspectionScheduledPayloadSchema.parse({
        ...scheduledBase,
        to_state: 'verifier_review',
      }),
    ).toThrow();
  });

  it('REJECTS a missing required id / malformed uuid', () => {
    const withoutId = { ...scheduledBase } as Record<string, unknown>;
    delete withoutId.ground_inspection_id;
    expect(() => ClaimGroundInspectionScheduledPayloadSchema.parse(withoutId)).toThrow();
    expect(() =>
      ClaimGroundInspectionScheduledPayloadSchema.parse({ ...scheduledBase, ground_inspection_id: 'not-a-uuid' }),
    ).toThrow();
  });
});

describe('ClaimGroundInspectionCompletedPayloadSchema (the 22nd claim event)', () => {
  const completedBase = {
    from_state: 'verification_in_progress',
    to_state: 'verification_in_progress',
    trigger: 'admin_complete_ground_inspection',
    actor: 'operator',
    ground_inspection_id: GID,
  } as const;

  it('is registered as a claim event type + bound in the payload-schema map', () => {
    expect(CLAIM_EVENT_TYPES).toContain('claim.ground_inspection_completed');
    // The vocabulary grows as owner stories add annotation events (Story 6.8 added the 23rd,
    // claim.nominee_bank_recorded; Story 6.9 the 24th + 25th, claim.dpdpa_consent_recorded/_revoked;
    // Story 6.11 the 26th + 27th, claim.verifier_escalated/_decision_revised);
    // dpdpa-consent-events.test.ts owns the exact-count invariant.
    expect(CLAIM_EVENT_TYPES).toHaveLength(30); // Story 6.15 added the 30th (claim.concealment_assessed)
    expect(CLAIM_EVENT_PAYLOAD_SCHEMAS['claim.ground_inspection_completed']).toBe(
      ClaimGroundInspectionCompletedPayloadSchema,
    );
  });

  it('accepts a valid payload, with or without the optional photo_count', () => {
    expect(ClaimGroundInspectionCompletedPayloadSchema.parse(completedBase)).toMatchObject({
      ground_inspection_id: GID,
    });
    expect(
      ClaimGroundInspectionCompletedPayloadSchema.parse({ ...completedBase, photo_count: 3 }).photo_count,
    ).toBe(3);
  });

  it('REJECTS an unknown key + a non-identity transition', () => {
    expect(() =>
      ClaimGroundInspectionCompletedPayloadSchema.parse({ ...completedBase, notes: 'free text' }),
    ).toThrow();
    expect(() =>
      ClaimGroundInspectionCompletedPayloadSchema.parse({ ...completedBase, to_state: 'settled' }),
    ).toThrow();
  });

  it('REJECTS a negative / non-integer photo_count', () => {
    expect(() =>
      ClaimGroundInspectionCompletedPayloadSchema.parse({ ...completedBase, photo_count: -1 }),
    ).toThrow();
    expect(() =>
      ClaimGroundInspectionCompletedPayloadSchema.parse({ ...completedBase, photo_count: 1.5 }),
    ).toThrow();
  });
});
