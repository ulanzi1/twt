// Member session tokens (Story 3.2, Task 3) — opaque refresh + signed JWTs.
//
// REFRESH token = opaque high-entropy random (NOT a JWT), stored HASHED in
// member_refresh_tokens (rotation-on-use + reuse detection). ACCESS token +
// signup-continuation + pariwar-select are signed JWTs (ES256, algorithm-pinned by
// the jwt plugin). Only the access token authorizes member API calls; the others
// are single-purpose seams. The `@fastify/jwt` instance (`app.jwt`) owns the
// signature + exp; this module is the thin typed wrapper around it.

import { createHash, randomBytes } from 'node:crypto';

import type { FastifyInstance } from 'fastify';

import {
  MEMBER_ACCESS_TYP,
  PARIWAR_SELECT_TYP,
  SIGNUP_CONTINUATION_TYP,
} from '../../../plugins/jwt/index.js';
import type { SignupContinuationClaims } from '../../../plugins/jwt/index.js';

const REFRESH_TOKEN_BYTES = 32; // 256 bits of entropy

/** SHA-256 hex of an opaque token — the only form persisted. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Mint a fresh opaque refresh token + its storage hash. */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

const ms2s = (ms: number): number => Math.max(1, Math.floor(ms / 1000));

/** Sign a member ACCESS token (the session bearer). */
export function signAccessToken(
  app: FastifyInstance,
  claims: { memberId: string; pariwarId: string; deviceId: string },
  ttlMs: number,
): string {
  return app.jwt.sign(
    { typ: MEMBER_ACCESS_TYP, sub: claims.memberId, pariwar_id: claims.pariwarId, device_id: claims.deviceId },
    { expiresIn: ms2s(ttlMs) },
  );
}

/**
 * Verify + narrow a first-signup CONTINUATION token (Story 3.6a — mirrors how `selectPariwar`
 * verifies a `PariwarSelectClaims`). Returns the claims on a valid `intent === 'signup'`
 * continuation token, or `null` on any failure (bad signature, expired, wrong `typ`/`intent`) —
 * the caller maps `null` to a 401. The single-use `jti` is burned separately by
 * `consumeSignupContinuation` (the JWT `exp` enforces freshness; the table enforces single-use).
 */
export function verifySignupContinuation(
  app: FastifyInstance,
  token: string,
): (SignupContinuationClaims & { iat: number; exp: number }) | null {
  let claims: SignupContinuationClaims & { iat: number; exp: number };
  try {
    claims = app.jwt.verify<SignupContinuationClaims & { iat: number; exp: number }>(token);
  } catch {
    return null;
  }
  if (claims.typ !== SIGNUP_CONTINUATION_TYP || claims.intent !== 'signup') return null;
  return claims;
}

/** Sign a first-signup CONTINUATION token (the verified-mobile seam, R5). */
export function signSignupContinuation(
  app: FastifyInstance,
  args: { mobileBlindIndex: string; jti: string },
  ttlMs: number,
): string {
  return app.jwt.sign(
    { typ: SIGNUP_CONTINUATION_TYP, sub: args.mobileBlindIndex, intent: 'signup', jti: args.jti },
    { expiresIn: ms2s(ttlMs) },
  );
}

/** Sign a multi-Pariwar SCOPE-SELECT token (R2). Single-use via the `jti` (PR-Patch-10). */
export function signPariwarSelect(
  app: FastifyInstance,
  args: { mobileBlindIndex: string; deviceId: string; jti: string; deviceLabel?: string; maskedMobile?: string },
  ttlMs: number,
): string {
  return app.jwt.sign(
    {
      typ: PARIWAR_SELECT_TYP,
      sub: args.mobileBlindIndex,
      device_id: args.deviceId,
      jti: args.jti,
      ...(args.deviceLabel ? { device_label: args.deviceLabel } : {}),
      ...(args.maskedMobile ? { masked_mobile: args.maskedMobile } : {}),
    },
    { expiresIn: ms2s(ttlMs) },
  );
}
