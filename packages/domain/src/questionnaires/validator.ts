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
//   · `showIf` refers only to an EARLIER key and to its real codes; keys and codes unique; pages of 1–3 questions.
// ⛔ PURE.

import {
  DATE_UNKNOWN_CODE,
  DECISION_ID_RE,
  FORBIDDEN_TOPIC_RE,
  HAS_DIED_CODES,
  PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS,
  PEER_MESH_HEALTH_QUESTION_KEYS,
  PEER_MESH_RULED_QUESTION_KEYS,
  PEER_MESH_WARNING_QUESTION_KEYS,
} from './keys.js';
import {
  QUESTION_KINDS,
  QUESTIONNAIRE_KINDS,
  type QuestionDefinition,
  type QuestionnaireDefinition,
} from './types.js';

const KEY_RE = /^[a-z][a-z0-9_]*$/;
const COPY_KEY_RE = /^[a-z][a-z0-9_.]*$/;
const MAX_QUESTIONS_PER_PAGE = 3;

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

function checkApprovedBy(where: string, ids: readonly string[], problems: string[]): void {
  if (ids.length === 0) problems.push(`${where}: approvedBy is empty`);
  for (const id of ids) {
    if (!(PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS as readonly string[]).includes(id)) {
      problems.push(`${where}: approvedBy '${id}' is not a Trustee-ratified questionnaire decision`);
    }
  }
}

function checkQuestion(def: QuestionnaireDefinition, q: QuestionDefinition, earlier: ReadonlyMap<string, QuestionDefinition>, problems: string[]): void {
  const where = `question '${q.key}'`;
  if (!KEY_RE.test(q.key)) problems.push(`${where}: malformed key`);
  if (!(QUESTION_KINDS as readonly string[]).includes(q.kind)) problems.push(`${where}: unknown kind '${q.kind}'`);
  if (!COPY_KEY_RE.test(q.copyKey)) problems.push(`${where}: malformed copy key`);

  const codes = q.options.map((o) => o.code);
  if (new Set(codes).size !== codes.length) problems.push(`${where}: duplicate option code`);
  for (const o of q.options) {
    if (!KEY_RE.test(o.code)) problems.push(`${where}: malformed option code '${o.code}'`);
    if (!COPY_KEY_RE.test(o.copyKey)) problems.push(`${where}: malformed option copy key '${o.copyKey}'`);
    if (o.exclusive === true && q.kind !== 'multi') problems.push(`${where}: 'exclusive' on a non-multi option '${o.code}'`);
  }
  if ((q.kind === 'single' || q.kind === 'multi') && q.options.length < 2) problems.push(`${where}: a ${q.kind} question needs ≥ 2 options`);
  if (q.kind === 'yes_no' && !(codes.length === 2 && codes[0] === 'yes' && codes[1] === 'no')) {
    problems.push(`${where}: a yes_no question's codes are exactly ['yes', 'no']`);
  }
  if (q.kind === 'date' && !(codes.length === 1 && codes[0] === DATE_UNKNOWN_CODE)) {
    problems.push(`${where}: a date question's only option is '${DATE_UNKNOWN_CODE}'`);
  }

  // CF3 (c) — ⛔ no alcohol question.
  if ([q.key, q.copyKey, ...codes, ...q.options.map((o) => o.copyKey)].some((s) => FORBIDDEN_TOPIC_RE.test(s))) {
    problems.push(`${where}: an alcohol question or option is refused (-304 Q5 A)`);
  }

  // CF3 (b) — a warning ONLY on the two ruled keys.
  if (q.warning && !warningKeysFor(def.kind).includes(q.key)) problems.push(`${where}: 'warning' is refused on this key`);

  checkApprovedBy(where, q.approvedBy, problems);

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

/** Every problem with `def` — empty ⇔ valid. */
export function questionnaireDefinitionProblems(def: QuestionnaireDefinition): string[] {
  const problems: string[] = [];
  if (!(QUESTIONNAIRE_KINDS as readonly string[]).includes(def.kind)) problems.push(`unknown kind '${def.kind}'`);
  if (!Number.isInteger(def.version) || def.version < 1) problems.push('version is a positive integer');
  if (def.versionId !== `${def.kind}.v${def.version}`) problems.push(`versionId is '${def.kind}.v${def.version}'`);
  if (!COPY_KEY_RE.test(def.closingNoteCopyKey) || !COPY_KEY_RE.test(def.thankYouCopyKey)) problems.push('malformed closing copy key');
  checkApprovedBy('the version', def.approvedBy, problems);
  if (def.pages.length === 0) problems.push('no pages');

  const earlier = new Map<string, QuestionDefinition>();
  for (const [i, page] of def.pages.entries()) {
    if (page.questions.length === 0 || page.questions.length > MAX_QUESTIONS_PER_PAGE) {
      problems.push(`page ${i + 1}: 1–${MAX_QUESTIONS_PER_PAGE} questions`);
    }
    for (const q of page.questions) {
      if (earlier.has(q.key)) problems.push(`question '${q.key}': duplicate key`);
      checkQuestion(def, q, earlier, problems);
      earlier.set(q.key, q);
    }
  }

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
      for (const key of PEER_MESH_HEALTH_QUESTION_KEYS) {
        if (earlier.get(key)?.health === false) problems.push(`the ruled health question '${key}' is health: true`);
      }
      for (const key of PEER_MESH_WARNING_QUESTION_KEYS) {
        if (earlier.get(key)?.warning === false) problems.push(`the ruled question '${key}' carries its warning`);
      }
    }
  }
  return problems;
}

/** Throw `QuestionnaireDefinitionInvalidError` unless `def` is valid. */
export function assertValidQuestionnaireDefinition(def: QuestionnaireDefinition): void {
  const problems = questionnaireDefinitionProblems(def);
  if (problems.length > 0) throw new QuestionnaireDefinitionInvalidError(def.versionId, problems);
}
