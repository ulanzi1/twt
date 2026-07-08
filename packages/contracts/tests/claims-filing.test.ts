// Member-app claim-filing contract tests — Story 6.2 (Task 1/9).
//
// (1) lockstep: the wire `ClaimLifecycleState` / intake-channel-relevant literals are
//     RE-DECLARED here (contracts cannot import @twt/domain — turbo cycle), so THIS test
//     (contracts → domain is legal) is the anti-drift guard against the domain
//     CLAIM_LIFECYCLE_STATES tuple (the telegram_opt_in_state / consent_type precedent).
// (2) DTO behaviour (strict, valid parse, reject unknown key, reject malformed code).

import { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { assertStrict } from '../src/_common/strict.js';
import {
  ClaimIntakeInitiateRequest,
  ClaimIntakeInitiateResponse,
  ClaimLifecycleState,
  ClaimantRelationship,
  HandoverOtpRequest,
  HandoverOtpResponse,
  HandoverOtpVerifyRequest,
  HandoverOtpVerifyResponse,
} from '../src/claims/index.js';

describe('Claim-filing lockstep (contracts ↔ domain)', () => {
  it('wire ClaimLifecycleState.options === domain CLAIM_LIFECYCLE_STATES', () => {
    expect([...ClaimLifecycleState.options].sort()).toEqual(
      [...schema.claimLifecycleStateEnum.enumValues].sort(),
    );
  });
});

describe('Claim-filing DTOs (strict + shapes)', () => {
  it('all claim-filing DTOs are .strict()', () => {
    assertStrict(HandoverOtpRequest);
    assertStrict(HandoverOtpResponse);
    assertStrict(HandoverOtpVerifyRequest);
    assertStrict(HandoverOtpVerifyResponse);
    assertStrict(ClaimIntakeInitiateRequest);
    assertStrict(ClaimIntakeInitiateResponse);
  });

  it('ClaimIntakeInitiateRequest accepts a relationship', () => {
    expect(ClaimIntakeInitiateRequest.parse({ relationship: 'spouse' })).toEqual({
      relationship: 'spouse',
    });
  });

  it('ClaimIntakeInitiateRequest rejects an unknown key and an out-of-enum relationship', () => {
    expect(() => ClaimIntakeInitiateRequest.parse({ relationship: 'spouse', extra: 1 })).toThrow();
    expect(() => ClaimIntakeInitiateRequest.parse({ relationship: 'cousin' })).toThrow();
  });

  it('ClaimIntakeInitiateResponse round-trips a minted intake_pending claim', () => {
    const parsed = ClaimIntakeInitiateResponse.parse({
      claimCaseId: '22222222-2222-2222-2222-222222222222',
      state: 'intake_pending',
    });
    expect(parsed.state).toBe('intake_pending');
  });

  it('HandoverOtpVerifyRequest requires a 6-digit numeric code', () => {
    expect(HandoverOtpVerifyRequest.parse({ code: '012345' }).code).toBe('012345');
    expect(() => HandoverOtpVerifyRequest.parse({ code: '12345' })).toThrow();
    expect(() => HandoverOtpVerifyRequest.parse({ code: 'abcdef' })).toThrow();
  });

  it('HandoverOtpResponse pins sent:true + a masked hint', () => {
    const parsed = HandoverOtpResponse.parse({ sent: true, nomineeMobileMasked: '+91·····3210' });
    expect(parsed.sent).toBe(true);
    expect(() => HandoverOtpResponse.parse({ sent: false, nomineeMobileMasked: 'x' })).toThrow();
  });

  it('ClaimantRelationship is the value-aligned nominee relationship set', () => {
    expect([...ClaimantRelationship.options].sort()).toEqual([
      'child',
      'other',
      'parent',
      'sibling',
      'spouse',
    ]);
  });
});
