// Member nominee Tier-1 encryption helpers — Story 3.4 (Task 5).
//
// Encryption is an APP-LAYER concern: the route encrypts name/mobile/address before handing
// ciphertext to the `replaceMemberNominees` accessor (the 3.3b kyc-crypto precedent). Unlike
// the admin-email / member-mobile families (which key on a fixed global sentinel because
// their lookup runs pre-scope), the nominee row is a TENANT table — the encryption context
// keys on the member's REAL `pariwarId` (`MEMBER_NOMINEE_FIELD_CLASS`).
//
// NEVER log a decrypted value. The status view never round-trips the bytes (presence flags).

import { encryption } from '@twt/domain';

import { MEMBER_NOMINEE_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: MEMBER_NOMINEE_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a member nominee field. */
export async function encryptNomineeField(
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

/** Decrypt a stored member nominee envelope back to plaintext (a confirmation read path, if needed). */
export async function decryptNomineeField(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}
