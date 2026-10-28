// THE COMPARABLE FORM of a health answer — Story 6.32 (`2026-10-28-413` IQ4; 6.27a PM25 (a): *"comparing ENCRYPTED codes
// needs a comparable form (a keyed blind index per option code) — a design OWED by row 6-32"*).
//
// ONE helper for BOTH writers' handlers — the neighbours' (`peer-request-core.ts`) and the family's at the inspection — so
// the same (claim, question, code) hashes EQUAL on both sides (I5; TR3). The plaintexts are `questionnaires.
// answerCodeIndexInputs` (claim-scoped; `null` for a non-health key or an answer with *"I don't know"*); each is hashed
// under the ONE class `ANSWER_CODE_INDEX_FIELD_CLASS`, bound to the claim's REAL `pariwarId`.
// ⚠ Per-code `blindIndex` (one audit line each, ≤ 10 codes), ⛔ `blindIndexMany`: the neighbours' handler runs inside its
// request transaction, where the batch path is forbidden (`blind-index.ts`: *"⛔ Never call it inside a transaction"*) —
// the date window's precedent (three `blindIndex` calls). ⛔ Never call it under a writer's lock (TR2).

import { blindIndex } from '../encryption/blind-index.js';
import { ANSWER_CODE_INDEX_FIELD_CLASS } from '../encryption/field-classes.js';
import type { KmsKeyRef, KmsProvider } from '../encryption/kms-provider.js';
import { answerCodeIndexInputs } from '../questionnaires/answers.js';

/** The keyed code indexes of one answer, in the codes' order — or `null` (store ⛔ indexes: ⛔ compared). */
export async function answerCodeBlindIndexes(
  input: { readonly claimCaseId: string; readonly questionKey: string; readonly codes: readonly string[] },
  context: { readonly pariwarId: string },
  kms: KmsProvider,
  hmacKeyRef: KmsKeyRef,
): Promise<string[] | null> {
  const plaintexts = answerCodeIndexInputs(input.claimCaseId, input.questionKey, input.codes);
  if (plaintexts === null) return null;
  return Promise.all(plaintexts.map((p) => blindIndex(ANSWER_CODE_INDEX_FIELD_CLASS, p, { pariwarId: context.pariwarId }, kms, hmacKeyRef)));
}
