// Member WA opt-in contract tests — Story 5.4 (Task 3/8).
//
// (1) lockstep: the domain `wa_opt_in_state` pgEnum and the contracts `WaOptInStateSchema` z.enum must
//     declare the SAME values. `@twt/domain` cannot import `@twt/contracts` (turbo cycle), so the literals
//     are duplicated; THIS test (contracts → domain is legal) is the anti-drift guard (the consent_type
//     precedent).
// (2) DTO behaviour (strict, valid parse, reject unknown key, reject out-of-enum state).

import { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { assertStrict } from '../src/_common/strict.js';
import {
  CreateWaOptInResponse,
  RevokeWaOptInResponse,
  WaOptInStateSchema,
  WaOptInStatusResponse,
} from '../src/wa-opt-in/index.js';

describe('WA opt-in lockstep (contracts ↔ domain)', () => {
  it('domain wa_opt_in_state enumValues === contracts WaOptInStateSchema.options', () => {
    expect([...schema.waOptInStateEnum.enumValues].sort()).toEqual(
      [...WaOptInStateSchema.options].sort(),
    );
  });

  it('wa_opt_in_state declares exactly the five AC4 lifecycle states', () => {
    expect([...WaOptInStateSchema.options].sort()).toEqual([
      'ACTIVE',
      'BLOCKED_BY_META',
      'EXPIRED_24H_WINDOW',
      'PENDING',
      'REVOKED',
    ]);
  });
});

describe('WA opt-in DTOs (strict + shapes)', () => {
  it('all opt-in DTOs are .strict()', () => {
    assertStrict(CreateWaOptInResponse);
    assertStrict(WaOptInStatusResponse);
    assertStrict(RevokeWaOptInResponse);
  });

  it('CreateWaOptInResponse parses a valid PENDING mint', () => {
    const parsed = CreateWaOptInResponse.parse({
      state: 'PENDING',
      displayPhoneNumber: '+91 98765 43210',
      deepLink: 'https://wa.me/919876543210?text=TWT-7K2F9QXR',
      verificationPhrase: 'TWT-7K2F9QXR',
    });
    expect(parsed.state).toBe('PENDING');
  });

  it('WaOptInStatusResponse parses a null (never-opted-in) state', () => {
    const parsed = WaOptInStatusResponse.parse({
      available: true,
      displayPhoneNumber: '+91 98765 43210',
      state: null,
      deepLink: null,
      verificationPhrase: null,
      windowExpiresAt: null,
    });
    expect(parsed.state).toBeNull();
  });

  it('rejects an out-of-enum opt-in state', () => {
    expect(
      WaOptInStatusResponse.safeParse({
        available: true,
        displayPhoneNumber: null,
        state: 'ONBOARDING',
        deepLink: null,
        verificationPhrase: null,
        windowExpiresAt: null,
      }).success,
    ).toBe(false);
  });
});
