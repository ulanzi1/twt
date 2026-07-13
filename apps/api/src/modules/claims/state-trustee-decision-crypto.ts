// State-Trustee-decision Tier-1 encryption helpers — Story 6.13 (D-G).
//
// Encryption is an APP-LAYER concern: the cycle-freeze routes encrypt the brief trustee rationale
// (arbitrary free-text — PII-capable) before handing ciphertext to the domain writer, and decrypt on the
// pending-list read path AFTER authorization. The `claim_state_trustee_decisions` table is a TENANT table
// — the encryption context keys on the claim's REAL `pariwarId`
// (`CLAIM_STATE_TRUSTEE_DECISION_FIELD_CLASS`), matching the `piiColumn(1, 'state_trustee_decision')`
// annotation. The exact `verifier-decision-crypto.ts` (6.11) shape.
//
// NEVER log a decrypted value; NEVER put the rationale in an event payload, an audit line, an index, or a
// searchable filter (D-G). The reason-code (bounded non-PII enum) + outcome may ride those surfaces; the
// rationale may not.

import { encryption } from '@twt/domain';

import { CLAIM_STATE_TRUSTEE_DECISION_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: CLAIM_STATE_TRUSTEE_DECISION_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of the trustee rationale. */
export async function encryptTrusteeRationale(
  value: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = await encryption.encryptTier1(Buffer.from(value, 'utf-8'), encContext(pariwarId), enc.kms, enc.kekRef);
  return encryption.serializeEnvelope(ct);
}

/** Encrypt an OPTIONAL rationale: returns `null` for null/undefined/empty, else the ciphertext. */
export async function encryptOptionalTrusteeRationale(
  value: string | null | undefined,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string | null> {
  if (value == null || value.trim() === '') return null;
  return encryptTrusteeRationale(value, pariwarId, enc);
}

/** Decrypt a stored trustee/verifier-rationale envelope back to plaintext, FAIL-SOFT to '' on any error
 *  (the 6.10 pending-read posture — a decrypt failure must never 500 the authorized list). NOTE this
 *  decrypts under the trustee field class; the pending list also surfaces the VERIFIER rationale, which is
 *  decrypted by `decryptVerifierRationale` under the verifier field class — the caller picks the right one. */
export async function decryptTrusteeRationaleSoft(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  try {
    const ct = encryption.parseEnvelope(serialized);
    const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
    return Buffer.from(bytes).toString('utf-8');
  } catch (err) {
    // Fail-soft to '' (never 500 the authorized list on one bad envelope) — but a decrypt failure is NOT
    // the same as a genuinely-absent rationale, so it still needs an operator-visible signal.
    console.error('[state-trustee-decision-crypto] rationale decrypt failed', err);
    return '';
  }
}
