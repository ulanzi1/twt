// Push device-token Tier-1 encryption + blind-index helpers — Story 5.2 (Task 3/4).
//
// ── RELOCATED to @twt/domain by Story 8.8 (Task 1) — this module is now a thin re-export ────────────
// The implementations moved to `packages/domain/src/encryption/member-fields.ts` VERBATIM. Story 8.8's
// live notification fan-out runs in `apps/jobs`, which cannot import `apps/api` (apps/api already
// depends on `@twt/jobs`, so the reverse edge is a turbo cycle), and the delivery resolver must decrypt
// under the EXACT context this registration path encrypted under — a by-value duplicate would be a
// silent-drift hazard on Tier-1 PII. This file keeps its path + exported names so every existing
// apps/api import is unchanged.
//
// The encryption context still keys on the OWNING PRINCIPAL's `pariwarId` (a member's REAL Pariwar; an
// admin's ADMIN_GLOBAL_NAMESPACE sentinel) via `MEMBER_DEVICE_TOKEN_FIELD_CLASS` — the SAME context the
// delivery resolver decrypts under, so a mismatch throws at decrypt time rather than silently succeeding.
//
// NEVER log a decrypted token (Tier-1 PII). The audit hash over a token is the blind index, never the
// raw token or sha256(token) (AI-4-3(c)).

import { encryption } from '@twt/domain';

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a device token. */
export const encryptDeviceToken = encryption.encryptDeviceToken;

/** Decrypt a stored device-token envelope back to the raw token (delivery-resolver send-time read). */
export const decryptDeviceToken = encryption.decryptDeviceToken;

/** The token's per-Pariwar blind index — the dedup/lookup key, the AI-4-3(c) audit hash, and the
 *  `markInvalid` lookup. A 64-hex keyed HMAC, NOT sha256(token). */
export const deviceTokenBlindIndex = encryption.deviceTokenBlindIndex;
