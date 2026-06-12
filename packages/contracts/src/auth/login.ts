// packages/contracts/src/auth/login.ts
//
// Admin login first-factor (Story 1.9, AC-1). The response NEVER reveals whether
// the email exists (anti-enumeration) — a wrong email and a wrong password are
// indistinguishable 401s; only a fully-verified first factor returns
// `mfa_required`. The second factor (WebAuthn / recovery code) completes the login.

import { z } from 'zod';

import { Email } from '../_common/primitives.js';

export const LoginRequest = z
  .object({
    email: Email,
    password: z.string().min(12).max(512),
    /** Optional Cloudflare Turnstile token (seam — Story 1.13). */
    turnstileToken: z.string().optional(),
  })
  .strict();
export type LoginRequest = z.output<typeof LoginRequest>;

/** Second-factor methods offered after a successful first factor. */
export const SecondFactorMethod = z.enum(['webauthn', 'recovery_code']);
export type SecondFactorMethod = z.output<typeof SecondFactorMethod>;

export const LoginResponse = z
  .object({
    status: z.literal('mfa_required'),
    methods: z.array(SecondFactorMethod),
  })
  .strict();
export type LoginResponse = z.output<typeof LoginResponse>;
