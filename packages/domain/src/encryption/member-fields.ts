// Member PII field crypto helpers — RELOCATED here by Story 8.8 (Task 1).
//
// The device-token / mobile / KYC-name Tier-1 envelope + blind-index helpers, moved VERBATIM from
// `apps/api` (`modules/device-token/device-token-crypto.ts`, `modules/auth/shared/mobile-index.ts`,
// `modules/kyc/kyc-crypto.ts`). Story 8.8's live notification fan-out runs in `apps/jobs`, which
// cannot import `apps/api` (the reverse dependency edge is a turbo cycle — see field-classes.ts), and
// a by-value duplicate of a Tier-1 decrypt context is a silent-drift hazard on real PII. Each original
// apps/api module now RE-EXPORTS from here, so no apps/api call site changed.
//
// Encryption stays an app-layer concern in the sense that matters: the route/worker encrypts before
// handing ciphertext to an accessor, and decrypts at the composition layer — never inside `dispatch`
// / a `ChannelProvider` / a DB accessor. What moved is only WHERE the shared helper lives.
//
// NEVER log a decrypted value (Tier-1 PII). The audit hash over a token/mobile is its blind index,
// never the raw value or `sha256(rawPII)` (AI-4-3(c)).

import { blindIndex } from './blind-index.js';
import { decryptTier1, encryptTier1, parseEnvelope, serializeEnvelope } from './envelope.js';
import {
  MEMBER_DEVICE_TOKEN_FIELD_CLASS,
  MEMBER_IDENTITY_NAMESPACE,
  MEMBER_KYC_FIELD_CLASS,
  MEMBER_MOBILE_FIELD_CLASS,
  type FieldCryptoDeps,
} from './field-classes.js';

// ── Push device tokens (Story 5.2) ──────────────────────────────────────────────────────────────

function deviceTokenContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: MEMBER_DEVICE_TOKEN_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a device token. */
export async function encryptDeviceToken(
  token: string,
  pariwarId: string,
  enc: FieldCryptoDeps,
): Promise<string> {
  const ct = await encryptTier1(
    Buffer.from(token, 'utf-8'),
    deviceTokenContext(pariwarId),
    enc.kms,
    enc.kekRef,
  );
  return serializeEnvelope(ct);
}

/** Decrypt a stored device-token envelope back to the raw token (delivery-resolver send-time read). */
export async function decryptDeviceToken(
  serialized: string,
  pariwarId: string,
  enc: FieldCryptoDeps,
): Promise<string> {
  const ct = parseEnvelope(serialized);
  const bytes = await decryptTier1(ct, deviceTokenContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}

/**
 * The token's per-Pariwar blind index — the dedup/lookup key on the unique constraint + the AI-4-3(c)
 * audit hash + the `markInvalid` lookup. A 64-hex keyed HMAC (per-Pariwar context-bound), NOT
 * `sha256(token)`.
 */
export function deviceTokenBlindIndex(
  token: string,
  pariwarId: string,
  enc: FieldCryptoDeps,
): Promise<string> {
  return blindIndex(
    MEMBER_DEVICE_TOKEN_FIELD_CLASS,
    token,
    { pariwarId },
    enc.kms,
    enc.hmacKeyRef,
  );
}

// ── Member mobile (Story 3.2) ───────────────────────────────────────────────────────────────────

const MOBILE_ENC_CONTEXT = {
  pariwarId: MEMBER_IDENTITY_NAMESPACE,
  fieldClass: MEMBER_MOBILE_FIELD_CLASS,
} as const;

/** Indian mobile core: exactly 10 digits, first digit 6-9 (TRAI mobile series). */
const INDIAN_MOBILE_CORE = /^[6-9]\d{9}$/;

/**
 * Canonicalise a raw mobile to E.164 `+91XXXXXXXXXX`, or `null` if it is not a valid Indian 10-digit
 * mobile. Strips separators, then peels a `+91` / `91` / leading-`0` prefix down to the 10-digit core.
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
 * Deterministic blind index of a raw mobile — the UNIQUE login lookup key — or `null` if the input
 * does not normalise to a valid Indian mobile.
 */
export async function mobileBlindIndex(raw: string, enc: FieldCryptoDeps): Promise<string | null> {
  const canonical = normalizeMobile(raw);
  if (canonical === null) return null;
  return blindIndex(
    MEMBER_MOBILE_FIELD_CLASS,
    canonical,
    { pariwarId: MEMBER_IDENTITY_NAMESPACE },
    enc.kms,
    enc.hmacKeyRef,
  );
}

/** Tier-1 envelope ciphertext (serialized) of the normalized mobile. Throws on a bad number. */
export async function encryptMobile(canonical: string, enc: FieldCryptoDeps): Promise<string> {
  const ct = await encryptTier1(
    Buffer.from(canonical, 'utf-8'),
    MOBILE_ENC_CONTEXT,
    enc.kms,
    enc.kekRef,
  );
  return serializeEnvelope(ct);
}

/** Decrypt a stored mobile envelope back to plaintext (display/recovery + SMS/WA target resolution). */
export async function decryptMobile(serialized: string, enc: FieldCryptoDeps): Promise<string> {
  const ct = parseEnvelope(serialized);
  const bytes = await decryptTier1(ct, MOBILE_ENC_CONTEXT, enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}

// ── Member KYC profile fields (Story 3.3b) ──────────────────────────────────────────────────────

function kycContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: MEMBER_KYC_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a member KYC field. */
export async function encryptKycField(
  value: string,
  pariwarId: string,
  enc: FieldCryptoDeps,
): Promise<string> {
  const ct = await encryptTier1(Buffer.from(value, 'utf-8'), kycContext(pariwarId), enc.kms, enc.kekRef);
  return serializeEnvelope(ct);
}

/** Decrypt a stored member KYC envelope back to plaintext (the status/confirm + notification reads). */
export async function decryptKycField(
  serialized: string,
  pariwarId: string,
  enc: FieldCryptoDeps,
): Promise<string> {
  const ct = parseEnvelope(serialized);
  const bytes = await decryptTier1(ct, kycContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}
