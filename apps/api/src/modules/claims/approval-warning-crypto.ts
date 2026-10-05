// Story 6.23a (NW14) — the late-warning reason's Tier-1 note encryption. The route encrypts the note BEFORE the domain
// writer (`claim_warning_approvals.note_ciphertext`, `piiColumn(1, 'claim_warning_approval')`). ⛔ There is ⛔ no decrypt
// here: 6.23a shows ⛔ no late note back (the record is audit evidence, read by a later story's surface), and erasure
// overwrites it with the sentinel. NEVER log the note; NEVER put it in an event, an audit line or the console packet.

import { encryption } from '@twt/domain';

import { CLAIM_WARNING_APPROVAL_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a late-warning reason's note. */
export async function encryptLateWarningReasonNote(value: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(
    Buffer.from(value, 'utf-8'),
    { pariwarId, fieldClass: CLAIM_WARNING_APPROVAL_FIELD_CLASS },
    enc.kms,
    enc.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}
