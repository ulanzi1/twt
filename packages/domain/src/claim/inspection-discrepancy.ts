// THE INSPECTOR'S DISCREPANCY COMPARISON — Story 6.27d (6.27a PM25 (a); `-304` Q3 A, `-310` CF2, `-311`).
//
// At a FULL visit's completion (`death_date_source = 'family_statement'` — author reading R1; a `certificate_check`
// records ⛔ no family account, so there is ⛔ nothing to compare) the inspector is shown ONLY the question keys on which the
// family's account and a neighbour's LIVE answer differ — ⛔ never a value, ⛔ never who, ⛔ never a count. It gates
// ⛔ nothing: no approval, refusal, warning, payment or claim state reads it (`-304` Q3: *"⛔ never a warning"*).
//   ① `has_died` — a live answer whose codes are exactly `['not_died']` (the family reported the death);
//   ② `death_date` — a live answer whose three keyed window indexes (D − 1, D, D + 1) do ⛔ NOT contain the family's
//      `death_date_index` — set membership under the ONE shared field class, ⛔ no decrypt. A neighbour's `unknown`, a
//      NULL window (erased) or a NULL family index (erased) ⇒ ⛔ not compared, ⛔ never "differs";
//   ③ `death_cause` / ④ `death_illness` — Story 6.32 (IQ4 / IQ6): the family's answer at the inspection and a neighbour's,
//      compared as KEYED CODE INDEXES (one per selected option, `ANSWER_CODE_INDEX_FIELD_CLASS`, claim-scoped) — ONE rule:
//      both sides DEFINITE and sharing ⛔ code (`NOT (a && b)` — array overlap). *"I don't know"* (stored with NULL indexes),
//      an erased side or an unanswered side ⇒ ⛔ not compared. Overlapping-but-unequal illness lists are a MATCH (IQ6's cost).
// ⛔ Never compared: `how_known`, `relationship`, `callback_consent`; ⛔ never the member's medical declaration (`-304` Q4 A).
//
// ⭐ ONE per-answer predicate (`peerAnswerDiffers`) SHARED with 6.27b's `derivePeerReplyWarningKeys` — the reference date
// index is a PARAMETER (6.27b passes the current accepted review's, 6.27d the family's). ⛔ Never call
// `derivePeerReplyWarningKeys` with the family's index: it mints `peer_*` WARNING keys (the wrong vocabulary). ⭐ Story 6.32:
// the family's CODE indexes are a further parameter that 6.27b ⛔ passes — so ③ / ④ ⛔ never reach a warning (CF3 (b)).
//
// ⭐ R2 — THE CLOCK BASIS that makes the as-of recompute EQUAL the in-transaction result. The comparison runs INSIDE the
// completion transaction, under the claim row lock every answer writer takes first. `completed_at` is `clock_timestamp()`
// read AT the completion UPDATE (after both locks); an answer's `saved_at` is `DEFAULT clock_timestamp()` stamped at its
// INSERT after the claim lock, and `superseded_at` is set to `clock_timestamp()` under the same lock ⇒ the claim lock
// orders every answer write against the completion, and "live as of `completed_at`" IS "saved by then". ⛔ Never change any
// of the three to `now()` (the transaction START) — a writer that began before the completion but took the lock after it
// would then fall on the wrong side. The only answer writer without the claim lock is the anonymizer (it NULLs the window
// and code indexes), which can only DROP a ② / ③ / ④ on a later recompute (accepted — the recorded showing is the normal
// path). ⭐ Story 6.32: a NEW family answer, or a supersede, needs a `scheduled` visit (0189's guard), so their live set at
// completion IS their set as of `completed_at` — EXCEPT the guard's erasure arm (RECORDED in 0189): it admits an in-place
// rewrite of `value_ciphertext` and indexes → NULL in ANY state (it cannot tell the RTBF scrub from another writer), and
// such a rewrite can only DROP a ③ / ④ on a later recompute, like the anonymizer above (second review S20).
//
// ⚠ A LEAF: drizzle and `questionnaires/keys.ts` ONLY (`approval-warnings.ts` imports it — its import discipline holds).
// ⛔ No ciphertext, ⛔ no KMS, ⛔ no medical module (a fence pins all three).

import { type SQL, sql } from 'drizzle-orm';

import { COMPARABLE_QUESTION_KEYS, type HasDiedCode } from '../questionnaires/keys.js';

/** A key compared wherever BOTH the family and a neighbour answer (PM23 (a)). */
export type ComparableQuestionKey = (typeof COMPARABLE_QUESTION_KEYS)[number];

/** A key the inspector may be shown — ⚠ LOCKSTEP with 0160's CHECKs as widened by 0189 (`INSPECTION_DISCREPANCY_QUESTION_KEYS`). */
export type InspectionDiscrepancyKey = 'has_died' | 'death_date' | 'death_cause' | 'death_illness';

/** The keys compared by CODE INDEX overlap (③ / ④) — the family answers them at the inspection (Story 6.32). */
export type CodeIndexComparedKey = 'death_cause' | 'death_illness';
const CODE_INDEX_COMPARED_KEYS: readonly CodeIndexComparedKey[] = ['death_cause', 'death_illness'];

/** The family's keyed code indexes per ③ / ④ key — `null` / absent ⇔ ⛔ answered, *"I don't know"*, or erased. */
export type FamilyCodeIndexes = Readonly<Partial<Record<CodeIndexComparedKey, readonly string[] | null>>>;

/**
 * THE RULE TABLE over every comparable key — `'compare'` ⇔ the inspector may be shown a difference on it.
 */
export const INSPECTION_DISCREPANCY_RULES: Readonly<Record<ComparableQuestionKey, 'compare' | 'not_comparable'>> = {
  has_died: 'compare',
  death_date: 'compare',
  /** Story 6.32 (AC6) — the family's answer at the inspection vs a neighbour's, by keyed code index overlap. */
  death_cause: 'compare',
  /** Story 6.32 (AC6) — the family's answer at the inspection vs a neighbour's, by keyed code index overlap. */
  death_illness: 'compare',
};

/** The compared keys, DERIVED from the rule table in `COMPARABLE_QUESTION_KEYS` order — ⛔ never a second hand list. */
export const INSPECTION_DISCREPANCY_COMPARED_KEYS: readonly InspectionDiscrepancyKey[] = COMPARABLE_QUESTION_KEYS.filter(
  (k): k is InspectionDiscrepancyKey => INSPECTION_DISCREPANCY_RULES[k] === 'compare',
);

/** One LIVE answer as the comparison reads it — the question key, the plaintext codes, the window indexes ONLY. */
export interface PeerAnswerForComparison {
  readonly key: string;
  /** `has_died`: ONE plaintext code; `death_date`: `['unknown']` for *"I don't know the date"*, else `null`. */
  readonly codes: readonly string[] | null;
  /** `death_date`: exactly three keyed indexes (D − 1, D, D + 1), or `null` (unknown, or scrubbed on erasure). */
  readonly window: readonly string[] | null;
  /** Story 6.32 — `death_cause` / `death_illness`: one keyed index per selected code, or `null` (*"I don't know"*, erased).
   *  Optional: 6.27b's warning answers carry ⛔ none. */
  readonly codeIndexes?: readonly string[] | null;
}

const NOT_DIED: HasDiedCode = 'not_died';

/** ③ / ④'s ONE rule (IQ6): both sides DEFINITE (non-empty indexes) and sharing ⛔ index. */
function codeIndexesDiffer(neighbour: readonly string[] | null | undefined, family: readonly string[] | null | undefined): boolean {
  if (neighbour == null || family == null || neighbour.length === 0 || family.length === 0) return false;
  return !neighbour.some((i) => family.includes(i));
}

/**
 * ⭐ THE ONE PER-ANSWER PREDICATE (shared with 6.27b's `derivePeerReplyWarningKeys`): does this live answer differ from the
 * reference? `'has_died'` — codes exactly `not_died`; `'death_date'` — a three-index window ⛔ containing
 * `referenceDateIndex`; `'death_cause'` / `'death_illness'` — ⛔ code index shared with `familyCodeIndexes` (Story 6.32 —
 * ⛔ passed by 6.27b, so ⛔ a warning); `null` otherwise (⛔ an index on either side ⇒ ⛔ not compared).
 */
export function peerAnswerDiffers(
  answer: PeerAnswerForComparison,
  referenceDateIndex: string | null,
  familyCodeIndexes: FamilyCodeIndexes | null = null,
): InspectionDiscrepancyKey | null {
  if (answer.key === 'has_died' && answer.codes !== null && answer.codes.length === 1 && answer.codes[0] === NOT_DIED) {
    return 'has_died';
  }
  if (
    answer.key === 'death_date' &&
    answer.window !== null &&
    answer.window.length === 3 &&
    referenceDateIndex !== null &&
    !answer.window.includes(referenceDateIndex)
  ) {
    return 'death_date';
  }
  const codeKey = CODE_INDEX_COMPARED_KEYS.find((k) => k === answer.key);
  if (codeKey !== undefined && familyCodeIndexes !== null && codeIndexesDiffer(answer.codeIndexes, familyCodeIndexes[codeKey])) {
    return codeKey;
  }
  return null;
}

/**
 * The keys of the questions that differ, in `INSPECTION_DISCREPANCY_COMPARED_KEYS` order — ⛔ no values, ⛔ no count.
 * A `'not_comparable'` key ⛔ never yields one. `familyDateIndex` is the completed row's `death_date_index`;
 * `familyCodeIndexes` the family's ③ / ④ answers at the same visit (Story 6.32 — `{}` when ⛔ none).
 */
export function deriveInspectionDiscrepancy(input: {
  readonly answers: readonly PeerAnswerForComparison[];
  readonly familyDateIndex: string | null;
  readonly familyCodeIndexes: FamilyCodeIndexes;
}): InspectionDiscrepancyKey[] {
  const found = new Set<InspectionDiscrepancyKey>();
  for (const a of input.answers) {
    if (!(INSPECTION_DISCREPANCY_COMPARED_KEYS as readonly string[]).includes(a.key)) continue;
    const differs = peerAnswerDiffers(a, input.familyDateIndex, input.familyCodeIndexes);
    if (differs !== null && INSPECTION_DISCREPANCY_RULES[differs] === 'compare') found.add(differs);
  }
  return INSPECTION_DISCREPANCY_COMPARED_KEYS.filter((k) => found.has(k));
}

/**
 * ONE fragment for BOTH reads — a scalar subquery yielding a JSON array of the claim's answers to the compared keys
 * (`[{ key, codes, window, codeIndexes }]`, `[]` when none): LIVE (`asOf === null` — `superseded_at IS NULL`, submitted or not, as
 * 6.27b's `peerReplyColumnsSql`) or live AS OF `asOf` (an SQL timestamp expression — the completed row's `completed_at`
 * column, ⛔ never a JS Date: µs precision). The own-claim filter is `-261` C3 (a refile's answers live on the refile's
 * claim id). ⛔ Never `value_ciphertext`; ⛔ no lock on answers. Served by `claim_peer_mesh_reply_answers_claim_idx`.
 */
export function inspectionDiscrepancyAnswersSql(pariwarRef: SQL, claimRef: SQL, asOf: SQL | null): SQL {
  const live =
    asOf === null
      ? sql`ida.superseded_at IS NULL`
      : sql`ida.saved_at <= ${asOf} AND (ida.superseded_at IS NULL OR ida.superseded_at > ${asOf})`;
  return sql`(SELECT coalesce(json_agg(json_build_object('key', ida.question_key, 'codes', ida.value_codes,
                                                         'window', ida.death_date_window_indexes,
                                                         'codeIndexes', ida.value_code_indexes)
                                       ORDER BY ida.answer_id), '[]'::json)
                FROM claim_peer_mesh_reply_answers ida
               WHERE ida.pariwar_id = ${pariwarRef}
                 AND ida.claim_case_id = ${claimRef}
                 AND ${live}
                 AND ida.question_key IN (${sql.join(
                   INSPECTION_DISCREPANCY_COMPARED_KEYS.map((k) => sql`${k}`),
                   sql`, `,
                 )}))`;
}

/**
 * ⭐ Story 6.32 (AC6) — the FAMILY side: a scalar subquery yielding a JSON object of the assignment's ③ / ④ code indexes
 * (`{ death_cause?: [...] | null, death_illness?: [...] | null }`, `{}` when ⛔ answered), live or AS OF `asOf` (the same
 * predicate as the neighbours'). Codes indexes ONLY — ⛔ the answer's value. Served by `claim_gi_answers_visit_idx`
 * (⛔ `claim_gi_answers_live_uq`: it is partial on `superseded_at IS NULL`, so the as-of branch could ⛔ use it — second review S20).
 */
export function familyCodeIndexesSql(pariwarRef: SQL, groundInspectionRef: SQL, asOf: SQL | null): SQL {
  const live =
    asOf === null
      ? sql`fca.superseded_at IS NULL`
      : sql`fca.saved_at <= ${asOf} AND (fca.superseded_at IS NULL OR fca.superseded_at > ${asOf})`;
  return sql`(SELECT coalesce(json_object_agg(fca.question_key, fca.value_code_indexes), '{}'::json)
                FROM claim_ground_inspection_answers fca
               WHERE fca.pariwar_id = ${pariwarRef}
                 AND fca.ground_inspection_id = ${groundInspectionRef}
                 AND ${live}
                 AND fca.question_key IN (${sql.join(
                   CODE_INDEX_COMPARED_KEYS.map((k) => sql`${k}`),
                   sql`, `,
                 )}))`;
}
