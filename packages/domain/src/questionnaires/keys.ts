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
 * code edit that cites it.
 */
export const PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS = [
  '2026-09-28-262',
  '2026-09-28-263',
  '2026-10-10-303',
  '2026-10-10-304',
  '2026-10-13-328',
] as const;

/** A decision id (`YYYY-MM-DD-NNN`) — the form of a recorded counsel basis. */
export const DECISION_ID_RE = /^\d{4}-\d{2}-\d{2}-\d{3}$/;

/** ⛔ No alcohol question (`-304` Q5 A; CF3 (c)) — matched on keys, codes and copy keys. */
export const FORBIDDEN_TOPIC_RE = /alcohol|drink|liquor|sharab/i;
