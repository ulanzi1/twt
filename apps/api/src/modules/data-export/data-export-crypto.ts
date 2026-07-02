// Data-export artifact Tier-1 decryption helper — Story 3.11 (Task 5).
//
// The download handler decrypts the envelope-encrypted ZIP artifact back to plaintext bytes to stream.
// The artifact was envelope-encrypted by the apps/jobs build worker with the SAME field-class context
// (`MEMBER_DATA_EXPORT_FIELD_CLASS`) keyed on the member's REAL `pariwarId` — the api↔jobs round-trip
// uses the identical KEK (see apps/jobs/src/deps.ts). `parseEnvelope` recovers the Tier1Ciphertext
// struct from the stored `enc:v1:…` string; `decryptTier1` returns the plaintext ZIP Buffer.
//
// NEVER log the plaintext. The plaintext exists only in-memory during the gated stream (AC4).

import { encryption } from '@twt/domain';

import { MEMBER_DATA_EXPORT_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: MEMBER_DATA_EXPORT_FIELD_CLASS };
}

/** Decrypt the stored `enc:v1:…` artifact envelope back to the plaintext ZIP bytes (download only). */
export async function decryptExportArtifact(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<Buffer> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes);
}
