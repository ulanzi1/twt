// Ground-inspection Tier-1 encryption helpers — Story 6.7 (Task 5).
//
// Encryption is an APP-LAYER concern: the route encrypts the assignment's PII (exact location/site
// detail, family contact, free-text notes / refusal reason, photo caption) before handing ciphertext
// to the domain writers, and decrypts on the read path (the 3.4 nominee-crypto / 6.5 claim-document
// precedent). `claim_ground_inspections` / `_photos` are TENANT tables — the encryption context keys
// on the claim's REAL `pariwarId` (`CLAIM_GROUND_INSPECTION_FIELD_CLASS`), matching the
// `piiColumn(1, 'ground_inspection')` column annotation.
//
// NEVER log a decrypted value; NEVER put any of these in an event payload or an audit line.

import { encryption } from '@twt/domain';

import { CLAIM_GROUND_INSPECTION_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: CLAIM_GROUND_INSPECTION_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a ground-inspection PII field. */
export async function encryptGroundInspectionField(
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

/** Encrypt an OPTIONAL field: returns `null` for null/undefined/empty, else the ciphertext. */
export async function encryptOptionalGroundInspectionField(
  value: string | null | undefined,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string | null> {
  if (value == null || value === '') return null;
  return encryptGroundInspectionField(value, pariwarId, enc);
}

/** Decrypt a stored ground-inspection envelope back to plaintext (the read/console path). */
export async function decryptGroundInspectionField(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}
