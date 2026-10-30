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
 * Panel-ratified, so ⛔ listed). A new CODE version still comes only from a Panel decision id — adding one here is a
 * reviewed code edit that cites it; staff versions come through row 6-33's chain and cite a chain record
 * (`CHAIN_RECORD_RE`), ⛔ an id here. ⭐ Story 6.36: `2026-10-14-331` (Trustee-ratified — SC4 A: *"school or office", in the next
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

/**
 * ⛔ No alcohol question (`-304` Q5 A; CF3 (c)) — matched on keys, codes, copy keys and (Story 6.33 QE8 C6) the STORED
 * words of a chain question or option, in English AND Hindi. A substring match, ⛔ `\b` (JS `\b` is ASCII-only): it also
 * refuses innocent text such as "drinking water" — accepted (CF3 (c) is a prohibition); the editor shows the matched term.
 */
/**
 * ⚠ The Hindi short-u spelling `दारु` is also the stem of `दारुण` ("grievous" — the commonest word in condolence text), and a bare
 * Latin `daru` is inside `Daruka` / `darumaa`: both are matched ONLY as the whole word (review RP1 — the first widening refused
 * "दारुण दुःख" and "Daruka village"). `\b` is ASCII-only in JS, which is right for the Latin terms; the Devanagari stem takes a
 * negative lookahead for `ण`.
 */
export const FORBIDDEN_TOPIC_RE = /alcohol|drink|liquor|sharab|sharaab|\bdaa?ru\b|शराब|दार[ुू](?!ण)|मदिरा|नशा|ठर्रा/i;

/**
 * What is stripped before matching (review RP1): every Unicode FORMAT character (`\p{Cf}` — ZWJ / ZWNJ / bidi controls / U+2061–2064 /
 * the soft hyphen), the variation selectors, the combining grapheme joiner and the Hangul filler. Built with `fromCharCode` for the
 * non-property parts — ⛔ an escape sequence in source.
 */
const INVISIBLE_RE = new RegExp(
  `[\\p{Cf}${String.fromCharCode(0xfe00)}-${String.fromCharCode(0xfe0f)}${String.fromCharCode(0x034f)}${String.fromCharCode(0x3164)}]`,
  'gu',
);

/**
 * The forbidden term `s` contains, or `null` — after NFKC normalisation (it folds full-width and mathematical Latin: `ＡＬＣＯＨＯＬ`)
 * and with invisible characters removed (a ZWJ inside "शराब" must not evade the match). This is a LEXICAL backstop beside the
 * approver's own classification tick (QE10), not the whole control: it will miss a spelling it does not list.
 */
export function forbiddenTopicMatch(s: string): string | null {
  return FORBIDDEN_TOPIC_RE.exec(s.normalize('NFKC').replace(INVISIBLE_RE, ''))?.[0] ?? null;
}

/**
 * Text Postgres cannot store (review RV22): a NUL (U+0000 — refused by `text` and `jsonb`) or a LONE surrogate (not a valid
 * UTF-8 scalar — `jsonb` raises 22P05). Either would surface as a 500 on insert. Scanned by code unit, ⛔ a regex over escapes.
 */
export function hasUnstorableText(s: string): boolean {
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (c === 0) return true;
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        i += 1;
        continue;
      }
      return true;
    }
    if (c >= 0xdc00 && c <= 0xdfff) return true;
  }
  return false;
}

// ── Story 6.33 — the chain (`2026-10-10-304` Q7 / Q8; `2026-10-30-421` QE3 / QE4 / QE8 / QE10) ──────────────────────

/**
 * A chain record cited as `approvedBy` — `chain:<questionnaire_versions.id>` (a lower-case uuid, STAMPED by the
 * server). Admitted ONLY in a database-stored version, and ONLY for that version's own id (the validator).
 */
export const CHAIN_RECORD_RE = /^chain:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * QE3 (A) — database versions number from 1000 (a CHECK in migration 0192), CODE versions stay below it (the
 * validator), so a later reviewed code version can ⛔ take an id a database already holds.
 */
export const DB_VERSION_FLOOR = 1000;

/**
 * QE10 (A) — counsel's recorded bases a CHAIN health question may cite. EMPTY: recording one is a reviewed code edit
 * that cites it (as Row 27 (f) / Row 42 (a) already require for the ruled questions) — until then every chain health
 * question is `'pending'`, ⛔ served.
 */
export const COUNSEL_BASIS_DECISIONS: readonly string[] = [];

/** QE8 C1 — a chain question's key is ⛔ any key a ruling or the code gives a meaning, in EITHER questionnaire. */
export const CHAIN_RESERVED_QUESTION_KEYS: readonly string[] = [
  ...new Set<string>([
    ...PEER_MESH_RULED_QUESTION_KEYS,
    ...PEER_MESH_WARNING_QUESTION_KEYS,
    ...PEER_MESH_HEALTH_QUESTION_KEYS,
    ...PEER_MESH_SENSITIVE_QUESTION_KEYS,
    ...COMPARABLE_QUESTION_KEYS,
    ...GROUND_INSPECTION_RULED_QUESTION_KEYS,
    'callback_consent',
  ]),
];

/** QE8 C2 — ⛔ `date` (the ground-inspection save takes only codes; one rule for both kinds). */
export const CHAIN_QUESTION_KINDS = ['single', 'multi', 'yes_no'] as const;

/** QE8 C1 — the neighbours' wire limit (`PeerRequestAnswerPathParams .max(64)`), applied to both kinds. */
export const CHAIN_QUESTION_KEY_MAX = 64;

/** QE8 C3 — `PeerRequestAnswerValue .max(20)`. */
export const CHAIN_QUESTION_OPTIONS_MAX = 20;

/**
 * QE8 C3 — ⚠ LOCKSTEP with `@twt/contracts` `GROUND_INSPECTION_ANSWER_MAX_CODES` (a contracts test pins the two
 * equal): a `ground_inspection` chain question with more options could be served but ⛔ saved.
 */
export const GROUND_INSPECTION_CHAIN_OPTIONS_MAX = 10;

/** QE8 C8 — questions in ONE version, the ruled ones included (5 replies × 20 = the 100-answer console cap — G16). */
export const QUESTIONNAIRE_MAX_QUESTIONS = 20;

/** QE4 — the longest stored string (each language). */
export const STORED_TEXT_MAX = 500;

/** QE4 / QE8 C10 — the ONLY placeholder stored words may hold (`t()`'s `\w` is ASCII: `{सदस्य}` would stay literal). */
export const MEMBER_PLACEHOLDER = '{member}';

/**
 * The questions a ruling gives each kind — the keys the chain may ⛔ change (QE5 (A): locked to the recorded ruled base);
 * in a database version every OTHER key is a chain question (QE4: decided by ORIGIN, ⛔ by `approvedBy`).
 */
export function ruledQuestionKeysFor(kind: 'peer_mesh' | 'ground_inspection'): readonly string[] {
  return kind === 'peer_mesh' ? PEER_MESH_RULED_QUESTION_KEYS : GROUND_INSPECTION_RULED_QUESTION_KEYS;
}
