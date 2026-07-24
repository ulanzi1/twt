// Member mobile — normalizer + Tier-1 envelope + blind index (Story 3.2, Task 1).
//
// ── RELOCATED to @twt/domain by Story 8.8 (Task 1) — this module is now a thin re-export ────────────
// The implementations moved to `packages/domain/src/encryption/member-fields.ts` VERBATIM. Story 8.8's
// live notification fan-out runs in `apps/jobs` and resolves the SMS / WhatsApp delivery target by
// decrypting the member's Tier-1 mobile — the same decrypt this module owned. `apps/jobs` cannot import
// `apps/api` (the reverse dependency edge is a turbo cycle), and duplicating a Tier-1 decrypt context by
// value is a silent-drift hazard, so the helpers moved down and this file keeps its path + exported
// names so every existing apps/api import is unchanged.
//
// The substance is unchanged: mobile is Tier-1 PII (§2.7) AND a login EQUALITY-lookup key, so alongside
// the non-deterministic Tier-1 ciphertext we compute a deterministic blind index keyed on the FIXED
// `MEMBER_IDENTITY_NAMESPACE` (member login runs BEFORE any Pariwar is known, R2), distinct from the
// admin namespace so a numeric admin email and a mobile can never collide. `+91 98765 43210`,
// `09876543210`, and `9876543210` all canonicalise to `+91XXXXXXXXXX`, so they map to ONE member; a
// value that cannot be normalised returns `null` (the caller treats it as a non-existent member — the
// request endpoint still returns `{ sent: true }`, enumeration defense).

import { encryption } from '@twt/domain';

/** Canonicalise a raw mobile to E.164 `+91XXXXXXXXXX`, or `null` if it is not a valid Indian mobile. */
export const normalizeMobile = encryption.normalizeMobile;

/** The masked form safe for audit/display — country code + last 4 only. */
export const maskMobile = encryption.maskMobile;

/** Deterministic blind index of a raw mobile — the UNIQUE login lookup key — or `null` on a bad number. */
export const mobileBlindIndex = encryption.mobileBlindIndex;

/** Tier-1 envelope ciphertext (serialized) of the normalized mobile. Throws on a bad number. */
export const encryptMobile = encryption.encryptMobile;

/** Decrypt a stored mobile envelope back to plaintext (display/recovery + delivery-target resolution). */
export const decryptMobile = encryption.decryptMobile;
