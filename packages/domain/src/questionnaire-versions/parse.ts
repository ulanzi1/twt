// QE12 R1 — a database row's `definition` → a SERVABLE `QuestionnaireDefinition`, or the reasons it is ⛔ servable (Story
// 6.33, `2026-10-30-421`). Lives HERE, ⛔ in `questionnaires/` (whose fence forbids every package — zod included).
//
// (1) a STRICT Zod parse (`.strict()` at every level, typed booleans, unknown fields refused — a JSONB row is ⛔ typed, and
//     the validator alone is ⛔ type-safe: `RegExp.test(undefined)` passes, a truthy `"true"` would encrypt-or-not by luck);
// (2) the SAME validator the code versions pass, as `{ origin: 'db' }`, against the row's OWN recorded
//     `ruled_base_code_version_id` (⛔ the newest code at read — TR11: a later code edit would strand every pin);
// (3) the counsel-basis overlay from the NEWEST code version of the kind (QE12 R3).
// The served object carries the constants `scope: { kind: 'all' }`, `status: 'live'` (QE2 — a version may be live for P1
// AND for all, so neither has one value; ⛔ consumer outside the registry reads either).

import { z } from 'zod';

import {
  CALLBACK_AUDIENCES,
  DB_VERSION_FLOOR,
  QUESTION_KINDS,
  QUESTIONNAIRE_KINDS,
  QUESTIONNAIRE_REGISTRY,
  getQuestionnaireVersion,
  findNewestCodeVersion,
  overlayCounselBasis,
  questionnaireDefinitionProblems,
  type QuestionnaireDefinition,
  type QuestionnaireKind,
} from '../questionnaires/index.js';

const StoredText = z.object({ en: z.string(), hi: z.string() }).strict();
const Option = z
  .object({ code: z.string(), copyKey: z.string().optional(), text: StoredText.optional(), exclusive: z.boolean().optional() })
  .strict();
const ShowIf = z.object({ key: z.string(), anyOf: z.array(z.string()) }).strict();
const Question = z
  .object({
    key: z.string(),
    kind: z.enum(QUESTION_KINDS),
    copyKey: z.string().optional(),
    text: StoredText.optional(),
    options: z.array(Option),
    optional: z.boolean(),
    showIf: ShowIf.nullable(),
    sensitive: z.boolean(),
    warning: z.boolean(),
    approvedBy: z.array(z.string()),
    health: z.boolean(),
    counselBasis: z.string().nullable(),
    callbackAudience: z.enum(CALLBACK_AUDIENCES).optional(),
  })
  .strict();
const Page = z.object({ questions: z.array(Question) }).strict();

/** What `questionnaire_versions.definition` holds — the definition MINUS `scope` / `status` (QE2). */
export const StoredQuestionnaireDefinition = z
  .object({
    kind: z.enum(QUESTIONNAIRE_KINDS),
    versionId: z.string(),
    version: z.number().int(),
    approvedBy: z.array(z.string()),
    pages: z.array(Page),
    closingNoteCopyKey: z.string(),
    thankYouCopyKey: z.string(),
  })
  .strict();

/** The stored form of a definition (what the writer inserts). */
export function toStoredDefinition(def: QuestionnaireDefinition): z.infer<typeof StoredQuestionnaireDefinition> {
  return {
    kind: def.kind,
    versionId: def.versionId,
    version: def.version,
    approvedBy: def.approvedBy,
    pages: def.pages,
    closingNoteCopyKey: def.closingNoteCopyKey,
    thankYouCopyKey: def.thankYouCopyKey,
  } as z.infer<typeof StoredQuestionnaireDefinition>;
}

/** The columns R1 reads. */
export interface VersionRowForParse {
  readonly id: string;
  readonly kind: QuestionnaireKind;
  readonly versionId: string;
  readonly ruledBaseCodeVersionId: string;
  readonly definition: unknown;
}

export type ParsedVersion =
  | { readonly ok: true; readonly def: QuestionnaireDefinition }
  /** `def` is set when the row PARSED but failed the validator — servable READ-ONLY for its pins (R7 (v)). */
  | { readonly ok: false; readonly def: QuestionnaireDefinition | null; readonly problems: readonly string[] };

/** The CODE version a row's ruled questions are locked to, or `null` (⛔ registered, or ⛔ a code version of the kind). */
export function ruledBaseOf(
  row: Pick<VersionRowForParse, 'kind' | 'ruledBaseCodeVersionId'>,
  registry: readonly QuestionnaireDefinition[] = QUESTIONNAIRE_REGISTRY,
): QuestionnaireDefinition | null {
  const base = getQuestionnaireVersion(row.ruledBaseCodeVersionId, registry);
  return base !== null && base.kind === row.kind && base.version < DB_VERSION_FLOOR ? base : null;
}

/**
 * QE12 R1 — parse, validate against the RECORDED ruled base, overlay counsel's basis. `registry` = the CODE registry (a
 * TEST seam: an injected copy with a recorded counsel basis — the shipped versions are ⛔ edited to pass a test).
 */
export function parseVersionRow(row: VersionRowForParse, registry: readonly QuestionnaireDefinition[] = QUESTIONNAIRE_REGISTRY): ParsedVersion {
  const parsed = StoredQuestionnaireDefinition.safeParse(row.definition);
  if (!parsed.success) {
    return { ok: false, def: null, problems: parsed.error.issues.map((i) => `${i.path.join('.') || 'definition'}: ${i.message}`) };
  }
  const raw: QuestionnaireDefinition = { ...parsed.data, scope: { kind: 'all' }, status: 'live' };
  const ruledBase = ruledBaseOf(row, registry);
  const problems =
    ruledBase === null
      ? [`the ruled base '${row.ruledBaseCodeVersionId}' is not a registered code version of ${row.kind}`]
      : questionnaireDefinitionProblems(raw, { origin: 'db', chainId: row.id, ruledBase });
  if (raw.versionId !== row.versionId || raw.kind !== row.kind) problems.push(`the definition does not name the row ${row.versionId}`);
  const newest = findNewestCodeVersion(row.kind, registry);
  const def = newest === null ? raw : overlayCounselBasis(raw, newest);
  return problems.length === 0 ? { ok: true, def } : { ok: false, def, problems };
}
