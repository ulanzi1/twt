// Member WA opt-in contract tests — Story 5.4 (Task 3/8).
//
// (1) lockstep: the domain `wa_opt_in_state` pgEnum and the contracts `WaOptInStateSchema` z.enum must
//     declare the SAME values. `@twt/domain` cannot import `@twt/contracts` (turbo cycle), so the literals
//     are duplicated; THIS test (contracts → domain is legal) is the anti-drift guard (the consent_type
//     precedent).
// (2) DTO behaviour (strict, valid parse, reject unknown key, reject out-of-enum state).

import { schema, waOptIn } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { assertStrict } from '../src/_common/strict.js';
import {
  CreateWaOptInResponse,
  RevokeWaOptInResponse,
  SendWaOptInCodeRequest,
  SendWaOptInCodeResponse,
  VerifyWaOptInCodeRequest,
  VerifyWaOptInCodeResponse,
  WaOptInCodeErrorDetails,
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
      // Story 5.13 (WC4) — the code fields (required — a `.strict()` contract change).
      codeAvailable: false,
      codesRemaining: 2,
      liveCode: false,
      liveCodeDelivery: null,
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

// Story 5.13 (Task 4.2; WC4, AC1, AC2, AC4) — the WhatsApp-code DTOs.
describe('WA opt-in code DTOs (Story 5.13)', () => {
  const MINT = {
    state: 'PENDING',
    displayPhoneNumber: '+91 98765 43210',
    deepLink: 'https://wa.me/919876543210?text=TWT-7K2F9QXR',
    verificationPhrase: 'TWT-7K2F9QXR',
  } as const;

  it('every code DTO is .strict()', () => {
    for (const s of [SendWaOptInCodeRequest, SendWaOptInCodeResponse, VerifyWaOptInCodeRequest, VerifyWaOptInCodeResponse, WaOptInCodeErrorDetails]) {
      assertStrict(s);
    }
  });

  it('the mint REQUIRES the four code fields; codesRemaining is 0 | 1 | 2; liveCodeDelivery sent | uncertain | null', () => {
    expect(CreateWaOptInResponse.safeParse(MINT).success).toBe(false);
    const ok = { ...MINT, codeAvailable: true, codesRemaining: 1, liveCode: true, liveCodeDelivery: 'uncertain' };
    expect(CreateWaOptInResponse.parse(ok).liveCodeDelivery).toBe('uncertain');
    expect(CreateWaOptInResponse.safeParse({ ...ok, codesRemaining: 3 }).success).toBe(false);
    expect(CreateWaOptInResponse.safeParse({ ...ok, liveCodeDelivery: 'delivered' }).success).toBe(false);
  });

  it('the send request is EMPTY — ⛔ a number field (I2)', () => {
    expect(SendWaOptInCodeRequest.parse({})).toEqual({});
    expect(SendWaOptInCodeRequest.safeParse({ mobile: '+919999999999' }).success).toBe(false);
  });

  it('the send response — delivery, codesRemaining 0 | 1, a bounded relative wait', () => {
    expect(SendWaOptInCodeResponse.parse({ delivery: 'sent', codesRemaining: 1, retryAfterSeconds: 60 }).delivery).toBe('sent');
    expect(SendWaOptInCodeResponse.safeParse({ delivery: 'sent', codesRemaining: 2, retryAfterSeconds: 60 }).success).toBe(false);
    expect(SendWaOptInCodeResponse.safeParse({ delivery: 'sent', codesRemaining: 0, retryAfterSeconds: 61 }).success).toBe(false);
    expect(SendWaOptInCodeResponse.safeParse({ delivery: 'sent', codesRemaining: 0, retryAfterSeconds: null }).success).toBe(true);
  });

  it('verify takes EXACTLY six digits', () => {
    expect(VerifyWaOptInCodeRequest.parse({ code: '012345' }).code).toBe('012345');
    for (const code of ['12345', '1234567', '12345a', ' 123456', '123 456', '']) {
      expect(VerifyWaOptInCodeRequest.safeParse({ code }).success, code).toBe(false);
    }
    expect(VerifyWaOptInCodeResponse.parse({ state: 'ACTIVE' }).state).toBe('ACTIVE');
  });

  it('the error details — codesRemaining + liveCode always; the wait and the tries optional', () => {
    expect(WaOptInCodeErrorDetails.parse({ codesRemaining: 0, liveCode: false })).toEqual({ codesRemaining: 0, liveCode: false });
    expect(WaOptInCodeErrorDetails.parse({ codesRemaining: 1, liveCode: true, retryAfterSeconds: null, attemptsRemaining: 1 }).attemptsRemaining).toBe(1);
    expect(WaOptInCodeErrorDetails.safeParse({ liveCode: true }).success).toBe(false);
    expect(WaOptInCodeErrorDetails.safeParse({ codesRemaining: 1, liveCode: true, code: '123456' }).success).toBe(false);
  });

  it('lockstep — the contract caps are the domain\'s (two sends, two tries, a 60 s wait)', () => {
    expect(waOptIn.WA_OPT_IN_CODE_MAX_SENDS).toBe(2);
    expect(waOptIn.WA_OPT_IN_CODE_MAX_ATTEMPTS).toBe(2);
    expect(waOptIn.WA_OPT_IN_CODE_RESEND_WAIT_SECONDS).toBe(60);
  });
});
