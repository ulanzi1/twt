// Push device-token Tier-1 encryption + blind-index helpers — Story 5.2 (Task 3/4).
//
// Encryption is an APP-LAYER concern: the registration route encrypts the token + computes its blind index
// before handing ciphertext to the `upsertActiveToken` accessor (the nominee-crypto precedent). The
// encryption context keys on the OWNING PRINCIPAL's `pariwarId` (a member's REAL Pariwar; an admin's
// ADMIN_GLOBAL_NAMESPACE sentinel) via `MEMBER_DEVICE_TOKEN_FIELD_CLASS` — the SAME context the delivery
// resolver decrypts under, so a mismatch throws at decrypt time rather than silently succeeding.
//
// NEVER log a decrypted token (Tier-1 PII). The audit hash over a token is the blind index, never the raw
// token or sha256(token) (AI-4-3(c)).

import { encryption } from '@twt/domain';

import { MEMBER_DEVICE_TOKEN_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: MEMBER_DEVICE_TOKEN_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a device token. */
export async function encryptDeviceToken(token: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(Buffer.from(token, 'utf-8'), encContext(pariwarId), enc.kms, enc.kekRef);
  return encryption.serializeEnvelope(ct);
}

/** Decrypt a stored device-token envelope back to the raw token (delivery-resolver send-time read). */
export async function decryptDeviceToken(serialized: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}

/**
 * The token's per-Pariwar blind index — the dedup/lookup key on the unique constraint + the AI-4-3(c)
 * audit hash + the `markInvalid` lookup. A 64-hex keyed HMAC (per-Pariwar context-bound), NOT sha256(token).
 */
export function deviceTokenBlindIndex(token: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  return encryption.blindIndex(MEMBER_DEVICE_TOKEN_FIELD_CLASS, token, { pariwarId }, enc.kms, enc.hmacKeyRef);
}
