// Story 6.33 (`2026-10-10-304` Q7 / Q8; `2026-10-30-421` QE4 / QE6 / QE7 / QE16) — the QUESTIONNAIRE CHAIN on the wire: staff
// propose a new version of the neighbours' or the inspector's questionnaire, an approver approves or returns it, the Super
// Admin makes it live for one Pariwar or all (or adds directly) and reverts. ⛔ Contracts never import domain (TR3): the
// shapes mirror the engine's with a test-only lockstep.
//   · TENANT  /api/v1/p/:pariwarId/questionnaire-versions…  — list, detail, propose, approve, return, withdraw.
//   · GLOBAL  /api/v1/global/questionnaire-versions…        — list, detail, pariwars-keeping-own, make-live, direct, revert.
// A DRAFT question is either a RULED one by key (the server puts the Panel's question in its place — QE5), or a staff
// question: its key, kind, words in English AND Hindi, options, condition and whether it is about health. The server sets
// the rest (optional, stored encrypted, ⛔ a warning, counsel's basis pending for health, the chain record) and validates
// it with the ONE validator (`questionnaire.definition_invalid`, the problems in `details.problems`).
// ⛔ Nothing here gates a claim (I1): every staff question is optional, ⛔ a warning, ⛔ compared.

import { z } from 'zod';

export const QUESTIONNAIRE_VERSION_KINDS = ['peer_mesh', 'ground_inspection'] as const;
export const QuestionnaireVersionKind = z.enum(QUESTIONNAIRE_VERSION_KINDS);
export type QuestionnaireVersionKind = z.infer<typeof QuestionnaireVersionKind>;

/** ⚠ LOCKSTEP with the domain's `CHAIN_STEPS` (a contracts test pins the two equal). */
export const QUESTIONNAIRE_CHAIN_STEPS = ['proposed', 'approved', 'returned', 'withdrawn', 'made_live', 'pariwar_reverted'] as const;
/** `code` = a reviewed code version (⛔ a chain record); `published` = made live for at least one target. */
export const QUESTIONNAIRE_VERSION_STAGES = ['code', 'proposed', 'approved', 'returned', 'withdrawn', 'published'] as const;
/** ⚠ LOCKSTEP with the domain's `CHAIN_QUESTION_KINDS` — ⛔ `date` (QE8 C2). */
export const QUESTIONNAIRE_CHAIN_QUESTION_KINDS = ['single', 'multi', 'yes_no'] as const;

/**
 * Review RV22 — a NUL (U+0000) or a LONE surrogate cannot be stored by Postgres (`text` refuses the first; `jsonb` raises 22P05
 * on either): refused at the door as a 400, ⛔ a 500 on insert. Scanned by code unit (the domain's `hasUnstorableText` is the
 * same rule for the stored words — ⛔ contracts import domain, so the few lines are repeated, and a contracts test pins both).
 */
export function hasUnstorableChars(s: string): boolean {
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
const storable = (s: string): boolean => !hasUnstorableChars(s);
const STORABLE_MESSAGE = 'text holds a character that cannot be stored';

export const QuestionnaireVersionId = z.string().regex(/^(peer_mesh|ground_inspection)\.v[0-9]+$/).max(64);
const Key = z.string().regex(/^[a-z][a-z0-9_]*$/).max(64);
/** QE4 — staff-written words, both languages, ≤ 500 each (the validator also refuses a padded or `{other}` placeholder). */
export const QuestionnaireStoredText = z.object({ en: z.string().min(1).max(500), hi: z.string().min(1).max(500) }).strict();
const ShowIf = z.object({ key: Key, anyOf: z.array(Key).min(1).max(20) }).strict();

export const QuestionnaireDraftRuledQuestion = z.object({ ruled: z.literal(true), key: Key }).strict();
export const QuestionnaireDraftChainQuestion = z
  .object({
    key: Key,
    kind: z.enum(QUESTIONNAIRE_CHAIN_QUESTION_KINDS),
    text: QuestionnaireStoredText,
    options: z.array(z.object({ code: Key, text: QuestionnaireStoredText, exclusive: z.boolean().optional() }).strict()).min(2).max(20),
    showIf: ShowIf.nullable(),
    /** About the deceased member's health (QE10) — its counsel basis is then PENDING: ⛔ shown until counsel's basis is recorded. */
    health: z.boolean(),
  })
  .strict();
export const QuestionnaireDraftQuestion = z.union([QuestionnaireDraftRuledQuestion, QuestionnaireDraftChainQuestion]);
export type QuestionnaireDraftQuestion = z.infer<typeof QuestionnaireDraftQuestion>;
export const QuestionnaireDraftPage = z.object({ questions: z.array(QuestionnaireDraftQuestion).min(1).max(3) }).strict();
export type QuestionnaireDraftPage = z.infer<typeof QuestionnaireDraftPage>;
const DraftPages = z.array(QuestionnaireDraftPage).min(1).max(20);

// ── requests ────────────────────────────────────────────────────────────────────────────────────────────────────────

export const QuestionnaireProposeRequest = z
  .object({ kind: QuestionnaireVersionKind, baseVersionId: QuestionnaireVersionId.optional(), pages: DraftPages })
  .strict();
export type QuestionnaireProposeRequest = z.infer<typeof QuestionnaireProposeRequest>;

/** QE9 / QE10 — both ticks, on approve and on the Super Admin's direct path. */
export const QuestionnaireApproveRequest = z.object({ hindiReviewed: z.boolean(), classificationAttested: z.boolean() }).strict();
export type QuestionnaireApproveRequest = z.infer<typeof QuestionnaireApproveRequest>;

export const QuestionnaireReturnRequest = z.object({ note: z.string().trim().min(1).max(500).refine(storable, STORABLE_MESSAGE) }).strict();
export type QuestionnaireReturnRequest = z.infer<typeof QuestionnaireReturnRequest>;

/** A bodyless POST sends `{}` (Fastify refuses an empty JSON body — TR13). */
export const QuestionnaireEmptyRequest = z.object({}).strict();

/** QE7 (a) — `targetPariwarId: null` = ALL Pariwars (the DEFAULT level). */
export const QuestionnaireMakeLiveRequest = z
  .object({ targetPariwarId: z.string().uuid().nullable(), acknowledgeBaseMoved: z.boolean().optional() })
  .strict();
export type QuestionnaireMakeLiveRequest = z.infer<typeof QuestionnaireMakeLiveRequest>;

/** QE7 (b) / (c) — the Super Admin's direct version: author + approve + make live, with a REQUIRED reason. */
export const QuestionnaireDirectRequest = z
  .object({
    kind: QuestionnaireVersionKind,
    targetPariwarId: z.string().uuid().nullable(),
    baseVersionId: QuestionnaireVersionId.optional(),
    pages: DraftPages,
    reason: z.string().trim().min(1).max(500).refine(storable, STORABLE_MESSAGE),
    hindiReviewed: z.boolean(),
    classificationAttested: z.boolean(),
    acknowledgeBaseMoved: z.boolean().optional(),
  })
  .strict();
export type QuestionnaireDirectRequest = z.infer<typeof QuestionnaireDirectRequest>;

/** QE7 (d) — revert ONE Pariwar to the all-Pariwar level. */
export const QuestionnaireRevertRequest = z.object({ kind: QuestionnaireVersionKind, targetPariwarId: z.string().uuid() }).strict();
export type QuestionnaireRevertRequest = z.infer<typeof QuestionnaireRevertRequest>;

// ── responses ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Every write: the version acted on and the validator's WARNINGS (QE8 C9 — ⛔ refusals). */
export const QuestionnaireStepResponse = z.object({ versionId: QuestionnaireVersionId, warnings: z.array(z.string()) }).strict();
export type QuestionnaireStepResponse = z.infer<typeof QuestionnaireStepResponse>;

const Words = z.object({ en: z.string(), hi: z.string() });

export const QuestionnaireStepView = z.object({
  step: z.enum(QUESTIONNAIRE_CHAIN_STEPS),
  /** `null` = all Pariwars (a `made_live`), or a step that names ⛔ target. */
  targetPariwarId: z.string().nullable(),
  actorDisplay: z.string(),
  note: z.string().nullable(),
  at: z.string(),
  hindiReviewed: z.boolean().nullable(),
  classificationAttested: z.boolean().nullable(),
});
export type QuestionnaireStepView = z.infer<typeof QuestionnaireStepView>;

export const QuestionnaireVersionSummary = z.object({
  versionId: QuestionnaireVersionId,
  kind: QuestionnaireVersionKind,
  version: z.number().int(),
  stage: z.enum(QUESTIONNAIRE_VERSION_STAGES),
  /** `null` for a code version, and — to a Pariwar Admin — a base it may ⛔ see (another Pariwar's proposal; review RT6). */
  baseVersionId: z.string().nullable(),
  ruledBaseCodeVersionId: z.string().nullable(),
  /** `null` for a code version, for a direct all-Pariwar one, and — to a Pariwar Admin — for a version from ANOTHER Pariwar
   *  (`historyElsewhere` says so; review RT6: withheld as its steps are). */
  originPariwarId: z.string().nullable(),
  direct: z.boolean(),
  /** `null` unless a direct version — and, to a Pariwar Admin, for a version from ANOTHER Pariwar (review round 4, RF6). */
  reason: z.string().nullable(),
  /** `null` for a code version, and — to a Pariwar Admin — for a version from ANOTHER Pariwar (review RT6). */
  authoredByDisplay: z.string().nullable(),
  authoredByMe: z.boolean(),
  authoredAt: z.string().nullable(),
  /** QE5 — on an OLDER ruled base: ⛔ served, ⛔ approvable, ⛔ publishable until re-based. */
  outOfDate: z.boolean(),
  /** R1 — the stored definition passes the validator. */
  valid: z.boolean(),
  steps: z.array(QuestionnaireStepView),
  /** QE11 — part of this version's history is in another Pariwar (shown as "Proposed and approved in another Pariwar"). */
  historyElsewhere: z.boolean(),
});
export type QuestionnaireVersionSummary = z.infer<typeof QuestionnaireVersionSummary>;

export const QuestionnaireQuestionView = z.object({
  key: z.string(),
  kind: z.enum(['single', 'multi', 'date', 'yes_no']),
  /** A Panel-ruled question — LOCKED (QE5). */
  ruled: z.boolean(),
  /** The words as the server resolves them, `{member}` left in place. For a staff question these ARE its stored text. */
  words: Words,
  options: z.array(z.object({ code: z.string(), words: Words, exclusive: z.boolean() })),
  optional: z.boolean(),
  showIf: z.object({ key: z.string(), anyOf: z.array(z.string()) }).nullable(),
  health: z.boolean(),
  /** Its counsel basis is pending — ⛔ shown until it is recorded (QE10). */
  counselPending: z.boolean(),
  /** Stored as a Tier-1 ciphertext. */
  sensitive: z.boolean(),
  /** QE16 — against the version's base, by key; `null` when there is ⛔ base to compare. */
  change: z.enum(['new', 'changed', 'unchanged']).nullable(),
});
export type QuestionnaireQuestionView = z.infer<typeof QuestionnaireQuestionView>;

export const QuestionnaireVersionDetailResponse = QuestionnaireVersionSummary.extend({
  /** `null` ⇔ the stored definition cannot be parsed at all. */
  questions: z.array(QuestionnaireQuestionView).nullable(),
  /** The pages, as question keys (the editor keeps the layout). */
  pages: z.array(z.array(z.string())).nullable(),
  closingNote: Words.nullable(),
  removedKeys: z.array(z.string()),
  warnings: z.array(z.string()),
  problems: z.array(z.string()),
});
export type QuestionnaireVersionDetailResponse = z.infer<typeof QuestionnaireVersionDetailResponse>;

export const QuestionnaireInForce = z.object({
  kind: QuestionnaireVersionKind,
  /** `null` ⇔ ⛔ version at any level. */
  versionId: z.string().nullable(),
  source: z.enum(['own', 'all', 'code']).nullable(),
  /** R8 — a version R2 passed over ("failed validation / out of date, serving …"). */
  skipped: z.array(z.object({ versionId: z.string(), level: z.enum(['own', 'all']), reason: z.enum(['invalid', 'stale']) })),
});
export type QuestionnaireInForce = z.infer<typeof QuestionnaireInForce>;

export const QuestionnaireVersionListResponse = z.object({
  /** For the page's Pariwar (both kinds). */
  inForce: z.array(QuestionnaireInForce),
  versions: z.array(QuestionnaireVersionSummary),
});
export type QuestionnaireVersionListResponse = z.infer<typeof QuestionnaireVersionListResponse>;

export const QuestionnairePariwarsKeepingOwnResponse = z.object({
  pariwars: z.array(z.object({ pariwarId: z.string(), name: z.string().nullable(), versionId: z.string() })),
});
export type QuestionnairePariwarsKeepingOwnResponse = z.infer<typeof QuestionnairePariwarsKeepingOwnResponse>;

/** The refusals (AC8). */
export const QUESTIONNAIRE_CHAIN_ERROR_CODES = [
  'questionnaire.not_found',
  'questionnaire.base_invalid',
  'questionnaire.not_approvable',
  'questionnaire.not_withdrawable',
  'questionnaire.not_publishable',
  'questionnaire.base_moved',
  'questionnaire.ruled_base_moved',
  'questionnaire.nothing_to_revert',
  'questionnaire.hindi_review_required',
  'questionnaire.classification_attestation_required',
  'questionnaire.not_author',
  'questionnaire.definition_invalid',
] as const;
