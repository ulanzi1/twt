// Member medical-disclosure Tier-1 encryption helpers — Story 3.5 (Task 6).
//
// Encryption is an APP-LAYER concern: the route encrypts the selected condition codes (as a
// canonical-JSON array) + the free-text additional context before handing ciphertext to the
// `appendMedicalDisclosure` accessor (the 3.4 nominee-crypto precedent). Unlike the admin-email /
// member-mobile families (which key on a fixed global sentinel because their lookup runs
// pre-scope), the disclosure row is a TENANT table — the encryption context keys on the member's
// REAL `pariwarId` (`MEMBER_MEDICAL_FIELD_CLASS`).
//
// NEVER log a decrypted value. The status view never round-trips the bytes (presence flag + count).

import { encryption } from '@twt/domain';

import { MEMBER_MEDICAL_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: MEMBER_MEDICAL_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a member medical field. */
export async function encryptMedicalField(
  value: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = await encryption.encryptTier1(
    Buffer.from(value, 'utf-8'),
    encContext(pariwarId),
    enc.kms,
    enc.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}

/** Decrypt a stored member medical envelope back to plaintext (a confirmation read path, if needed). */
export async function decryptMedicalField(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}
