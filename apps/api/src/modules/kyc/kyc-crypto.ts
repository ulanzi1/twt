// Member KYC-profile Tier-1 encryption helpers — Story 3.3b (Task 1/Task 3).
//
// Encryption is an APP-LAYER concern: the route encrypts name/dob/photo before handing
// ciphertext to the `upsertMemberKycProfile` accessor (the 3.2 identity-write + email-index
// precedent). Unlike the admin-email / member-mobile families (which key on a fixed global
// sentinel because their lookup runs pre-scope), the KYC profile is a TENANT table — the
// encryption context keys on the member's REAL `pariwarId` (`MEMBER_KYC_FIELD_CLASS`).
//
// NEVER log a decrypted value. The summary view never round-trips the photo (a presence flag).

import { encryption } from '@twt/domain';

import { MEMBER_KYC_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: MEMBER_KYC_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a member KYC field. */
export async function encryptKycField(
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

/** Decrypt a stored member KYC envelope back to plaintext (the status/confirm read path). */
export async function decryptKycField(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}
