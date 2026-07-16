// Appeal Tier-1 encryption helpers — Story 6.16 (AC2/AC3/AC10).
//
// Encryption is an APP-LAYER concern: the appeal routes encrypt the mandatory reviewer rationale (Stage 1/3
// decisions + the Stage-2 finalize audit row) and each per-vote rationale before the domain writer, and
// decrypt on authorized read paths. The `claim_appeal_decisions` / `claim_appeal_panel_votes` tables are
// TENANT tables — the encryption context keys on the claim's REAL `pariwarId` + the matching field class
// (`CLAIM_APPEAL_DECISION_FIELD_CLASS` / `CLAIM_APPEAL_VOTE_FIELD_CLASS`, matching the `piiColumn(1, …)`
// annotations). The r9-vote-crypto.ts / verifier-decision-crypto.ts shape.
//
// ── The decrypt-FAILURE-DISTINCT sentinel (the 6.13/6.14 review lesson) ─────────────────────
// Rationale is REQUIRED for EVERY decision/vote (AC2/AC3), so a BLANK rationale can only mean a decrypt
// FAILURE — so on a decrypt error we render a DISTINCT SENTINEL, never an empty string. The read never 500s
// on one bad envelope. NEVER log a decrypted value; NEVER put rationale in an event/audit/index/filter.

import { claim, encryption } from '@twt/domain';

import { CLAIM_APPEAL_DECISION_FIELD_CLASS, CLAIM_APPEAL_VOTE_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

/** The distinct sentinel a decrypt FAILURE renders (never blank — a blank would masquerade as "no rationale"). */
export const APPEAL_RATIONALE_DECRYPT_FAILED_SENTINEL = '[rationale unavailable — decryption failed]';

function encContext(pariwarId: string, fieldClass: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass };
}

/** Encrypt an appeal rationale, then stamp it via `prepareAppealCiphertext` so the writer will accept it. The
 *  plaintext ≤500-char bound was enforced at the contract boundary; this only adds the storage-safety ceiling. */
export async function encryptAppealRationale(
  value: string,
  pariwarId: string,
  fieldClass: string,
  enc: EncryptionDeps,
): Promise<claim.PreparedAppealCiphertext> {
  const ct = await encryption.encryptTier1(
    Buffer.from(value, 'utf-8'),
    encContext(pariwarId, fieldClass),
    enc.kms,
    enc.kekRef,
  );
  return claim.prepareAppealCiphertext(encryption.serializeEnvelope(ct));
}

/** Encrypt a Stage-1/2/3 DECISION rationale (the appeal_decision field class). */
export function encryptAppealDecisionRationale(
  value: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<claim.PreparedAppealCiphertext> {
  return encryptAppealRationale(value, pariwarId, CLAIM_APPEAL_DECISION_FIELD_CLASS, enc);
}

/** Encrypt a Stage-2 per-VOTE rationale (the appeal_vote field class). */
export function encryptAppealVoteRationale(
  value: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<claim.PreparedAppealCiphertext> {
  return encryptAppealRationale(value, pariwarId, CLAIM_APPEAL_VOTE_FIELD_CLASS, enc);
}

/** Decrypt a stored appeal rationale envelope. On ANY error returns the DISTINCT failure sentinel + logs;
 *  never throws (a decrypt failure must never 500 the authorized read). */
export async function decryptAppealRationale(
  serialized: string,
  pariwarId: string,
  fieldClass: string,
  enc: EncryptionDeps,
  log?: (err: unknown) => void,
): Promise<string> {
  try {
    const ct = encryption.parseEnvelope(serialized);
    const bytes = await encryption.decryptTier1(ct, encContext(pariwarId, fieldClass), enc.kms, enc.kekRef);
    return Buffer.from(bytes).toString('utf-8');
  } catch (err) {
    if (log) log(err);
    else console.error('[appeal-crypto] rationale decrypt failed', err);
    return APPEAL_RATIONALE_DECRYPT_FAILED_SENTINEL;
  }
}
