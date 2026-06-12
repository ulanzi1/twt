// HMAC-signed single-use links (Story 1.9, AC-2) — out-of-band passkey-enrollment
// links + password-reset links.
//
// A stateless signed token: `base64url(JSON payload) + "." + base64url(HMAC-SHA256)`.
// The payload carries `{ sub, purpose, exp, bind? }`. Signature is verified
// timing-safe; expiry is enforced. SINGLE-USE is achieved by STATE-BINDING (no
// extra DB columns / no 0006 migration): a reset link binds `bind` to a prefix of
// the current password hash, so once the password changes the token can no longer
// be replayed; an enrollment link is only honoured while the admin has 0 passkeys
// (the bootstrap window), so it cannot be reused after the first device enrolls.
// Recorded in ADR-0009.

import { createHmac, timingSafeEqual } from 'node:crypto';

export type LinkPurpose = 'passkey_enrollment' | 'password_reset';

export interface SignedLinkPayload {
  /** Subject — the user id the link authorizes. */
  sub: string;
  purpose: LinkPurpose;
  /** Expiry, epoch ms. */
  exp: number;
  /** Optional state-binding value (e.g. password-hash prefix) for single-use. */
  bind?: string;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function sign(payloadB64: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(payloadB64).digest());
}

export function mintSignedLink(payload: SignedLinkPayload, secret: string): string {
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload), 'utf-8'));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

/**
 * Verify signature + expiry. Returns the payload on success, or null on any
 * failure (bad shape, bad signature, expired). The caller additionally enforces
 * the state-binding (`bind`) + single-use semantics for the specific purpose.
 */
export function verifySignedLink(
  token: string,
  secret: string,
  now: number,
): SignedLinkPayload | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const expected = sign(payloadB64, secret);
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: SignedLinkPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as SignedLinkPayload;
  } catch {
    return null;
  }
  if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
  if (now > payload.exp) return null;
  return payload;
}
