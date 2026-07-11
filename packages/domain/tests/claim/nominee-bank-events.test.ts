// Nominee-bank claim-event payload schema + identity-reducer case — pure, DB-free (Story 6.8, Task 7).
//
// Covers the annotation/identity event 6.8 owns: ClaimNomineeBankRecordedPayloadSchema — the 23rd
// claim event. It is `requireIdentityTransition` (`.strict()` + from_state === to_state) and carries
// `account_ranks_present` ([1,2] in v1) + `ifsc_validated` ONLY — there is no PII field to smuggle a
// holder name / account number / IFSC into (`.strict()` rejects unknown keys). Also asserts the
// reducer treats it as identity from any state (replay-robustness — the guard lives in the writer).

import { describe, expect, it } from 'vitest';

import {
  CLAIM_EVENT_PAYLOAD_SCHEMAS,
  CLAIM_EVENT_TYPES,
  ClaimNomineeBankRecordedPayloadSchema,
} from '../../src/claim/events.js';
import { replayClaimState } from '../../src/claim/state.js';

const recordedBase = {
  from_state: 'verification_in_progress',
  to_state: 'verification_in_progress',
  trigger: 'member_record_nominee_bank',
  actor: 'member',
  account_ranks_present: [1, 2],
  ifsc_validated: true,
} as const;

describe('ClaimNomineeBankRecordedPayloadSchema (the 23rd claim event)', () => {
  it('is registered as a claim event type + bound in the payload-schema map', () => {
    expect(CLAIM_EVENT_TYPES).toContain('claim.nominee_bank_recorded');
    // 25 total: 24th = claim.dpdpa_consent_recorded (Story 6.9), 25th = claim.dpdpa_consent_revoked
    // (Story 6.9 code review) — dpdpa-consent-events.test.ts now owns the exact-count invariant.
    expect(CLAIM_EVENT_TYPES).toHaveLength(25);
    expect(CLAIM_EVENT_PAYLOAD_SCHEMAS['claim.nominee_bank_recorded']).toBe(
      ClaimNomineeBankRecordedPayloadSchema,
    );
  });

  it('accepts a valid payload (exactly two ranks, ifsc_validated flag)', () => {
    expect(ClaimNomineeBankRecordedPayloadSchema.parse(recordedBase)).toMatchObject({
      account_ranks_present: [1, 2],
      ifsc_validated: true,
    });
  });

  it('accepts the optional corrected flag (admin post-approval correction — D3 tier-2)', () => {
    const parsed = ClaimNomineeBankRecordedPayloadSchema.parse({ ...recordedBase, corrected: true });
    expect(parsed.corrected).toBe(true);
    // Absent on an ordinary collection.
    expect(ClaimNomineeBankRecordedPayloadSchema.parse(recordedBase).corrected).toBeUndefined();
  });

  it('accepts collection from any pre-adjudication state (identity)', () => {
    for (const state of ['intake_converged', 'documents_pending'] as const) {
      const parsed = ClaimNomineeBankRecordedPayloadSchema.parse({
        ...recordedBase,
        from_state: state,
        to_state: state,
      });
      expect(parsed.to_state).toBe(state);
    }
  });

  it('REJECTS a non-length-2 account_ranks_present (v1 requires exactly two)', () => {
    expect(() =>
      ClaimNomineeBankRecordedPayloadSchema.parse({ ...recordedBase, account_ranks_present: [1] }),
    ).toThrow();
    expect(() =>
      ClaimNomineeBankRecordedPayloadSchema.parse({ ...recordedBase, account_ranks_present: [1, 2, 2] }),
    ).toThrow();
  });

  it('REJECTS an out-of-range rank literal', () => {
    expect(() =>
      ClaimNomineeBankRecordedPayloadSchema.parse({ ...recordedBase, account_ranks_present: [1, 3] }),
    ).toThrow();
  });

  it('REJECTS an unknown key (.strict — no PII smuggled into events_log)', () => {
    expect(() =>
      ClaimNomineeBankRecordedPayloadSchema.parse({
        ...recordedBase,
        account_number: '000123456789', // PII must NEVER ride the event payload
      }),
    ).toThrow();
  });

  it('REJECTS a non-identity transition (from_state !== to_state)', () => {
    expect(() =>
      ClaimNomineeBankRecordedPayloadSchema.parse({ ...recordedBase, to_state: 'verifier_review' }),
    ).toThrow();
  });
});

describe('reducer treats claim.nominee_bank_recorded as identity', () => {
  it('leaves the state unchanged from any state (replay-robustness)', () => {
    // A stream of one intake event lands the claim at intake_pending; a nominee_bank_recorded
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
      { eventType: 'claim.nominee_bank_recorded', payload: recordedBase },
    ] as never;
    expect(replayClaimState(rows)).toBe('intake_pending');
  });
});
