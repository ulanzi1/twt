// The correction chase's Tier-1 encryption helpers — Story 6.19b (Task 7; the `claim-contact-crypto.ts` precedent).
//
// Two NEW field classes, each matching its `piiColumn(1, …)` annotation, keyed on the claim's REAL `pariwarId`:
//   · `claim_correction_letter` — a posted letter's TRACKING NUMBER (`claim_correction_letters.tracking_number_ciphertext`);
//   · `claim_correction_mark`   — the District Admin's NOTE on a "who must act" change (`claim_correction_marks.note_ciphertext`).
// The letter's ADDRESS is ⛔ not here — it is the contact record's own column, read back through
// `decryptClaimContactField` (the `claim_contact` class it was written under).
// ⛔ NEVER log a decrypted value; ⛔ never put one in an event payload, an audit line or an error body.

import { encryption } from '@twt/domain';

import type { EncryptionDeps } from '../../context.js';

export const CLAIM_CORRECTION_LETTER_FIELD_CLASS = 'claim_correction_letter';
export const CLAIM_CORRECTION_MARK_FIELD_CLASS = 'claim_correction_mark';

async function encryptWith(value: string, pariwarId: string, fieldClass: string, enc: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(Buffer.from(value, 'utf-8'), { pariwarId, fieldClass }, enc.kms, enc.kekRef);
  return encryption.serializeEnvelope(ct);
}

/** Tier-1 envelope ciphertext of a letter's tracking number. */
export function encryptCorrectionTrackingNumber(value: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  return encryptWith(value.trim(), pariwarId, CLAIM_CORRECTION_LETTER_FIELD_CLASS, enc);
}

/** Tier-1 envelope ciphertext of a "who must act" change note. */
export function encryptCorrectionMarkNote(value: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  return encryptWith(value.trim(), pariwarId, CLAIM_CORRECTION_MARK_FIELD_CLASS, enc);
}
