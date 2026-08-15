// Member OTP service (Story 3.2, Task 2) — login + step-up OTP request/verify.
//
// Reuses the admin verify/burn semantics VERBATIM (step-up.service.ts:53-74): mint
// (invalidate-on-next per (mobile,intent) → store HASH only) + verify (latest-live →
// attempt-cap → ATOMIC burn on match, with the concurrent-burn race guard). The two
// intents are DISTINCT pools (§2.2 line 1379) keyed on the mobile blind index — a
// concurrent login-OTP and step-up-OTP never share a value/slot. TTLs differ:
// login 5 min (`loginOtpTtlMs`), step-up 3 min (`stepUpOtpTtlMs`, §2.2 line 1370),
// data-export-delivery 60 min (`dataExportDeliveryOtpTtlMs`, Story 10.21, code-review
// decision — see `member_auth_otps.ts`'s header for why it is NOT the step-up TTL).

import type { schema } from '@twt/domain';

import type { AppDeps } from '../../../context.js';
import { hashOtp, generateOtp, OTP_MAX_ATTEMPTS, timingSafeHashCompare } from '../shared/otp.js';
import * as repo from './member-auth.repo.js';

type MemberOtpIntent = schema.MemberOtpIntent;

export interface RequestedOtp {
  /** The plaintext code — delivered via the seam, NEVER persisted (only its hash). */
  code: string;
  otpHash: string;
  expiresAt: Date;
}

/** Mint a fresh OTP for a (mobile, intent) pool, invalidating any prior live one. */
export async function requestOtp(
  deps: AppDeps,
  intent: MemberOtpIntent,
  mobileBlindIndex: string,
  opts: { memberId?: string | null; actionContext?: string | null } = {},
): Promise<RequestedOtp> {
  const now = deps.clock();
  await repo.invalidateLiveOtps(deps.pool, mobileBlindIndex, intent, now);
  const code = generateOtp();
  const otpHash = hashOtp(code);
  const ttlMs =
    intent === 'login'
      ? deps.config.loginOtpTtlMs
      : intent === 'data_export_delivery'
        ? deps.config.dataExportDeliveryOtpTtlMs
        : deps.config.stepUpOtpTtlMs;
  const expiresAt = new Date(now.getTime() + ttlMs);
  await repo.insertMemberOtp(deps.pool, {
    mobileBlindIndex,
    memberId: opts.memberId ?? null,
    intent,
    actionContext: opts.actionContext ?? null,
    otpHash,
    expiresAt,
  });
  return { code, otpHash, expiresAt };
}

export type VerifyOtpResult =
  | { ok: true; memberId: string | null; actionContext: string | null; otpHash: string }
  // `otpHash` is present on a wrong-code failure (the hash of the OTP record the guess was
  // checked against) so callers can still build an HMAC audit-correlation tag on failure;
  // absent when no live OTP was found to check against.
  | { ok: false; otpHash?: string };

/**
 * Verify a submitted OTP; burns it on success, attempt-caps on failure.
 *
 * PR-Patch-4: `opts.expectedMemberId` binds the lookup to a member (step-up flow) so
 * a shared-mobile member cannot consume another member's step-up OTP. Login omits it.
 */
export async function verifyOtp(
  deps: AppDeps,
  intent: MemberOtpIntent,
  mobileBlindIndex: string,
  code: string,
  opts: { expectedMemberId?: string | null } = {},
): Promise<VerifyOtpResult> {
  const now = deps.clock();
  const otp = await repo.findLatestLiveOtp(
    deps.pool,
    mobileBlindIndex,
    intent,
    now,
    opts.expectedMemberId ?? null,
  );
  if (!otp) return { ok: false };

  // P2: timing-safe comparison — === short-circuits on the first differing byte,
  // leaking prefix information to a timing oracle.
  if (timingSafeHashCompare(hashOtp(code), otp.otpHash)) {
    // Atomic consume: false if a concurrent request already burned this OTP.
    const burned = await repo.burnOtp(deps.pool, otp.id, now);
    if (!burned) return { ok: false };
    // P20: return otpHash so the handler can build the HMAC audit correlation tag.
    return { ok: true, memberId: otp.memberId, actionContext: otp.actionContext, otpHash: otp.otpHash };
  }

  // Wrong code — atomically increment the attempt counter and check the cap in one
  // statement (P1). The read-then-check in the old code had a TOCTOU gap: two
  // concurrent wrong-code requests could both observe attempts < cap, both pass the
  // check, and both increment, advancing the counter by 2 instead of 1.
  try {
    const newAttempts = await repo.atomicIncrementOtpAttempts(deps.pool, otp.id, OTP_MAX_ATTEMPTS);
    if (newAttempts === null || newAttempts >= OTP_MAX_ATTEMPTS) {
      // Cap reached or OTP already consumed — burn to prevent further guessing.
      await repo.burnOtp(deps.pool, otp.id, now);
    }
  } catch (err) {
    // P14: DB failure here leaves the retry budget unconsumed. Log but don't surface a
    // 5xx — the OTP remains valid and a legitimate user should still be able to retry.
    // The risk is that an attacker who can induce DB errors bypasses the cap; that
    // threat requires prior DB-level compromise and is accepted as residual risk.
    console.warn('[member-otp] atomicIncrementOtpAttempts failed — attempt budget may be stale', err);
  }
  return { ok: false, otpHash: otp.otpHash };
}
