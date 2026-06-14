// Admin-auth contract tests (Story 1.9, Task 8.4) — `.strict()` + unknown-key
// rejection per object, plus representative validation cases.

import { describe, expect, it } from 'vitest';

import {
  LoginRequest,
  LoginResponse,
  PasskeyAuthVerifyRequest,
  PasskeyAuthVerifyResponse,
  PasskeyRegisterOptionsRequest,
  PasskeyRegisterVerifyRequest,
  PasskeyRegisterVerifyResponse,
  PasswordResetConsumeRequest,
  PasswordResetConsumeResponse,
  PasswordResetRequestRequest,
  PasswordResetRequestResponse,
  RecoveryConsumeRequest,
  RecoveryConsumeResponse,
  StepUpRequestRequest,
  StepUpRequestResponse,
  StepUpVerifyRequest,
  StepUpVerifyResponse,
  UserIdSchema,
  assertStrict,
} from '../src/index.js';

const STRICT_OBJECTS = {
  LoginRequest,
  LoginResponse,
  PasskeyRegisterOptionsRequest,
  PasskeyRegisterVerifyRequest,
  PasskeyRegisterVerifyResponse,
  PasskeyAuthVerifyRequest,
  PasskeyAuthVerifyResponse,
  RecoveryConsumeRequest,
  RecoveryConsumeResponse,
  PasswordResetRequestRequest,
  PasswordResetRequestResponse,
  PasswordResetConsumeRequest,
  PasswordResetConsumeResponse,
  StepUpRequestRequest,
  StepUpRequestResponse,
  StepUpVerifyRequest,
  StepUpVerifyResponse,
};

describe('auth contracts — .strict()', () => {
  for (const [name, schema] of Object.entries(STRICT_OBJECTS)) {
    it(`${name} is strict`, () => {
      expect(() => assertStrict(schema)).not.toThrow();
    });
  }
});

describe('auth contracts — validation', () => {
  it('LoginRequest accepts a valid body, rejects unknown keys + bad email', () => {
    expect(LoginRequest.safeParse({ email: 'a@b.com', password: 'valid-password' }).success).toBe(true);
    expect(LoginRequest.safeParse({ email: 'a@b.com', password: 'valid-password', extra: 1 }).success).toBe(false);
    expect(LoginRequest.safeParse({ email: 'not-an-email', password: 'valid-password' }).success).toBe(false);
  });

  it('PasskeyRegisterVerifyRequest accepts a provider-controlled response object', () => {
    const ok = PasskeyRegisterVerifyRequest.safeParse({
      response: { id: 'x', rawId: 'y', type: 'public-key', response: {} },
      deviceLabel: 'My Key',
    });
    expect(ok.success).toBe(true);
    // The outer envelope is still strict.
    expect(
      PasskeyRegisterVerifyRequest.safeParse({ response: {}, bogusTopLevel: true }).success,
    ).toBe(false);
  });

  it('StepUpVerifyRequest bounds the OTP length', () => {
    expect(StepUpVerifyRequest.safeParse({ otp: '123456' }).success).toBe(true);
    expect(StepUpVerifyRequest.safeParse({ otp: '' }).success).toBe(false);
    expect(StepUpVerifyRequest.safeParse({ otp: 'x'.repeat(64) }).success).toBe(false);
  });

  it('PasswordResetConsumeRequest enforces a minimum new-password length', () => {
    expect(PasswordResetConsumeRequest.safeParse({ token: 'a'.repeat(32), newPassword: 'short' }).success).toBe(false);
    expect(
      PasswordResetConsumeRequest.safeParse({ token: 'a'.repeat(32), newPassword: 'a-sufficiently-long-password' }).success,
    ).toBe(true);
  });

  it('UserIdSchema brands a uuid + rejects non-uuids', () => {
    expect(UserIdSchema.safeParse('11111111-1111-1111-1111-111111111111').success).toBe(true);
    expect(UserIdSchema.safeParse('nope').success).toBe(false);
  });
});
