// DPDPA-consent claim-event payload schemas + identity-reducer cases — pure, DB-free (Story 6.9,
// Task 2; code review addition for the revoke-side event).
//
// Covers the annotation/identity events 6.9 owns: ClaimDpdpaConsentRecordedPayloadSchema (the 24th
// claim event) + ClaimDpdpaConsentRevokedPayloadSchema (the 25th, added in code review to keep the
// claim's evidentiary timeline symmetric with the record side). Both are `requireIdentityTransition`
// (`.strict()` + from_state === to_state) and carry ONLY non-PII flags — there is no field to smuggle
// checkbox text / subject id / revocation reason into (`.strict()` rejects unknown keys). Also asserts
// the reducer treats both as identity from any state (replay-robustness — the guard lives in the
// write path).

import { describe, expect, it } from 'vitest';

import {
  CLAIM_EVENT_PAYLOAD_SCHEMAS,
  CLAIM_EVENT_TYPES,
  ClaimDpdpaConsentRecordedPayloadSchema,
  ClaimDpdpaConsentRevokedPayloadSchema,
} from '../../src/claim/events.js';
import { replayClaimState } from '../../src/claim/state.js';

const recordedBase = {
  from_state: 'documents_pending',
  to_state: 'documents_pending',
  trigger: 'member_record_dpdpa_consent',
  actor: 'member',
  consent_types_granted: ['claim_time_dpdpa', 'sahyog_vivran_publication'],
} as const;

const revokedBase = {
  from_state: 'settled',
  to_state: 'settled',
  trigger: 'member_revoke_dpdpa_consent',
  actor: 'member',
  consent_type: 'sahyog_vivran_publication',
} as const;

describe('ClaimDpdpaConsentRecordedPayloadSchema (the 24th claim event)', () => {
  it('is registered as a claim event type + bound in the payload-schema map', () => {
    expect(CLAIM_EVENT_TYPES).toContain('claim.dpdpa_consent_recorded');
    // The vocabulary grows as owner stories add annotation events: 25 = 23 (Story 6.8) + recorded
    // (24th) + revoked (25th, code review); Story 6.11 added the 26th + 27th (claim.verifier_escalated
    // + claim.verifier_decision_revised).
    expect(CLAIM_EVENT_TYPES).toHaveLength(27);
    expect(CLAIM_EVENT_PAYLOAD_SCHEMAS['claim.dpdpa_consent_recorded']).toBe(
      ClaimDpdpaConsentRecordedPayloadSchema,
    );
  });

  it('accepts a valid payload (a granted subset)', () => {
    expect(ClaimDpdpaConsentRecordedPayloadSchema.parse(recordedBase)).toMatchObject({
      consent_types_granted: ['claim_time_dpdpa', 'sahyog_vivran_publication'],
    });
  });

  it('accepts all three granted types', () => {
    const parsed = ClaimDpdpaConsentRecordedPayloadSchema.parse({
      ...recordedBase,
      consent_types_granted: ['claim_time_dpdpa', 'sahyog_vivran_publication', 'in_memoriam_listing'],
    });
    expect(parsed.consent_types_granted).toHaveLength(3);
  });

  it('accepts a single-type grant (only claim_time_dpdpa)', () => {
    const parsed = ClaimDpdpaConsentRecordedPayloadSchema.parse({
      ...recordedBase,
      consent_types_granted: ['claim_time_dpdpa'],
    });
    expect(parsed.consent_types_granted).toEqual(['claim_time_dpdpa']);
  });

  it('REJECTS an empty consent_types_granted (the event is emitted only when ≥1 grant is written)', () => {
    expect(() =>
      ClaimDpdpaConsentRecordedPayloadSchema.parse({ ...recordedBase, consent_types_granted: [] }),
    ).toThrow();
  });

  it('REJECTS an unknown consent-type literal', () => {
    expect(() =>
      ClaimDpdpaConsentRecordedPayloadSchema.parse({
        ...recordedBase,
        consent_types_granted: ['whatsapp_opt_in'],
      }),
    ).toThrow();
  });

  it('REJECTS an unknown key (.strict — no PII / checkbox text smuggled into events_log)', () => {
    expect(() =>
      ClaimDpdpaConsentRecordedPayloadSchema.parse({
        ...recordedBase,
        checkbox_text_shown: 'I consent to …', // evidence copy lives in consent_payload, never here
      }),
    ).toThrow();
    expect(() =>
      ClaimDpdpaConsentRecordedPayloadSchema.parse({
        ...recordedBase,
        subject_id: '33333333-3333-3333-3333-333333333333', // subject id must NOT ride the event
      }),
    ).toThrow();
  });

  it('REJECTS a non-identity transition (from_state !== to_state)', () => {
    expect(() =>
      ClaimDpdpaConsentRecordedPayloadSchema.parse({ ...recordedBase, to_state: 'verification_in_progress' }),
    ).toThrow();
  });
});

describe('reducer treats claim.dpdpa_consent_recorded as identity', () => {
  it('leaves the state unchanged from any state (replay-robustness)', () => {
    // A stream of one intake event lands the claim at intake_pending; a dpdpa_consent_recorded
    // annotation replayed afterwards must not move the primary state.
    const rows = [
      {
        eventType: 'claim.intake_initiated',
        payload: {
          from_state: null,
          to_state: 'intake_pending',
          trigger: 't',
          actor: 'member',
          deceased_member_id: '33333333-3333-3333-3333-333333333333',
          intake_channel: 'member_app',
          claimant_actor_id: null,
        },
      },
      { eventType: 'claim.dpdpa_consent_recorded', payload: recordedBase },
    ] as never;
    expect(replayClaimState(rows)).toBe('intake_pending');
  });
});

describe('ClaimDpdpaConsentRevokedPayloadSchema (the 25th claim event, code review addition)', () => {
  it('is registered as a claim event type + bound in the payload-schema map', () => {
    expect(CLAIM_EVENT_TYPES).toContain('claim.dpdpa_consent_revoked');
    expect(CLAIM_EVENT_PAYLOAD_SCHEMAS['claim.dpdpa_consent_revoked']).toBe(
      ClaimDpdpaConsentRevokedPayloadSchema,
    );
  });

  it('accepts a valid payload for either revocable publication type', () => {
    expect(ClaimDpdpaConsentRevokedPayloadSchema.parse(revokedBase)).toMatchObject({
      consent_type: 'sahyog_vivran_publication',
    });
    expect(
      ClaimDpdpaConsentRevokedPayloadSchema.parse({ ...revokedBase, consent_type: 'in_memoriam_listing' }),
    ).toMatchObject({ consent_type: 'in_memoriam_listing' });
  });

  it('REJECTS claim_time_dpdpa (not revocable — only the two publication types are)', () => {
    expect(() =>
      ClaimDpdpaConsentRevokedPayloadSchema.parse({ ...revokedBase, consent_type: 'claim_time_dpdpa' }),
    ).toThrow();
  });

  it('REJECTS an unknown key (.strict — no reason / PII smuggled into events_log)', () => {
    expect(() =>
      ClaimDpdpaConsentRevokedPayloadSchema.parse({
        ...revokedBase,
        reason: 'family requested takedown', // the revocation reason lives in consent_records + audit sink only
      }),
    ).toThrow();
  });

  it('REJECTS a non-identity transition (from_state !== to_state)', () => {
    expect(() =>
      ClaimDpdpaConsentRevokedPayloadSchema.parse({ ...revokedBase, to_state: 'appeal_stage_1' }),
    ).toThrow();
  });
});

describe('reducer treats claim.dpdpa_consent_revoked as identity', () => {
  it('leaves the state unchanged from any state (replay-robustness — revocation is allowed post-settlement, AC3)', () => {
    const rows = [
      {
        eventType: 'claim.intake_initiated',
        payload: {
          from_state: null,
          to_state: 'intake_pending',
          trigger: 't',
          actor: 'member',
          deceased_member_id: '33333333-3333-3333-3333-333333333333',
          intake_channel: 'member_app',
          claimant_actor_id: null,
        },
      },
      { eventType: 'claim.dpdpa_consent_revoked', payload: revokedBase },
    ] as never;
    expect(replayClaimState(rows)).toBe('intake_pending');
  });
});
