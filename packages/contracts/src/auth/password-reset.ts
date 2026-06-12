// packages/contracts/src/auth/password-reset.ts
//
// Password reset via a signed out-of-band link (Story 1.9, AC-2). The request
// response is ALWAYS `{ sent: true }` (anti-enumeration — never reveals whether the
// email exists). Consuming a valid link resets the password, forces WebAuthn
// re-enrollment, and rotates the session.

import { z } from 'zod';

import { Email } from '../_common/primitives.js';

export const PasswordResetRequestRequest = z
  .object({
    email: Email,
    turnstileToken: z.string().optional(),
  })
  .strict();
export type PasswordResetRequestRequest = z.output<typeof PasswordResetRequestRequest>;

export const PasswordResetRequestResponse = z
  .object({
    sent: z.literal(true),
  })
  .strict();
export type PasswordResetRequestResponse = z.output<typeof PasswordResetRequestResponse>;

export const PasswordResetConsumeRequest = z
  .object({
    token: z.string().min(32),
    newPassword: z.string().min(12).max(512),
  })
  .strict();
export type PasswordResetConsumeRequest = z.output<typeof PasswordResetConsumeRequest>;

export const PasswordResetConsumeResponse = z
  .object({
    reset: z.literal(true),
    /** True — a WebAuthn re-enrollment is required after a reset (AC-2). */
    webauthnReenrollmentRequired: z.literal(true),
  })
  .strict();
export type PasswordResetConsumeResponse = z.output<typeof PasswordResetConsumeResponse>;
