// Verification-code generation + extraction — Story 5.5 (Task 3).
//
// The unique per-PENDING match token handed to the member via the `t.me/<bot>?start=<code>` deep-link.
// Tapping the link opens the bot and sends `/start <code>`; the worker extracts the code from the inbound
// message text and matches it to the outstanding PENDING. It must (a) survive round-tripping through the
// Telegram `start` deep-link parameter unchanged, (b) be cleanly extractable from a `/start <code>` message,
// and (c) be unique enough that two members' PENDING codes never collide within a Pariwar (the DB
// partial-unique index is the backstop; this generator supplies the entropy).
//
// ── The Telegram `start` param charset ─────────────────────────────────────────────────────────────────
// Telegram's Bot API restricts the deep-link `start` parameter to `[A-Za-z0-9_-]`, ≤64 characters. So the
// code alphabet is a subset of that (a Crockford-ish set with visually ambiguous characters removed so a
// member could read + retype it), and the total length stays well under 64.
//
// ── Entropy discipline ─────────────────────────────────────────────────────────────────────────────────
// Uses `crypto.randomBytes` — NEVER Math.random. Modulo bias is avoided by rejection sampling.

import { randomBytes } from 'node:crypto';

/** The human-legible, start-param-safe, unambiguous code alphabet (subset of Telegram's [A-Za-z0-9_-]). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** The fixed, greppable prefix — the anchor the extractor keys on. All chars are start-param-safe. */
export const VERIFICATION_CODE_PREFIX = 'TWT-';
/** The random-suffix length (30^8 ≈ 6.5e11 combinations — collision-negligible; the DB index is the backstop). */
const CODE_SUFFIX_LENGTH = 8;
/** Telegram's hard cap on the `start` deep-link parameter. */
export const TELEGRAM_START_PARAM_MAX_LENGTH = 64;

/**
 * Generate a fresh verification code, e.g. `TWT-7K2F9QXR`. Cryptographically random suffix over the
 * unambiguous alphabet. Modulo bias is avoided by rejection sampling within a generous byte budget (the
 * alphabet is 30, well under 256). The full code (prefix + suffix) stays well under Telegram's 64-char cap.
 */
export function generateVerificationCode(): string {
  let suffix = '';
  while (suffix.length < CODE_SUFFIX_LENGTH) {
    const bytes = randomBytes(CODE_SUFFIX_LENGTH * 2);
    const limit = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;
    for (const b of bytes) {
      if (suffix.length >= CODE_SUFFIX_LENGTH) break;
      if (b < limit) suffix += CODE_ALPHABET[b % CODE_ALPHABET.length];
    }
  }
  return `${VERIFICATION_CODE_PREFIX}${suffix}`;
}

/** The extraction matcher — the fixed prefix + exactly the suffix-length of alphabet chars. */
const CODE_EXTRACT_REGEX = new RegExp(`${VERIFICATION_CODE_PREFIX}[${CODE_ALPHABET}]{${CODE_SUFFIX_LENGTH}}`);
/** Unicode dash variants a keyboard/autocorrect can substitute for the code's ASCII hyphen. */
const DASH_VARIANTS = /[\u2010-\u2015\u2212]/g;

/**
 * Extract the verification code from an inbound Telegram `/start <code>` message body, or null when none is
 * present. Telegram sends the deep-link `start` parameter as `/start <code>` when the bot is opened via the
 * link, but a member could also paste/retype it (lowercase, or with an autocorrected Unicode dash) — so this
 * uppercases the body and normalizes dash variants to `-` before scanning for the anchored `TWT-XXXXXXXX`
 * token. The alphabet excludes ambiguous lowercase-only characters, so uppercasing is lossless for a genuine
 * code.
 */
export function extractStartCode(messageBody: string): string | null {
  const normalized = messageBody.toUpperCase().replace(DASH_VARIANTS, '-');
  const m = CODE_EXTRACT_REGEX.exec(normalized);
  return m ? m[0] : null;
}
