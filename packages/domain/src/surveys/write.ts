// Survey write-path accessors — Story 10.15 (Task 4; AC1, AC2, AC4, AC5, AC6).
//
// The mutable-content workflow (LBD-2): a PLAIN `status` column transitioned in the caller's scoped
// tx, NOT event-derived-state. Every function here runs DIRECTLY on the passed `db` (the caller's
// scope tx) — never opening its own transaction (the banners/news-blog contract). RLS scope is
// transaction-scoped; the explicit `pariwarId` predicate (alongside RLS) is defense-in-depth and
// matches the `(pariwar_id, status, valid_from)` index.
//
// ── The guards every write runs through ──────────────────────────────────────────────────────
//   1. `nextSurveyStatus` legality (status.ts) — an illegal (status, action) → SurveyStateError 409,
//      raised BEFORE any write.
//   2. `valid_until > valid_from` (AC2) — SurveyWindowInvalidError 422. Mirrored by the
//      `surveys_window_non_empty` DB CHECK, so it holds even on a raw SQL write.
//   3. audience authorability (AC5) — `public` / `role` / `cohort` are rejected at the WRITE with
//      SurveyAudienceUnsupportedError 422, and `state` without a value with
//      SurveyAudienceValueRequiredError 422. ⭐ The read-time predicate already fails closed for all
//      of these, but failing closed at READ time means a survey that publishes fine, fans out to
//      nobody and collects nothing — with no error anywhere. The write-path rejection is what makes
//      the mistake visible to the admin who made it.
//   4. questionnaire validity (AC3) — `validateQuestionnaire` on every create/update, and again with
//      `forPublish` at publish.
//   5. tone-review (AC4) — `publish` builds a `ToneReviewSignoff` and injects it into the shipped
//      pure `evaluateToneReviewGate`; a deny is the shipped `ToneReviewRequiredError` (409) with NO
//      status change. The gate is ALREADY default-deny on `reviewedBy === authoredBy`, so there is
//      deliberately NO second author≠reviewer identity check here (the 10.9 posture; 10.5 needed one
//      only because it also had a reviewer-ASSIGNMENT step, and this story has none).
//
// ── ⭐ LBD-5: THE QUESTIONNAIRE IS FROZEN AT PUBLISH, so there is ONE update path and NO re-review ─
// 10.9 needed a content-hash oracle deciding whether an edit required a fresh sign-off, because a
// published banner's copy can still change. A published survey's copy, questions, threshold and
// audience CANNOT change — the only permitted post-publish mutation is EXTENDING `valid_until`, which
// is in neither half of the hash. So the sign-off is a ONE-SHOT binding and `updateSurvey` is a plain
// freeze check rather than a hash comparison.
// ⛔ Do not "restore symmetry" with 10.9 by adding a re-sign path: it would require unfreezing the
// questionnaire, and a response is an answer TO A QUESTION — change the question and every stored
// answer silently becomes an answer to something nobody asked
// ([[feedback_supersede_never_reinterpret]]).
//
// The AUDIT of each transition (Story 1.10) is the CONSUMER's job (the apps/api handler), as is the
// `tone_review.signoff` audit-sink emission — this module owns only the durable row state (the
// banners / news-blog / niyamavali domain/api split).

import { and, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId, SurveyId, UserId } from '../ids/index.js';
import {
  type SurveyAudienceScope,
  type SurveyResponseRow,
  type SurveyRow,
  type SurveyStatus,
  surveyResponses,
  surveys,
} from '../schema/surveys.js';
import { ToneReviewRequiredError } from '../tone-review/errors.js';
import { type ToneReviewSignoff, evaluateToneReviewGate } from '../tone-review/gate.js';
import { type SurveyCopy, missingSurveyCopyFields, surveyContentHash, surveyResourceLocator } from './content-hash.js';
import {
  SurveyAlreadyRespondedError,
  SurveyAudienceUnsupportedError,
  SurveyAudienceValueRequiredError,
  SurveyBilingualRequiredError,
  SurveyFrozenFieldError,
  SurveyNotFoundError,
  SurveyStateError,
  SurveyWindowInvalidError,
} from './errors.js';
import { getSurveyOrThrow } from './read.js';
import { isSurveyOpen, nextSurveyStatus } from './status.js';
import type { SurveyAnswer, SurveyQuestion } from './types.js';
import { validateAnswers, validateQuestionnaire } from './validate.js';

// ── pure guards (exported for unit tests + the apps/api audit line) ────────────

/** AC2: the response window must be non-empty (`valid_until > valid_from`). PURE. */
export function assertWindowValid(surveyId: string | null, validFrom: Date, validUntil: Date): void {
  if (validUntil.getTime() <= validFrom.getTime()) {
    throw new SurveyWindowInvalidError(surveyId, validFrom.toISOString(), validUntil.toISOString());
  }
}

/**
 * AC4: all four copy fields must be non-empty at publish (FR-68 Hindi + English variants). A draft
 * may be incomplete; publishing one may not. PURE + exported for unit tests.
 */
export function assertSurveyCopyComplete(surveyId: string, copy: SurveyCopy): void {
  const missing = missingSurveyCopyFields(copy);
  if (missing.length > 0) throw new SurveyBilingualRequiredError(surveyId, missing);
}

/**
 * AC5: reject an audience scope that can never resolve to a survey audience. PURE.
 *
 * ⭐ `public` is the interesting rejection and it is the OPPOSITE of Story 10.9 (LBD-7). A public
 * BANNER widens who else may see it; a public SURVEY is incoherent — there is no unauthenticated
 * survey surface, responding requires a member session by definition, and one-response-per-member
 * (LBD-6) has no identity to enforce against for an anonymous respondent. `public` stays in the enum
 * only so the vocabulary reads beside its two siblings; a scope that can be authored but never
 * resolve is a trap, which is why this guard exists at all.
 */
export function assertAudienceAuthorable(audienceScope: SurveyAudienceScope, scopeValue: string | null): void {
  if (audienceScope === 'public') {
    throw new SurveyAudienceUnsupportedError(
      audienceScope,
      'a survey has no unauthenticated respondent; use members-all to reach every member of the Pariwar',
    );
  }
  if (audienceScope === 'role' || audienceScope === 'cohort') {
    throw new SurveyAudienceUnsupportedError(
      audienceScope,
      'no member role/cohort attribute exists at any layer, so this scope can never resolve to an audience',
    );
  }
  if (audienceScope === 'state' && (scopeValue === null || scopeValue.trim() === '')) {
    throw new SurveyAudienceValueRequiredError(audienceScope);
  }
  // The mirror of the check above: `members-all` takes no value, so a stray one left over from a
  // prior `state` scope (or supplied by a client that omitted `audience_scope` on a PATCH, which the
  // wire-level refinement cannot see because it only validates the fields present IN the patch) must
  // be rejected here too — this function sees the MERGED, resulting state, which is the only place
  // that gap can be closed. [Review][Patch] — code review of 10-15-survey-poll (2026-08-17).
  if (audienceScope === 'members-all' && scopeValue !== null) {
    throw new SurveyAudienceUnsupportedError(
      audienceScope,
      'members-all takes no audience_scope_value; clear it or choose the state scope instead',
    );
  }
}

// ── create / edit ──────────────────────────────────────────────────────────────

export interface CreateSurveyDraftInput {
  pariwarId: PariwarId;
  title?: string | null;
  body?: string | null;
  titleHi?: string | null;
  bodyHi?: string | null;
  questions?: SurveyQuestion[];
  audienceScope: SurveyAudienceScope;
  audienceScopeValue?: string | null;
  validFrom: Date;
  validUntil: Date;
  /** FR-58's "optional quorum threshold", RENAMED. ⚠ INFORMATIONAL ONLY — it gates nothing (LBD-1). */
  responseThreshold?: number | null;
  /** The authoring actor (NOT NULL — a survey is always human-authored; the gate's `authoredBy`). */
  createdByActorId: UserId;
}

/**
 * Create a survey at `status='draft'`. Copy may be incomplete on a draft and the questionnaire may be
 * EMPTY (the bilingual requirement and the at-least-one-question rule bite at PUBLISH); the window,
 * audience and per-question validity invariants bite here.
 */
export async function createDraft(db: Db, input: CreateSurveyDraftInput): Promise<SurveyRow> {
  assertWindowValid(null, input.validFrom, input.validUntil);
  assertAudienceAuthorable(input.audienceScope, input.audienceScopeValue ?? null);
  const questions = input.questions ?? [];
  validateQuestionnaire(questions);

  const inserted = await db
    .insert(surveys)
    .values({
      pariwarId: input.pariwarId,
      title: input.title ?? null,
      body: input.body ?? null,
      titleHi: input.titleHi ?? null,
      bodyHi: input.bodyHi ?? null,
      questions,
      audienceScope: input.audienceScope,
      audienceScopeValue: input.audienceScopeValue ?? null,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      responseThreshold: input.responseThreshold ?? null,
      status: 'draft',
      createdByActorId: input.createdByActorId,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error('survey insert returned no row');
  return row;
}

/**
 * The fields an update may request. Every one is freely editable on a DRAFT; on a PUBLISHED survey
 * only `validUntil` (extended) survives the LBD-5 freeze.
 */
export interface UpdateSurveyPatch {
  title?: string | null;
  body?: string | null;
  titleHi?: string | null;
  bodyHi?: string | null;
  questions?: SurveyQuestion[];
  audienceScope?: SurveyAudienceScope;
  audienceScopeValue?: string | null;
  validFrom?: Date;
  validUntil?: Date;
  responseThreshold?: number | null;
}

/**
 * The fields LBD-5 freezes at publish, in the order they are reported to the admin.
 *
 * ⚠ [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): this list previously named only
 * four of the nine fields `updateSurvey`'s published-survey guard actually rejects (it also freezes
 * the copy fields and `valid_from` — see the guard below). This is the single source of truth other
 * code points to instead of re-deriving the freeze set, so it MUST list every field the guard checks,
 * in the same order the guard checks them — keep the two in lockstep.
 */
const FROZEN_AFTER_PUBLISH = [
  'questions',
  'response_threshold',
  'audience_scope',
  'audience_scope_value',
  'title',
  'body',
  'title_hi',
  'body_hi',
  'valid_from',
] as const;

/**
 * Edit a survey.
 *
 *   · `draft`     → everything in the patch applies, re-validated.
 *   · `published` → ONLY an EXTENSION of `valid_until`. Any of the four frozen fields → 409 naming
 *     them (`SurveyFrozenFieldError`); a SHORTENING of `valid_until` → 422 pointing at `close`
 *     (`SurveyWindowInvalidError.shortening`); a change to copy or `valid_from` → 409, because the
 *     tone sign-off is bound to the copy and members have already been notified of the start.
 *   · `closed`    → 409. Terminal.
 *
 * ⚠ A patch that requests a frozen field with its CURRENT value is still a 409, deliberately: this
 * function compares REQUESTED KEYS, not resulting values. Diff-based tolerance would mean an admin
 * console that always PUTs the whole row could silently "succeed" at editing a published
 * questionnaire whenever the edit happened to be a no-op, which is a behaviour nobody could predict
 * from the outside. The console sends what it means to change.
 */
export async function updateSurvey(
  db: Db,
  pariwarId: PariwarId,
  surveyId: SurveyId,
  patch: UpdateSurveyPatch,
  now: Date,
): Promise<SurveyRow> {
  const survey = await getSurveyOrThrow(db, pariwarId, surveyId);

  if (survey.status === 'closed') {
    throw new SurveyStateError(surveyId, survey.status, 'a closed survey cannot be edited');
  }

  if (survey.status === 'published') {
    const touchedFrozen: string[] = [];
    if (patch.questions !== undefined) touchedFrozen.push('questions');
    if (patch.responseThreshold !== undefined) touchedFrozen.push('response_threshold');
    if (patch.audienceScope !== undefined) touchedFrozen.push('audience_scope');
    if (patch.audienceScopeValue !== undefined) touchedFrozen.push('audience_scope_value');
    // Copy is frozen too — the tone sign-off is BOUND to it by content hash (AC4), so changing it
    // would leave a published survey carrying a sign-off for text nobody reviewed. Reported under the
    // same 409 rather than a separate error: to the admin it is the same fact ("this is published").
    if (patch.title !== undefined) touchedFrozen.push('title');
    if (patch.body !== undefined) touchedFrozen.push('body');
    if (patch.titleHi !== undefined) touchedFrozen.push('title_hi');
    if (patch.bodyHi !== undefined) touchedFrozen.push('body_hi');
    // Moving the START of a window members have already been notified about is not an extension.
    if (patch.validFrom !== undefined) touchedFrozen.push('valid_from');
    if (touchedFrozen.length > 0) throw new SurveyFrozenFieldError(surveyId, touchedFrozen);

    if (patch.validUntil === undefined) return survey; // nothing to do — an empty patch is not an error.

    if (patch.validUntil.getTime() <= survey.validUntil.getTime()) {
      throw SurveyWindowInvalidError.shortening(
        surveyId,
        survey.validUntil.toISOString(),
        patch.validUntil.toISOString(),
      );
    }
    const extended = await db
      .update(surveys)
      .set({ validUntil: patch.validUntil, updatedAt: now })
      .where(and(eq(surveys.pariwarId, pariwarId), eq(surveys.surveyId, surveyId), eq(surveys.status, 'published')))
      .returning();
    const extendedRow = extended[0];
    if (!extendedRow) {
      throw new SurveyStateError(surveyId, survey.status, 'survey changed state before the extension could be applied');
    }
    return extendedRow;
  }

  // ── draft: everything applies ──
  const merged = {
    title: patch.title !== undefined ? patch.title : survey.title,
    body: patch.body !== undefined ? patch.body : survey.body,
    titleHi: patch.titleHi !== undefined ? patch.titleHi : survey.titleHi,
    bodyHi: patch.bodyHi !== undefined ? patch.bodyHi : survey.bodyHi,
    questions: patch.questions !== undefined ? patch.questions : survey.questions,
    audienceScope: patch.audienceScope !== undefined ? patch.audienceScope : survey.audienceScope,
    audienceScopeValue:
      patch.audienceScopeValue !== undefined ? patch.audienceScopeValue : survey.audienceScopeValue,
    validFrom: patch.validFrom !== undefined ? patch.validFrom : survey.validFrom,
    validUntil: patch.validUntil !== undefined ? patch.validUntil : survey.validUntil,
    responseThreshold:
      patch.responseThreshold !== undefined ? patch.responseThreshold : survey.responseThreshold,
  };

  assertWindowValid(surveyId, merged.validFrom, merged.validUntil);
  assertAudienceAuthorable(merged.audienceScope, merged.audienceScopeValue);
  validateQuestionnaire(merged.questions);

  const updated = await db
    .update(surveys)
    .set({ ...merged, updatedAt: now })
    .where(and(eq(surveys.pariwarId, pariwarId), eq(surveys.surveyId, surveyId), eq(surveys.status, 'draft')))
    .returning();
  const row = updated[0];
  if (!row) {
    throw new SurveyStateError(surveyId, survey.status, 'survey changed state before the edit could be applied');
  }
  return row;
}

// ── lifecycle transitions ──────────────────────────────────────────────────────

export interface PublishSurveyResult {
  row: SurveyRow;
  /** The sign-off the gate accepted — the apps/api handler emits it to the `ToneReviewAuditSink`. */
  signoff: ToneReviewSignoff;
}

/**
 * Publish a draft survey (`draft → published`), gated on a NON-AUTHOR tone-review sign-off (AC4).
 * Fail-closed, in order:
 *   1. legality (`draft → published`) → SurveyStateError 409;
 *   2. all four copy fields present (FR-68) → SurveyBilingualRequiredError 422;
 *   3. the questionnaire is valid AND non-empty → SurveyQuestionnaireInvalidError 422;
 *   4. window + audience re-assert (defensive — a row could predate a guard);
 *   5. build a `ToneReviewSignoff` (reviewedBy = the publishing actor, resourceLocator =
 *      `survey:<id>`, contentHash over the four copy fields PLUS the questions) and inject it into
 *      the shipped gate; a deny → ToneReviewRequiredError 409 with the status UNCHANGED.
 *
 * ⚠ KNOWN, PO-RATIFIED CONSEQUENCE: because the gate is default-deny on `reviewedBy === authoredBy`
 * and `survey.manage` is granted to `pariwar_admin` only, a SINGLE-ADMIN Pariwar cannot publish a
 * survey (nobody else can be the non-author reviewer). This is the identical consequence Story 10.5's
 * review recorded and the PO deferred on 2026-07-30, inherited unchanged by 10.9. It is a deferral
 * with precedent, not a bug — ⛔ do NOT "fix" it by weakening the gate or minting a second role grant.
 *
 * ⭐ The fan-out is NOT triggered here. `apps/api` enqueues `SURVEY_PUBLISH` after this returns, and
 * `apps/jobs` fans out (LBD-8) — a fan-out failure must never roll back a publish (AC8).
 */
export async function publish(
  db: Db,
  pariwarId: PariwarId,
  surveyId: SurveyId,
  actorId: UserId,
  now: Date,
): Promise<PublishSurveyResult> {
  const survey = await getSurveyOrThrow(db, pariwarId, surveyId);
  if (nextSurveyStatus(survey.status, 'publish') === null) {
    throw new SurveyStateError(surveyId, survey.status, 'only a draft may be published');
  }
  assertSurveyCopyComplete(surveyId, survey);
  validateQuestionnaire(survey.questions, true);
  assertWindowValid(surveyId, survey.validFrom, survey.validUntil);
  assertAudienceAuthorable(survey.audienceScope, survey.audienceScopeValue);

  const resourceLocator = surveyResourceLocator(surveyId);
  const contentHash = surveyContentHash(survey, survey.questions);
  const signoff: ToneReviewSignoff = { reviewedBy: actorId, resourceLocator, contentHash, reviewedAt: now };
  const gate = evaluateToneReviewGate({ signoff, authoredBy: survey.createdByActorId, resourceLocator });
  if (!gate.allowed) throw new ToneReviewRequiredError(gate.denial);

  const updated = await db
    .update(surveys)
    .set({
      status: 'published',
      publishedAt: now,
      toneSignoffContentHash: contentHash,
      toneSignoffReviewedAt: now,
      toneSignoffReviewedBy: actorId,
      updatedAt: now,
    })
    .where(
      and(
        eq(surveys.pariwarId, pariwarId),
        eq(surveys.surveyId, surveyId),
        eq(surveys.status, 'draft'),
        // ⚠ [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): `status='draft'` alone
        // does not guard against a concurrent `updateSurvey` PATCH landing between the read above and
        // this UPDATE — an ordinary edit (title/questions/etc.) never changes `status`, so it would
        // commit invisibly to this guard while `contentHash` above was computed from the STALE
        // pre-PATCH `survey` object, publishing a signoff that no longer matches the row's actual
        // content. Pinning to the `updatedAt` this function read makes any such interleaving lose the
        // race honestly (falls into the `!row` branch below) instead of silently publishing stale copy.
        //
        // ⛔ LIVE-DB REGRESSION FOUND AND FIXED (code review of 10-15-survey-poll, 2026-08-17): a bare
        // `eq(surveys.updatedAt, survey.updatedAt)` FAILED EVERY publish — `updated_at` is stored at
        // microsecond precision (Postgres `timestamptz` default), but `survey.updatedAt` is a JS
        // `Date`, which only holds millisecond precision. Reading the row truncates the sub-millisecond
        // remainder; echoing that truncated value back into the WHERE clause then compares it against
        // the STILL-microsecond-precision stored value, which can never match. Millisecond-truncating
        // BOTH sides in SQL closes the gap without touching the column's stored precision (a schema
        // migration was the other option; this is the smaller, non-invasive fix). Unit tests — no real
        // DB — could not have caught this; only live-DB verification surfaced it.
        sql`date_trunc('milliseconds', ${surveys.updatedAt}) = date_trunc('milliseconds', ${survey.updatedAt}::timestamptz)`,
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    throw new SurveyStateError(surveyId, survey.status, 'survey changed state before publish could be applied');
  }
  return { row, signoff };
}

/**
 * Close a survey (`draft → closed` as a DISCARD, or `published → closed` to stop collecting), setting
 * `closed_at`.
 *
 * ⛔ TERMINAL — `nextSurveyStatus` offers no way back, and that asymmetry is deliberate: reopening
 * would resume collecting answers into an aggregate an admin has already read and may have already
 * acted on, silently moving a number someone quoted. To ask again, publish a NEW survey.
 *
 * ⚠ Closing does NOT delete responses, and the migration grants no DELETE on either table. A closed
 * survey's aggregate stays readable — that is the whole point of having asked.
 */
export async function close(db: Db, pariwarId: PariwarId, surveyId: SurveyId, now: Date): Promise<SurveyRow> {
  const survey = await getSurveyOrThrow(db, pariwarId, surveyId);
  if (nextSurveyStatus(survey.status, 'close') === null) {
    throw new SurveyStateError(surveyId, survey.status, 'only a draft or a published survey may be closed');
  }
  const updated = await db
    .update(surveys)
    .set({ status: 'closed', closedAt: now, updatedAt: now })
    .where(
      and(
        eq(surveys.pariwarId, pariwarId),
        eq(surveys.surveyId, surveyId),
        inArray(surveys.status, ['draft', 'published'] satisfies SurveyStatus[]),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    throw new SurveyStateError(surveyId, survey.status, 'survey changed state before close could be applied');
  }
  return row;
}

// ── the member write (AC6, LBD-6) ──────────────────────────────────────────────

export interface RecordResponseInput {
  pariwarId: PariwarId;
  surveyId: SurveyId;
  memberId: MemberId;
  answers: SurveyAnswer[];
  now: Date;
}

/**
 * Record one member's response.
 *
 * ── ⛔ AN IDEMPOTENT INSERT THAT 409s ON CONFLICT — NOT AN UPSERT (LBD-6) ─────────────────────
 * `PRIMARY KEY (pariwar_id, survey_id, member_id)` is the invariant; this is its 409. Editing an
 * answer is deferred WITH ITS REASON STATED: an editable answer makes the aggregate a moving target,
 * and no requirement in FR-58 or the epic AC asks for one. A member who submitted by mistake raises a
 * helpdesk ticket (Story 10.2) — a human path that already exists and leaves a record.
 * ⚠ Do NOT quietly make this an upsert "for convenience"; it changes what the aggregate MEANS. The
 * migration additionally withholds UPDATE on this table from `twt_app`, so the convenience upsert is
 * not merely discouraged — it is unavailable.
 *
 * ⭐ The duplicate is detected by the INSERT's unique violation, not by a pre-read: a check-then-insert
 * races two concurrent submissions past each other, and the composite PK is the real authority.
 * `onConflictDoNothing().returning()` yields zero rows on a duplicate, which is the 409.
 *
 * ── Expiry is enforced HERE, on the write path (AC2) ─────────────────────────────────────────
 * A response against a survey that is not `open` at `now` is a 409. Hiding an expired survey from the
 * read is not enough: the member's client may hold a stale list, and a survey whose window has closed
 * must stop collecting whether or not anything re-rendered.
 */
export async function recordResponse(db: Db, input: RecordResponseInput): Promise<SurveyResponseRow> {
  const survey = await getSurveyOrThrow(db, input.pariwarId, input.surveyId);

  // AC6: a draft is not yet visible to a member — an unpublished survey's existence must read
  // identically to a cross-tenant one (404, never 403 or a state-revealing 409), otherwise the status
  // code itself leaks that the survey/audience exists before it was ever published. `closed` is not
  // this case: it WAS published and visible, so its state conflict is honestly reported as 409.
  // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): this branch previously fell
  // through to the generic `isSurveyOpen` check below and 409'd a draft the same as a closed survey.
  if (survey.status === 'draft') {
    throw new SurveyNotFoundError(input.pariwarId, input.surveyId);
  }

  if (!isSurveyOpen(survey, input.now)) {
    throw new SurveyStateError(
      input.surveyId,
      survey.status,
      'this survey is not open for responses at this time',
    );
  }

  validateAnswers(survey.questions, input.answers);

  const inserted = await db
    .insert(surveyResponses)
    .values({
      pariwarId: input.pariwarId,
      surveyId: input.surveyId,
      memberId: input.memberId,
      answers: input.answers,
      submittedAt: input.now,
    })
    .onConflictDoNothing()
    .returning();
  const row = inserted[0];
  if (!row) throw new SurveyAlreadyRespondedError(input.surveyId);
  return row;
}

/** Re-exported so a caller can name the frozen set without re-deriving it. */
export { FROZEN_AFTER_PUBLISH };
