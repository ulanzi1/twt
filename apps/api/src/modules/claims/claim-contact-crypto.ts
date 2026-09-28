// The claim CONTACT RECORD's Tier-1 encryption helpers — Story 6.19a (D5; the `nominee-bank-crypto.ts` precedent).
//
// Encryption is an APP-LAYER concern: the contact routes hand the domain writer a `crypto` port built from these,
// so every value is encrypted BEFORE insert, and the W5 identical-value comparison decrypts under the same
// context. The context keys on the claim's REAL `pariwarId` and `CLAIM_CONTACT_FIELD_CLASS`, matching the
// `piiColumn(1, 'claim_contact')` annotation.
//
// ⛔ NEVER log a decrypted value; ⛔ never put one in an event payload, an audit line or an error body.

import { NOMINEE_BANK_DECRYPT_FAILED_SENTINEL } from '@twt/contracts';
import { encryption } from '@twt/domain';

import { CLAIM_CONTACT_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

/** The sentinel a field that fails to decrypt reads back as — the plaintext read's DTO parses it. */
export const CLAIM_CONTACT_DECRYPT_FAILED_SENTINEL = NOMINEE_BANK_DECRYPT_FAILED_SENTINEL;

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: CLAIM_CONTACT_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a contact-record field. */
export async function encryptClaimContactField(value: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(Buffer.from(value, 'utf-8'), encContext(pariwarId), enc.kms, enc.kekRef);
  return encryption.serializeEnvelope(ct);
}

/** Decrypt a stored contact-record envelope back to plaintext. Throws on a bad envelope. */
export async function decryptClaimContactField(serialized: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}

/**
 * Fail-soft decrypt for the operator's READ-BACK (AC8a (ii)): on ANY decrypt error, or an empty plaintext, the
 * sentinel — ⛔ never a throw, ⛔ never the plaintext in the log. ⛔ NOT for the W5 comparison, where a wrong
 * value is a hazard: that path uses `decryptClaimContactField` and lets a failure propagate.
 */
export async function decryptClaimContactFieldSoft(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
  log: (err: unknown) => void,
): Promise<string> {
  try {
    const plaintext = await decryptClaimContactField(serialized, pariwarId, enc);
    return plaintext.length > 0 ? plaintext : CLAIM_CONTACT_DECRYPT_FAILED_SENTINEL;
  } catch (err) {
    try {
      log(err);
    } catch {
      // a logging failure must never defeat the fail-soft contract
    }
    return CLAIM_CONTACT_DECRYPT_FAILED_SENTINEL;
  }
}
