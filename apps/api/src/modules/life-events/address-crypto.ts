// Member address Tier-1 encryption helper — Story 3.9 (Task 5).
//
// Encryption is an APP-LAYER concern: the address handler encrypts the address line before handing
// ciphertext to the `insertMemberAddress` accessor (the 3.4 nominee-crypto / 3.5 medical-crypto
// precedent). `member_addresses` is a TENANT table — the encryption context keys on the member's
// REAL `pariwarId` (`MEMBER_ADDRESS_FIELD_CLASS`), matching the `piiColumn(1, 'member_address')`
// column annotation.
//
// NEVER log a decrypted value. The Life Events summary never round-trips the bytes (presence flag).

import { encryption } from '@twt/domain';

import { MEMBER_ADDRESS_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: MEMBER_ADDRESS_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a member's address line. */
export async function encryptAddressLine(
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
