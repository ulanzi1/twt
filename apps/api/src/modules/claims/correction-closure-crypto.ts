// The correction CLOSURE's Tier-1 encryption helpers — Story 6.19c (AC9c; the `correction-chase-crypto.ts` precedent).
//
// Four NEW field classes, each matching its `piiColumn(1, …)` annotation, keyed on the claim's REAL `pariwarId`:
//   · `claim_correction_closure`   — every staff NOTE on a closures row (the request, the Pariwar Admin's decision, the
//                                    hold under review, the Super Admin's decision) and the "no correction needed" record;
//   · `claim_correction_direction` — a Super Admin direction's TEXT and the directee's RESPONSE;
//   · `claim_refile_confirmation`  — a re-file confirmation's NOTE;
//   · `claim_closure_letter`       — a closure letter's TRACKING NUMBER.
// The mark note of a "no correction needed" record / a keep is 6.19b's `claim_correction_mark` (`encryptCorrectionMarkNote`).
// ⭐ The reads decrypt STRICTLY and the caller maps a throw to an explicit `unreadable` state — ⛔ never `''`, which would
// read as "they wrote nothing" (the 6.18 Trap-4 precedent, `state-trustee-decision-crypto.ts`).
// ⛔ NEVER log a decrypted value; ⛔ never put one in an event payload, an audit line or an error body.

import type { StaffNoteDto } from '@twt/contracts';
import { encryption } from '@twt/domain';

import type { EncryptionDeps } from '../../context.js';
import { CLAIM_CORRECTION_MARK_FIELD_CLASS } from './correction-chase-crypto.js';

export const CLAIM_CORRECTION_CLOSURE_FIELD_CLASS = 'claim_correction_closure';
export const CLAIM_CORRECTION_DIRECTION_FIELD_CLASS = 'claim_correction_direction';
export const CLAIM_REFILE_CONFIRMATION_FIELD_CLASS = 'claim_refile_confirmation';
export const CLAIM_CLOSURE_LETTER_FIELD_CLASS = 'claim_closure_letter';

export type ClosureFieldClass =
  | typeof CLAIM_CORRECTION_CLOSURE_FIELD_CLASS
  | typeof CLAIM_CORRECTION_DIRECTION_FIELD_CLASS
  | typeof CLAIM_REFILE_CONFIRMATION_FIELD_CLASS
  | typeof CLAIM_CLOSURE_LETTER_FIELD_CLASS
  | typeof CLAIM_CORRECTION_MARK_FIELD_CLASS;

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of `value`, trimmed, under `fieldClass`. */
export async function encryptClosureField(
  value: string,
  pariwarId: string,
  fieldClass: ClosureFieldClass,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = await encryption.encryptTier1(Buffer.from(value.trim(), 'utf-8'), { pariwarId, fieldClass }, enc.kms, enc.kekRef);
  return encryption.serializeEnvelope(ct);
}

/**
 * Decrypt a stored note for an AUTHORIZED staff read: `readable` with the text, or `unreadable` on ANY envelope / KMS
 * fault (logged through `log` — ids only, ⛔ the value). `null` in ⇒ `null` out (⛔ no note was written).
 */
export async function decryptStaffNote(
  serialized: string | null,
  pariwarId: string,
  fieldClass: ClosureFieldClass,
  enc: EncryptionDeps,
  log: (err: unknown) => void,
): Promise<StaffNoteDto | null> {
  if (serialized === null) return null;
  try {
    const bytes = await encryption.decryptTier1(encryption.parseEnvelope(serialized), { pariwarId, fieldClass }, enc.kms, enc.kekRef);
    return { state: 'readable', value: Buffer.from(bytes).toString('utf-8') };
  } catch (err) {
    try {
      log(err);
    } catch {
      // a logging failure must never defeat the fail-soft contract
    }
    return { state: 'unreadable' };
  }
}
