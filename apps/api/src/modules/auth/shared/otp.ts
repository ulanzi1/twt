// Shared OTP primitives (Story 3.2, Task 2 — extracted from step-up.service.ts).
//
// `generateOtp` + `hashOtp` are the ONE implementation shared by admin step-up
// (Story 1.9) AND member auth (Story 3.2) — extracted here so the two surfaces
// never drift (no copy-paste). The OTP is short-lived + rate-limited + attempt-
// capped, so a fast hash (SHA-256) is appropriate — it is NOT a stored credential
// (§2.2 OTP-security-floor). Only the HASH is ever persisted; never the code.

import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';

const OTP_DIGITS = 6;

/** A 6-digit numeric OTP (leading zeros preserved). */
export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, '0');
}

/** SHA-256 hex of the trimmed code — the only form ever persisted (§2.2). */
export function hashOtp(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex');
}

/** Max wrong guesses on a single OTP before it is burned (anti-brute-force). */
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Timing-safe comparison of two SHA-256 hex strings (P2). `===` short-circuits on
 * the first differing byte, leaking length + prefix information to a timing oracle.
 */
export function timingSafeHashCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/**
 * HMAC-SHA256 audit correlation tag for an OTP hash (P28 / D1). Plain SHA-256 of a
 * 6-digit OTP is brute-forceable in <1ms; keying with a server-side secret makes it
 * non-invertible to audit-log readers who lack the key. The same correlation key is
 * used on both the send and consume events so they remain linkable.
 */
export function hmacOtpAuditCorrelation(otpHash: string, auditCorrelationKey: string): string {
  return createHmac('sha256', auditCorrelationKey).update(otpHash).digest('hex');
}
