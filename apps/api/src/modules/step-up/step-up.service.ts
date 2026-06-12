// step-up OTP mechanism (Story 1.9, Task 5, AC-4).
//
// Generate → store HASH only → TTL 3 min → single-use → invalidate-on-next →
// attempt-capped. The OTP is short-lived + rate-limited + attempt-capped, so a
// fast hash (SHA-256) is appropriate (it is not a stored credential). The MIDDLEWARE
// owns the gating decision; the channel owns transport — delivery is behind
// `StepUpOtpDeliveryPort` (dev/log stub here; real SMS-DLT is Story 5.6/5.9, R3).

import { createHash, randomInt } from 'node:crypto';

import type { AppDeps } from '../../context.js';
import * as repo from './step-up.repo.js';

const OTP_DIGITS = 6;
const MAX_ATTEMPTS = 5;

/** A 6-digit numeric OTP (leading zeros preserved). */
export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, '0');
}

export function hashOtp(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex');
}

export interface RequestedStepUp {
  code: string;
  otpHash: string;
  expiresAt: Date;
}

/** Mint a fresh OTP for an actor, invalidating any prior live one. */
export async function requestStepUp(
  deps: AppDeps,
  userId: string,
  actionContext: string,
  pariwarId: string | null,
): Promise<RequestedStepUp> {
  const now = deps.clock();
  await repo.invalidateActorOtps(deps.pool, userId, now);
  const code = generateOtp();
  const otpHash = hashOtp(code);
  const expiresAt = new Date(now.getTime() + deps.config.stepUpOtpTtlMs);
  await repo.insertOtp(deps.pool, { userId, otpHash, actionContext, pariwarId, expiresAt });
  return { code, otpHash, expiresAt };
}

export type VerifyStepUpResult =
  | { ok: true; actionContext: string }
  | { ok: false };

/** Verify a submitted OTP; burns it on success, attempt-caps on failure. */
export async function verifyStepUp(
  deps: AppDeps,
  userId: string,
  code: string,
): Promise<VerifyStepUpResult> {
  const now = deps.clock();
  const otp = await repo.findLatestLiveOtp(deps.pool, userId, now);
  if (!otp) return { ok: false };
  if (otp.attempts >= MAX_ATTEMPTS) {
    // Too many wrong guesses on this OTP — burn it so it cannot be brute-forced.
    await repo.burnOtp(deps.pool, otp.id, now);
    return { ok: false };
  }
  if (hashOtp(code) === otp.otpHash) {
    // Atomic consume: returns false if a concurrent request already burned this OTP.
    const burned = await repo.burnOtp(deps.pool, otp.id, now);
    if (!burned) return { ok: false };
    return { ok: true, actionContext: otp.actionContext };
  }
  await repo.incrementOtpAttempts(deps.pool, otp.id);
  return { ok: false };
}
