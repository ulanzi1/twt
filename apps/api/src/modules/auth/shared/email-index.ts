// Admin email — Tier-1 envelope + Tier-2 blind index (Story 1.9, AC-1, Dev Note
// "Admin email is Tier-1 PII").
//
// Email is Tier-1 PII (§2.7) but login is an EQUALITY lookup, and Tier-1 ciphertext
// is non-deterministic (per-row DEK) so it can't be queried. So:
//   - `encryptEmail`  → Tier-1 envelope (serialized `enc:v1:…`), for display/recovery.
//   - `emailBlindIndex` → deterministic HMAC-SHA-256 (`pariwar:<global-ns>|admin_email:<email>`),
//     the UNIQUE login lookup key.
// Admin identity is GLOBAL (R2), so the blind-index + envelope context key on the
// nil-UUID ADMIN_GLOBAL_NAMESPACE (never a real tenant). Email is normalized
// (trim+lowercase) before both so `Foo@x.com` and `foo@x.com` map to one admin.

import { encryption } from '@twt/domain';

import {
  ADMIN_EMAIL_FIELD_CLASS,
  ADMIN_GLOBAL_NAMESPACE,
  type EncryptionDeps,
} from '../../../context.js';

const ENC_CONTEXT = {
  pariwarId: ADMIN_GLOBAL_NAMESPACE,
  fieldClass: ADMIN_EMAIL_FIELD_CLASS,
} as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Deterministic blind index — the UNIQUE login lookup key. */
export async function emailBlindIndex(email: string, enc: EncryptionDeps): Promise<string> {
  return encryption.blindIndex(
    ADMIN_EMAIL_FIELD_CLASS,
    normalizeEmail(email),
    { pariwarId: ADMIN_GLOBAL_NAMESPACE },
    enc.kms,
    enc.hmacKeyRef,
  );
}

/** Tier-1 envelope ciphertext (serialized) of the normalized email. */
export async function encryptEmail(email: string, enc: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(
    Buffer.from(normalizeEmail(email), 'utf-8'),
    ENC_CONTEXT,
    enc.kms,
    enc.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}

/** Decrypt a stored email envelope back to plaintext (display/recovery only). */
export async function decryptEmail(serialized: string, enc: EncryptionDeps): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, ENC_CONTEXT, enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}
