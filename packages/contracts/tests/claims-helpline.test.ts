// Helpline-mediated claim-filing contract tests — Story 6.3 (Task 2/7).
//
// The operator-console intake wire shapes. Focus areas (AC2/AC3):
//   · strict() on every DTO;
//   · `identityReadBackConfirmed` is a literal `true` — the wire ITSELF enforces AC2's HARD
//     identity gate (a `false`/absent value is rejected at validation);
//   · `lookupMethod` accepts the three exact-match search dimensions (audit metadata);
//   · there is NO nominee-confirmation wire field (nominee read-back is advisory, non-gating);
//   · the response carries the `created` discriminator (convergence-hit signal).

import { describe, expect, it } from 'vitest';

import { assertStrict } from '../src/_common/strict.js';
import {
  HelplineClaimIntakeRequest,
  HelplineClaimIntakeResponse,
  HelplineLookupMethod,
} from '../src/claims/index.js';

const DECEASED = '11111111-1111-1111-1111-111111111111';
const CLAIM = '22222222-2222-2222-2222-222222222222';

const validRequest = {
  deceasedMemberId: DECEASED,
  relationship: 'child' as const,
  identityReadBackConfirmed: true as const,
  lookupMethod: 'memberId' as const,
};

describe('Helpline claim-intake DTOs (strict + shapes)', () => {
  it('all helpline DTOs are .strict()', () => {
    assertStrict(HelplineClaimIntakeRequest);
    assertStrict(HelplineClaimIntakeResponse);
  });

  it('HelplineClaimIntakeRequest accepts a well-formed intake', () => {
    expect(HelplineClaimIntakeRequest.parse(validRequest)).toEqual(validRequest);
  });

  it('identityReadBackConfirmed is the HARD gate: false or absent is rejected (AC2)', () => {
    expect(() =>
      HelplineClaimIntakeRequest.parse({ ...validRequest, identityReadBackConfirmed: false }),
    ).toThrow();
    const withoutFlag = {
      deceasedMemberId: validRequest.deceasedMemberId,
      relationship: validRequest.relationship,
      lookupMethod: validRequest.lookupMethod,
    };
    expect(() => HelplineClaimIntakeRequest.parse(withoutFlag)).toThrow();
  });

  it('lookupMethod accepts the three exact-match dimensions, rejects others', () => {
    for (const m of ['memberId', 'mobile', 'pariwar'] as const) {
      expect(HelplineClaimIntakeRequest.parse({ ...validRequest, lookupMethod: m }).lookupMethod).toBe(m);
    }
    expect(() => HelplineClaimIntakeRequest.parse({ ...validRequest, lookupMethod: 'name' })).toThrow();
    expect([...HelplineLookupMethod.options].sort()).toEqual(['memberId', 'mobile', 'pariwar']);
  });

  it('rejects a nominee-confirmation field (nominee read-back is advisory, NOT a wire gate)', () => {
    expect(() =>
      HelplineClaimIntakeRequest.parse({ ...validRequest, nomineeReadBackConfirmed: true }),
    ).toThrow();
  });

  it('rejects an unknown key and an out-of-enum relationship', () => {
    expect(() => HelplineClaimIntakeRequest.parse({ ...validRequest, extra: 1 })).toThrow();
    expect(() => HelplineClaimIntakeRequest.parse({ ...validRequest, relationship: 'cousin' })).toThrow();
  });

  it('HelplineClaimIntakeResponse carries the created + convergencePending discriminators', () => {
    expect(
      HelplineClaimIntakeResponse.parse({ claimCaseId: CLAIM, state: 'intake_converged', created: true, convergencePending: false }),
    ).toEqual({ claimCaseId: CLAIM, state: 'intake_converged', created: true, convergencePending: false });
    // The cross-channel convergence hit is a valid response (created:false, convergencePending:true).
    expect(
      HelplineClaimIntakeResponse.parse({ claimCaseId: CLAIM, state: 'intake_converged', created: false, convergencePending: true }).convergencePending,
    ).toBe(true);
    // `created` + `convergencePending` are required — an old {claimCaseId,state,created} shape is rejected.
    expect(() => HelplineClaimIntakeResponse.parse({ claimCaseId: CLAIM, state: 'intake_converged', created: true })).toThrow();
  });
});
