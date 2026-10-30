// The questionnaire VALIDATOR — Story 6.27a PM23 (a). A definition is REFUSED unless every rule holds. Because the
// rules live HERE (⛔ never only in a test), row 6-33's database-backed versions inherit them.
//
// The rules (CF3 (a)–(d), `2026-10-10-310`):
//   · `peer_mesh`, v2 onward — all seven ruled keys present (v1 is EXEMPT: registered and historical, ⛔ never live);
//   · `warning` ONLY on `has_died` and `death_date` (a chain-added question is ⛔ never a warning or a flag) — and, v2
//     onward, ALWAYS on both; the ruled health questions stay `health: true` (⛔ never reclassified — review S2);
//   · every question, and the version, carries `approvedBy` = Trustee-ratified decision ids;
//   · ⛔ no alcohol question key, option or copy key (`-304` Q5 A);
//   · a `health: true` question carries a `counselBasis` (`'pending'` or a decision id); a non-health one carries none;
//   · `showIf` refers only to an EARLIER key and to its real codes; keys and codes unique; pages of 1–3 questions;
//   · Story 6.27b (`-329`) — `callbackAudience` on `callback_consent` (one of `CALLBACK_AUDIENCES`), and ONLY there;
//   · Story 6.32 (`2026-10-28-413` IQ1) — `ground_inspection`, EVERY version: the three ruled keys (I4); EVERY question
//     optional (I1 — nothing gates an inspection); cause and illness `health` + `sensitive` with the neighbours' CODES
//     (PM23 (a)); the head's letter ⛔ sensitive / health, codes `collected` / `not_collected`.
//   · Story 6.33 (`2026-10-30-421` QE3 / QE4 / QE5 / QE8 / QE10) — the ORIGIN is an input: a CODE version is numbered
//     below 1000 and cites ⛔ chain record; a DATABASE version (the `-304` Q7 / Q8 chain) is numbered from 1000, its
//     ruled questions and closing words are LOCKED to its recorded ruled base (a CODE version), and every other question
//     is a CHAIN question — stored words, `approvedBy` exactly its own chain record, and QE8's checklist C1–C8 / C10
//     (C9 is `questionnaireDefinitionWarnings`, ⛔ a refusal). Words: exactly one of `copyKey` / `text`, by `typeof`.
// ⛔ PURE.

import {
  CHAIN_QUESTION_KEY_MAX,
  CHAIN_QUESTION_KINDS,
  CHAIN_QUESTION_OPTIONS_MAX,
  CHAIN_RECORD_RE,
  CHAIN_RESERVED_QUESTION_KEYS,
  COUNSEL_BASIS_DECISIONS,
  DATE_UNKNOWN_CODE,
  DB_VERSION_FLOOR,
  DEATH_CAUSE_CODES,
  DEATH_ILLNESS_CODES,
  DECISION_ID_RE,
  forbiddenTopicMatch,
  GROUND_INSPECTION_CHAIN_OPTIONS_MAX,
  GROUND_INSPECTION_RULED_QUESTION_KEYS,
  GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS,
  HAS_DIED_CODES,
  HEAD_LETTER_CODES,
  hasUnstorableText,
  PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS,
  PEER_MESH_HEALTH_QUESTION_KEYS,
  PEER_MESH_RULED_QUESTION_KEYS,
  PEER_MESH_SENSITIVE_QUESTION_KEYS,
  PEER_MESH_WARNING_QUESTION_KEYS,
  MEMBER_PLACEHOLDER,
  QUESTIONNAIRE_MAX_QUESTIONS,
  STORED_TEXT_MAX,
  ruledQuestionKeysFor,
} from './keys.js';
import {
  CALLBACK_AUDIENCES,
  QUESTION_KINDS,
  QUESTIONNAIRE_KINDS,
  type QuestionDefinition,
  type QuestionnaireDefinition,
  type StoredText,
} from './types.js';

const KEY_RE = /^[a-z][a-z0-9_]*$/;
const COPY_KEY_RE = /^[a-z][a-z0-9_.]*$/;
const MAX_QUESTIONS_PER_PAGE = 3;
const PLACEHOLDER_RE = /\{[^}]*\}/g;

/**
 * Story 6.33 QE4 — WHERE a definition comes from. A CODE version (the registry) is the default; a DATABASE version (the
 * chain) names its own `questionnaire_versions.id` (stamped by the server as `chain:<id>`) and the CODE version whose
 * ruled questions it carries (`ruled_base_code_version_id` — QE5's ONE definition, recorded at write: ⛔ the newest code
 * version at READ time — TR11).
 */
export type QuestionnaireValidationContext =
  | { readonly origin: 'code' }
  | { readonly origin: 'db'; readonly chainId: string; readonly ruledBase: QuestionnaireDefinition };

const CODE_ORIGIN: QuestionnaireValidationContext = { origin: 'code' };

export class QuestionnaireDefinitionInvalidError extends Error {
  readonly code = 'questionnaire.definition_invalid';
  constructor(
    readonly versionId: string,
    readonly problems: readonly string[],
  ) {
    super(`[questionnaires] ${versionId} refused: ${problems.join('; ')}`);
    this.name = 'QuestionnaireDefinitionInvalidError';
  }
}

/** The warning keys a kind admits — `ground_inspection` admits ⛔ none until its own story rules one. */
function warningKeysFor(kind: QuestionnaireDefinition['kind']): readonly string[] {
  return kind === 'peer_mesh' ? PEER_MESH_WARNING_QUESTION_KEYS : [];
}

/** A chain record for THIS version — the form (a lower-case uuid) AND the id (⛔ another version's record). */
function isOwnChainRecord(id: string, ctx: QuestionnaireValidationContext): boolean {
  return ctx.origin === 'db' && CHAIN_RECORD_RE.test(id) && id === `chain:${ctx.chainId}`;
}

function checkApprovedBy(where: string, ids: readonly string[], ctx: QuestionnaireValidationContext, problems: string[]): void {
  if (ids.length === 0) problems.push(`${where}: approvedBy is empty`);
  for (const id of ids) {
    if (typeof id === 'string' && id.startsWith('chain:')) {
      if (ctx.origin === 'code') problems.push(`${where}: a code version cannot cite a chain record ('${id}')`);
      else if (!isOwnChainRecord(id, ctx)) problems.push(`${where}: approvedBy '${id}' is not this version's chain record`);
    } else if (!(PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS as readonly string[]).includes(id)) {
      problems.push(`${where}: approvedBy '${id}' is not a Trustee-ratified questionnaire decision`);
    }
  }
}

/** QE4 — stored words: both languages, non-empty, trimmed, ≤ 500; every `{…}` is exactly `{member}` (C10). */
function checkStoredText(where: string, text: StoredText, problems: string[]): void {
  for (const lang of ['en', 'hi'] as const) {
    const v: unknown = (text as unknown as Record<string, unknown>)[lang];
    if (typeof v !== 'string' || v.length === 0 || v.trim() !== v || v.length > STORED_TEXT_MAX) {
      problems.push(`${where}: text.${lang} is a non-empty trimmed string of ≤ ${STORED_TEXT_MAX} characters`);
      continue;
    }
    // Review RV22 — a NUL / lone surrogate would fail in Postgres (22P05) as a 500: refuse it here as a problem (a 422).
    if (hasUnstorableText(v)) {
      problems.push(`${where}: text.${lang} holds a character that cannot be stored (a NUL or a lone surrogate)`);
      continue;
    }
    for (const m of v.matchAll(PLACEHOLDER_RE)) {
      if (m[0] !== MEMBER_PLACEHOLDER) problems.push(`${where}: text.${lang} — the only placeholder is ${MEMBER_PLACEHOLDER} (found '${m[0]}')`);
    }
  }
}

/** QE4 — EXACTLY ONE of `copyKey` / `text`, by `typeof` (⛔ truthiness — a JSONB row is ⛔ typed); a chain item: text. */
function checkWords(where: string, item: { readonly copyKey?: unknown; readonly text?: unknown }, chain: boolean, problems: string[]): void {
  const hasKey = typeof item.copyKey === 'string';
  const hasText = typeof item.text === 'object' && item.text !== null;
  if (hasKey === hasText) problems.push(`${where}: exactly one of copyKey / text`);
  if (hasKey && !COPY_KEY_RE.test(item.copyKey as string)) problems.push(`${where}: malformed copy key '${String(item.copyKey)}'`);
  if (hasText) checkStoredText(where, item.text as StoredText, problems);
  if (chain && !hasText) problems.push(`${where}: a chain question's words are stored text (⛔ a copy key)`);
}

/** Every string a person or the code could hide an alcohol question in (CF3 (c)) — incl. the stored words (C6). */
function topicStrings(q: QuestionDefinition): string[] {
  const out: unknown[] = [q.key, q.copyKey, q.text?.en, q.text?.hi];
  for (const o of q.options) out.push(o.code, o.copyKey, o.text?.en, o.text?.hi);
  return out.filter((x): x is string => typeof x === 'string');
}

/**
 * QE8 — the checklist for a CHAIN question (a non-ruled key in a database version): C1 key, C2 kind, C3 options, C4
 * optional / ⛔ warning / ⛔ audience, C5 sensitive (`=== true`), C7 counsel's basis (QE10). C6 / C10 run on every
 * question (above); C8 on the version.
 */
function checkChainQuestion(def: QuestionnaireDefinition, q: QuestionDefinition, chainId: string, problems: string[]): void {
  const where = `question '${q.key}'`;
  const own = `chain:${chainId}`;
  if (q.approvedBy.length !== 1 || q.approvedBy[0] !== own) problems.push(`${where}: a chain question's approvedBy is exactly ['${own}']`);
  if (CHAIN_RESERVED_QUESTION_KEYS.includes(q.key)) problems.push(`${where}: C1 — a reserved key (a ruled, warning, comparable or health key)`);
  if (typeof q.key !== 'string' || q.key.length > CHAIN_QUESTION_KEY_MAX) problems.push(`${where}: C1 — a key of ≤ ${CHAIN_QUESTION_KEY_MAX} characters`);
  if (!(CHAIN_QUESTION_KINDS as readonly string[]).includes(q.kind)) problems.push(`${where}: C2 — a chain question is ${CHAIN_QUESTION_KINDS.join(' / ')}`);
  const maxOptions = def.kind === 'ground_inspection' ? GROUND_INSPECTION_CHAIN_OPTIONS_MAX : CHAIN_QUESTION_OPTIONS_MAX;
  if (q.options.length > maxOptions) problems.push(`${where}: C3 — at most ${maxOptions} options`);
  if (q.optional !== true) problems.push(`${where}: C4 — a chain question is optional`);
  if (q.warning !== false) problems.push(`${where}: C4 — a chain question is ⛔ a warning`);
  if (q.callbackAudience !== undefined) problems.push(`${where}: C4 — ⛔ callbackAudience on a chain question`);
  if (q.sensitive !== true) problems.push(`${where}: C5 — a chain question is sensitive (stored encrypted)`);
  if (typeof q.health !== 'boolean') problems.push(`${where}: C7 — health is a boolean`);
  else if (q.health && q.counselBasis !== null && q.counselBasis !== 'pending' && !COUNSEL_BASIS_DECISIONS.includes(q.counselBasis)) {
    problems.push(`${where}: C7 — a chain health question's basis is 'pending' or an id in COUNSEL_BASIS_DECISIONS`);
  }
}

/** A stable rendering for the field-by-field lock (key order ignored; an absent field ≠ a present one). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

/** The ruled HEALTH questions — their `counselBasis` is EXCLUDED from the lock and overlaid at read (QE12 R3). */
const LOCK_EXEMPT_BASIS_KEYS: readonly string[] = PEER_MESH_HEALTH_QUESTION_KEYS;

/** The lock's view of a ruled question. */
export function lockedView(q: QuestionDefinition): unknown {
  if (!LOCK_EXEMPT_BASIS_KEYS.includes(q.key)) return q;
  return Object.fromEntries(Object.entries(q).filter(([k]) => k !== 'counselBasis'));
}

/** QE5 (A) — a database version: the ruled base, the version's own `approvedBy`, the locked questions and closing words. */
function checkDbVersion(def: QuestionnaireDefinition, ctx: Extract<QuestionnaireValidationContext, { origin: 'db' }>, questions: ReadonlyMap<string, QuestionDefinition>, problems: string[]): void {
  const base = ctx.ruledBase;
  if (!CHAIN_RECORD_RE.test(`chain:${ctx.chainId}`)) problems.push(`the chain record id '${ctx.chainId}' is not a lower-case uuid`);
  if (base.kind !== def.kind || !(base.version < DB_VERSION_FLOOR)) {
    problems.push(`the ruled base '${base.versionId}' is a CODE version of the same kind`);
    return;
  }
  const expected = [...base.approvedBy, `chain:${ctx.chainId}`];
  if (canonicalJson(def.approvedBy) !== canonicalJson(expected)) {
    problems.push(`the version's approvedBy is ${base.versionId}'s Panel ids + chain:<this version's id>`);
  }
  if (def.closingNoteCopyKey !== base.closingNoteCopyKey) problems.push(`the closing note is locked to ${base.versionId} (QE5)`);
  if (def.thankYouCopyKey !== base.thankYouCopyKey) problems.push(`the thank-you is locked to ${base.versionId} (QE5)`);
  const baseQuestions = new Map(base.pages.flatMap((p) => p.questions).map((q) => [q.key, q] as const));
  for (const key of ruledQuestionKeysFor(def.kind)) {
    const b = baseQuestions.get(key);
    const q = questions.get(key);
    if (b === undefined || q === undefined) continue; // presence is CF3 (a)'s rule (below)
    if (canonicalJson(lockedView(q)) !== canonicalJson(lockedView(b))) problems.push(`the ruled question '${key}' is locked to ${base.versionId} (QE5)`);
  }
}

function checkQuestion(
  def: QuestionnaireDefinition,
  q: QuestionDefinition,
  earlier: ReadonlyMap<string, QuestionDefinition>,
  ctx: QuestionnaireValidationContext,
  problems: string[],
): void {
  const where = `question '${q.key}'`;
  const chain = ctx.origin === 'db' && !ruledQuestionKeysFor(def.kind).includes(q.key);
  if (!KEY_RE.test(q.key)) problems.push(`${where}: malformed key`);
  if (!(QUESTION_KINDS as readonly string[]).includes(q.kind)) problems.push(`${where}: unknown kind '${q.kind}'`);
  checkWords(where, q, chain, problems);

  const codes = q.options.map((o) => o.code);
  if (new Set(codes).size !== codes.length) problems.push(`${where}: duplicate option code`);
  for (const o of q.options) {
    if (!KEY_RE.test(o.code)) problems.push(`${where}: malformed option code '${o.code}'`);
    checkWords(`${where}: option '${o.code}'`, o, chain, problems);
    if (o.exclusive === true && q.kind !== 'multi') problems.push(`${where}: 'exclusive' on a non-multi option '${o.code}'`);
  }
  if ((q.kind === 'single' || q.kind === 'multi') && q.options.length < 2) problems.push(`${where}: a ${q.kind} question needs ≥ 2 options`);
  if (q.kind === 'yes_no' && !(codes.length === 2 && codes[0] === 'yes' && codes[1] === 'no')) {
    problems.push(`${where}: a yes_no question's codes are exactly ['yes', 'no']`);
  }
  if (q.kind === 'date' && !(codes.length === 1 && codes[0] === DATE_UNKNOWN_CODE)) {
    problems.push(`${where}: a date question's only option is '${DATE_UNKNOWN_CODE}'`);
  }

  // CF3 (c) — ⛔ no alcohol question (QE8 C6: the stored words too, English and Hindi).
  const topic = topicStrings(q)
    .map((s) => forbiddenTopicMatch(s))
    .find((m) => m !== null);
  if (topic !== undefined && topic !== null) {
    problems.push(`${where}: an alcohol question or option is refused (-304 Q5 A) — matched '${topic}'`);
  }

  // CF3 (b) — a warning ONLY on the two ruled keys.
  if (q.warning && !warningKeysFor(def.kind).includes(q.key)) problems.push(`${where}: 'warning' is refused on this key`);

  checkApprovedBy(where, q.approvedBy, ctx, problems);
  if (chain && ctx.origin === 'db') checkChainQuestion(def, q, ctx.chainId, problems);

  // CF3 (d) — the counsel basis is a state on a health question, and only there.
  if (q.health) {
    if (q.counselBasis === null) problems.push(`${where}: a health question needs a counselBasis`);
    else if (q.counselBasis !== 'pending' && !DECISION_ID_RE.test(q.counselBasis)) {
      problems.push(`${where}: counselBasis is 'pending' or a decision id`);
    }
    if (!q.sensitive) problems.push(`${where}: a health question is sensitive`);
  } else if (q.counselBasis !== null) {
    problems.push(`${where}: counselBasis only on a health question`);
  }
  if (q.kind === 'date' && !q.sensitive) problems.push(`${where}: a date question is sensitive`);

  // Story 6.27b (`-329` decisions 1–3) — whom the call-back question's words name, read by the approvers' read.
  if (q.key === 'callback_consent') {
    if (q.callbackAudience === undefined) problems.push(`${where}: callbackAudience is required`);
    else if (!(CALLBACK_AUDIENCES as readonly string[]).includes(q.callbackAudience)) {
      problems.push(`${where}: callbackAudience is one of ${CALLBACK_AUDIENCES.join(', ')}`);
    }
  } else if (q.callbackAudience !== undefined) {
    problems.push(`${where}: callbackAudience only on 'callback_consent'`);
  }

  if (q.showIf !== null) {
    const target = earlier.get(q.showIf.key);
    if (!target) problems.push(`${where}: showIf refers to '${q.showIf.key}', which is not an EARLIER question`);
    else {
      if (q.showIf.anyOf.length === 0) problems.push(`${where}: showIf.anyOf is empty`);
      for (const c of q.showIf.anyOf) {
        if (!target.options.some((o) => o.code === c)) problems.push(`${where}: showIf code '${c}' is not an option of '${target.key}'`);
      }
    }
  }
}

/** Every problem with `def` — empty ⇔ valid. `ctx` = where it comes from (Story 6.33 QE4; a CODE version by default). */
export function questionnaireDefinitionProblems(def: QuestionnaireDefinition, ctx: QuestionnaireValidationContext = CODE_ORIGIN): string[] {
  const problems: string[] = [];
  if (!(QUESTIONNAIRE_KINDS as readonly string[]).includes(def.kind)) problems.push(`unknown kind '${def.kind}'`);
  if (!Number.isInteger(def.version) || def.version < 1) problems.push('version is a positive integer');
  // QE3 (A) — two disjoint ranges: a later reviewed code version can ⛔ take an id a database already holds.
  if (ctx.origin === 'code' && def.version >= DB_VERSION_FLOOR) problems.push(`a code version is numbered below ${DB_VERSION_FLOOR} (QE3)`);
  if (ctx.origin === 'db' && !(def.version >= DB_VERSION_FLOOR)) problems.push(`a database version is numbered from ${DB_VERSION_FLOOR} (QE3)`);
  if (def.versionId !== `${def.kind}.v${def.version}`) problems.push(`versionId is '${def.kind}.v${def.version}'`);
  if (!COPY_KEY_RE.test(def.closingNoteCopyKey) || !COPY_KEY_RE.test(def.thankYouCopyKey)) problems.push('malformed closing copy key');
  checkApprovedBy('the version', def.approvedBy, ctx, problems);
  if (def.pages.length === 0) problems.push('no pages');

  const earlier = new Map<string, QuestionDefinition>();
  for (const [i, page] of def.pages.entries()) {
    if (page.questions.length === 0 || page.questions.length > MAX_QUESTIONS_PER_PAGE) {
      problems.push(`page ${i + 1}: 1–${MAX_QUESTIONS_PER_PAGE} questions`);
    }
    for (const q of page.questions) {
      if (earlier.has(q.key)) problems.push(`question '${q.key}': duplicate key`);
      checkQuestion(def, q, earlier, ctx, problems);
      earlier.set(q.key, q);
    }
  }
  // QE8 C8 — the version's size (the answer read caps — G16).
  if (earlier.size > QUESTIONNAIRE_MAX_QUESTIONS) problems.push(`C8 — a version holds at most ${QUESTIONNAIRE_MAX_QUESTIONS} questions in total`);
  if (ctx.origin === 'db') checkDbVersion(def, ctx, earlier, problems);

  if (def.kind === 'peer_mesh') {
    const first = def.pages[0]?.questions[0];
    if (first?.key !== 'has_died') problems.push(`the first question is 'has_died'`);
    for (const q of earlier.values()) {
      if (q.key === 'has_died') {
        if (q.optional) problems.push(`'has_died' is required`);
        if (q.kind !== 'single' || q.options.map((o) => o.code).join(',') !== HAS_DIED_CODES.join(',')) {
          problems.push(`'has_died' is single with codes ${HAS_DIED_CODES.join(', ')}`);
        }
      } else if (!q.optional) {
        problems.push(`question '${q.key}': every question but 'has_died' is optional`);
      }
      if (q.key === 'death_date' && q.kind !== 'date') problems.push(`'death_date' is a date question`);
    }
    // CF3 (a) — every ruled key, from v2 onward (v1 EXEMPT).
    if (def.version >= 2) {
      for (const key of PEER_MESH_RULED_QUESTION_KEYS) {
        if (!earlier.has(key)) problems.push(`the ruled question '${key}' is missing (CF3 (a))`);
      }
      // ⭐ Second-pass review S2 — the ruled CLASSIFICATION, ⛔ not only the presence: a ruled health question stays a
      // health question (⇒ sensitive, ⇒ counsel's basis), and both warning questions keep their warning (`-308` item 2).
      // Third-pass review U12: `!== true`, ⛔ `=== false` — an OMITTED flag (row 6-33's JSON-backed versions) is refused too.
      for (const key of PEER_MESH_HEALTH_QUESTION_KEYS) {
        if (earlier.has(key) && earlier.get(key)?.health !== true) problems.push(`the ruled health question '${key}' is health: true`);
      }
      for (const key of PEER_MESH_WARNING_QUESTION_KEYS) {
        if (earlier.has(key) && earlier.get(key)?.warning !== true) problems.push(`the ruled question '${key}' carries its warning`);
      }
    }
    // U12 — EVERY version (v1 included): the Tier-1 questions are `sensitive`, so the writer encrypts them — in lockstep
    // with migration 0158's CHECK (a codes form there would be a 23514, a 500, instead of a validator refusal here).
    for (const key of PEER_MESH_SENSITIVE_QUESTION_KEYS) {
      if (earlier.has(key) && earlier.get(key)?.sensitive !== true) problems.push(`the Tier-1 question '${key}' is sensitive`);
    }
  }
  if (def.kind === 'ground_inspection') groundInspectionProblems(earlier, problems);
  return problems;
}

/** The ruled codes of each ruled `ground_inspection` question (the health ones shared with `peer_mesh`). */
const GROUND_INSPECTION_RULED_CODES: Readonly<Record<string, readonly string[]>> = {
  head_letter: HEAD_LETTER_CODES,
  death_cause: DEATH_CAUSE_CODES,
  death_illness: DEATH_ILLNESS_CODES,
};

/** Story 6.32 — the `ground_inspection` rule, applied to EVERY version (⛔ a v1 exemption: there is no history to keep). */
function groundInspectionProblems(questions: ReadonlyMap<string, QuestionDefinition>, problems: string[]): void {
  // CF3 (a) / I4 — every ruled key, in every version.
  for (const key of GROUND_INSPECTION_RULED_QUESTION_KEYS) {
    if (!questions.has(key)) problems.push(`the ruled question '${key}' is missing (CF3 (a))`);
  }
  for (const q of questions.values()) {
    // I1 — the questionnaire gates ⛔ nothing: a chain-added question (row 6-33) inherits this.
    if (!q.optional) problems.push(`question '${q.key}': every ground_inspection question is optional`);
    // ⭐ Story 6.32 (second review S17) — an OWN key only: a plain index would answer `Object` for a key `constructor`.
    const ruled = Object.hasOwn(GROUND_INSPECTION_RULED_CODES, q.key) ? GROUND_INSPECTION_RULED_CODES[q.key] : undefined;
    if (ruled !== undefined && q.options.map((o) => o.code).join(',') !== ruled.join(',')) {
      problems.push(q.key === 'head_letter' ? `'head_letter' is single with codes ${ruled.join(', ')}` : `'${q.key}' has the ruled codes (the neighbours')`);
    }
  }
  const letter = questions.get('head_letter');
  if (letter !== undefined) {
    if (letter.kind !== 'single') problems.push(`'head_letter' is single with codes ${HEAD_LETTER_CODES.join(', ')}`);
    if (letter.sensitive || letter.health) problems.push(`'head_letter' is ⛔ sensitive or health`);
  }
  // `!== true` (U12) — an OMITTED flag is refused too.
  for (const key of GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS) {
    const q = questions.get(key);
    if (q === undefined) continue;
    if (q.health !== true) problems.push(`the ruled health question '${key}' is health: true`);
    if (q.sensitive !== true) problems.push(`the Tier-1 question '${key}' is sensitive`);
  }
}

/** Throw `QuestionnaireDefinitionInvalidError` unless `def` is valid. */
export function assertValidQuestionnaireDefinition(def: QuestionnaireDefinition, ctx: QuestionnaireValidationContext = CODE_ORIGIN): void {
  const problems = questionnaireDefinitionProblems(def, ctx);
  if (problems.length > 0) throw new QuestionnaireDefinitionInvalidError(def.versionId, problems);
}

/**
 * Story 6.33 QE8 C9 — what is ALLOWED but worth telling the author (⛔ a refusal): a question whose `showIf` parent is
 * skipped while it waits for counsel's basis is itself never shown (`servedDefinition` drops dependants).
 */
export function questionnaireDefinitionWarnings(def: QuestionnaireDefinition): string[] {
  const skipped = new Set<string>();
  const warnings: string[] = [];
  for (const q of def.pages.flatMap((p) => p.questions)) {
    if (q.counselBasis === 'pending') {
      skipped.add(q.key);
    } else if (q.showIf !== null && skipped.has(q.showIf.key)) {
      skipped.add(q.key);
      warnings.push(`question '${q.key}' is never shown while '${q.showIf.key}' waits for counsel's basis`);
    }
  }
  return warnings;
}
