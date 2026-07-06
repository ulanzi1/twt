// Meta X-Hub-Signature-256 verification — Story 5.4 (Task 4; AC2).
//
// PURE, DB-free, unit-testable. Meta signs an inbound webhook with the header
//   X-Hub-Signature-256: sha256=<hex HMAC-SHA256(rawBody, appSecret)>
// computed over the EXACT raw request bytes (a re-serialized parsed object would differ). We recompute the
// HMAC over the captured raw body and compare with `crypto.timingSafeEqual` (constant-time — no early-exit
// byte leak). Any shape mismatch (missing/short/malformed header, wrong length) fails CLOSED (returns false),
// never throws — the caller maps a false to a 403/404 that persists nothing.

import { createHmac, timingSafeEqual } from 'node:crypto';

/** The header Meta signs inbound webhooks with. */
export const META_SIGNATURE_HEADER = 'x-hub-signature-256';
const SIGNATURE_PREFIX = 'sha256=';

/**
 * Verify a Meta X-Hub-Signature-256 header against the raw body + the Pariwar's app secret. Returns true iff
 * the header is `sha256=<hex>` and the hex equals HMAC-SHA256(rawBody, appSecret) (timing-safe). Fails closed
 * (false) on any absent/malformed input.
 */
export function verifyMetaSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith(SIGNATURE_PREFIX)) return false;
  const providedHex = signatureHeader.slice(SIGNATURE_PREFIX.length);
  // A non-hex or wrong-length signature can never match — reject before the compare (Buffer.from would
  // silently truncate invalid hex, so validate shape first).
  if (!/^[0-9a-f]{64}$/i.test(providedHex)) return false;

  const expectedHex = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const provided = Buffer.from(providedHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  // Both are 32 bytes (SHA-256) by construction of the regex + digest — timingSafeEqual requires equal length.
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/**
 * Constant-time string comparison (UTF-8 bytes) — same length-then-`timingSafeEqual` idiom as the HMAC compare
 * above. Used for the GET subscription-verification `hub.verify_token` compare, which otherwise would be the
 * one secret-adjacent comparison in this module NOT using a timing-safe compare.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
