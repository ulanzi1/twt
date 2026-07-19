// Idempotent contribution payment-reference derivation — Story 7.7 (Task 1; AC1/AC4).
//
// The deterministic, bounded, VERSION-PINNED `tr=` a UPI Intent carries so that repeated
// payments for one (member, alert) reconcile as a SINGLE valid contribution — idempotency by
// CONSTRUCTION (AC1 of the epic). This is a [PRIMITIVE]: it commits the pure derivation two
// later epics consume — it does NOT build the consumers. Epic 8's <UPIIntentButton> (Story 8.6)
// is the PRODUCER that pre-fills `upi://pay?…tr=…&am=…` from THIS derivation; Epic 9's reconciler
// is the DEDUPE consumer that keys the Story 1.12 keyed store on the `tr=` this returns (it does
// NOT call keyedStore.claim here — the [[project_channels_no_live_dispatch_yet]] / 7.6-D3 seam).
// Transport-free, decryption-free, I/O-free — a pure function of its two inputs.
//
// ── THE version pin is the most important API in this module (D1, the assign.ts D0 precedent) ─
// `CONTRIBUTION_REF_VERSION` is a SCHEMA-GRADE whole-contract version, NOT a cosmetic tag: it
// gates the ENTIRE four-tuple { prefix, hash function, preimage delimiter/encoding, truncation
// width }. Epic 9's reconciler must reproduce the IDENTICAL `tr=` from (member_id, alert_id) + the
// version pin at ANY time — replay identity. A change to ANY of the four elements re-routes/duplicates
// real contributions for already-issued references, so it MUST bump `'v1' → 'v2'` DELIBERATELY and is
// caught by the FROZEN seeded vectors in contribution-reference.test.ts (never "fix" a failing vector
// by pasting the new bytes — that silently breaks the idempotency guarantee, the 7.4 frozen-vector rule).
//
// ── Why a BOUNDED derivation, not the literal `contrib-{member_id}-{alert_id}-{nonce}` (D1) ────
// Read literally with UUID ids, the epic's sketch is ~90 chars — well past the NPCI transaction-
// reference ceiling (~35 chars). A UPI app that truncates a too-long `tr=` would COLLIDE (two distinct
// (member, alert) pairs sharing a truncated prefix) and silently break the one-valid-contribution-per-
// alert guarantee — so length is a first-class CORRECTNESS property, not cosmetics. We honor the AC's
// INTENT (deterministic, stable-per-(member,alert), dedupe-able) with a bounded digest: the epic's
// "{nonce}" IS this deterministic derived digest component (same for repeats → idempotent), never a
// per-attempt random value (a random nonce would defeat idempotency by construction).
//
// ── plain hash, not a keyed HMAC (D1 sub-decision — FLAGGED to review) ─────────────────────────
// A plain SHA-256 digest is ENUMERABLE (anyone with member_id + alert_id can recompute the `tr=`), but
// both are internal UUIDs never exposed to members, so enumerability is low-risk. A keyed HMAC buys
// non-guessability but introduces a KEY-ROTATION hazard: rotating the key changes every `tr=` → breaks
// idempotency for in-flight alerts, so the key would itself need pinning/versioning. We ship the plain
// version-pinned hash for replay-safety + simplicity; HMAC is noted as deferred hardening if a threat
// model ever demands non-enumerability. CARRY FORWARD to Story 8.6: confirm the exact NPCI `tr` length +
// charset the target UPI apps accept (BHIM/PhonePe/GPay/Paytm) — the pinned width below is conservative
// but is a real UPI-app-behavior dependency.

import { createHash } from 'node:crypto';

import type { AlertId, MemberId } from '../ids/index.js';

/**
 * The WHOLE-CONTRACT replay-identity version. Gates { prefix, hash fn, preimage delimiter/encoding,
 * truncation width } — a change to ANY of the four is a replay-identity break and MUST bump this
 * constant (see the D1 header). The frozen reference vectors in contribution-reference.test.ts pin it.
 */
export const CONTRIBUTION_REF_VERSION = 'v1' as const;

/**
 * The stable, human-recognizable reference prefix (the epic's `contrib-` sketch). Part of the version
 * pin — a member/support agent reading a UPI history sees `contrib-v1-…` and knows it is a TWT
 * contribution reference. Lowercase + a trailing hyphen so the composed reference is a clean token.
 */
export const CONTRIBUTION_REF_PREFIX = 'contrib-' as const;

/**
 * The pinned preimage delimiter between `member_id` and `alert_id` (the assign.ts `:` precedent). Part
 * of the version pin. UUIDs are fixed-width so ambiguity is already low, but the explicit delimiter is
 * cheap insurance and self-documents the `(member_id, alert_id)` preimage intent (FR-17).
 */
const CONTRIBUTION_REF_PREIMAGE_DELIM = ':';

/**
 * The pinned truncation width, in bytes, of the SHA-256 digest read as the reference body. Part of the
 * version pin — widening/narrowing it changes every reference. 12 bytes = 96 bits: ample collision
 * resistance for the (member, alert) space (birthday bound ~2^48) while keeping the base32 body compact
 * (20 chars) so the whole reference clears the NPCI ceiling with headroom.
 */
const CONTRIBUTION_REF_DIGEST_BYTES = 12;

/**
 * The safe upper bound on a UPI `tr=` (the NPCI transaction-reference ceiling, ~35 chars). The derivation
 * asserts its output never exceeds this (AC1.3): a reference some UPI app would truncate is a correctness
 * failure, so the length is checked at derivation time, not merely asserted by a test. A future
 * truncation-width bump that blows this ceiling fails loudly here rather than shipping a colliding `tr=`.
 */
export const CONTRIBUTION_REF_MAX_LENGTH = 35;

/**
 * RFC 4648 base32 alphabet, LOWERCASE. Case-uniform lowercase alphanumerics are the safest charset for a
 * UPI `tr=` (some UPI apps normalize case); base32 avoids the `+`/`/`/`_`/`-` of base64url. No padding —
 * the reference is fixed-width so `=` padding would only add noise (and `=` is not `tr=`-safe).
 */
const BASE32_LOWER_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

/**
 * Encode a byte buffer as lowercase, unpadded RFC 4648 base32. Pure. Processes the bytes as a big-endian
 * bit stream, emitting one alphabet char per 5 bits (a trailing partial group is left-padded with zero
 * bits). `value` never exceeds ~12 bits between drains, so the 32-bit bitwise ops never overflow.
 */
function base32LowerNoPad(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_LOWER_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_LOWER_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

/**
 * The PURE string core of the derivation (AC1.1) — operates over plain strings so unit/property tests can
 * feed arbitrary inputs (the 7.6 `classifyContributionDestination` string-core precedent). Builds the
 * delimited preimage, SHA-256-hashes it (the node:crypto pattern in assign.ts / snapshot.ts / names.ts),
 * truncates to the pinned width, base32-encodes, and prefixes `contrib-{version}-`. Deterministic — no
 * clock, no DB, no randomness → the SAME (memberId, alertId) always yields the SAME reference (stable
 * across repeated payment attempts = idempotency by construction). Fails loud if the result would exceed
 * the NPCI ceiling (a mis-pinned truncation width, never a caller error), or if either input contains the
 * preimage delimiter (which would let two distinct pairs collide onto the same preimage).
 */
export function contributionReferenceCore(memberId: string, alertId: string): string {
  if (memberId.includes(CONTRIBUTION_REF_PREIMAGE_DELIM) || alertId.includes(CONTRIBUTION_REF_PREIMAGE_DELIM)) {
    throw new Error(
      `[deriveContributionReference] memberId/alertId must not contain the preimage delimiter ` +
        `'${CONTRIBUTION_REF_PREIMAGE_DELIM}' — an embedded delimiter can collide two distinct (member, alert) ` +
        `pairs onto the same preimage, silently breaking the idempotency guarantee`,
    );
  }
  const preimage = `${memberId}${CONTRIBUTION_REF_PREIMAGE_DELIM}${alertId}`;
  const digest = createHash('sha256').update(preimage, 'utf8').digest().subarray(0, CONTRIBUTION_REF_DIGEST_BYTES);
  const reference = `${CONTRIBUTION_REF_PREFIX}${CONTRIBUTION_REF_VERSION}-${base32LowerNoPad(digest)}`;
  if (reference.length > CONTRIBUTION_REF_MAX_LENGTH) {
    throw new Error(
      `[deriveContributionReference] derived reference exceeds the ${String(CONTRIBUTION_REF_MAX_LENGTH)}-char UPI tr= ceiling ` +
        `(got ${String(reference.length)}) — a truncation-width change must re-pin CONTRIBUTION_REF_VERSION and the ceiling`,
    );
  }
  return reference;
}

/**
 * Derive the idempotent contribution payment reference (`tr=`) for a (member, alert) pair (AC1). Accepts
 * the branded {@link MemberId} + {@link AlertId} (the derivation ships with NO live call site — Epic 8's
 * <UPIIntentButton> is the producer, Epic 9 the dedupe consumer; no live alert exists in Epic 7, AC1.4).
 * Deterministic, bounded, version-pinned, PURE — see {@link contributionReferenceCore}.
 */
export function deriveContributionReference(input: {
  readonly memberId: MemberId;
  readonly alertId: AlertId;
}): string {
  return contributionReferenceCore(input.memberId, input.alertId);
}
