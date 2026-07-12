// Verifier-decision Tier-1 encryption helpers — Story 6.11 (D-G).
//
// Encryption is an APP-LAYER concern: the adjudication route encrypts the brief verifier rationale
// (arbitrary free-text — PII-capable) before handing ciphertext to the domain writer, and decrypts on
// the read path (the verifier console (e)/(f) sections). The `claim_verifier_decisions` table is a
// TENANT table — the encryption context keys on the claim's REAL `pariwarId`
// (`CLAIM_VERIFIER_DECISION_FIELD_CLASS`), matching the `piiColumn(1, 'verifier_decision')` annotation.
//
// NEVER log a decrypted value; NEVER put the rationale in an event payload, an audit line, an index, or
// a searchable filter (D-G). The reason-code (bounded non-PII enum) + outcome may ride those surfaces;
// the rationale may not.

import { encryption } from '@twt/domain';

import { CLAIM_VERIFIER_DECISION_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: CLAIM_VERIFIER_DECISION_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of the verifier rationale. */
export async function encryptVerifierRationale(
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

/** Encrypt an OPTIONAL rationale: returns `null` for null/undefined/empty, else the ciphertext. */
export async function encryptOptionalVerifierRationale(
  value: string | null | undefined,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string | null> {
  if (value == null || value.trim() === '') return null;
  return encryptVerifierRationale(value, pariwarId, enc);
}

/** Decrypt a stored verifier-rationale envelope back to plaintext (the authorized console read path). */
export async function decryptVerifierRationale(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}
