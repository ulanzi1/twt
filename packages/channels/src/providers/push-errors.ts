// Push send-error classification — Story 5.2 (AC1, AC5; Task 2).
//
// Firebase (FCM/APNs-via-Firebase) returns a `FirebaseMessagingError` whose `.code` is a stable
// `messaging/<suffix>` string. Story 5.2's push-token invalidation (AC5) fires ONLY on an UNRECOVERABLE
// token error — the offending device token is dead and must be marked `invalid`. Every OTHER failure
// (quota, rate-limit, server-unavailable, transient network) is a plain transient send error and MUST NOT
// invalidate an otherwise-valid token (invalidating on a transient blip would silently unsubscribe a
// live device).
//
// ── Why the classification rides in `SendResult.detail`, not a new SendResult field ───────────────────
// The 5.1 `ChannelProvider` port + `SendResult` are FROZEN surfaces (Dev Notes boundary 1). The provider
// stays pure of DB access (Task 5): it CLASSIFIES the error and the composition layer (never `dispatch`,
// never the provider) does the isolated best-effort `markInvalid` write. So the provider encodes the
// classification into the existing `detail` string with a stable prefix, and the invalidation seam reads
// it back via `isUnrecoverableTokenRejection`. No SendResult shape change.

import type { SendResult } from '../provider.js';

/** The two send-failure classes that matter for token lifecycle (AC5). */
export type PushErrorClass = 'unrecoverable_token' | 'transient';

/**
 * Firebase messaging error codes that mean the DEVICE TOKEN itself is dead — the send can never succeed
 * against this token (architecture §3.3 push-token rotation). Matched on the `messaging/<suffix>` code.
 *   · `registration-token-not-registered` — the app was uninstalled / the token was revoked by the OS.
 *   · `invalid-registration-token` — a malformed / unparseable token.
 *   · `invalid-argument` — Firebase's generic "the request is invalid"; for a single-token `send` whose
 *     message body is a deterministic pure-render output (gated), the realistic cause is a bad token, so
 *     it is treated as unrecoverable-on-token. CAVEAT (documented for the retention-review): a genuine
 *     message-shape bug would also surface as `invalid-argument` — but the render output is CI-pinned
 *     byte-identical (determinism gate), so a shape bug is caught before prod, not in a live send.
 */
const UNRECOVERABLE_TOKEN_SUFFIXES: ReadonlySet<string> = new Set([
  'registration-token-not-registered',
  'invalid-registration-token',
  'invalid-argument',
]);

/** The stable `detail` prefix a provider stamps on a rejection so the invalidation seam can read the class. */
const DETAIL_PREFIX: Record<PushErrorClass, string> = {
  unrecoverable_token: 'unrecoverable_token',
  transient: 'transient',
};

/** Pull a `messaging/<suffix>` code off an unknown thrown value, defensively (never throws). */
export function firebaseErrorCode(err: unknown): string {
  try {
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: unknown }).code;
      if (typeof code === 'string' && code.length > 0) return code;
    }
  } catch {
    // A hostile `in`/getter access on `err` must never escape — this function's whole contract is "never
    // throws" so the caller's catch block (fcm.ts/apns.ts) can always resolve to a well-formed SendResult.
  }
  return 'unknown';
}

/** Classify a thrown Firebase send error into its token-lifecycle class (AC5). */
export function classifyPushError(err: unknown): { code: string; errorClass: PushErrorClass } {
  const code = firebaseErrorCode(err);
  // Codes are `messaging/<suffix>`; tolerate a bare suffix too (defensive across firebase-admin versions).
  const suffix = code.includes('/') ? code.slice(code.lastIndexOf('/') + 1) : code;
  const errorClass: PushErrorClass = UNRECOVERABLE_TOKEN_SUFFIXES.has(suffix)
    ? 'unrecoverable_token'
    : 'transient';
  return { code, errorClass };
}

/** Build the `SendResult.detail` for a classified rejection — `<class>:<code>` (no PII, stable). */
export function rejectionDetail(errorClass: PushErrorClass, code: string): string {
  return `${DETAIL_PREFIX[errorClass]}:${code}`;
}

/**
 * The composition-layer predicate (Task 5): did this push `SendResult` reject with an UNRECOVERABLE token
 * error? Only then does the invalidation seam mark the token `invalid`. A transient rejection returns
 * false — the token stays `active` (a live device must survive a quota blip).
 */
export function isUnrecoverableTokenRejection(result: SendResult): boolean {
  return (
    result.status === 'rejected' &&
    (result.detail?.startsWith(`${DETAIL_PREFIX.unrecoverable_token}:`) ?? false)
  );
}
