// Claim-document (death-certificate OCR) Tier-1 decryption helper — Story 6.10 (Task 1).
//
// The Story 6.5 OCR-parity job (apps/jobs/src/claim-ocr-parity.ts) encrypts the extracted
// death-certificate identity fields (deceased name / DoB / date-of-death / issuing authority /
// certificate number) as Tier-1 envelopes under the `claim_document` field class. The verifier
// console (6.10) is the FIRST read consumer to decrypt them for the authorized verifier's
// side-by-side parity view — the accessor (`getClaimDocumentReview`) returns ciphertext AS
// STORED; THIS helper decrypts under the SAME (pariwarId, fieldClass), mirroring the
// kyc-crypto / ground-inspection-crypto read-path helpers.
//
// NEVER log a decrypted value; NEVER put a decrypted extracted field in an event payload or an
// audit line — the packet is authorized-display-sensitive.

import { encryption } from '@twt/domain';

import { CLAIM_DOCUMENT_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: CLAIM_DOCUMENT_FIELD_CLASS };
}

/** Decrypt a stored claim-document extracted-field envelope back to plaintext (the console read path). */
export async function decryptClaimDocumentField(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}
