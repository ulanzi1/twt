// member_medical_disclosures write accessor — Story 3.5 (Task 2).
//
// The submit write: a member discloses any IMA-listed conditions + a concealment-denial ack →
// APPEND a NEW row (append-only history; NOT delete-then-insert latest-wins like nominees, R2).
// Epic 4 concealment evaluation walks the full per-member disclosure history, so every submit
// (signup + every Life Events update via Story 3.9) preserves a distinct row with its
// `ima_list_version` + timestamp. TENANT-scoped (RLS `withCheck` enforces the caller's
// `app.pariwar_id` matches `pariwarId`); runs its statement DIRECTLY on the passed (scoped)
// `db`, so a scoped caller is already inside the `SET LOCAL app.pariwar_id` transaction (the
// member_nominees write precedent).
//
// ── Encryption is an APP-LAYER concern (the handler does it) ───────────────────────────────
// This accessor takes ALREADY-SERIALIZED Tier-1 envelope ciphertext (`*Ciphertext` fields) +
// the NON-PII metadata (count / ima_list_version / locale / clause_version_id / consent_id) — it
// NEVER encrypts. The route encrypts under the member's real `pariwarId` context, resolves the
// clauses, writes the audit line, records the consent, and passes the resulting ids in (Task 6).
// NO HTTP, NO audit, NO event emission, NO consent recording here — the route orchestrates.

import type { Db } from '../db.js';
import type {
  ClauseVersionId,
  ConsentId,
  MemberId,
  PariwarId,
} from '../ids/index.js';
import {
  type MemberMedicalDisclosureRow,
  memberMedicalDisclosures,
} from '../schema/member_medical_disclosures.js';

/** One pre-encrypted medical-disclosure row to append (all NON-PII fields are server-stamped). */
export interface AppendMedicalDisclosureInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  /** The resolved `niy.medical.ima-list` clause_version_id the member saw (NON-PII). */
  imaListVersion: string;
  /** Tier-1 envelope ciphertext (serialized) of the canonical-JSON conditions array (always set). */
  disclosedConditionsCiphertext: string;
  /** Tier-1 envelope ciphertext (serialized) of the optional free-text context; null when absent. */
  additionalContextCiphertext?: string | null;
  /** NON-PII count of selected conditions (0..N). */
  conditionCount: number;
  /** Which locale the ack text was shown in ('hi' | 'en'). NON-PII. */
  acknowledgmentTextLocale: string;
  /** The `niy.concealment.r14` version acknowledged (also stored on the consent row). */
  clauseVersionId: ClauseVersionId;
  /** The consent_records row created in the SAME tx (insert consent FIRST, then this). */
  consentId: ConsentId;
}

/**
 * Append ONE new medical-disclosure row (append-only history — NO delete of prior rows). Runs in
 * the caller's single scope tx (the consent insert + event append run in the same tx, so a later
 * throw rolls the whole disclosure back — AC6). Returns the inserted row. Tenant-scoped.
 */
export async function appendMedicalDisclosure(
  db: Db,
  input: AppendMedicalDisclosureInput,
): Promise<MemberMedicalDisclosureRow> {
  const inserted = await db
    .insert(memberMedicalDisclosures)
    .values({
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      imaListVersion: input.imaListVersion,
      disclosedConditionsCiphertext: input.disclosedConditionsCiphertext,
      additionalContextCiphertext: input.additionalContextCiphertext ?? null,
      conditionCount: input.conditionCount,
      acknowledgmentTextLocale: input.acknowledgmentTextLocale,
      clauseVersionId: input.clauseVersionId,
      consentId: input.consentId,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[appendMedicalDisclosure] insert returned no row — check session scope');
  }
  return row;
}
