// Concealment-assessment Tier-1 encryption helpers — Story 6.15 (D-G).
//
// Encryption is an APP-LAYER concern: the concealment-assessment route encrypts the OPTIONAL verifier note
// (arbitrary free-text — PII-capable; it can reference member medical/disclosure facts) before handing
// ciphertext to the domain writer. The `claim_concealment_assessments` table is a TENANT table — the
// encryption context keys on the claim's REAL `pariwarId` (`CLAIM_CONCEALMENT_ASSESSMENT_FIELD_CLASS`),
// matching the `piiColumn(1, 'concealment_assessment')` annotation.
//
// NEVER log a decrypted value; NEVER put the note in an event payload, an audit line, an index, or a
// searchable filter (D-G). The tri-state kind (bounded non-PII) may ride those surfaces; the note may not.

import { encryption } from '@twt/domain';

import { CLAIM_CONCEALMENT_ASSESSMENT_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: CLAIM_CONCEALMENT_ASSESSMENT_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of the verifier note. */
export async function encryptConcealmentNote(
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

/** Encrypt an OPTIONAL note: returns `null` for null/undefined/empty, else the ciphertext. */
export async function encryptOptionalConcealmentNote(
  value: string | null | undefined,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string | null> {
  if (value == null || value.trim() === '') return null;
  return encryptConcealmentNote(value, pariwarId, enc);
}

/** Decrypt a stored concealment-note envelope back to plaintext (an authorized read path, if any).
 *  Story 6.15, D3 (ratified BigDev 2026-07-15): no route in this story calls this — canonical groundwork
 *  for a future authorized evidence/history consumer (an evidence timeline, appeal transcript, or trustee
 *  detail surface), not premature plumbing to remove. See deferred-work.md for the re-trigger condition. */
export async function decryptConcealmentNote(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}
