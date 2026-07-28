// Claim-time nominee-bank Tier-1 encryption helpers — Story 6.8 (Task 5).
//
// Encryption is an APP-LAYER concern: the member + helpline routes encrypt each account's PII
// (account holder name, account number, IFSC) before handing ciphertext to the domain writer, and
// any read consumer decrypts on its own path (the 3.4 nominee-crypto / 6.7 ground-inspection-crypto
// precedent). `claim_nominee_bank_accounts` is a TENANT table — the encryption context keys on the
// claim's REAL `pariwarId` (`CLAIM_NOMINEE_BANK_FIELD_CLASS`), matching the
// `piiColumn(1, 'claim_nominee_bank')` column annotation.
//
// `bank_name` / `branch` are Tier-3 plaintext (public, IFSC-derived) and are NEVER encrypted.
// NEVER log a decrypted value; NEVER put any of these in an event payload or an audit line.

import { NOMINEE_BANK_DECRYPT_FAILED_SENTINEL } from '@twt/contracts';
import { encryption } from '@twt/domain';

import { CLAIM_NOMINEE_BANK_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

export { NOMINEE_BANK_DECRYPT_FAILED_SENTINEL };

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: CLAIM_NOMINEE_BANK_FIELD_CLASS };
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a nominee-bank PII field. */
export async function encryptNomineeBankField(
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

/** Decrypt a stored nominee-bank envelope back to plaintext (the disbursement read path). */
export async function decryptNomineeBankField(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}

/**
 * Fail-soft decrypt for the donor-facing display (Story 9.9, AC6): on ANY decrypt error, OR a successfully
 * decrypted but EMPTY plaintext (a corrupted/legacy envelope round-tripping to ''), returns the DISTINCT
 * sentinel + logs (never the plaintext), never throws. A logging failure inside `log` itself is swallowed —
 * it must never defeat the fail-soft contract. Use ONLY on the presentation read where a per-field failure
 * must degrade gracefully — NOT on a path where a wrong/absent value is a security hazard.
 */
export async function decryptNomineeBankFieldSoft(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
  log: (err: unknown) => void,
): Promise<string> {
  try {
    const plaintext = await decryptNomineeBankField(serialized, pariwarId, enc);
    return plaintext.length > 0 ? plaintext : NOMINEE_BANK_DECRYPT_FAILED_SENTINEL;
  } catch (err) {
    try {
      log(err);
    } catch {
      // never let a logging failure defeat the fail-soft sentinel contract
    }
    return NOMINEE_BANK_DECRYPT_FAILED_SENTINEL;
  }
}
