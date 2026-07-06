// Verification-phrase generation + extraction — Story 5.4 (Task 3; Dev Notes "Verification-phrase generation").
//
// The unique per-PENDING match token pre-filled into the Send-Hello deep-link. It must (a) survive
// round-tripping through WhatsApp's message text unchanged, (b) be cleanly extractable from the inbound
// message body by the worker, and (c) be unique enough that two members' PENDING phrases never collide
// within a Pariwar (the DB partial-unique index is the backstop; this generator supplies the entropy).
//
// ── Entropy discipline ─────────────────────────────────────────────────────────────────────────────────
// Uses `crypto.randomBytes` — NEVER Math.random. The alphabet is a Crockford-ish set with the visually
// ambiguous characters (0/O, 1/I/L) removed so a member can read + retype the phrase without error, and it is
// URL-safe (survives the wa.me deep-link URL-encode) and WhatsApp-text-safe (no whitespace/punctuation).

import { randomBytes } from 'node:crypto';

/** The human-legible, URL-safe, unambiguous phrase alphabet (no 0/O/1/I/L). */
const PHRASE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** The fixed, greppable prefix — the anchor the extractor keys on inside a free-text message body. */
export const VERIFICATION_PHRASE_PREFIX = 'TWT-';
/** The random-suffix length (30^8 ≈ 6.5e11 combinations — collision-negligible; the DB index is the backstop). */
const PHRASE_SUFFIX_LENGTH = 8;

/**
 * Generate a fresh verification phrase, e.g. `TWT-7K2F9QXR`. Cryptographically random suffix over the
 * unambiguous alphabet. Rejection-free modulo bias is avoided by masking each byte to the alphabet size via
 * rejection sampling within a generous byte budget (the alphabet is 30, well under 256).
 */
export function generateVerificationPhrase(): string {
  let suffix = '';
  while (suffix.length < PHRASE_SUFFIX_LENGTH) {
    // Draw a batch of random bytes; keep only those below the largest multiple of the alphabet size to avoid
    // modulo bias, then map to the alphabet.
    const bytes = randomBytes(PHRASE_SUFFIX_LENGTH * 2);
    const limit = Math.floor(256 / PHRASE_ALPHABET.length) * PHRASE_ALPHABET.length;
    for (const b of bytes) {
      if (suffix.length >= PHRASE_SUFFIX_LENGTH) break;
      if (b < limit) suffix += PHRASE_ALPHABET[b % PHRASE_ALPHABET.length];
    }
  }
  return `${VERIFICATION_PHRASE_PREFIX}${suffix}`;
}

/** The extraction matcher — the fixed prefix + exactly the suffix-length of alphabet chars. */
const PHRASE_EXTRACT_REGEX = new RegExp(
  `${VERIFICATION_PHRASE_PREFIX}[${PHRASE_ALPHABET}]{${PHRASE_SUFFIX_LENGTH}}`,
);
/** Unicode dash variants a keyboard/autocorrect can substitute for the phrase's ASCII hyphen. */
const DASH_VARIANTS = /[\u2010-\u2015\u2212]/g;

/**
 * Extract the first verification phrase from an inbound WhatsApp message body, or null when none is present.
 * The member's Send-Hello message is the pre-filled phrase, but a member may add surrounding words, retype it
 * in lowercase, or have autocorrect swap the ASCII hyphen for a Unicode dash — so this uppercases the body and
 * normalizes dash variants to `-` before scanning for the anchored `TWT-XXXXXXXX` token, rather than requiring
 * an exact-case, exact-punctuation match. The alphabet excludes ambiguous lowercase-only characters, so
 * uppercasing is lossless for a genuine phrase.
 */
export function extractVerificationPhrase(messageBody: string): string | null {
  const normalized = messageBody.toUpperCase().replace(DASH_VARIANTS, '-');
  const m = PHRASE_EXTRACT_REGEX.exec(normalized);
  return m ? m[0] : null;
}
