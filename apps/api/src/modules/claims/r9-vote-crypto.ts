// R9-vote Tier-1 encryption helpers — Story 6.14 (AC3/AC10).
//
// Encryption is an APP-LAYER concern: the R9 voting route encrypts the per-vote rationale (arbitrary
// free-text — PII-capable) before handing ciphertext to the domain writer, and decrypts on the panel /
// votes-by-trustee read paths AFTER authorization. The `claim_r9_votes` table is a TENANT table — the
// encryption context keys on the claim's REAL `pariwarId` (`CLAIM_R9_VOTE_FIELD_CLASS`), matching the
// `piiColumn(1, 'r9_vote')` annotation. The `state-trustee-decision-crypto.ts` (6.13) / `verifier-decision-
// crypto.ts` (6.11) shape.
//
// ── The decrypt-FAILURE-DISTINCT sentinel (AC1/#11 — the 6.13 review lesson applied preemptively) ──
// Rationale is REQUIRED for EVERY vote (AC3), so a genuinely-absent rationale is impossible — a BLANK
// rationale can therefore only mean a decrypt FAILURE (bad envelope / KMS error). So on a decrypt error we
// render a DISTINCT SENTINEL (`[rationale unavailable — decryption failed]`) + log, NEVER an empty string
// that would masquerade as "no rationale". The read never 500s on one bad envelope.
//
// NEVER log a decrypted value; NEVER put the rationale in an event payload, audit line, index, or filter.

import { claim, encryption } from '@twt/domain';

import { CLAIM_R9_VOTE_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

/** The distinct sentinel a decrypt FAILURE renders (never blank — a blank would masquerade as "no rationale"). */
export const R9_RATIONALE_DECRYPT_FAILED_SENTINEL = '[rationale unavailable — decryption failed]';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: CLAIM_R9_VOTE_FIELD_CLASS };
}

/**
 * Tier-1 envelope ciphertext (serialized `enc:v1:…`) of an R9-vote rationale. `value` MUST already have
 * passed the contract's ≤500-char plaintext bound (the trusted pre-encryption boundary, AC3) — this
 * function encrypts, then stamps the result via `prepareR9VoteCiphertext` so `castR9Vote` will accept it.
 * The stamp enforces ONLY a storage-safety ceiling, never a re-check of the plaintext bound (structurally
 * impossible post-encryption).
 */
export async function encryptR9VoteRationale(
  value: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<claim.PreparedR9VoteCiphertext> {
  const ct = await encryption.encryptTier1(Buffer.from(value, 'utf-8'), encContext(pariwarId), enc.kms, enc.kekRef);
  return claim.prepareR9VoteCiphertext(encryption.serializeEnvelope(ct));
}

/**
 * Decrypt a stored R9-vote rationale envelope back to plaintext. On ANY error, returns the DISTINCT
 * failure sentinel (never '' — a blank would masquerade as "no rationale", which is impossible since
 * rationale is required) + logs. Never throws — a decrypt failure must never 500 the authorized read.
 */
export async function decryptR9VoteRationale(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
  log?: (err: unknown) => void,
): Promise<string> {
  try {
    const ct = encryption.parseEnvelope(serialized);
    const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
    return Buffer.from(bytes).toString('utf-8');
  } catch (err) {
    if (log) log(err);
    else console.error('[r9-vote-crypto] rationale decrypt failed', err);
    return R9_RATIONALE_DECRYPT_FAILED_SENTINEL;
  }
}
