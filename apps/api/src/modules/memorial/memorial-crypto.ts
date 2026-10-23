// The family memorial's Tier-1 crypto, in the API layer (Story 11b.4, MA5 / MA15 — the `claims/claim-contact-crypto.ts`
// precedent: the schema column is identity at the driver; the app encrypts before the write and decrypts after the read).
//
// ONE field class (`MEMORIAL_FIELD_CLASS`, declared once in `@twt/domain`) for the family's words, the alt text and the
// reviewer's notes, keyed on the deceased member's REAL `pariwarId`. ⚠ VERBATIM (Trap 6): the plaintext is the exact
// string received — `Buffer.from(value, 'utf-8')` and back, ⛔ no trim, ⛔ no normalisation. ⚠ ⛔ Never call these while
// holding the pool lock (footguns #56(b)) — every `encryptTier1` / `decryptTier1` also writes an audit hook line under
// the deployment-wide audit lock.

import { encryption } from '@twt/domain';

import type { EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: encryption.MEMORIAL_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a memorial field. */
export async function encryptMemorialField(value: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(Buffer.from(value, 'utf-8'), encContext(pariwarId), enc.kms, enc.kekRef);
  return encryption.serializeEnvelope(ct);
}

/** Decrypt a stored memorial envelope back to the exact plaintext. Throws on a bad envelope or a KMS fault. */
export async function decryptMemorialField(serialized: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}
