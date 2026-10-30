// THE QUESTIONNAIRE CHAIN's writer — Story 6.33 (`2026-10-10-304` Q7 / Q8, the Panel's own chain; `2026-10-30-421` QE2 /
// QE3 / QE5 / QE6 / QE7 / QE9 / QE10; the step table in the story). ONE function per step:
//
//   · TENANT (the Pariwar's scope transaction, `twt_app` — RLS admits ONLY these four steps, and a version ⛔ `direct`):
//     `proposeVersion` (a NEW version + its `proposed` step), `approveVersion` (both ticks), `returnVersion` (a note),
//     `withdrawVersion` (the author only).
//   · GLOBAL (`deps.serviceDb`, under `requireGlobalPermission('questionnaire.publish')` + step-up): `makeVersionLive` (one
//     Pariwar or ALL — the DEFAULT level, QE7 (a)), `directVersion` (QE7 (b) "with modification" / (c) "add directly":
//     author + `proposed` + `approved` + `made_live` in ONE transaction), `revertPariwar` (QE7 (d)).
//
// ⭐ LOCKS — ONE fixed order everywhere (⛔ deadlock): the QE3 NUMBERING lock (per kind) → the QE7 LIVE lock(s) (the `:all`
// key BEFORE a Pariwar's) → the per-version STEP lock; every step is inserted AFTER its locks, and the state machine is read
// only THEN (the tables have ⛔ UPDATE grant — ⛔ `FOR UPDATE`). ⇒ `seq` order = commit order per version and per target.
// ⭐ The server STAMPS: the version's uuid is generated HERE (⛔ a DB default) before `chain:<id>` is stamped on the version
// and on every chain question; the ruled questions and the closing words are REPLACED with the newest code version's (QE5's
// ONE definition of the ruled base); the definition is validated as `{ origin: 'db' }` BEFORE anything is written.
// ⛔ Nothing here gates a claim (I1): ⛔ import of an approval / warning / completion / discrepancy module.

import { randomUUID } from 'node:crypto';

import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import { clampLimit } from '../pagination.js';
import {
  canTakeStep,
  newestCodeVersion,
  questionnaireDefinitionProblems,
  questionnaireDefinitionWarnings,
  QuestionnaireDefinitionInvalidError,
  replaceRuledQuestions,
  ruledQuestionKeysFor,
  versionStage,
  DB_VERSION_FLOOR,
  QUESTIONNAIRE_KINDS,
  type ChainStep,
  type QuestionnaireDefinition,
  type QuestionnaireKind,
  type QuestionnairePage,
  type VersionStage,
} from '../questionnaires/index.js';
import { questionnaireVersionSteps, questionnaireVersions } from '../schema/questionnaire_versions.js';
import { parseVersionRow, toStoredDefinition } from './parse.js';
import { rawLiveCandidates, readQuestionnaireDefinition, resolveLiveQuestionnaire } from './read.js';

// ── errors (the API maps each by its code) ──────────────────────────────────────────────────────────────────────────

export type QuestionnaireChainErrorCode =
  | 'questionnaire.not_found'
  | 'questionnaire.base_invalid'
  | 'questionnaire.not_approvable'
  | 'questionnaire.not_withdrawable'
  | 'questionnaire.not_publishable'
  | 'questionnaire.base_moved'
  | 'questionnaire.ruled_base_moved'
  | 'questionnaire.nothing_to_revert'
  | 'questionnaire.hindi_review_required'
  | 'questionnaire.classification_attestation_required'
  | 'questionnaire.not_author';

const STATUS: Readonly<Record<QuestionnaireChainErrorCode, 403 | 404 | 409 | 422>> = {
  'questionnaire.not_found': 404,
  'questionnaire.base_invalid': 422,
  'questionnaire.not_approvable': 409,
  'questionnaire.not_withdrawable': 409,
  'questionnaire.not_publishable': 409,
  'questionnaire.base_moved': 409,
  'questionnaire.ruled_base_moved': 409,
  'questionnaire.nothing_to_revert': 409,
  'questionnaire.hindi_review_required': 422,
  'questionnaire.classification_attestation_required': 422,
  'questionnaire.not_author': 403,
};

/** A refused chain step — `code` / `status` are the wire's; `details` carries ids only (⛔ question text). */
export class QuestionnaireChainError extends Error {
  public readonly name = 'QuestionnaireChainError';
  public readonly status: 403 | 404 | 409 | 422;
  constructor(
    public readonly code: QuestionnaireChainErrorCode,
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(`[questionnaire-chain] ${code}`);
    this.status = STATUS[code];
  }
}

// ── locks ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/** QE3 — the numbering lock (per kind; the SAME key on the tenant and the global path). */
async function lockNumbering(db: Db, kind: QuestionnaireKind): Promise<void> {
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`questionnaire_version:${kind}`}))`);
}

/** QE7 — the live lock: the `:all` key FIRST, then the Pariwar's (one fixed order). */
async function lockLive(db: Db, kind: QuestionnaireKind, target: string | null): Promise<void> {
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`questionnaire_live:${kind}:all`}))`);
  if (target !== null) await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`questionnaire_live:${kind}:${target}`}))`);
}

/** QE2 — the per-version step lock, taken by EVERY step write before it reads the state machine. */
async function lockStep(db: Db, versionId: string): Promise<void> {
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`questionnaire_step:${versionId}`}))`);
}

// ── reads ───────────────────────────────────────────────────────────────────────────────────────────────────────────

export type QuestionnaireVersionRow = typeof questionnaireVersions.$inferSelect;
export type QuestionnaireStepRow = typeof questionnaireVersionSteps.$inferSelect;

export async function readVersionRow(db: Db, versionId: string): Promise<QuestionnaireVersionRow | null> {
  const rows = await db.select().from(questionnaireVersions).where(eq(questionnaireVersions.versionId, versionId)).limit(1);
  return rows[0] ?? null;
}

/** A version's steps the handle may SEE, oldest first (by `seq`). */
export async function readVersionSteps(db: Db, versionId: string): Promise<QuestionnaireStepRow[]> {
  return db.select().from(questionnaireVersionSteps).where(eq(questionnaireVersionSteps.versionId, versionId)).orderBy(asc(questionnaireVersionSteps.seq));
}

/** The stage from the steps (by `seq`). ⚠ On a TENANT handle a step is visible when its scope is this Pariwar's, or ALL, or
 *  when the version was ORIGINATED here (the steps SELECT policy's third leg — review RV2: a `made_live` for ANOTHER Pariwar
 *  is scoped to that target, and without the leg the origin read the stage as `approved` and could withdraw a live version).
 *  So the stage the writers read here is the version's true stage for the Pariwar that may act on it. */
async function stageOf(db: Db, versionId: string): Promise<VersionStage | null> {
  return versionStage((await readVersionSteps(db, versionId)).map((r) => ({ step: r.step, seq: Number(r.seq) })));
}

/**
 * Whether `pariwarId` may SEE `versionId` (a DATABASE version) — the one rule the API's list / detail apply (QE11): its own
 * origin, or ANY step it may read (a `made_live` here or for all). ⛔ Another Pariwar's open proposal. On a TENANT handle the
 * steps are RLS-filtered, so the answer is the Pariwar's; the API and the writers share it (review RV3).
 */
export async function versionVisibleTo(db: Db, pariwarId: string, versionId: string): Promise<boolean> {
  const row = await readVersionRow(db, versionId);
  if (row === null) return false;
  if (row.originPariwarId === pariwarId) return true;
  // Review RP10 — the Pariwar is named IN CODE, ⛔ left to RLS (the reader's R4 rule): on a superuser / BYPASSRLS handle every step is
  // readable, and "any step" would make a foreign draft look visible. A step shows the version to this Pariwar only when it is scoped
  // to it or to ALL.
  return (await readVersionSteps(db, versionId)).some((s) => s.scopePariwarId === null || s.scopePariwarId === pariwarId);
}

/** A Postgres unique violation — drizzle wraps the driver error in `DrizzleQueryError` (the SQLSTATE is on `.cause`). ⛔ A throw on `null`. */
export function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: unknown; cause?: { code?: unknown } | null };
  return e.code === '23505' || e.cause?.code === '23505';
}

/** The two constraints a lost NUMBERING race can trip (`(kind, version)` and `version_id`, which embeds the number). */
const NUMBERING_CONSTRAINTS: ReadonlySet<string> = new Set(['questionnaire_versions_kind_version_uq', 'questionnaire_versions_version_id_uq']);

/**
 * Review RP11 — a unique violation that is a lost NUMBERING race, ⛔ any 23505 (a collision on the primary key, say, is not cured by
 * taking the next number, and retrying it three times would only hide it). The constraint name is on the driver error.
 */
export function isNumberingCollision(err: unknown): boolean {
  if (!isUniqueViolation(err)) return false;
  const e = err as { constraint?: unknown; cause?: { constraint?: unknown } | null };
  const name = e.constraint ?? e.cause?.constraint;
  return typeof name === 'string' && NUMBERING_CONSTRAINTS.has(name);
}

async function insertStep(
  db: Db,
  values: {
    readonly versionId: string;
    readonly step: ChainStep;
    readonly targetPariwarId: string | null;
    readonly scopePariwarId: string | null;
    readonly actor: string;
    readonly actorDisplay: string;
    readonly note?: string | null;
    readonly ticks?: boolean;
  },
): Promise<void> {
  await db.insert(questionnaireVersionSteps).values({
    versionId: values.versionId,
    step: values.step,
    targetPariwarId: values.targetPariwarId as never,
    scopePariwarId: values.scopePariwarId as never,
    actor: values.actor,
    actorDisplay: values.actorDisplay,
    note: values.note ?? null,
    hindiReviewed: values.ticks === true ? true : null,
    classificationAttested: values.ticks === true ? true : null,
  });
}

// ── building a version ──────────────────────────────────────────────────────────────────────────────────────────────

/** The next DB version number of `kind` (QE3: `max(999, DB max) + 1`), read UNDER the numbering lock. */
async function nextVersionNumber(db: Db, kind: QuestionnaireKind): Promise<number> {
  const r = await db.execute<{ n: number }>(
    sql`SELECT (greatest(${DB_VERSION_FLOOR - 1}, coalesce(max(version), 0)) + 1)::int AS n FROM questionnaire_versions WHERE kind = ${kind}`,
  );
  return Number(r.rows[0]!.n);
}

/**
 * The server's definition of a new version: the submitted pages with every CHAIN question stamped `['chain:<id>']`, the
 * ruled questions and the closing words REPLACED with `ruledBase`'s (QE5), the version-level `approvedBy` = the ruled base's
 * Panel ids + `chain:<id>` — then VALIDATED as `{ origin: 'db' }` (throws `QuestionnaireDefinitionInvalidError`).
 */
export function buildChainDefinition(input: {
  readonly kind: QuestionnaireKind;
  readonly id: string;
  readonly version: number;
  readonly pages: readonly QuestionnairePage[];
  readonly ruledBase: QuestionnaireDefinition;
}): QuestionnaireDefinition {
  const chain = `chain:${input.id}`;
  const ruled = new Set(ruledQuestionKeysFor(input.kind));
  const versionId = `${input.kind}.v${input.version}`;
  const stamped: QuestionnaireDefinition = {
    kind: input.kind,
    versionId,
    version: input.version,
    scope: { kind: 'all' },
    status: 'live',
    approvedBy: [...input.ruledBase.approvedBy, chain],
    pages: input.pages.map((p) => ({ questions: p.questions.map((q) => (ruled.has(q.key) ? q : { ...q, approvedBy: [chain] })) })),
    closingNoteCopyKey: input.ruledBase.closingNoteCopyKey,
    thankYouCopyKey: input.ruledBase.thankYouCopyKey,
  };
  const def = replaceRuledQuestions(stamped, input.ruledBase);
  const problems = questionnaireDefinitionProblems(def, { origin: 'db', chainId: input.id, ruledBase: input.ruledBase });
  if (problems.length > 0) throw new QuestionnaireDefinitionInvalidError(versionId, problems);
  return def;
}

/**
 * A base a new version is started from: a code or DB version of the same kind (⛔ another kind, ⛔ unknown, ⛔ a row that
 * cannot be read). For a TENANT (`viewerPariwarId` set) a DATABASE base must also be one it may SEE — ⛔ another Pariwar's
 * open proposal, whose question keys the detail's change markers would otherwise show (review RV3; the QE11 API filter).
 * `null` = the Super Admin's global path, which sees every version.
 */
async function assertBase(db: Db, kind: QuestionnaireKind, baseVersionId: string, viewerPariwarId: string | null): Promise<void> {
  const base = await readQuestionnaireDefinition(db, baseVersionId);
  if (base.status !== 'found' || base.def.kind !== kind) {
    throw new QuestionnaireChainError('questionnaire.base_invalid', { baseVersionId });
  }
  if (viewerPariwarId !== null && base.origin === 'db' && !(await versionVisibleTo(db, viewerPariwarId, baseVersionId))) {
    throw new QuestionnaireChainError('questionnaire.base_invalid', { baseVersionId });
  }
}

/** Insert the version row (numbered under the lock; a `23505` on `(kind, version)` retried in a SAVEPOINT — the backstop). */
async function insertVersion(
  db: Db,
  input: {
    readonly kind: QuestionnaireKind;
    readonly pages: readonly QuestionnairePage[];
    readonly baseVersionId: string;
    readonly originPariwarId: string | null;
    readonly direct: boolean;
    readonly reason: string | null;
    readonly actor: string;
    readonly actorDisplay: string;
  },
): Promise<{ readonly id: string; readonly def: QuestionnaireDefinition }> {
  const ruledBase = newestCodeVersion(input.kind);
  for (let attempt = 1; ; attempt += 1) {
    const id = randomUUID();
    const version = await nextVersionNumber(db, input.kind);
    const def = buildChainDefinition({ kind: input.kind, id, version, pages: input.pages, ruledBase });
    await db.execute(sql`SAVEPOINT questionnaire_version_insert`);
    try {
      await db.insert(questionnaireVersions).values({
        id,
        kind: input.kind,
        version,
        versionId: def.versionId,
        baseVersionId: input.baseVersionId,
        ruledBaseCodeVersionId: ruledBase.versionId,
        originPariwarId: input.originPariwarId as never,
        definition: toStoredDefinition(def),
        authoredByActor: input.actor,
        authoredByDisplay: input.actorDisplay,
        direct: input.direct,
        reason: input.reason,
      });
      await db.execute(sql`RELEASE SAVEPOINT questionnaire_version_insert`);
      return { id, def };
    } catch (err) {
      await db.execute(sql`ROLLBACK TO SAVEPOINT questionnaire_version_insert`);
      if (!isNumberingCollision(err) || attempt >= 3) throw err;
    }
  }
}

function requireTicks(ticks: { readonly hindiReviewed: boolean; readonly classificationAttested: boolean }): void {
  // QE9 / QE10 — the approver read every Hindi line, and checked which questions are about health.
  if (ticks.hindiReviewed !== true) throw new QuestionnaireChainError('questionnaire.hindi_review_required');
  if (ticks.classificationAttested !== true) throw new QuestionnaireChainError('questionnaire.classification_attestation_required');
}

/** QE5 — a version on an OLDER ruled base can ⛔ be approved or made live (⛔ acknowledgement overrides it). */
function assertRuledBaseCurrent(row: QuestionnaireVersionRow): void {
  const newest = newestCodeVersion(row.kind).versionId;
  if (row.ruledBaseCodeVersionId !== newest) {
    throw new QuestionnaireChainError('questionnaire.ruled_base_moved', { ruledBase: row.ruledBaseCodeVersionId, newest });
  }
}

export interface ChainActor {
  readonly actor: string;
  /** `getDisplayName` snapshot ([[project_admin_display_name_attribution]]). */
  readonly actorDisplay: string;
}

// ── the TENANT steps ────────────────────────────────────────────────────────────────────────────────────────────────

/** PROPOSE a new version in `pariwarId` (from the version in force, or a named base). */
export async function proposeVersion(
  db: Db,
  input: ChainActor & {
    readonly pariwarId: string;
    readonly kind: QuestionnaireKind;
    readonly baseVersionId?: string;
    readonly pages: readonly QuestionnairePage[];
  },
): Promise<{ readonly id: string; readonly versionId: string; readonly warnings: readonly string[] }> {
  await lockNumbering(db, input.kind);
  const baseVersionId = input.baseVersionId ?? (await resolveLiveQuestionnaire(db, input.kind, input.pariwarId)).def?.versionId;
  if (baseVersionId === undefined) throw new QuestionnaireChainError('questionnaire.base_invalid', { kind: input.kind });
  await assertBase(db, input.kind, baseVersionId, input.pariwarId);
  const { id, def } = await insertVersion(db, {
    kind: input.kind,
    pages: input.pages,
    baseVersionId,
    originPariwarId: input.pariwarId,
    direct: false,
    reason: null,
    actor: input.actor,
    actorDisplay: input.actorDisplay,
  });
  await lockStep(db, def.versionId);
  await insertStep(db, { versionId: def.versionId, step: 'proposed', targetPariwarId: null, scopePariwarId: input.pariwarId, actor: input.actor, actorDisplay: input.actorDisplay });
  return { id, versionId: def.versionId, warnings: questionnaireDefinitionWarnings(def) };
}

/** The version of THIS Pariwar a tenant step acts on — ⛔ another Pariwar's (indistinguishable from unknown). */
async function ownTenantVersion(db: Db, pariwarId: string, versionId: string): Promise<QuestionnaireVersionRow> {
  const row = await readVersionRow(db, versionId);
  if (row === null || row.originPariwarId !== pariwarId || row.direct) throw new QuestionnaireChainError('questionnaire.not_found');
  return row;
}

/** APPROVE (the ruled "State Trustee" step — `pariwar_admin` as Trustee-Lite; the approver MAY be the author — QE6). */
export async function approveVersion(
  db: Db,
  input: ChainActor & { readonly pariwarId: string; readonly versionId: string; readonly hindiReviewed: boolean; readonly classificationAttested: boolean },
): Promise<{ readonly warnings: readonly string[] }> {
  requireTicks(input);
  await lockStep(db, input.versionId);
  const row = await ownTenantVersion(db, input.pariwarId, input.versionId);
  if (!canTakeStep(await stageOf(db, input.versionId), 'approved')) throw new QuestionnaireChainError('questionnaire.not_approvable');
  assertRuledBaseCurrent(row);
  const parsed = parseVersionRow(row);
  if (!parsed.ok) throw new QuestionnaireDefinitionInvalidError(row.versionId, parsed.problems);
  await insertStep(db, { versionId: input.versionId, step: 'approved', targetPariwarId: null, scopePariwarId: input.pariwarId, ticks: true, actor: input.actor, actorDisplay: input.actorDisplay });
  return { warnings: questionnaireDefinitionWarnings(parsed.def) };
}

/** RETURN a proposal with a note (terminal — a revision is a NEW version based on it). */
export async function returnVersion(
  db: Db,
  input: ChainActor & { readonly pariwarId: string; readonly versionId: string; readonly note: string },
): Promise<void> {
  await lockStep(db, input.versionId);
  await ownTenantVersion(db, input.pariwarId, input.versionId);
  if (!canTakeStep(await stageOf(db, input.versionId), 'returned')) throw new QuestionnaireChainError('questionnaire.not_approvable');
  await insertStep(db, { versionId: input.versionId, step: 'returned', targetPariwarId: null, scopePariwarId: input.pariwarId, note: input.note, actor: input.actor, actorDisplay: input.actorDisplay });
}

/** WITHDRAW one's OWN proposal (proposed or approved — ⛔ once made live). */
export async function withdrawVersion(db: Db, input: ChainActor & { readonly pariwarId: string; readonly versionId: string }): Promise<void> {
  await lockStep(db, input.versionId);
  const row = await ownTenantVersion(db, input.pariwarId, input.versionId);
  if (row.authoredByActor !== input.actor) throw new QuestionnaireChainError('questionnaire.not_author');
  if (!canTakeStep(await stageOf(db, input.versionId), 'withdrawn')) throw new QuestionnaireChainError('questionnaire.not_withdrawable');
  await insertStep(db, { versionId: input.versionId, step: 'withdrawn', targetPariwarId: null, scopePariwarId: input.pariwarId, actor: input.actor, actorDisplay: input.actorDisplay });
}

// ── the GLOBAL acts (the Super Admin) ───────────────────────────────────────────────────────────────────────────────

/** The version in force at `target` (R2-resolved; `null` = the ALL level) — `base_moved`'s comparison (QE7 (e)). */
async function inForceAt(db: Db, kind: QuestionnaireKind, target: string | null): Promise<string | null> {
  return (await resolveLiveQuestionnaire(db, kind, target)).def?.versionId ?? null;
}

/** QE7 (e) — `base` must be the target's version in force, unless acknowledged (⛔ for `ruled_base_moved`). */
function assertBaseCurrent(base: string, inForce: string | null, acknowledged: boolean): void {
  if (base !== inForce && !acknowledged) throw new QuestionnaireChainError('questionnaire.base_moved', { baseVersionId: base, inForce });
}

/** QE7 (a) — MAKE an approved version LIVE for one Pariwar or ALL (the DEFAULT level — a Pariwar's own version stays). */
export async function makeVersionLive(
  db: Db,
  input: ChainActor & { readonly versionId: string; readonly targetPariwarId: string | null; readonly acknowledgeBaseMoved: boolean },
): Promise<{ readonly warnings: readonly string[] }> {
  const first = await readVersionRow(db, input.versionId);
  if (first === null) throw new QuestionnaireChainError('questionnaire.not_found');
  await lockLive(db, first.kind, input.targetPariwarId);
  await lockStep(db, input.versionId);
  const row = (await readVersionRow(db, input.versionId))!;
  if (!canTakeStep(await stageOf(db, input.versionId), 'made_live')) throw new QuestionnaireChainError('questionnaire.not_publishable');
  const raw = await rawLiveCandidates(db, row.kind, input.targetPariwarId);
  // ⛔ already live there (made live again only for another target, or after a revert of this one).
  if ((input.targetPariwarId === null ? raw.all : raw.own) === input.versionId) throw new QuestionnaireChainError('questionnaire.not_publishable');
  assertRuledBaseCurrent(row);
  const parsed = parseVersionRow(row);
  if (!parsed.ok) throw new QuestionnaireDefinitionInvalidError(row.versionId, parsed.problems);
  assertBaseCurrent(row.baseVersionId, await inForceAt(db, row.kind, input.targetPariwarId), input.acknowledgeBaseMoved);
  await insertStep(db, { versionId: input.versionId, step: 'made_live', targetPariwarId: input.targetPariwarId, scopePariwarId: input.targetPariwarId, actor: input.actor, actorDisplay: input.actorDisplay });
  return { warnings: questionnaireDefinitionWarnings(parsed.def) };
}

/**
 * QE7 (b) / (c) — the Super Admin's DIRECT version: author it (from `baseVersionId` — an approved version to modify, or the
 * version in force), approve it (both ticks) and make it live for one Pariwar or ALL, in ONE transaction, with a REQUIRED
 * reason. Its `proposed` / `approved` steps are scoped to the target (NULL for all) — ⛔ a tenant step.
 */
export async function directVersion(
  db: Db,
  input: ChainActor & {
    readonly kind: QuestionnaireKind;
    readonly targetPariwarId: string | null;
    readonly baseVersionId?: string;
    readonly pages: readonly QuestionnairePage[];
    readonly reason: string;
    readonly hindiReviewed: boolean;
    readonly classificationAttested: boolean;
    readonly acknowledgeBaseMoved: boolean;
  },
): Promise<{ readonly id: string; readonly versionId: string; readonly warnings: readonly string[] }> {
  requireTicks(input);
  await lockNumbering(db, input.kind);
  await lockLive(db, input.kind, input.targetPariwarId);
  const inForce = await inForceAt(db, input.kind, input.targetPariwarId);
  const baseVersionId = input.baseVersionId ?? inForce;
  if (baseVersionId === null) throw new QuestionnaireChainError('questionnaire.base_invalid', { kind: input.kind });
  await assertBase(db, input.kind, baseVersionId, null);
  // A modification of an approved proposal is judged by what THAT proposal was based on (QE7 (b)); a code base by itself.
  const baseRow = baseVersionId === inForce ? null : await readVersionRow(db, baseVersionId);
  assertBaseCurrent(baseRow?.baseVersionId ?? baseVersionId, inForce, input.acknowledgeBaseMoved || baseVersionId === inForce);
  const { id, def } = await insertVersion(db, {
    kind: input.kind,
    pages: input.pages,
    baseVersionId,
    originPariwarId: input.targetPariwarId,
    direct: true,
    reason: input.reason,
    actor: input.actor,
    actorDisplay: input.actorDisplay,
  });
  await lockStep(db, def.versionId);
  const scope = input.targetPariwarId;
  await insertStep(db, { versionId: def.versionId, step: 'proposed', targetPariwarId: null, scopePariwarId: scope, actor: input.actor, actorDisplay: input.actorDisplay });
  await insertStep(db, { versionId: def.versionId, step: 'approved', targetPariwarId: null, scopePariwarId: scope, ticks: true, actor: input.actor, actorDisplay: input.actorDisplay });
  await insertStep(db, { versionId: def.versionId, step: 'made_live', targetPariwarId: scope, scopePariwarId: scope, actor: input.actor, actorDisplay: input.actorDisplay });
  return { id, versionId: def.versionId, warnings: questionnaireDefinitionWarnings(def) };
}

/** QE7 (d) — REVERT a Pariwar to the all-Pariwar level: ends its OWN version in force (read RAW — a skipped one too). */
export async function revertPariwar(
  db: Db,
  input: ChainActor & { readonly kind: QuestionnaireKind; readonly targetPariwarId: string },
): Promise<{ readonly endedVersionId: string }> {
  await lockLive(db, input.kind, input.targetPariwarId);
  const own = (await rawLiveCandidates(db, input.kind, input.targetPariwarId)).own;
  if (own === null) throw new QuestionnaireChainError('questionnaire.nothing_to_revert');
  await lockStep(db, own);
  await insertStep(db, { versionId: own, step: 'pariwar_reverted', targetPariwarId: input.targetPariwarId, scopePariwarId: input.targetPariwarId, actor: input.actor, actorDisplay: input.actorDisplay });
  return { endedVersionId: own };
}

/**
 * QE7 (a)'s list on make-live-for-ALL — the Pariwars whose OWN version is in force (R2-resolved) for `kind`, which "all"
 * does ⛔ end (`-422` Q3 A). Global handle only.
 */
export async function pariwarsKeepingOwn(db: Db, kind: QuestionnaireKind): Promise<{ readonly pariwarId: string; readonly versionId: string }[]> {
  const targets = await db.execute<{ target: string }>(sql`
    SELECT DISTINCT s.target_pariwar_id::text AS target
      FROM questionnaire_version_steps s JOIN questionnaire_versions v ON v.version_id = s.version_id
     WHERE v.kind = ${kind} AND s.step = 'made_live' AND s.target_pariwar_id IS NOT NULL`);
  const out: { pariwarId: string; versionId: string }[] = [];
  for (const { target } of targets.rows) {
    const live = await resolveLiveQuestionnaire(db, kind, target);
    if (live.source === 'own' && live.def !== null) out.push({ pariwarId: target, versionId: live.def.versionId });
  }
  return out.sort((a, b) => (a.pariwarId < b.pariwarId ? -1 : 1));
}

/** Every version's steps a handle may see — for a list (bounded by the caller's version list). */
export async function readStepsFor(db: Db, versionIds: readonly string[]): Promise<QuestionnaireStepRow[]> {
  if (versionIds.length === 0) return [];
  return db
    .select()
    .from(questionnaireVersionSteps)
    .where(inArray(questionnaireVersionSteps.versionId, [...versionIds]))
    .orderBy(asc(questionnaireVersionSteps.seq));
}

/** The cap of a version list, PER KIND (forced pagination — `clampLimit`; review RV20: one shared cap let a busy kind push the
 *  other out of the list without a signal). */
export const QUESTIONNAIRE_VERSION_LIST_CAP = 200;

/**
 * The versions a reader may LIST, newest first: the Super Admin (`pariwarId: null`, the global handle) every one; a
 * Pariwar its OWN versions and every version with a step scoped to it or to all (made live here or for everyone) — ⛔
 * another Pariwar's open proposal (QE11: an API filter — RLS lets every tenant read the version rows). The Pariwar is
 * named in SQL (R4).
 */
export async function listVersionRows(db: Db, opts: { readonly pariwarId: string | null; readonly limit?: number }): Promise<QuestionnaireVersionRow[]> {
  const v = questionnaireVersions;
  const visible =
    opts.pariwarId === null
      ? sql`true`
      : sql`(${v.originPariwarId} = ${opts.pariwarId}::uuid OR ${v.versionId} IN (
            SELECT s.version_id FROM questionnaire_version_steps s
             WHERE s.scope_pariwar_id = ${opts.pariwarId}::uuid OR s.scope_pariwar_id IS NULL))`;
  const out: QuestionnaireVersionRow[] = [];
  // ONE bounded query per kind (kind order ascending), newest first within a kind. ⚠ The clamp is INLINE in `.limit(…)` — the
  // forced-pagination gate (`domain-invariants`, Story 1.14) reads it there and refuses a hoisted variable.
  for (const kind of [...QUESTIONNAIRE_KINDS].sort()) {
    out.push(
      ...(await db
        .select()
        .from(v)
        .where(and(eq(v.kind, kind), visible))
        .orderBy(sql`${v.version} DESC`)
        .limit(clampLimit(opts.limit, { default: QUESTIONNAIRE_VERSION_LIST_CAP, cap: QUESTIONNAIRE_VERSION_LIST_CAP }))),
    );
  }
  return out;
}
