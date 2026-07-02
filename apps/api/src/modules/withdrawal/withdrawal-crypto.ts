// Member withdrawal-reason Tier-1 encryption helper — Story 3.10 (Task 5).
//
// Encryption is an APP-LAYER concern: the withdrawal handler encrypts the OPTIONAL free-text reason
// before handing ciphertext to the `insertMemberWithdrawal` accessor (the 3.9 address-crypto
// precedent). `member_withdrawals` is a TENANT table — the encryption context keys on the member's
// REAL `pariwarId` (`MEMBER_WITHDRAWAL_FIELD_CLASS`), matching the `piiColumn(1, 'member_withdrawal')`
// column annotation. The `encContext` shape mirrors address-crypto.ts exactly.
//
// NEVER log a decrypted value. The withdrawal confirm response never round-trips the reason (R1).

import { encryption } from '@twt/domain';

import { MEMBER_WITHDRAWAL_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: MEMBER_WITHDRAWAL_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a member's OPTIONAL free-text withdrawal reason. */
export async function encryptWithdrawalReason(
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
