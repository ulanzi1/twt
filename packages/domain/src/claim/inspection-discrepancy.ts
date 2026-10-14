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
//   ③ `death_cause` / ④ `death_illness` — ⛔ NOT compared (row 6-32 owes the family side and a keyed comparable form).
// ⛔ Never compared: `how_known`, `relationship`, `callback_consent`; ⛔ never the member's medical declaration (`-304` Q4 A).
//
// ⭐ ONE per-answer predicate (`peerAnswerDiffers`) SHARED with 6.27b's `derivePeerReplyWarningKeys` — the reference date
// index is a PARAMETER (6.27b passes the current accepted review's, 6.27d the family's). ⛔ Never call
// `derivePeerReplyWarningKeys` with the family's index: it mints `peer_*` WARNING keys (the wrong vocabulary).
//
// ⭐ R2 — THE CLOCK BASIS that makes the as-of recompute EQUAL the in-transaction result. The comparison runs INSIDE the
// completion transaction, under the claim row lock every answer writer takes first. `completed_at` is `clock_timestamp()`
// read AT the completion UPDATE (after both locks); an answer's `saved_at` is `DEFAULT clock_timestamp()` stamped at its
// INSERT after the claim lock, and `superseded_at` is set to `clock_timestamp()` under the same lock ⇒ the claim lock
// orders every answer write against the completion, and "live as of `completed_at`" IS "saved by then". ⛔ Never change any
// of the three to `now()` (the transaction START) — a writer that began before the completion but took the lock after it
// would then fall on the wrong side. The only answer writer without the claim lock is the anonymizer (it NULLs the window
// indexes), which can only DROP a ② on a later recompute (accepted — the recorded showing is the normal path).
//
// ⚠ A LEAF: drizzle and `questionnaires/keys.ts` ONLY (`approval-warnings.ts` imports it — its import discipline holds).
// ⛔ No ciphertext, ⛔ no KMS, ⛔ no medical module (a fence pins all three).

import { type SQL, sql } from 'drizzle-orm';

import { COMPARABLE_QUESTION_KEYS, type HasDiedCode } from '../questionnaires/keys.js';

/** A key compared wherever BOTH the family and a neighbour answer (PM23 (a)). */
export type ComparableQuestionKey = (typeof COMPARABLE_QUESTION_KEYS)[number];

/** A key the inspector may be shown — ⚠ LOCKSTEP with 0160's CHECKs (`INSPECTION_DISCREPANCY_QUESTION_KEYS`). */
export type InspectionDiscrepancyKey = 'has_died' | 'death_date';

/**
 * THE RULE TABLE over every comparable key — `'compare'` ⇔ the inspector may be shown a difference on it.
 */
export const INSPECTION_DISCREPANCY_RULES: Readonly<Record<ComparableQuestionKey, 'compare' | 'not_comparable'>> = {
  has_died: 'compare',
  death_date: 'compare',
  /** Owed by row 6-32 — the family side and a keyed comparable form. */
  death_cause: 'not_comparable',
  /** Owed by row 6-32 — the family side and a keyed comparable form. */
  death_illness: 'not_comparable',
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
}

const NOT_DIED: HasDiedCode = 'not_died';

/**
 * ⭐ THE ONE PER-ANSWER PREDICATE (shared with 6.27b's `derivePeerReplyWarningKeys`): does this live answer differ from the
 * reference? `'has_died'` — codes exactly `not_died`; `'death_date'` — a three-index window ⛔ containing
 * `referenceDateIndex`; `null` otherwise (⛔ no index on either side ⇒ ⛔ not compared).
 */
export function peerAnswerDiffers(answer: PeerAnswerForComparison, referenceDateIndex: string | null): InspectionDiscrepancyKey | null {
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
  return null;
}

/**
 * The keys of the questions that differ, in `INSPECTION_DISCREPANCY_COMPARED_KEYS` order — ⛔ no values, ⛔ no count.
 * A `'not_comparable'` key ⛔ never yields one. `familyDateIndex` is the completed row's `death_date_index`.
 */
export function deriveInspectionDiscrepancy(input: {
  readonly answers: readonly PeerAnswerForComparison[];
  readonly familyDateIndex: string | null;
}): InspectionDiscrepancyKey[] {
  const found = new Set<InspectionDiscrepancyKey>();
  for (const a of input.answers) {
    if (!(INSPECTION_DISCREPANCY_COMPARED_KEYS as readonly string[]).includes(a.key)) continue;
    const differs = peerAnswerDiffers(a, input.familyDateIndex);
    if (differs !== null && INSPECTION_DISCREPANCY_RULES[differs] === 'compare') found.add(differs);
  }
  return INSPECTION_DISCREPANCY_COMPARED_KEYS.filter((k) => found.has(k));
}

/**
 * ONE fragment for BOTH reads — a scalar subquery yielding a JSON array of the claim's answers to the compared keys
 * (`[{ key, codes, window }]`, `[]` when none): LIVE (`asOf === null` — `superseded_at IS NULL`, submitted or not, as
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
                                                         'window', ida.death_date_window_indexes)
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
