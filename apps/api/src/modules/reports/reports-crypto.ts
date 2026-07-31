// Report-export artifact Tier-1 decryption helper — Story 10.7 (Task 6).
//
// The download handler decrypts the envelope-encrypted CSV/JSON artifact back to plaintext bytes to
// stream. The artifact was envelope-encrypted by the apps/jobs build worker with the SAME field-class
// context (`REPORT_EXPORT_FIELD_CLASS`) keyed on the report's `pariwarId` — the api↔jobs round-trip uses
// the identical KEK. Mirrors data-export-crypto.ts.
//
// NEVER log the plaintext. The plaintext exists only in-memory during the gated stream (AC5).

import { encryption } from '@twt/domain';

import { REPORT_EXPORT_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: REPORT_EXPORT_FIELD_CLASS };
}

/** Decrypt the stored `enc:v1:…` artifact envelope back to the plaintext CSV/JSON bytes (download only). */
export async function decryptReportArtifact(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<Buffer> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes);
}
