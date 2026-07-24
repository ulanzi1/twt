// Member KYC-profile Tier-1 encryption helpers — Story 3.3b (Task 1/Task 3).
//
// ── RELOCATED to @twt/domain by Story 8.8 (Task 1) — this module is now a thin re-export ────────────
// The implementations moved to `packages/domain/src/encryption/member-fields.ts` VERBATIM. Story 8.8's
// cycle-open notification payload names the DECEASED family (first-name + last-initial, AC1), which
// means decrypting the deceased member's KYC name from `apps/jobs` — and `apps/jobs` cannot import
// `apps/api` (the reverse dependency edge is a turbo cycle). This file keeps its path + exported names
// so every existing apps/api import is unchanged.
//
// The substance is unchanged: unlike the admin-email / member-mobile families (which key on a fixed
// global sentinel because their lookup runs pre-scope), the KYC profile is a TENANT table — the
// encryption context keys on the member's REAL `pariwarId` (`MEMBER_KYC_FIELD_CLASS`).
//
// NEVER log a decrypted value. The summary view never round-trips the photo (a presence flag).

import { encryption } from '@twt/domain';

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a member KYC field. */
export const encryptKycField = encryption.encryptKycField;

/** Decrypt a stored member KYC envelope back to plaintext (the status/confirm read path). */
export const decryptKycField = encryption.decryptKycField;
