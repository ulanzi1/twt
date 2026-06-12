// packages/contracts/src/auth/step-up.ts
//
// Step-up OTP request + verify (Story 1.9, AC-4). The middleware owns the gating
// decision; delivery is seamed (real SMS-DLT is Story 5.6/5.9 — R3). On success the
// actor gains an elevated context (~5 min) for the named `actionContext`.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

export const StepUpRequestRequest = z
  .object({
    /** The operation the step-up gates (echoed into the audit line). */
    actionContext: z.string().min(1).max(128),
  })
  .strict();
export type StepUpRequestRequest = z.output<typeof StepUpRequestRequest>;

export const StepUpRequestResponse = z
  .object({
    sent: z.literal(true),
    expiresInSeconds: z.number().int().positive(),
  })
  .strict();
export type StepUpRequestResponse = z.output<typeof StepUpRequestResponse>;

export const StepUpVerifyRequest = z
  .object({
    otp: z.string().min(6).max(8),
  })
  .strict();
export type StepUpVerifyRequest = z.output<typeof StepUpVerifyRequest>;

export const StepUpVerifyResponse = z
  .object({
    elevated: z.literal(true),
    /** When the elevated context expires (epoch-derived ISO). */
    elevatedUntil: Iso8601Datetime,
  })
  .strict();
export type StepUpVerifyResponse = z.output<typeof StepUpVerifyResponse>;
