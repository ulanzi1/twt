// Backup recovery codes (Story 1.9, AC-2).
//
// 10 one-time-use codes provisioned at first WebAuthn enrollment, returned to the
// admin ONCE (never re-derivable) and stored HASHED. Codes are high-entropy random
// (80 bits) so a fast hash (SHA-256) is appropriate — unlike low-entropy passwords,
// they don't need Argon2's slow KDF. Consumption is constant-time-compared by hash
// and burned (single-use).

import { createHash, randomBytes } from 'node:crypto';

const CODE_COUNT = 10;
const CODE_BYTES = 10; // 80 bits → ~16 base32 chars

// Crockford-ish base32 alphabet (no I/L/O/U — avoids ambiguity when typed).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeBase32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Normalize for comparison: strip separators/whitespace, uppercase. */
export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/** Format a raw code as `XXXXX-XXXXX-XXXXX…` for human display. */
function formatCode(raw: string): string {
  return raw.match(/.{1,5}/g)?.join('-') ?? raw;
}

/** SHA-256 hex of the normalized code (the stored form). */
export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex');
}

/** Generate `CODE_COUNT` display codes + their hashes (store hashes, show codes once). */
export function generateRecoveryCodes(): { codes: string[]; hashes: string[] } {
  const codes: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < CODE_COUNT; i++) {
    const code = formatCode(encodeBase32(randomBytes(CODE_BYTES)));
    codes.push(code);
    hashes.push(hashRecoveryCode(code));
  }
  return { codes, hashes };
}
