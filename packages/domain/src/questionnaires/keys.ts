// The questionnaire's FIXED vocabulary — the keys and codes the rulings and the code depend on (Story 6.27a PM23).
// ⛔ PURE (no imports).

/**
 * The seven questions the Panel ruled for the neighbours (`-262` FQ8 E, `-263` FQ10, `-304` Q3 / Q4 / Q6) — EVERY
 * `peer_mesh` version from v2 onward carries all seven (CF3 (a), `2026-10-10-310`); v1 is exempt.
 */
export const PEER_MESH_RULED_QUESTION_KEYS = [
  'has_died',
  'death_date',
  'how_known',
  'relationship',
  'death_cause',
  'death_illness',
  'callback_consent',
] as const;
export type PeerMeshRuledQuestionKey = (typeof PEER_MESH_RULED_QUESTION_KEYS)[number];

/**
 * The ONLY questions that may feed a warning (CF3 (b)): *"they have not died"* (`-263` FQ10 A) and a date more than a
 * day from the certificate's (`-262` FQ8 E). Read by 6.27b's SQL (the two kinds) and by the validator.
 */
export const PEER_MESH_WARNING_QUESTION_KEYS = ['has_died', 'death_date'] as const;

/**
 * The ruled HEALTH questions (`-304` Q4 A): from v2 onward the validator holds them `health: true` — so each is
 * `sensitive` (stored ENCRYPTED, scrubbed on erasure) and waits for counsel's basis (6.27c AC2b). A later version can
 * ⛔ never reclassify one (second-pass review S2).
 */
export const PEER_MESH_HEALTH_QUESTION_KEYS = ['death_cause', 'death_illness'] as const;

/**
 * The questions whose answer is a Tier-1 value — ⚠ LOCKSTEP with migration 0158's
 * `claim_peer_mesh_reply_answers_sensitive_encrypted_check` (a policy-spec leg pins the two equal). `death_date` stores
 * a plaintext code ONLY for *"I don't know the date"*.
 */
export const PEER_MESH_SENSITIVE_QUESTION_KEYS = ['death_date', ...PEER_MESH_HEALTH_QUESTION_KEYS] as const;

/**
 * The keys compared wherever BOTH the family and a neighbour answer — the SAME keys and codes on both sides (PM23 (a),
 * PM25). ⚠ `has_died` is NEIGHBOUR-ONLY (the family has ⛔ no `has_died` answer — 6.27d's rule ① compares it against
 * the inspection having happened).
 */
export const COMPARABLE_QUESTION_KEYS = ['has_died', 'death_date', 'death_cause', 'death_illness'] as const;

/**
 * The ruled CODES of the two health questions (`-304` Q3 A / Q4 A) — ONE list, read by BOTH kinds: the neighbours'
 * definitions (`peer-mesh.ts`) and the inspector's (`ground-inspection.ts`), so the family's and a neighbour's answers
 * share codes (PM23 (a): *"the SAME keys and codes wherever BOTH sides answer"*). The `ground_inspection` validator
 * refuses a version whose options differ (Story 6.32 AC1).
 */
export const DEATH_CAUSE_CODES = ['illness_long', 'illness_sudden', 'old_age', 'accident', 'suicide', 'killed', 'other', 'dont_know'] as const;
export const DEATH_ILLNESS_CODES = [
  'cancer',
  'heart_disease',
  'diabetes',
  'kidney_disease',
  'liver_disease',
  'tb',
  'stroke_paralysis',
  'lung_disease',
  'other',
  'dont_know',
] as const;

/** *"I don't know"* on a health question — an answer that includes it is ⛔ never compared (PM25; Story 6.32 IQ4). */
export const DONT_KNOW_CODE = 'dont_know' as const;

/**
 * Story 6.32 (`2026-10-28-413` IQ1) — the questions EVERY `ground_inspection` version carries (I4; CF3 (a)): the head's
 * letter (`-310` CF4 A (3), asked on every full visit — `-330` SW25) and the family's cause and illness (`-304` Q3 A /
 * Q4 A, *"the inspector asks the family the same"*). Every one is OPTIONAL (I1 — nothing gates; the validator holds it).
 */
export const GROUND_INSPECTION_RULED_QUESTION_KEYS = ['head_letter', 'death_cause', 'death_illness'] as const;

/** The head's-letter codes (IQ3 (A): ONLY the answer is recorded — ⛔ the letter's photograph). */
export const HEAD_LETTER_CODES = ['collected', 'not_collected'] as const;

/**
 * The family's Tier-1 answers — ⚠ LOCKSTEP with the Story 6.32 migration's
 * `claim_gi_answers_sensitive_encrypted_check` (a policy-spec leg pins the two equal).
 */
export const GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS = PEER_MESH_HEALTH_QUESTION_KEYS;

/** The `has_died` codes — the event mapping (`claim/peer-mesh-reply.ts`) reads exactly these four. */
export const HAS_DIED_CODES = ['died', 'not_died', 'not_sure', 'did_not_know'] as const;
export type HasDiedCode = (typeof HAS_DIED_CODES)[number];

/** A `date` question's *"I don't know the date"* — stored as a plaintext code, ⛔ no ciphertext, ⛔ no indexes. */
export const DATE_UNKNOWN_CODE = 'unknown' as const;

/** The earliest date a neighbour may give (PM7 (b)). */
export const EARLIEST_ANSWER_DATE = '1900-01-01' as const;

/**
 * The Trustee-ratified decisions a question may cite as `approvedBy` (PM23 (a)). ⭐ Story 6.27b: v3 came from a Panel
 * decision id — `2026-10-13-328` (the call-back question's new words), read with its erratum `-329` (⛔ itself not
 * Panel-ratified, so ⛔ listed). ⛔ No v4 before row 6-33 except from a Panel decision id — adding one here is a reviewed
 * code edit that cites it. ⭐ Story 6.36: `2026-10-14-331` (Trustee-ratified — SC4 A: *"school or office", in the next
 * version (answers already given keep their words)*) — v4's relationship option words. ⭐ Story 6.32 (`2026-10-28-413`
 * IQ1): `2026-10-10-310` (Trustee-ratified — CF4 A (3): *"the inspector collects a letter from the head of the school or
 * office"*) — the inspector's `head_letter` question.
 */
export const PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS = [
  '2026-09-28-262',
  '2026-09-28-263',
  '2026-10-10-303',
  '2026-10-10-304',
  '2026-10-10-310',
  '2026-10-13-328',
  '2026-10-14-331',
] as const;

/** A decision id (`YYYY-MM-DD-NNN`) — the form of a recorded counsel basis. */
export const DECISION_ID_RE = /^\d{4}-\d{2}-\d{2}-\d{3}$/;

/** ⛔ No alcohol question (`-304` Q5 A; CF3 (c)) — matched on keys, codes and copy keys. */
export const FORBIDDEN_TOPIC_RE = /alcohol|drink|liquor|sharab/i;
