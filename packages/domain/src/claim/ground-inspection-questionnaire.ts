// THE INSPECTOR'S QUESTIONNAIRE FOR THE FAMILY — save and the reads (Story 6.32, `2026-10-28-413` IQ1 / IQ5 / IQ7 / IQ10 /
// IQ12; migration 0188).
//
// ⭐ SAVED AS THEY GO: every answer is saved the moment it is chosen; an edit stamps the old row's `superseded_at` FIRST, then
// inserts the new live row (the partial UNIQUE is ⛔ deferrable); an answer whose condition stops holding (the cause moves off
// an illness) has its dependants superseded in the SAME transaction. The version is PINNED at the assignment's FIRST save
// (the header row); a later live version applies to NEW visits only (IQ12).
// ⭐ LOCK ORDER — assignment → claim (6.26a Trap 1, every inspection writer's order): `lockActiveAssignment` (still
// `scheduled`) → `lockClaimInWindow` (the ONE answer window, on the locked claim row) → the inspector guard. The completion
// takes the SAME assignment lock first, so the family's answers are final when it compares them (AC6).
// ⛔ NO KMS under a lock (TR2): the HANDLER encrypts the cause / illness, computes their keyed code indexes, and decrypts the
// live sensitive answers it needs (the illness's `showIf` parent is the cause — a ciphertext); this writer receives
// ciphertext + indexes (+ the decrypted values keyed by `answer_id`, re-verified under the locks — a stale read is
// `GroundInspectionQuestionnaireStaleError`, a 409 the client retries). A row the handler READ but could ⛔ decrypt (erased,
// malformed, undecryptable) is KNOWN UNREADABLE (`unreadableLive`) — ⛔ stale: its value is `null`, so an unrelated save or
// its own replacement proceeds, and a question it is the `showIf` parent of stays refused (fail-closed, review R2).
// ⭐ I1 — NOTHING HERE GATES: ⛔ a reader of these rows is an approval, refusal, warning, routing or payment path. The
// completion predicate (6.26a's ONE definition of "complete") ⛔ reads them.
// ⛔ No decrypt here; ⛔ no value in an error message, a log or an event (⛔ event at all — IQ10).

import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, GroundInspectionId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import {
  answerCodeIndexInputs,
  checkAnswer,
  dependantsToSupersede,
  getQuestionnaireVersion,
  QUESTIONNAIRE_REGISTRY,
  resolveLiveVersion,
  servedDefinition,
  type AnswerRefusalReason,
  type LiveAnswerCodes,
  type QuestionnaireDefinition,
} from '../questionnaires/index.js';
import { claimGroundInspections } from '../schema/claim_ground_inspections.js';
import {
  claimGroundInspectionAnswers,
  claimGroundInspectionQuestionnaires,
  type ClaimGroundInspectionAnswerRow,
} from '../schema/claim_ground_inspection_questionnaire.js';
import { authorizeInspector, lockActiveAssignment, lockClaimInWindow, type GroundInspectionOverride } from './ground-inspection-persist.js';

// ── errors (the API maps each to a typed refusal — IQ10) ─────────────────────────────────────────────────────────────────

/** ⛔ Live `ground_inspection` version for the Pariwar (and ⛔ pinned one) — 404; the screen shows ⛔ panel (IQ12). */
export class GroundInspectionQuestionnaireUnavailableError extends Error {
  public readonly name = 'GroundInspectionQuestionnaireUnavailableError';
  constructor() {
    super('[ground-inspection-questionnaire] no questionnaire version for this visit');
  }
}

/** A `certificate_check` asks the family ⛔ nothing — 409 `ground_inspection.questionnaire_not_for_certificate_check`. */
export class GroundInspectionQuestionnaireCertificateCheckError extends Error {
  public readonly name = 'GroundInspectionQuestionnaireCertificateCheckError';
  constructor(readonly groundInspectionId: string) {
    super('[ground-inspection-questionnaire] a certificate check carries no questionnaire');
  }
}

/** The engine refused the answer — 422 `questionnaire.answer_invalid:<reason>`. */
export class GroundInspectionQuestionnaireInvalidAnswerError extends Error {
  public readonly name = 'GroundInspectionQuestionnaireInvalidAnswerError';
  constructor(readonly reason: AnswerRefusalReason) {
    super(`[ground-inspection-questionnaire] answer refused: ${reason}`);
  }
}

/** The handler's pre-lock read went stale (409 `ground_inspection.questionnaire_stale` — the client retries the save). */
export class GroundInspectionQuestionnaireStaleError extends Error {
  public readonly name = 'GroundInspectionQuestionnaireStaleError';
  constructor() {
    super('[ground-inspection-questionnaire] stale read — retry');
  }
}

// ── the version ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The assignment's header (the pinned version), or `null` before its first save. */
export async function readGroundInspectionQuestionnaireHeader(
  db: Db,
  pariwarId: PariwarId,
  groundInspectionId: GroundInspectionId,
): Promise<{ readonly questionnaireVersionId: string; readonly startedAt: Date } | null> {
  const rows = await db
    .select({ questionnaireVersionId: claimGroundInspectionQuestionnaires.questionnaireVersionId, startedAt: claimGroundInspectionQuestionnaires.startedAt })
    .from(claimGroundInspectionQuestionnaires)
    .where(
      and(
        eq(claimGroundInspectionQuestionnaires.pariwarId, pariwarId),
        eq(claimGroundInspectionQuestionnaires.groundInspectionId, groundInspectionId),
      ),
    );
  return rows[0] ?? null;
}

/**
 * The version a visit is (or will be) pinned to: its header's, else the LIVE one now (IQ12), or `null` (⛔ panel). `registry`
 * is a TEST seam (an injected copy with a recorded counsel basis — TR7: v1's `counselBasis` is ⛔ edited to pass a test).
 */
export function groundInspectionVersionFor(
  pinnedVersionId: string | null,
  pariwarId: PariwarId,
  registry: readonly QuestionnaireDefinition[] = QUESTIONNAIRE_REGISTRY,
): QuestionnaireDefinition | null {
  const def = pinnedVersionId !== null ? getQuestionnaireVersion(pinnedVersionId, registry) : resolveLiveVersion('ground_inspection', pariwarId, registry);
  return def !== null && def.kind === 'ground_inspection' ? def : null;
}

// ── the live answers ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** A visit holds at most three ruled answers; the cap bounds a later version's. */
export const GROUND_INSPECTION_LIVE_ANSWERS_CAP = 50;

/** The visit's LIVE answer rows (ciphertext AS STORED — the handler decrypts). */
export async function readLiveGroundInspectionAnswers(
  db: Db,
  pariwarId: PariwarId,
  groundInspectionId: GroundInspectionId,
): Promise<ClaimGroundInspectionAnswerRow[]> {
  return db
    .select()
    .from(claimGroundInspectionAnswers)
    .where(
      and(
        eq(claimGroundInspectionAnswers.pariwarId, pariwarId),
        eq(claimGroundInspectionAnswers.groundInspectionId, groundInspectionId),
        isNull(claimGroundInspectionAnswers.supersededAt),
      ),
    )
    .orderBy(asc(claimGroundInspectionAnswers.savedAt))
    .limit(clampLimit(GROUND_INSPECTION_LIVE_ANSWERS_CAP, { default: GROUND_INSPECTION_LIVE_ANSWERS_CAP, cap: GROUND_INSPECTION_LIVE_ANSWERS_CAP }));
}

// ── save ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** How the HANDLER prepared the value BEFORE the locks — plaintext codes, or a ciphertext + its keyed code indexes. */
export type PreparedGroundInspectionAnswer =
  | { readonly form: 'codes'; readonly codes: readonly string[] }
  | { readonly form: 'encrypted'; readonly ciphertext: string; readonly codeIndexes: readonly string[] | null };

export interface SaveGroundInspectionAnswerInput {
  readonly pariwarId: PariwarId;
  readonly groundInspectionId: GroundInspectionId;
  /** The inspector (or the override holder — `override` set by the route after it verified the key). */
  readonly actingActorId: string;
  readonly override?: GroundInspectionOverride;
  readonly questionKey: string;
  /** The PLAINTEXT codes — validation only; ⛔ never stored for a sensitive question. */
  readonly codes: readonly string[];
  readonly prepared: PreparedGroundInspectionAnswer;
  /** The visit's live SENSITIVE answers, DECRYPTED by the handler before the locks, keyed by `answer_id`. */
  readonly decryptedLive: ReadonlyMap<string, readonly string[]>;
  /**
   * The `answer_id`s of live sensitive answers the handler READ before the locks but could ⛔ decrypt (erased, malformed,
   * undecryptable) — their value is `null` (unknown), ⛔ a stale read (review R2). Rows are append-only, so an id read
   * unreadable stays so; a live row in NEITHER map was written after the handler's read ⇒ stale.
   */
  readonly unreadableLive?: ReadonlySet<string>;
  /** Today in IST (`YYYY-MM-DD`) — the engine's date rule (v1 has ⛔ date question). */
  readonly todayIst: string;
  /** TEST seam — see `groundInspectionVersionFor`. */
  readonly registry?: readonly QuestionnaireDefinition[];
}

export interface SaveGroundInspectionAnswerResult {
  readonly claimCaseId: ClaimId;
  readonly questionnaireVersionId: string;
  /** `false` ⇔ the same value was already live (idempotent by value) — ⛔ nothing written. */
  readonly written: boolean;
  /** The keys superseded as dependants in this save. */
  readonly supersededDependants: readonly string[];
}

function sameCodes(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((c, i) => c === b[i]);
}

/**
 * Save ONE answer (IQ10). Idempotent by value. Lock assignment → claim; refuse a `certificate_check`; resolve the PINNED (or
 * live) version; re-validate against the live answers read UNDER the locks; supersede the old live row and any dependant;
 * insert. ⛔ No KMS here.
 */
export async function saveGroundInspectionAnswer(
  client: pg.PoolClient,
  input: SaveGroundInspectionAnswerInput,
): Promise<SaveGroundInspectionAnswerResult> {
  const db = bindScopedDb(client);
  const assignment = await lockActiveAssignment(db, input.pariwarId, input.groundInspectionId);
  if (assignment.inspectionStage === 'certificate_check') throw new GroundInspectionQuestionnaireCertificateCheckError(input.groundInspectionId);
  await lockClaimInWindow(db, input.pariwarId, assignment.claimCaseId);
  authorizeInspector(assignment, input.actingActorId, input.override);

  const header = await readGroundInspectionQuestionnaireHeader(db, input.pariwarId, input.groundInspectionId);
  const def = groundInspectionVersionFor(header?.questionnaireVersionId ?? null, input.pariwarId, input.registry);
  if (def === null) throw new GroundInspectionQuestionnaireUnavailableError();
  const served = servedDefinition(def);

  const liveRows = await readLiveGroundInspectionAnswers(db, input.pariwarId, input.groundInspectionId);
  const live = new Map<string, readonly string[] | null>();
  for (const row of liveRows) {
    const codes = row.valueCodes ?? input.decryptedLive.get(row.answerId) ?? (input.unreadableLive?.has(row.answerId) ? null : undefined);
    if (codes === undefined) throw new GroundInspectionQuestionnaireStaleError();
    live.set(row.questionKey, codes);
  }

  const check = checkAnswer(served, input.questionKey, { codes: input.codes }, live as LiveAnswerCodes, input.todayIst);
  if (!check.ok) throw new GroundInspectionQuestionnaireInvalidAnswerError(check.reason);
  const normalized = check.codes ?? [];

  // The handler's prepared form must be the form the re-check stores (a programmer error otherwise — ⛔ a 4xx).
  const s = check.storage;
  const p = input.prepared;
  if (s.form !== p.form) throw new Error('[ground-inspection-questionnaire] prepared form does not match the answer');
  if (p.form === 'codes' && !sameCodes(p.codes, normalized)) throw new Error('[ground-inspection-questionnaire] prepared codes do not match the answer');
  if (p.form === 'encrypted') {
    const expected = answerCodeIndexInputs(assignment.claimCaseId, input.questionKey, normalized);
    if ((expected === null) !== (p.codeIndexes === null) || (expected !== null && expected.length !== p.codeIndexes!.length)) {
      throw new Error('[ground-inspection-questionnaire] prepared code indexes do not match the answer');
    }
  }

  const current = live.get(input.questionKey);
  if (current != null && sameCodes(current, normalized)) {
    return { claimCaseId: assignment.claimCaseId, questionnaireVersionId: def.versionId, written: false, supersededDependants: [] };
  }

  // The header — pinned at the visit's FIRST save (under the assignment lock ⇒ ⛔ race).
  if (header === null) {
    await db.insert(claimGroundInspectionQuestionnaires).values({
      groundInspectionId: input.groundInspectionId,
      pariwarId: input.pariwarId,
      claimCaseId: assignment.claimCaseId,
      questionnaireVersionId: def.versionId,
    });
  }

  // Stamp the old live row FIRST, then the dependants, then insert (the partial UNIQUE is ⛔ deferrable).
  const dependants = dependantsToSupersede(served, input.questionKey, normalized, live as LiveAnswerCodes);
  const toStamp = [...(current !== undefined ? [input.questionKey] : []), ...dependants];
  if (toStamp.length > 0) {
    await db
      .update(claimGroundInspectionAnswers)
      .set({ supersededAt: sql`clock_timestamp()` })
      .where(
        and(
          eq(claimGroundInspectionAnswers.pariwarId, input.pariwarId),
          eq(claimGroundInspectionAnswers.groundInspectionId, input.groundInspectionId),
          inArray(claimGroundInspectionAnswers.questionKey, toStamp),
          isNull(claimGroundInspectionAnswers.supersededAt),
        ),
      );
  }

  await db.insert(claimGroundInspectionAnswers).values({
    pariwarId: input.pariwarId,
    claimCaseId: assignment.claimCaseId,
    groundInspectionId: input.groundInspectionId,
    questionKey: input.questionKey,
    valueCodes: p.form === 'codes' ? [...p.codes] : null,
    valueCiphertext: p.form === 'encrypted' ? p.ciphertext : null,
    valueCodeIndexes: p.form === 'encrypted' && p.codeIndexes !== null ? [...p.codeIndexes] : null,
    savedByActorId: input.actingActorId,
  });

  return { claimCaseId: assignment.claimCaseId, questionnaireVersionId: def.versionId, written: true, supersededDependants: dependants };
}

// ── the reads ────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The visit the questionnaire GET is about — the facts its guards need (⛔ a value). */
export interface GroundInspectionQuestionnaireTarget {
  readonly claimCaseId: ClaimId;
  readonly status: string;
  readonly inspectionStage: string;
  readonly inspectorActorId: string;
}

/** The assignment in scope (any status — the GET answers a completed visit with its answers read-only), or `null`. */
export async function readGroundInspectionQuestionnaireTarget(
  db: Db,
  pariwarId: PariwarId,
  groundInspectionId: GroundInspectionId,
): Promise<GroundInspectionQuestionnaireTarget | null> {
  const rows = await db
    .select({
      claimCaseId: claimGroundInspections.claimCaseId,
      status: claimGroundInspections.status,
      inspectionStage: claimGroundInspections.inspectionStage,
      inspectorActorId: claimGroundInspections.inspectorActorId,
    })
    .from(claimGroundInspections)
    .where(and(eq(claimGroundInspections.pariwarId, pariwarId), eq(claimGroundInspections.groundInspectionId, groundInspectionId)));
  return rows[0] ?? null;
}

/** One visit's family account for the approvers' read (IQ7) — the LIVE answers AS STORED (the handler decrypts). */
export interface ClaimFamilyAccountVisit {
  readonly groundInspectionId: GroundInspectionId;
  /** The pinned version — `null` for a visit that saved ⛔ answer (⛔ header: the version is pinned at the first save). */
  readonly questionnaireVersionId: string | null;
  readonly completedAt: Date | null;
  readonly answers: readonly Pick<ClaimGroundInspectionAnswerRow, 'answerId' | 'questionKey' | 'valueCodes' | 'valueCiphertext' | 'savedAt'>[];
}

/** A claim has few visits, each with few answers; the cap bounds the read's ROWS (forced pagination). */
export const CLAIM_FAMILY_ACCOUNT_ROWS_CAP = 200;

/**
 * ⭐ IQ7 (A) — the claim's FAMILY ACCOUNT: every COMPLETED FULL visit (`death_date_source = 'family_statement'` — a
 * `certificate_check` asks the family ⛔ nothing) with its live answers, newest completion first — INCLUDING a visit that
 * saved ⛔ answer (review R3: every question is optional, so a skipped letter must still read *"Letter: not recorded"* to the
 * approver — AC10). ONE read for the ONE assembler (`assemblePeerSection`), which applies the PM25 (c) hide BEFORE calling
 * it — ⛔ call it for a hidden actor. Ciphertext AS STORED.
 */
export async function readClaimFamilyAccount(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<ClaimFamilyAccountVisit[]> {
  const rows = await db
    .select({
      groundInspectionId: claimGroundInspections.groundInspectionId,
      questionnaireVersionId: claimGroundInspectionQuestionnaires.questionnaireVersionId,
      completedAt: claimGroundInspections.completedAt,
      answerId: claimGroundInspectionAnswers.answerId,
      questionKey: claimGroundInspectionAnswers.questionKey,
      valueCodes: claimGroundInspectionAnswers.valueCodes,
      valueCiphertext: claimGroundInspectionAnswers.valueCiphertext,
      savedAt: claimGroundInspectionAnswers.savedAt,
    })
    .from(claimGroundInspections)
    .leftJoin(
      claimGroundInspectionQuestionnaires,
      and(
        eq(claimGroundInspectionQuestionnaires.pariwarId, claimGroundInspections.pariwarId),
        eq(claimGroundInspectionQuestionnaires.groundInspectionId, claimGroundInspections.groundInspectionId),
      ),
    )
    .leftJoin(
      claimGroundInspectionAnswers,
      and(
        eq(claimGroundInspectionAnswers.pariwarId, claimGroundInspections.pariwarId),
        eq(claimGroundInspectionAnswers.groundInspectionId, claimGroundInspections.groundInspectionId),
        isNull(claimGroundInspectionAnswers.supersededAt),
      ),
    )
    .where(
      and(
        eq(claimGroundInspections.pariwarId, pariwarId),
        eq(claimGroundInspections.claimCaseId, claimCaseId),
        eq(claimGroundInspections.status, 'completed'),
        eq(claimGroundInspections.deathDateSource, 'family_statement'),
      ),
    )
    .orderBy(
      sql`${claimGroundInspections.completedAt} DESC`,
      asc(claimGroundInspections.groundInspectionId),
      asc(claimGroundInspectionAnswers.savedAt),
    )
    .limit(clampLimit(CLAIM_FAMILY_ACCOUNT_ROWS_CAP, { default: CLAIM_FAMILY_ACCOUNT_ROWS_CAP, cap: CLAIM_FAMILY_ACCOUNT_ROWS_CAP }));
  // Group by visit, keeping the query's order (newest completion first; answers by `saved_at`). A visit with ⛔ answer is
  // ONE row with every answer column NULL (the left join) ⇒ an empty `answers`.
  const visits = new Map<string, ClaimFamilyAccountVisit>();
  for (const r of rows) {
    const v =
      visits.get(r.groundInspectionId) ??
      { groundInspectionId: r.groundInspectionId, questionnaireVersionId: r.questionnaireVersionId, completedAt: r.completedAt, answers: [] };
    const answers =
      r.answerId === null || r.questionKey === null || r.savedAt === null
        ? v.answers
        : [...v.answers, { answerId: r.answerId, questionKey: r.questionKey, valueCodes: r.valueCodes, valueCiphertext: r.valueCiphertext, savedAt: r.savedAt }];
    visits.set(r.groundInspectionId, { ...v, answers });
  }
  return [...visits.values()];
}
