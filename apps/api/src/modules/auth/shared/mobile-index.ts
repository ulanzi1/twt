// Member mobile — normalizer + Tier-1 envelope + blind index (Story 3.2, Task 1).
//
// Mobile is Tier-1 PII (§2.7) AND a login EQUALITY-lookup key (the same problem as
// the admin email, mirror `email-index.ts`). Tier-1 ciphertext is non-deterministic
// (per-row DEK) so it can't be queried — so we ALSO compute a deterministic blind
// index, the login lookup key. Both key on the FIXED `MEMBER_IDENTITY_NAMESPACE`
// (member login runs BEFORE any Pariwar is known, R2), distinct from the admin
// namespace so a numeric admin email + a mobile can never collide.
//
// ── Normalization (canonical → one blind index) ───────────────────────────────
// `+91 98765 43210`, `09876543210`, and `9876543210` all canonicalise to the E.164
// form `+91XXXXXXXXXX`, so they map to ONE member. A value that cannot be normalised
// to a valid Indian mobile returns `null` — the caller treats it as a non-existent
// member (the request endpoint still returns `{ sent: true }`, enumeration defense).

import { encryption } from '@twt/domain';

import {
  MEMBER_IDENTITY_NAMESPACE,
  MEMBER_MOBILE_FIELD_CLASS,
  type EncryptionDeps,
} from '../../../context.js';

const ENC_CONTEXT = {
  pariwarId: MEMBER_IDENTITY_NAMESPACE,
  fieldClass: MEMBER_MOBILE_FIELD_CLASS,
} as const;

/** Indian mobile core: exactly 10 digits, first digit 6-9 (TRAI mobile series). */
const INDIAN_MOBILE_CORE = /^[6-9]\d{9}$/;

/**
 * Canonicalise a raw mobile to E.164 `+91XXXXXXXXXX`, or `null` if it is not a
 * valid Indian 10-digit mobile. Strips separators, then peels a `+91` / `91` /
 * leading-`0` prefix down to the 10-digit core.
 */
export function normalizeMobile(raw: string): string | null {
  // Keep digits only (drops +, spaces, hyphens, parens).
  let digits = raw.replace(/\D/g, '');
  // Peel country / trunk prefixes down to the 10-digit core.
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (!INDIAN_MOBILE_CORE.test(digits)) return null;
  return `+91${digits}`;
}

/** The masked form safe for audit/display — country code + last 4 only. */
export function maskMobile(canonical: string): string {
  // canonical is +91XXXXXXXXXX (13 chars); show +91·····NNNN.
  const last4 = canonical.slice(-4);
  return `+91·····${last4}`;
}

/**
 * Deterministic blind index of a raw mobile — the UNIQUE login lookup key — or
 * `null` if the input does not normalise to a valid Indian mobile.
 */
export async function mobileBlindIndex(raw: string, enc: EncryptionDeps): Promise<string | null> {
  const canonical = normalizeMobile(raw);
  if (canonical === null) return null;
  return encryption.blindIndex(
    MEMBER_MOBILE_FIELD_CLASS,
    canonical,
    { pariwarId: MEMBER_IDENTITY_NAMESPACE },
    enc.kms,
    enc.hmacKeyRef,
  );
}

/** Tier-1 envelope ciphertext (serialized) of the normalized mobile. Throws on a bad number. */
export async function encryptMobile(canonical: string, enc: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(
    Buffer.from(canonical, 'utf-8'),
    ENC_CONTEXT,
    enc.kms,
    enc.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}

/** Decrypt a stored mobile envelope back to plaintext (display/recovery only). */
export async function decryptMobile(serialized: string, enc: EncryptionDeps): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, ENC_CONTEXT, enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}
