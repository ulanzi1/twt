// Ground-inspection admin handlers — Story 6.7 (Task 5; AC1–AC6).
//
// The admin surface for the ground-inspection ASSIGNMENT (schedule/reschedule/findings/complete/
// refusal/photos/read). Consumes the Story 6.5 ClaimDocumentStorage PORT for photo bytes (Decision
// D2 — NOT the claim_documents row). Per-endpoint hook chains differ (AC6): all writes share the
// district-gated conduct permission (resolveValue = body district for schedule, the assignment
// row's district otherwise), and the evidence-authoring verbs (complete/refusal/findings/photos)
// ADD the inspector-identity guard (acting actor === inspector, or a checked
// claim.override_ground_inspection).
//
// ── Two concerns this file owns that differ from 6.5 ──────────────────────────
// (1) AUDIT IS A POST-COMMIT SINK (#10). schedule/reschedule/complete perform real in-tx DB work
//     (events_log append + row writes), so — unlike 6.5, whose audit fires before commit and makes
//     no synchronous DB write — each write handler opens its OWN scope-tx, COMMITS it, and only
//     THEN calls emitAuthAudit. The durable record is the events_log event / the row state, never
//     the audit line. (The scope-resolution middleware's request.scopeTx is used ONLY by the
//     permission preHandlers; the mutation rides a dedicated committed tx.)
// (2) PII IS ENCRYPTED BEFORE INSERT under the request encryption context; the read path decrypts +
//     mints short-lived signed URLs (never bytes, never a public URL).

import { randomUUID } from 'node:crypto';

import {
  CLAIM_DOCUMENT_MAX_BYTES,
  GROUND_INSPECTION_ANSWER_INVALID_CODE,
  GROUND_INSPECTION_QUESTIONNAIRE_CERTIFICATE_CHECK_CODE,
  GROUND_INSPECTION_QUESTIONNAIRE_STALE_CODE,
  GROUND_INSPECTION_QUESTIONNAIRE_UNAVAILABLE_CODE,
  GROUND_INSPECTION_QUESTIONNAIRE_VERSION_STALE_CODE,
  GROUND_INSPECTION_QUESTIONNAIRE_VERSION_UNREADABLE_CODE,
  type FamilyAnswerDisplay,
  type FamilyAnswersDisplay,
  type GroundInspectionLiveAnswer,
  type GroundInspectionQuestionnaireResponse,
  type GroundInspectionSaveAnswerResponse,
  type NoteWithheldReason,
} from '@twt/contracts';
import { claim, cycleCalendar, ids, member as memberDomain, questionnaireVersions, questionnaires, rbac, schema } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  ApiError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
  UnauthorizedError,
  UnsupportedMediaTypeError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { auditAuthorizationDenied, geoTreeResolverForRequest } from '../rbac/index.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { underSavepoint } from './later-approval-warnings.js';
import { resolvePeerRequestMemberName, toWireQuestionnaire } from './peer-request-core.js';
import { questionnaireWordsFor } from './questionnaire-words.js';
import { readClaimsHiddenFromReader, withheldReasonOn, withheldUnlessAuthor } from './hidden-reader-notes.js';
import {
  answerCodeIndexes,
  deathDateBlindIndex,
  decryptGroundInspectionField,
  encryptGroundInspectionField,
  encryptOptionalGroundInspectionField,
} from './ground-inspection-crypto.js';

/** Images-only MIME allowlist (NOT the death-cert PDF list) — checked before the storage `put`. */
const PHOTO_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Per-file byte cap (reuses the object-store's 10 MiB ceiling — within the multipart plugin limit). */
const PHOTO_MAX_BYTES = CLAIM_DOCUMENT_MAX_BYTES;
/** Signed-URL TTL for a photo read (short-lived — the 6.5 access pattern). */
const PHOTO_SIGNED_URL_TTL_SECONDS = 300;
/** Story 6.26a (GI4) — the signed-URL TTL of the inspector's view of the uploaded certificate. */
const CERTIFICATE_SIGNED_URL_TTL_SECONDS = 300;

/** The D6 supervisor-override key (catalog v9) — the conduct key is gated by the route preHandlers. */
const OVERRIDE_KEY = 'claim.override_ground_inspection';
/** Story 6.17 (review fix) — the conduct key, needed here (not just at the route layer) to
 *  re-check EACH row's OWN dimension in `read()`'s list filter (see there for why). */
const CONDUCT_KEY = 'claim.conduct_ground_inspection';

/** Translate a ground-inspection domain error to its stable HTTP shape (the backstop mapping; the
 *  route also pre-checks the common cases for a clean early signal). Rethrows anything unknown. */
function translateGroundInspectionError(err: unknown): never {
  if (err instanceof claim.GroundInspectionClaimNotInVerificationError) {
    throw new ConflictError(
      'Ground inspection is not allowed for the claim in its current state',
      'ground_inspection.not_allowed',
      { state: err.currentState },
    );
  }
  if (err instanceof claim.GroundInspectionNotActiveError) {
    throw new ConflictError(
      'The ground-inspection assignment is not active',
      'ground_inspection.not_active',
      { status: err.status },
    );
  }
  if (err instanceof claim.GroundInspectionPhotoRequiredError) {
    throw new ConflictError(
      'At least one photo is required to complete the inspection',
      'ground_inspection.photo_required',
    );
  }
  if (err instanceof claim.GroundInspectionPhotoLimitError) {
    throw new ConflictError(
      'The assignment already holds the maximum number of photos',
      'ground_inspection.photo_limit',
      { max: err.max },
    );
  }
  if (err instanceof claim.GroundInspectionNotFoundError) {
    throw new NotFoundError('Ground inspection not found', 'ground_inspection.not_found');
  }
  if (err instanceof claim.GroundInspectionSiteDetailRequiredError) {
    throw new BadRequestError(
      "A location description is required when the site type is 'other'",
      'ground_inspection.site_detail_required',
    );
  }
  if (err instanceof claim.GroundInspectionRefusalReasonError) {
    throw new BadRequestError(err.detail, 'ground_inspection.invalid_refusal');
  }
  if (err instanceof claim.GroundInspectionDistrictImmutableError) {
    throw new ConflictError(
      'A reschedule cannot move the assignment to a different district',
      'ground_inspection.district_immutable',
      { district: err.currentDistrict },
    );
  }
  if (err instanceof claim.GroundInspectionBlockImmutableError) {
    // Story 6.17 (D3) — the SIBLING of district_immutable, with its own stable code. ⛔ Not folded
    // into the district mapping: `ground_inspection.district_immutable` is an asserted contract.
    throw new ConflictError(
      'A reschedule cannot move the assignment to a different block',
      'ground_inspection.block_immutable',
      { block: err.currentBlock },
    );
  }
  if (err instanceof claim.GroundInspectionIdempotencyMismatchError) {
    throw new ConflictError(
      'The Idempotency-Key was already used for a different request',
      'ground_inspection.idempotency_mismatch',
      { field: err.field },
    );
  }
  // ── Story 6.26a (GI4 / GI5) — the original-certificate record and the dates. ──
  if (err instanceof claim.GroundInspectionOriginalCertificateRequiredError) {
    const words = {
      photo: 'a photo of the original death certificate',
      verdict: 'whether the original matches the copy',
      compared_certificate: 'which uploaded certificate the original was compared with',
    } as const;
    // Worded for BOTH callers (narrow review 2026-10-07): the completion, and — `-287` J1 — the upload of an original's
    // photo, which is refused without the compared certificate's token.
    throw new ConflictError(
      `The original-certificate record needs ${words[err.missing]}`,
      'ground_inspection.original_certificate_required',
      { missing: err.missing },
    );
  }
  if (err instanceof claim.GroundInspectionCertificateChangedError) {
    throw new ConflictError(
      'The family has replaced the death certificate since you opened it — compare the original with the new one',
      'ground_inspection.certificate_changed',
    );
  }
  if (err instanceof claim.GroundInspectionNoCurrentCertificateError) {
    throw new ConflictError(
      'This claim has no uploaded death certificate to compare the original with yet',
      'ground_inspection.no_current_certificate',
    );
  }
  if (err instanceof claim.GroundInspectionDeathDateRequiredError) {
    throw new ConflictError('To complete the inspection, record the date of death', 'ground_inspection.death_date_required');
  }
  if (err instanceof claim.GroundInspectionDeathDateInFutureError) {
    throw new ConflictError('The date of death cannot be after today', 'ground_inspection.death_date_in_future');
  }
  if (err instanceof claim.GroundInspectionDeathFactsInvalidError) {
    throw new BadRequestError(
      err.detail === 'time_not_allowed'
        ? 'A certificate check records the date printed on the original only — not a time'
        : 'The date or time of death is not valid',
      'ground_inspection.invalid_death_facts',
      { problem: err.detail },
    );
  }
  // ── Story 6.27d (AC6) — the inspector's re-ask notes. ──
  if (err instanceof claim.OwnGroundVisitPendingError) {
    // ⭐ AC2 — ONE neutral refusal, ⛔ `details`, raised BEFORE any showing / exists check: a hidden caller learns ⛔ nothing
    // about what a neighbour said. Mapped HERE, ⛔ through 6.27b's approval mapper (its words say "approve").
    throw new ConflictError(
      'Your own ground visit on this claim is not finished yet — finish it before recording a note',
      'ground_inspection.own_ground_visit_pending',
    );
  }
  if (err instanceof claim.InspectionDiscrepancyNotShownError) {
    throw new ConflictError('No difference was shown on this question', 'ground_inspection.discrepancy_not_shown');
  }
  if (err instanceof claim.InspectionDiscrepancyNoteExistsError) {
    throw new ConflictError('A note on this question is already recorded', 'ground_inspection.discrepancy_note_exists');
  }
  // ── Story 6.32 (IQ10) — the inspector's questionnaire for the family. ──
  if (err instanceof claim.GroundInspectionQuestionnaireUnavailableError) {
    throw new NotFoundError('There is no questionnaire for this visit', GROUND_INSPECTION_QUESTIONNAIRE_UNAVAILABLE_CODE);
  }
  if (err instanceof claim.GroundInspectionQuestionnaireCertificateCheckError) {
    throw new ConflictError('A certificate check asks the family no questions', GROUND_INSPECTION_QUESTIONNAIRE_CERTIFICATE_CHECK_CODE);
  }
  // Story 6.33 (R7) — the version changed since the panel loaded it (RELOAD), or the pinned version cannot be saved to.
  if (err instanceof claim.GroundInspectionQuestionnaireVersionStaleError) {
    throw new ConflictError('These questions have changed — reload them', GROUND_INSPECTION_QUESTIONNAIRE_VERSION_STALE_CODE);
  }
  if (err instanceof claim.GroundInspectionQuestionnaireVersionUnreadableError) {
    throw new ConflictError('These questions cannot be answered just now', GROUND_INSPECTION_QUESTIONNAIRE_VERSION_UNREADABLE_CODE);
  }
  if (err instanceof claim.GroundInspectionQuestionnaireStaleError) {
    throw new ConflictError('The answers changed while saving — please try again', GROUND_INSPECTION_QUESTIONNAIRE_STALE_CODE);
  }
  if (err instanceof claim.GroundInspectionQuestionnaireInvalidAnswerError) {
    throw new ApiError(422, GROUND_INSPECTION_ANSWER_INVALID_CODE, 'This answer cannot be saved', { reason: err.reason });
  }
  if (err instanceof claim.GroundInspectionInspectorMismatchError) {
    // Backstop for the inspector-identity guard (the route pre-checks the override for a clean 403;
    // this maps the writer's guard so a future divergence surfaces a 403, not an unclassified 500).
    throw new ForbiddenError(
      'Only the assigned inspector may author this evidence',
      'ground_inspection.inspector_mismatch',
    );
  }
  throw err;
}

interface AdminCtx {
  actorId: string;
  pariwarId: string;
}

/** Story 6.27d — the family's date as the inspector's screen shows it (R3): the plaintext in hand, or `unavailable` (an
 *  erased / undecryptable date on the re-read — ⛔ never the sentinel text, ⛔ never a 500). */
type FamilyDeathDate = { readonly status: 'shown'; readonly date: string } | { readonly status: 'unavailable' };

/**
 * ⭐ Story 6.27d (AC3, AC4; R1, R4) — the ONE result union on the completion response AND the re-read:
 *   · `null` — ⛔ a family account to compare (a `certificate_check`; the completion only — the re-read answers 404);
 *   · `withheld` — the receiver is HIDDEN on the claim (`own_visit`) or the check / the delivery could ⛔ be confirmed
 *     (`check_failed`) — 6.27b's ONE withheld shape, UNIFORM: it does ⛔ not depend on the result;
 *   · `shown` — the keys that differ (possibly none), and the family's date ONLY when `death_date` is among them.
 * ⛔ No value, ⛔ no name, ⛔ no count — the shape does ⛔ not vary with the number of neighbours or answers.
 */
type InspectionDiscrepancyDto =
  | null
  | { readonly state: 'withheld'; readonly reason: NoteWithheldReason }
  | {
      readonly state: 'shown';
      readonly questionKeys: readonly claim.InspectionDiscrepancyKey[];
      readonly familyDeathDate: FamilyDeathDate | null;
      /** ⭐ Story 6.32 (AC6 / AC7) — the family's ③ / ④ answers in English words, ONLY for a ③ / ④ key shown; else `null`. */
      readonly familyAnswers: FamilyAnswersDisplay | null;
    };

/** A re-ask note on the re-read (R4a) — ALL of the assignment's notes, with their author. */
interface InspectionDiscrepancyNoteDto {
  readonly questionKey: claim.InspectionDiscrepancyKey;
  readonly note: string | { readonly status: 'unavailable' };
  readonly notedAt: string;
  readonly authorActorId: string;
  readonly authorDisplay: string;
}

/** The note POST's body (the route validates it `.strict()`). */
export type DiscrepancyNoteBody = { questionKey: claim.InspectionDiscrepancyKey; note: string };

/** Story 6.32 — the questionnaire save's body (the route validates it `.strict()`). */
export type QuestionnaireAnswerBody = { codes: string[]; questionnaireVersionId?: string };

/** The ③ / ④ keys — the family answers them at the inspection (Story 6.32). */
const FAMILY_ANSWER_KEYS = ['death_cause', 'death_illness'] as const;

/** A family answer's stored value as codes: plaintext codes, else the decrypted JSON code list; `null` ⇔ ⛔ shown. */
function codesOfDecrypted(plain: string): string[] | null {
  if (plain === memberDomain.ANONYMIZED_SENTINEL) return null;
  try {
    const parsed: unknown = JSON.parse(plain);
    return Array.isArray(parsed) && parsed.every((c) => typeof c === 'string') ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

export function createGroundInspectionHandlers(deps: AppDeps) {
  /** The acting admin id + active pariwar (both set by requireAdminSession + scope-resolution). */
  function adminCtx(request: FastifyRequest): AdminCtx {
    const actorId = request.requestContext.actorId;
    const pariwarId = request.scopeTx?.pariwarId;
    if (!actorId || !pariwarId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { actorId, pariwarId };
  }

  /**
   * Resolve the inspector-identity guard (D6). Returns `undefined` when the acting actor IS the
   * assigned inspector (no override needed); otherwise requires `claim.override_ground_inspection`
   * at the assignment's district — throwing the structured 403 (with the authz.denied audit) if
   * absent — and returns the recorded override marker.
   */
  function resolveInspectorOverride(
    request: FastifyRequest,
    ctx: AdminCtx,
    assignment: schema.ClaimGroundInspectionRow,
  ): claim.GroundInspectionOverride | undefined {
    // ⭐ Story 6.27b code review round 2 (V2) — the ONE meaning of "is the assigned inspector" (`claim.isSameActorId`).
    if (claim.isSameActorId(ctx.actorId, assignment.inspectorActorId)) return undefined;
    const grants = request.scopeGrants ?? [];
    const result = rbac.checkPermission(
      {
        actorId: ctx.actorId,
        grants,
        key: OVERRIDE_KEY,
        resource: { dimension: 'district', value: assignment.district, pariwarId: ctx.pariwarId },
      },
      { onAuthorizationDenied: auditAuthorizationDenied(deps, request, ctx.actorId, ctx.pariwarId) },
    );
    if (!result.ok) throw result.error; // AuthorizationDeniedError → structured 403
    return { byActorId: ctx.actorId };
  }

  /**
   * ⭐ Story 6.32 (review R4) — the questionnaire routes BIND the assignment to the claim named in their path: the preHandler
   * loads by (pariwar, id) only, so a path naming claim A with claim B's assignment would read or save B's answers. A
   * mismatch is the SAME 404 as a missing assignment (⛔ a hint that the id exists elsewhere), before any read or write.
   * ⭐ Second review S2 — the discrepancy re-read and the completion bind too: since 6.32 they carry the family's cause and
   * illness.
   */
  function requirePathClaim(request: FastifyRequest, assignment: schema.ClaimGroundInspectionRow): void {
    const { claimCaseId } = request.params as { claimCaseId: string };
    if (assignment.claimCaseId !== claimCaseId.toLowerCase()) {
      throw new NotFoundError('Ground inspection not found', 'ground_inspection.not_found');
    }
  }

  /** The assignment the `resolveGroundInspectionAssignment` preHandler already loaded + stashed
   *  (for the district permission gate). Reused here so the handler does not re-read the row. */
  function loadAssignment(
    request: FastifyRequest,
    _ctx: AdminCtx,
    groundInspectionIdStr: string,
  ): schema.ClaimGroundInspectionRow {
    const stashed = request.groundInspection;
    if (!stashed || stashed.groundInspectionId !== groundInspectionIdStr) {
      // Programming error — the route omitted the resolve-assignment preHandler.
      throw new Error('[ground-inspection] handler ran without resolveGroundInspectionAssignment preHandler');
    }
    return stashed;
  }

  /**
   * ⭐ Story 6.27d (AC5, 4.1; R4) — deliver the completion's in-tx discrepancy, AFTER its transaction closed, in a NEW
   * scope transaction (the request's second connection — the first is released): (i) the HIDDEN check (the ONE
   * predicate) → `withheld/own_visit` and ⛔ no showing; (ii) ONLY when ⛔ hidden, the ONE guarded statement that records
   * the showing AND reports whether the completion PERSISTED. FAIL CLOSED: ANY failure before (i) answered, a raise
   * from (ii), or `persisted = false` (a failed completion COMMIT — this route commits ITSELF, so `closeScopeTx`'s rethrow since 6.36a round 2 does ⛔ reach it) ⇒ `withheld/check_failed`,
   * ⛔ never `shown` for a record ⛔ known to be saved. ONLY a failure AFTER (ii) answered `persisted` (the closing COMMIT)
   * is logged ids-only and still answers `shown` with the in-tx keys (the re-read recomputes the same keys by R2).
   * Uses `assignment.claimCaseId` — ⛔ the path's claim id (the preHandler loads by (pariwar, id) only).
   */
  async function deliverInspectionDiscrepancy(
    request: FastifyRequest,
    ctx: AdminCtx,
    assignment: schema.ClaimGroundInspectionRow,
    questionKeys: readonly claim.InspectionDiscrepancyKey[],
    familyDate: string | null,
    override: claim.GroundInspectionOverride | undefined,
  ): Promise<InspectionDiscrepancyDto> {
    const logFailure = (stage: string, err: unknown) =>
      request.log.warn(
        { err: err instanceof Error ? err.name : 'unknown', ground_inspection_id: assignment.groundInspectionId, stage },
        'discrepancy delivery: withheld (check_failed)',
      );
    let scopeTx;
    try {
      scopeTx = await openScopeTx(deps, ctx.pariwarId);
    } catch (err) {
      logFailure('open', err);
      return { state: 'withheld', reason: 'check_failed' };
    }
    let persisted = false;
    try {
      const pid = ids.pariwarId(ctx.pariwarId);
      if (await claim.isActorOwnVisitPending(scopeTx.tx, pid, assignment.claimCaseId, ctx.actorId)) {
        await closeScopeTx(scopeTx, false);
        return { state: 'withheld', reason: 'own_visit' };
      }
      ({ persisted } = await claim.recordInspectionDiscrepancyShowing(scopeTx.tx, {
        pariwarId: pid,
        groundInspectionId: assignment.groundInspectionId,
        questionKeys,
      }));
    } catch (err) {
      logFailure('check_or_record', err);
      await closeScopeTx(scopeTx, false);
      return { state: 'withheld', reason: 'check_failed' };
    }
    if (!persisted) {
      logFailure('not_persisted', null);
      await closeScopeTx(scopeTx, false);
      return { state: 'withheld', reason: 'check_failed' };
    }
    try {
      await scopeTx.client.query('COMMIT');
    } catch (err) {
      // The showing is ⛔ recorded; the re-read records it later (as of `completed_at` — the same keys, R2).
      request.log.warn(
        { err: err instanceof Error ? err.name : 'unknown', ground_inspection_id: assignment.groundInspectionId },
        'discrepancy delivery: the showing write failed to commit; answered from the in-tx result',
      );
    } finally {
      scopeTx.scopeSet = false;
      scopeTx.client.release();
    }
    return {
      state: 'shown',
      questionKeys: [...questionKeys],
      familyDeathDate: questionKeys.includes('death_date') && familyDate !== null ? { status: 'shown', date: familyDate } : null,
      familyAnswers: await displayFamilyAnswers(request, ctx, assignment.groundInspectionId, questionKeys, {
        claimCaseId: assignment.claimCaseId,
        path: 'completion',
        override,
      }),
    };
  }

  /**
   * ⭐ Story 6.32 (AC6 / AC7; 6.27d R3's shape) — ③ / ④ on the inspector's result: the FAMILY's own answers in the options'
   * English words, read in their OWN transaction and decrypted AFTER it closed (⛔ KMS in a transaction); erased (the
   * sentinel), absent or undecryptable ⇒ `unavailable` (⛔ the sentinel text, ⛔ a 500). `null` unless a ③ / ④ key is SHOWN.
   * ⛔ The neighbour's answer, ⛔ who, ⛔ a count (CF2). ⭐ Second review S3 — a decrypt of the family's health answers is ⛔
   * unaudited (AC8, the 6.27a S12 lesson): when at least one was decrypted, ONE post-read line
   * `admin_ground_inspection.family_answers_shown` — the keys shown and counts, ⛔ a code, ⛔ a value.
   */
  async function displayFamilyAnswers(
    request: FastifyRequest,
    ctx: AdminCtx,
    groundInspectionId: string,
    questionKeys: readonly claim.InspectionDiscrepancyKey[],
    audit: { readonly claimCaseId: string; readonly path: 'completion' | 're_read'; readonly override: claim.GroundInspectionOverride | undefined },
  ): Promise<FamilyAnswersDisplay | null> {
    const keys = FAMILY_ANSWER_KEYS.filter((k) => questionKeys.includes(k));
    if (keys.length === 0) return null;
    const warn = (what: string, err: unknown) =>
      request.log.warn({ err: err instanceof Error ? err.name : 'unknown', ground_inspection_id: groundInspectionId, what }, 'discrepancy: a family answer could not be shown');
    let rows: Awaited<ReturnType<typeof claim.readLiveGroundInspectionAnswers>> = [];
    let def: questionnaires.QuestionnaireDefinition | null = null;
    try {
      const pid = ids.pariwarId(ctx.pariwarId);
      const gid = ids.groundInspectionId(groundInspectionId);
      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      try {
        rows = await claim.readLiveGroundInspectionAnswers(scopeTx.tx, pid, gid);
        const header = await claim.readGroundInspectionQuestionnaireHeader(scopeTx.tx, pid, gid);
        // Story 6.33 (R5) — the database-aware reader, on this transaction (a chain version's pin resolves too).
        def = header === null ? null : await questionnaireVersions.getQuestionnaireDefinition(scopeTx.tx, header.questionnaireVersionId);
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    } catch (err) {
      warn('read', err);
    }
    const out: { -readonly [K in keyof FamilyAnswersDisplay]: FamilyAnswersDisplay[K] } = {};
    const optionWords = questionnaireWordsFor('');
    for (const key of keys) {
      const row = rows.find((r) => r.questionKey === key);
      let codes: string[] | null = null;
      if (row?.valueCiphertext != null) {
        try {
          codes = codesOfDecrypted(await decryptGroundInspectionField(row.valueCiphertext, ctx.pariwarId, deps.encryption));
        } catch (err) {
          warn('decrypt', err);
        }
      }
      const q = def === null ? undefined : questionnaires.questionsOf(def).find((x) => x.key === key);
      // THE ONE word function (Story 6.33 QE4) — an option's words carry ⛔ `{member}` slot, so ⛔ name is needed here.
      const label = (code: string) => {
        const o = q?.options.find((x) => x.code === code);
        return o === undefined ? code : optionWords.en(o);
      };
      const display: FamilyAnswerDisplay = codes === null ? { status: 'unavailable' } : { status: 'shown', codes, labels: codes.map(label) };
      out[key] = display;
    }
    const shownKeys = keys.filter((k) => out[k]?.status === 'shown');
    if (shownKeys.length > 0) {
      emitAuthAudit(deps, request, 'admin_ground_inspection.family_answers_shown', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        // ⭐ Patch review — the STORED row keeps only the locator (the context is hashed): it names the claim.
        resourceLocator: `claim:${audit.claimCaseId.toLowerCase()}`,
        context: {
          ground_inspection_id: groundInspectionId,
          claim_case_id: audit.claimCaseId,
          path: audit.path,
          // Keys and counts only — ⛔ a code, ⛔ a value.
          question_keys: shownKeys,
          shown_count: shownKeys.length,
          unavailable_count: keys.length - shownKeys.length,
          ...(audit.override ? { override_actor_id: audit.override.byActorId } : {}),
        },
      });
    }
    return out;
  }

  /** Story 6.32 — the visit's live answers as the inspector reads them back (decrypted AFTER the transaction). */
  async function liveAnswerDtos(
    request: FastifyRequest,
    ctx: AdminCtx,
    rows: Awaited<ReturnType<typeof claim.readLiveGroundInspectionAnswers>>,
  ): Promise<GroundInspectionLiveAnswer[]> {
    const out: GroundInspectionLiveAnswer[] = [];
    for (const row of rows) {
      if (row.valueCodes !== null) {
        out.push({ questionKey: row.questionKey, value: { kind: 'codes', codes: [...row.valueCodes] } });
        continue;
      }
      let codes: string[] | null = null;
      try {
        codes = row.valueCiphertext === null ? null : codesOfDecrypted(await decryptGroundInspectionField(row.valueCiphertext, ctx.pariwarId, deps.encryption));
      } catch (err) {
        request.log.warn({ err: err instanceof Error ? err.name : 'unknown', ground_inspection_id: row.groundInspectionId }, 'questionnaire: an answer could not be decrypted');
      }
      out.push({ questionKey: row.questionKey, value: codes === null ? { kind: 'unavailable' } : { kind: 'codes', codes } });
    }
    return out;
  }

  /** R3 — the RE-READ's family date: decrypted AFTER the transaction; erased (the sentinel), absent, malformed or
   *  undecryptable ⇒ `unavailable` (⛔ never the sentinel text, ⛔ never a 500). */
  async function displayFamilyDeathDate(
    request: FastifyRequest,
    ctx: AdminCtx,
    ciphertext: string | null,
    groundInspectionId: string,
  ): Promise<FamilyDeathDate> {
    if (ciphertext === null) return { status: 'unavailable' };
    try {
      const date = await decryptGroundInspectionField(ciphertext, ctx.pariwarId, deps.encryption);
      if (date === memberDomain.ANONYMIZED_SENTINEL || !claim.isRealCalendarDate(date)) return { status: 'unavailable' };
      return { status: 'shown', date };
    } catch (err) {
      request.log.warn({ err: err instanceof Error ? err.name : 'unknown', ground_inspection_id: groundInspectionId }, 'discrepancy re-read: the family date could not be decrypted');
      return { status: 'unavailable' };
    }
  }

  /** A note for the re-read — decrypted outside any lock; a failure (or the erasure sentinel) ⇒ `unavailable`, ⛔ blank. */
  async function noteDtoOf(request: FastifyRequest, ctx: AdminCtx, n: claim.InspectionDiscrepancyNoteRow): Promise<InspectionDiscrepancyNoteDto> {
    let note: InspectionDiscrepancyNoteDto['note'];
    try {
      const text = await decryptGroundInspectionField(n.noteCiphertext, ctx.pariwarId, deps.encryption);
      note = text === memberDomain.ANONYMIZED_SENTINEL ? { status: 'unavailable' } : text;
    } catch (err) {
      request.log.warn({ err: err instanceof Error ? err.name : 'unknown', ground_inspection_id: n.groundInspectionId }, 'discrepancy note could not be decrypted');
      note = { status: 'unavailable' };
    }
    return {
      questionKey: n.questionKey,
      note,
      notedAt: n.notedAt.toISOString(),
      authorActorId: n.authorActorId,
      authorDisplay: n.authorDisplay,
    };
  }

  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.trim() === '') {
      throw new BadRequestError('An Idempotency-Key header is required', 'ground_inspection.idempotency_key_required');
    }
    return key.trim();
  }

  return {
    /** POST …/admin/claims/:claimCaseId/ground-inspection — schedule an assignment (AC1). */
    async schedule(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const body = request.body as ScheduleBody;
      const idempotencyKey = requireIdempotencyKey(request);

      // (D3) claim-state guard FIRST — a clean 409 before any write (the domain re-guards inside the tx).
      // ⭐ Story 6.26a (GI3, `-283` A4): through the domain's ONE window predicate — a twin of the writer's guard
      // widened alone would strand every claim that reached an approval with ⛔ no inspection HERE, at the API.
      const claimRow = await claim.getClaimCase(
        request.scopeTx!.tx,
        ids.pariwarId(ctx.pariwarId),
        ids.claimId(claimCaseId),
      );
      if (!claimRow) throw new NotFoundError('Claim not found', 'claim.not_found');
      if (
        !(await claim.isClaimInGroundInspectionWindow(
          request.scopeTx!.tx,
          ids.pariwarId(ctx.pariwarId),
          ids.claimId(claimCaseId),
          claimRow.currentState,
        ))
      ) {
        throw new ConflictError(
          'Ground inspection is not allowed for the claim in its current state',
          'ground_inspection.not_allowed',
          { state: claimRow.currentState },
        );
      }

      // Encrypt PII BEFORE insert (under the request encryption context).
      const locationCiphertext = await encryptOptionalGroundInspectionField(body.locationDetail, ctx.pariwarId, deps.encryption);
      const familyContactCiphertext = await encryptOptionalGroundInspectionField(body.familyContact, ctx.pariwarId, deps.encryption);
      const notesCiphertext = await encryptOptionalGroundInspectionField(body.notes, ctx.pariwarId, deps.encryption);

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result;
      try {
        result = await claim.scheduleGroundInspection(scopeTx.client, {
          claimCaseId: ids.claimId(claimCaseId),
          pariwarId: ids.pariwarId(ctx.pariwarId),
          district: body.district,
          block: body.block ?? null,
          inspectionStage: body.inspectionStage,
          inspectionSiteType: body.inspectionSiteType,
          inspectorActorId: body.inspectorActorId,
          scheduledAt: new Date(body.scheduledAt),
          locationCiphertext,
          familyContactCiphertext,
          notesCiphertext,
          structuredFindings: body.structuredFindings ?? null,
          scheduledByActor: ctx.actorId,
          idempotencyKey,
        });
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // POST-COMMIT audit (#10) — only after the tx committed.
      if (result!.created) {
        emitAuthAudit(deps, request, 'admin_ground_inspection.scheduled', {
          actorId: ctx.actorId,
          pariwarId: ctx.pariwarId,
          context: {
            claim_case_id: claimCaseId,
            ground_inspection_id: result!.groundInspection.groundInspectionId,
            district: body.district,
            // Story 6.17 — non-PII, same class as `district` (the schema's PII discipline note).
            block: body.block ?? null,
            inspector_actor_id: body.inspectorActorId,
            inspection_stage: body.inspectionStage,
            inspection_site_type: body.inspectionSiteType,
          },
        });
      }
      void reply.status(result!.created ? 201 : 200);
      return { groundInspectionId: result!.groundInspection.groundInspectionId, status: result!.groundInspection.status, created: result!.created };
    },

    /** POST …/ground-inspection/:ground_inspection_id/reschedule — supersede + replace (AC1/D5). */
    async reschedule(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const body = request.body as ScheduleBody;
      const idempotencyKey = requireIdempotencyKey(request);
      const target = loadAssignment(request, ctx, ground_inspection_id);

      // (review 1a) Fail fast — a reschedule cannot change district (the district gate resolved from
      // the target row, so a different district was never authorization-checked). The writer
      // re-asserts this under the row lock as the backstop.
      if (body.district !== target.district) {
        throw new ConflictError(
          'A reschedule cannot move the assignment to a different district',
          'ground_inspection.district_immutable',
          { district: target.district },
        );
      }
      // (Story 6.17, D3) The same fail-fast one level down. ⚠ Compares null↔non-null too: adding a
      // block would move the row from the district gate to the block gate and clearing one would move
      // it back — a silent re-gating in either direction. The writer re-asserts under the row lock.
      if ((body.block ?? null) !== target.block) {
        throw new ConflictError(
          'A reschedule cannot move the assignment to a different block',
          'ground_inspection.block_immutable',
          { block: target.block },
        );
      }

      const locationCiphertext = await encryptOptionalGroundInspectionField(body.locationDetail, ctx.pariwarId, deps.encryption);
      const familyContactCiphertext = await encryptOptionalGroundInspectionField(body.familyContact, ctx.pariwarId, deps.encryption);
      const notesCiphertext = await encryptOptionalGroundInspectionField(body.notes, ctx.pariwarId, deps.encryption);

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result;
      try {
        result = await claim.rescheduleGroundInspection(scopeTx.client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          groundInspectionId: ids.groundInspectionId(ground_inspection_id),
          idempotencyKey,
          district: body.district,
          block: body.block ?? null,
          inspectionStage: body.inspectionStage,
          inspectionSiteType: body.inspectionSiteType,
          inspectorActorId: body.inspectorActorId,
          scheduledAt: new Date(body.scheduledAt),
          locationCiphertext,
          familyContactCiphertext,
          notesCiphertext,
          structuredFindings: body.structuredFindings ?? null,
          scheduledByActor: ctx.actorId,
        });
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      if (result!.created) {
        emitAuthAudit(deps, request, 'admin_ground_inspection.rescheduled', {
          actorId: ctx.actorId,
          pariwarId: ctx.pariwarId,
          context: {
            supersedes_ground_inspection_id: ground_inspection_id,
            ground_inspection_id: result!.groundInspection.groundInspectionId,
            district: body.district,
            block: body.block ?? null,
            inspector_actor_id: body.inspectorActorId,
            // Forensic trail (review #10): the superseded assignment's inspector, so a reassignment
            // is legible. District is immutable across a reschedule (1a), so it is not duplicated.
            supersedes_inspector_actor_id: target.inspectorActorId,
          },
        });
      }
      void reply.status(result!.created ? 201 : 200);
      return { groundInspectionId: result!.groundInspection.groundInspectionId, status: result!.groundInspection.status, created: result!.created };
    },

    /** PATCH …/ground-inspection/:ground_inspection_id — record findings (AC2). */
    async recordFindings(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const body = request.body as FindingsBody;
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      const override = resolveInspectorOverride(request, ctx, assignment);

      const notesCiphertext =
        body.notes !== undefined
          ? await encryptOptionalGroundInspectionField(body.notes, ctx.pariwarId, deps.encryption)
          : undefined;

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      try {
        await claim.recordGroundInspectionFindings(scopeTx.client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          groundInspectionId: ids.groundInspectionId(ground_inspection_id),
          actingActorId: ctx.actorId,
          override,
          ...(body.structuredFindings !== undefined ? { structuredFindings: body.structuredFindings } : {}),
          ...(notesCiphertext !== undefined ? { notesCiphertext } : {}),
        });
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      emitAuthAudit(deps, request, 'admin_ground_inspection.findings_recorded', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: {
          ground_inspection_id,
          district: assignment.district,
          // Story 6.17 (review fix) — the dimension the conduct gate actually checked for this row.
          block: assignment.block,
          ...(override ? { override_actor_id: override.byActorId } : {}),
        },
      });
      void reply.status(200);
      return { groundInspectionId: ground_inspection_id, status: 'scheduled' };
    },

    /** POST …/ground-inspection/:ground_inspection_id/photos — upload one photo (AC3). */
    async uploadPhoto(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      const override = resolveInspectorOverride(request, ctx, assignment);

      // Cheap pre-check: reject a terminal assignment BEFORE reading/putting bytes (the writer
      // re-asserts under the row lock as the backstop).
      if (assignment.status !== 'scheduled') {
        throw new ConflictError('The ground-inspection assignment is not active', 'ground_inspection.not_active', {
          status: assignment.status,
        });
      }

      const data = await request.file();
      if (!data) throw new BadRequestError('No photo file in the upload', 'ground_inspection.no_file');
      if (!PHOTO_ALLOWED_MIME_TYPES.includes(data.mimetype as (typeof PHOTO_ALLOWED_MIME_TYPES)[number])) {
        throw new UnsupportedMediaTypeError(
          'Unsupported photo type — upload a JPEG, PNG, or WebP',
          'ground_inspection.unsupported_media_type',
          { allowed: PHOTO_ALLOWED_MIME_TYPES },
        );
      }
      let buffer: Buffer;
      try {
        buffer = await data.toBuffer();
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'FST_REQ_FILE_TOO_LARGE' || code === 'FST_FILES_LIMIT') {
          throw new PayloadTooLargeError('Photo exceeds the size limit', 'ground_inspection.too_large', {
            maxBytes: PHOTO_MAX_BYTES,
          });
        }
        throw err;
      }
      if (data.file.truncated || buffer.byteLength > PHOTO_MAX_BYTES) {
        throw new PayloadTooLargeError('Photo exceeds the size limit', 'ground_inspection.too_large', {
          maxBytes: PHOTO_MAX_BYTES,
        });
      }
      if (buffer.byteLength === 0) throw new BadRequestError('The uploaded photo is empty', 'ground_inspection.empty');

      // Optional caption (PII) — read AFTER draining the file stream so a `caption` field that
      // arrives in EITHER multipart position (before or after the file part) is captured, not
      // silently dropped (review #8). `data.fields` accumulates parts as the stream is consumed.
      // ⚠ A duplicate `caption` part (array, not a single field) falls through to "no caption" below —
      // harmless, since caption carries no business meaning and is always optional (review 2026-10-07).
      // A duplicate part under the same field name arrives as an ARRAY, not a single field object (review
      // 2026-10-07) — the cast must admit that shape, even where (as for `caption`) it's then treated as absent.
      type MultipartField = { value?: unknown } | { value?: unknown }[] | undefined;
      const captionField = (data.fields as Record<string, MultipartField> | undefined)?.caption;
      const captionPlain = captionField && !Array.isArray(captionField) && typeof captionField.value === 'string' ? captionField.value : undefined;
      // ⭐ Story 6.26a (GI4) — what the photo shows (`site` default | `original_certificate`), read the same
      // position-independent way as the caption — but UNLIKE caption, this one gates a mandatory business
      // requirement (GI4's "≥1 original_certificate photo"), so a malformed/duplicate value is REJECTED, never
      // silently defaulted (review 2026-10-07).
      const kindField = (data.fields as Record<string, MultipartField> | undefined)?.photoKind;
      // A duplicate `photoKind` part arrives as an ARRAY, not a single field object (review 2026-10-07) — that
      // must be rejected too, same as an explicitly-unknown kind, ⛔ never silently fall back to the default.
      const kindRaw = kindField !== undefined && !Array.isArray(kindField) && typeof kindField.value === 'string' ? kindField.value : undefined;
      if (
        kindField !== undefined &&
        (kindRaw === undefined || !(schema.GROUND_INSPECTION_PHOTO_KINDS as readonly string[]).includes(kindRaw))
      ) {
        throw new BadRequestError('Unknown photo kind', 'ground_inspection.invalid_photo_kind', {
          allowed: schema.GROUND_INSPECTION_PHOTO_KINDS,
        });
      }
      const photoKind = (kindRaw ?? 'site') as schema.GroundInspectionPhotoKind;
      // ⭐ `2026-10-07-287` J1 — an original's photo carries the certificate token the inspector was SHOWN (the Compare
      // read's `certificateToken`); the writer stamps with it only while it is still current. Read position-independently
      // like the kind; a duplicate part is REJECTED (it decides which certificate the photo is evidence for).
      const tokenField = (data.fields as Record<string, MultipartField> | undefined)?.comparedCertificateToken;
      const comparedCertificateToken =
        tokenField !== undefined && !Array.isArray(tokenField) && typeof tokenField.value === 'string' ? tokenField.value : undefined;
      if (tokenField !== undefined && comparedCertificateToken === undefined) {
        throw new BadRequestError('Malformed compared-certificate token', 'ground_inspection.invalid_compared_certificate');
      }

      const captionCiphertext = await encryptOptionalGroundInspectionField(captionPlain, ctx.pariwarId, deps.encryption);

      // put-then-persist: store bytes first, then insert the row. Orphan-safe — a DB failure after a
      // successful put best-effort-deletes the object before rethrowing (AC3).
      const photoId = randomUUID();
      const storageObjectKey = `pariwar/${ctx.pariwarId}/claim/${assignment.claimCaseId}/inspection/${ground_inspection_id}/photo/${photoId}`;
      await deps.claimDocumentStorage.put(storageObjectKey, new Uint8Array(buffer), { contentType: data.mimetype });

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let photoRow;
      try {
        photoRow = await claim.addGroundInspectionPhoto(scopeTx.client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          groundInspectionId: ids.groundInspectionId(ground_inspection_id),
          actingActorId: ctx.actorId,
          override,
          storageObjectKey,
          contentType: data.mimetype,
          byteSize: buffer.byteLength,
          captionCiphertext,
          photoKind,
          comparedCertificateUploadId: comparedCertificateToken ?? null,
        });
        ok = true;
      } catch (err) {
        // Compensate the orphan object (best-effort) before surfacing the error (review #6). `delete`
        // is optional on the port (Decision D2) — LOG rather than silently swallow, so a failed or
        // impossible cleanup is observable instead of accumulating invisible orphaned blobs.
        if (typeof deps.claimDocumentStorage.delete === 'function') {
          await deps.claimDocumentStorage
            .delete(storageObjectKey)
            .catch((delErr: unknown) =>
              request.log.warn({ err: delErr, storageObjectKey }, 'ground-inspection photo orphan cleanup failed'),
            );
        } else {
          request.log.warn({ storageObjectKey }, 'ground-inspection photo orphaned: storage port has no delete()');
        }
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      emitAuthAudit(deps, request, 'admin_ground_inspection.photo_uploaded', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: {
          ground_inspection_id,
          district: assignment.district,
          // Story 6.17 (review fix) — the dimension the conduct gate actually checked for this row.
          block: assignment.block,
          photo_id: photoRow!.photoId,
          byte_size: buffer.byteLength,
          content_type: data.mimetype,
          photo_kind: photoKind,
          // `-287` J1 — the certificate an original's photo is evidence for (an id, ⛔ never PII; null on a site photo).
          certificate_token: photoRow!.certificateUploadId ?? null,
          ...(override ? { override_actor_id: override.byActorId } : {}),
        },
      });
      void reply.status(201);
      return { photoId: photoRow!.photoId, photoKind };
    },

    /** POST …/ground-inspection/:ground_inspection_id/complete — complete (AC4). */
    async complete(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const body = (request.body ?? {}) as CompleteBody;
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      requirePathClaim(request, assignment);
      const override = resolveInspectorOverride(request, ctx, assignment);

      const notesCiphertext =
        body.notes !== undefined
          ? await encryptOptionalGroundInspectionField(body.notes, ctx.pariwarId, deps.encryption)
          : undefined;

      // ⭐ Story 6.26a (GI5) — the HANDLER holds the plaintext date, so it encrypts it (Tier-1) and computes its blind
      // index under the ONE shared field class (the 6.21a "handler encrypts" pattern); the writer takes the
      // plaintext for VALIDATION only. The source follows the stage (a certificate check records the printed date).
      const deathDateSource: schema.GroundInspectionDeathDateSource =
        assignment.inspectionStage === 'certificate_check' ? 'original_certificate' : 'family_statement';
      const deathDate =
        body.deathDate != null
          ? {
              plaintext: body.deathDate,
              ciphertext: await encryptGroundInspectionField(body.deathDate, ctx.pariwarId, deps.encryption),
              index: await deathDateBlindIndex(body.deathDate, ctx.pariwarId, deps.encryption),
              source: deathDateSource,
            }
          : null;
      const deathTime =
        body.deathTime != null
          ? {
              plaintext: body.deathTime,
              ciphertext: await encryptGroundInspectionField(body.deathTime, ctx.pariwarId, deps.encryption),
            }
          : null;

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result;
      try {
        result = await claim.completeGroundInspection(scopeTx.client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          groundInspectionId: ids.groundInspectionId(ground_inspection_id),
          actingActorId: ctx.actorId,
          override,
          ...(body.structuredFindings !== undefined ? { structuredFindings: body.structuredFindings } : {}),
          ...(notesCiphertext !== undefined ? { notesCiphertext } : {}),
          originalCertificateVerdict: body.originalCertificateVerdict ?? null,
          comparedCertificateUploadId: body.comparedCertificateToken ?? null,
          deathDate,
          deathTime,
        });
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      emitAuthAudit(deps, request, 'admin_ground_inspection.completed', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: {
          ground_inspection_id,
          district: assignment.district,
          // Story 6.17 (review fix) — the dimension the conduct gate actually checked for this row.
          block: assignment.block,
          photo_count: result!.photoCount,
          // ⭐ Story 6.26a (GI14) — codes and counts only: ⛔ never a date, a time, a note or a name.
          photo_kind_counts: {
            site: result!.photoCount - result!.originalCertificatePhotoCount,
            original_certificate: result!.originalCertificatePhotoCount,
            // `-286` H1 / `-287` J1 — of those, the ones of the COMPARED certificate (the ones GI4 counts).
            original_certificate_for_compared: result!.originalCertificatePhotoForComparedCount,
          },
          original_certificate_verdict: result!.groundInspection.originalCertificateVerdict,
          death_date_source: result!.groundInspection.deathDateSource,
          ...(override ? { override_actor_id: override.byActorId } : {}),
        },
      });
      // ⭐ Story 6.27d (AC3 – AC5; R1, R4) — AFTER the completion's transaction closed: deliver the in-tx result, ⛔ on
      // `request.scopeTx` (it commits in `onSend`). `null` ⇔ ⛔ a family account (R1).
      const discrepancy: InspectionDiscrepancyDto =
        result!.discrepancy === null
          ? null
          : await deliverInspectionDiscrepancy(request, ctx, assignment, result!.discrepancy.questionKeys, body.deathDate ?? null, override);

      void reply.status(200);
      return {
        groundInspectionId: ground_inspection_id,
        status: result!.groundInspection.status,
        photoCount: result!.photoCount,
        discrepancy,
      };
    },

    /**
     * GET …/ground-inspection/:ground_inspection_id/discrepancy — ⭐ Story 6.27d (AC5; R3, R4, R4a) — the inspector's
     * RE-READ (the recovery path: a retried completion is 409 `not_active`). Order: the identity guard (the assigned
     * inspector, or an override holder — the route's conduct gate first) → 404 `ground_inspection.not_found` for ANY
     * assignment that is ⛔ a completed FULL visit (`family_statement` — R1; ONE neutral code, ⛔ reaching the
     * recompute) → the HIDDEN check (the ONE predicate; an error FAILS CLOSED) ⇒ the withheld shape with ⛔ notes → the
     * RECORDED showing, else recomputed as of `completed_at` and recorded, + ALL the assignment's notes with their author.
     * Its OWN transaction, closed BEFORE any decrypt (⛔ KMS while the showing's index entry is locked — Trap 9). ⛔ No
     * audit line for the result itself: the showing row is the record of when it was first recorded — but a decrypt of the
     * family's cause / illness is audited (`displayFamilyAnswers`, second review S3).
     */
    async discrepancy(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      requirePathClaim(request, assignment);
      const override = resolveInspectorOverride(request, ctx, assignment);
      const pid = ids.pariwarId(ctx.pariwarId);
      const gid = ids.groundInspectionId(ground_inspection_id);

      type Read =
        | { readonly kind: 'withheld'; readonly reason: NoteWithheldReason }
        | {
            readonly kind: 'shown';
            readonly showing: claim.InspectionDiscrepancyShowing;
            readonly target: claim.InspectionDiscrepancyTarget;
            readonly notes: claim.InspectionDiscrepancyNoteRow[];
          };
      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let read: Read;
      try {
        const target = await claim.readInspectionDiscrepancyTarget(scopeTx.tx, pid, gid);
        let hidden: boolean | null;
        try {
          hidden = await claim.isActorOwnVisitPending(scopeTx.tx, pid, target.claimCaseId, ctx.actorId);
        } catch (err) {
          request.log.warn({ err: err instanceof Error ? err.name : 'unknown', ground_inspection_id }, 'discrepancy re-read: the hide check failed; withheld');
          hidden = null;
        }
        if (hidden !== false) {
          read = { kind: 'withheld', reason: hidden === null ? 'check_failed' : 'own_visit' };
        } else {
          const showing = await claim.readOrRecomputeInspectionDiscrepancy(scopeTx.tx, pid, gid);
          const notes = await claim.readInspectionDiscrepancyNotes(scopeTx.tx, pid, gid);
          read = { kind: 'shown', showing, target, notes };
          ok = true;
        }
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      if (read!.kind === 'withheld') {
        void reply.status(200);
        return { discrepancy: { state: 'withheld', reason: read!.reason }, notes: [] };
      }
      const { showing, target, notes } = read!;
      const familyDeathDate = showing.questionKeys.includes('death_date')
        ? await displayFamilyDeathDate(request, ctx, target.deathDateCiphertext, ground_inspection_id)
        : null;
      const noteDtos: InspectionDiscrepancyNoteDto[] = [];
      for (const n of notes) noteDtos.push(await noteDtoOf(request, ctx, n));
      const familyAnswers = await displayFamilyAnswers(request, ctx, ground_inspection_id, showing.questionKeys, {
        claimCaseId: assignment.claimCaseId,
        path: 're_read',
        override,
      });
      void reply.status(200);
      return {
        discrepancy: { state: 'shown', questionKeys: showing.questionKeys, familyDeathDate, familyAnswers },
        notes: noteDtos,
      };
    },

    /**
     * POST …/ground-inspection/:ground_inspection_id/discrepancy-notes — ⭐ Story 6.27d (AC6; R4, R4a, R6) — the family's
     * re-told answer to ONE differing question. The identity guard → the author's stored display name (a missing one
     * refuses: 409 `admin.display_name_missing`) → the note encrypted (Tier-1, `ground_inspection` — BEFORE the
     * transaction, Trap 9) → the writer's six steps in ONE transaction (404 → the window `not_allowed` → the HIDDEN
     * refusal `own_ground_visit_pending`, ⛔ `details`, BEFORE any showing check → `discrepancy_not_shown` →
     * `discrepancy_note_exists`). 201 `{ questionKey, notedAt, authorActorId, authorDisplay }` (⛔ the note text). Audited
     * post-commit with codes only.
     */
    async recordDiscrepancyNote(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const body = request.body as DiscrepancyNoteBody;
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      // ⭐ Patch review (S2) — since 0189 a note may carry the family's re-told cause / illness (Tier-1): bound to the path's claim.
      requirePathClaim(request, assignment);
      const override = resolveInspectorOverride(request, ctx, assignment);
      const authorDisplay = await getDisplayName(deps.pool, ctx.actorId);
      if (authorDisplay === null) throw new AdminDisplayNameMissingError(ctx.actorId);
      const noteCiphertext = await encryptGroundInspectionField(body.note, ctx.pariwarId, deps.encryption);

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let written: Awaited<ReturnType<typeof claim.recordInspectionDiscrepancyNote>>;
      try {
        written = await claim.recordInspectionDiscrepancyNote(scopeTx.client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          groundInspectionId: ids.groundInspectionId(ground_inspection_id),
          actingActorId: ctx.actorId,
          ...(override ? { override } : {}),
          questionKey: body.questionKey,
          noteCiphertext,
          authorDisplay,
        });
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      emitAuthAudit(deps, request, 'admin_ground_inspection.discrepancy_note_recorded', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: {
          claim_case_id: assignment.claimCaseId,
          ground_inspection_id,
          // Codes only — ⛔ never the note.
          question_key: body.questionKey,
          ...(override ? { override_actor_id: override.byActorId } : {}),
        },
      });
      void reply.status(201);
      return {
        questionKey: written!.questionKey,
        notedAt: written!.notedAt.toISOString(),
        authorActorId: written!.authorActorId,
        authorDisplay: written!.authorDisplay,
      };
    },

    /**
     * GET …/ground-inspection/:ground_inspection_id/certificate — ⭐ Story 6.26a (GI4; `-263` FQ11 A). The inspector is
     * SHOWN the claim's CURRENT uploaded death certificate to compare with the original they hold: its token (the
     * upload id they echo back as `comparedCertificateToken`), content type and a short-lived signed URL. Gated by the
     * row's conduct dimension (the route) PLUS the D6 inspector guard: the assigned inspector, or a
     * `claim.override_ground_inspection` holder — anyone else holding the conduct key gets 403. ⭐ This lets a
     * `block_admin` inspector see a claim's uploaded certificate image — confined to an assignment they HOLD: a
     * `scheduled` one (409 `ground_inspection.not_active` otherwise — a superseded, completed or refused assignment
     * ⛔ never re-opens the copy, second code review 2026-10-07) on a claim in the inspection window (409
     * `ground_inspection.not_allowed` — the one predicate every writer uses; outside it nothing could be recorded
     * against the copy anyway). ⛔ No current upload ⇒ 409 `ground_inspection.no_current_certificate` (⛔ never a
     * 500, ⛔ never a 404 hiding the assignment). Audited `admin_ground_inspection.certificate_viewed` — ids only.
     */
    /**
     * GET …/ground-inspection/:ground_inspection_id/questionnaire — ⭐ Story 6.32 (IQ9 / IQ10 / IQ12; AC3, AC7) — the served
     * definition of the visit's PINNED version (else the LIVE one), its words in en AND hi (`toWireQuestionnaire` — the ONE
     * resolver), whether the visit is still open, and the inspector's own live answers. Order: the identity guard (the assigned
     * inspector, or an override holder — the denial audited) → 404 `ground_inspection.questionnaire_unavailable` for a
     * certificate check, ⛔ version, or a closed visit with ⛔ header (⇔ ⛔ panel) → ONE read transaction (it also resolves the
     * member's name for `{member}` — the shared `resolvePeerRequestMemberName`, a decrypt INSIDE it; ⛔ a row lock is held) →
     * the answers' decrypt AFTER it closed. Audited post-read with counts only (⛔ a value). ⛔ It reads ⛔ neighbour data (I2: the questions are identical
     * whatever the neighbours said, and whether any were asked).
     */
    async questionnaire(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      requirePathClaim(request, assignment);
      const override = resolveInspectorOverride(request, ctx, assignment);
      if (assignment.inspectionStage === 'certificate_check') {
        throw new NotFoundError('There is no questionnaire for this visit', GROUND_INSPECTION_QUESTIONNAIRE_UNAVAILABLE_CODE);
      }
      const pid = ids.pariwarId(ctx.pariwarId);
      const gid = ids.groundInspectionId(ground_inspection_id);
      const open = assignment.status === 'scheduled';

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let read: { def: questionnaires.QuestionnaireDefinition; rows: Awaited<ReturnType<typeof claim.readLiveGroundInspectionAnswers>>; memberName: string };
      try {
        const header = await claim.readGroundInspectionQuestionnaireHeader(scopeTx.tx, pid, gid);
        // Story 6.33 (R5) — the database-aware reader, on this transaction (a pin failing validation is still SHOWN — R7 (v)).
        const version = await claim.groundInspectionVersionFor(scopeTx.tx, header?.questionnaireVersionId ?? null, pid);
        if (version === null || (header === null && !open)) throw new claim.GroundInspectionQuestionnaireUnavailableError();
        const def = version.def;
        const rows = header === null ? [] : await claim.readLiveGroundInspectionAnswers(scopeTx.tx, pid, gid);
        const claimRow = await claim.getClaimCase(scopeTx.tx, pid, assignment.claimCaseId);
        const memberName = claimRow
          ? await resolvePeerRequestMemberName(scopeTx.tx, ctx.pariwarId, claimRow.deceasedMemberId, deps.encryption, request.log)
          : '';
        read = { def, rows, memberName };
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      const answers = await liveAnswerDtos(request, ctx, read!.rows);
      emitAuthAudit(deps, request, 'admin_ground_inspection.questionnaire_read', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        resourceLocator: `claim:${assignment.claimCaseId.toLowerCase()}`,
        context: {
          ground_inspection_id,
          claim_case_id: assignment.claimCaseId,
          questionnaire_version_id: read!.def.versionId,
          // Counts only — ⛔ a code, ⛔ a value.
          answer_count: answers.length,
          sensitive_answer_count: read!.rows.filter((r) => r.valueCiphertext !== null).length,
          ...(override ? { override_actor_id: override.byActorId } : {}),
        },
      });
      const body: GroundInspectionQuestionnaireResponse = {
        groundInspectionId: ground_inspection_id,
        questionnaire: toWireQuestionnaire(read!.def, read!.memberName, {
          log: request.log,
          ids: { pariwarId: ctx.pariwarId, groundInspectionId: ground_inspection_id },
        }),
        open,
        answers,
      };
      void reply.status(200);
      return body;
    },

    /**
     * PUT …/ground-inspection/:ground_inspection_id/questionnaire/answers/:questionKey — ⭐ Story 6.32 (IQ4 / IQ10; AC3, AC5) —
     * save ONE answer. Order: the identity guard → a PRE-LOCK read transaction (the pinned version, the live answers) → the
     * decrypt of the live sensitive answers (the illness's `showIf` parent is the cause — a ciphertext) → the pre-check (the
     * storage form; a condition we could ⛔ evaluate because THIS question's parent would ⛔ decrypt is STALE, ⛔ a 422) → the
     * ciphertext and the keyed code indexes (`answerCodeIndexes` — the ONE helper the neighbours' writer uses) → the WRITE
     * transaction (`saveGroundInspectionAnswer`: assignment → claim, re-validated under the locks) → the audit line, post-commit,
     * ONLY when something was written (key, counts — ⛔ a value). Last write wins (⛔ Idempotency-Key). ⛔ Step-up (G11).
     */
    async saveQuestionnaireAnswer(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id, questionKey } = request.params as { ground_inspection_id: string; questionKey: string };
      const body = request.body as QuestionnaireAnswerBody;
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      requirePathClaim(request, assignment);
      const override = resolveInspectorOverride(request, ctx, assignment);
      const pid = ids.pariwarId(ctx.pariwarId);
      const gid = ids.groundInspectionId(ground_inspection_id);
      const todayIst = cycleCalendar.istDateOf(new Date());
      // ⭐ Second review S13 — IQ10's order: a visit that is ⛔ open is refused (409) BEFORE the 422 pre-check and BEFORE any key
      // work (an index is an audited HMAC per code). The stashed row is the preHandler's read — the writer re-checks under the lock.
      if (assignment.inspectionStage === 'certificate_check') translateGroundInspectionError(new claim.GroundInspectionQuestionnaireCertificateCheckError(ground_inspection_id));
      if (assignment.status !== 'scheduled') translateGroundInspectionError(new claim.GroundInspectionNotActiveError(ground_inspection_id, assignment.status));

      // (1) the pre-lock read
      const pre = await openScopeTx(deps, ctx.pariwarId);
      let preOk = false;
      let header: Awaited<ReturnType<typeof claim.readGroundInspectionQuestionnaireHeader>> = null;
      let rows: Awaited<ReturnType<typeof claim.readLiveGroundInspectionAnswers>> = [];
      let version: claim.GroundInspectionVersion | null = null;
      try {
        header = await claim.readGroundInspectionQuestionnaireHeader(pre.tx, pid, gid);
        rows = await claim.readLiveGroundInspectionAnswers(pre.tx, pid, gid);
        // ⭐ Story 6.33 (R5) — the version resolved INSIDE `pre` (the database-aware reader needs a transaction).
        version = await claim.groundInspectionVersionFor(pre.tx, header?.questionnaireVersionId ?? null, pid);
        preOk = true;
      } catch (err) {
        // Review RV6 — an unreadable pin throws here: the 409 `…version_unreadable`, ⛔ a 500.
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(pre, preOk);
      }
      if (version === null) translateGroundInspectionError(new claim.GroundInspectionQuestionnaireUnavailableError());
      // ⭐ Story 6.33 (R7) — a panel that rendered another version RELOADS before its value is checked against this one; an
      // unwritable pin is refused. The writer repeats the compare under its locks, FIRST.
      if (body.questionnaireVersionId !== undefined && body.questionnaireVersionId !== version!.def.versionId) {
        translateGroundInspectionError(new claim.GroundInspectionQuestionnaireVersionStaleError());
      }
      if (!version!.writable) translateGroundInspectionError(new claim.GroundInspectionQuestionnaireVersionUnreadableError());
      const def = version!.def;

      // (2) the live sensitive answers, decrypted OUTSIDE any transaction. One that will ⛔ decrypt (erased, malformed,
      //     undecryptable) is KNOWN UNREADABLE — its value is `null`, ⛔ stale (review R2): the letter, or a replacement of
      //     that very answer, still saves; a question it is the `showIf` parent of stays refused (fail-closed, below).
      //     Each is kept WITH the ciphertext read (second review S10): the writer refuses as stale a row rewritten since.
      const decryptedLive = new Map<string, claim.DecryptedLiveAnswer>();
      const unreadableLive = new Map<string, string>();
      for (const row of rows) {
        if (row.valueCiphertext === null) continue;
        let codes: string[] | null = null;
        try {
          codes = codesOfDecrypted(await decryptGroundInspectionField(row.valueCiphertext, ctx.pariwarId, deps.encryption));
        } catch (err) {
          request.log.warn({ err: err instanceof Error ? err.name : 'unknown', ground_inspection_id }, 'questionnaire save: a live answer could not be decrypted');
        }
        if (codes === null) unreadableLive.set(row.answerId, row.valueCiphertext);
        else decryptedLive.set(row.answerId, { ciphertext: row.valueCiphertext, codes });
      }
      const live = new Map<string, readonly string[] | null>();
      for (const row of rows) live.set(row.questionKey, row.valueCodes ?? decryptedLive.get(row.answerId)?.codes ?? null);

      // (3) the pre-check — to learn the storage form (the writer re-does it under its locks)
      const served = questionnaires.servedDefinition(def);
      const check = questionnaires.checkAnswer(served, questionKey, { codes: body.codes }, live, todayIst);
      if (!check.ok) {
        const parentKey = questionnaires.questionsOf(served).find((q) => q.key === questionKey)?.showIf?.key ?? null;
        const parentRow = parentKey === null ? undefined : rows.find((r) => r.questionKey === parentKey);
        const parentUnreadable = parentRow !== undefined && unreadableLive.has(parentRow.answerId);
        translateGroundInspectionError(
          check.reason === 'condition_not_met' && parentUnreadable
            ? new claim.GroundInspectionQuestionnaireStaleError()
            : new claim.GroundInspectionQuestionnaireInvalidAnswerError(check.reason),
        );
      }
      const normalized = check.codes ?? [];

      // (4) the ciphertext and the keyed code indexes — BEFORE the write transaction (TR2)
      const prepared: claim.PreparedGroundInspectionAnswer =
        check.storage.form === 'codes'
          ? { form: 'codes', codes: check.storage.codes }
          : {
              form: 'encrypted',
              ciphertext: await encryptGroundInspectionField(check.storage.plaintext, ctx.pariwarId, deps.encryption),
              codeIndexes: await answerCodeIndexes(assignment.claimCaseId, questionKey, normalized, ctx.pariwarId, deps.encryption),
            };

      // (5) the write
      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result: claim.SaveGroundInspectionAnswerResult;
      try {
        result = await claim.saveGroundInspectionAnswer(scopeTx.client, {
          pariwarId: pid,
          groundInspectionId: gid,
          actingActorId: ctx.actorId,
          ...(override ? { override } : {}),
          questionKey,
          codes: body.codes,
          prepared,
          decryptedLive,
          unreadableLive,
          todayIst,
          preReadVersionId: def.versionId,
          ...(body.questionnaireVersionId !== undefined ? { clientVersionId: body.questionnaireVersionId } : {}),
        });
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // (6) the audit line — post-commit, ONLY for a write (an unchanged value is a no-op — the neighbours' S20 precedent)
      if (result!.written) {
        emitAuthAudit(deps, request, 'admin_ground_inspection.questionnaire_answer_saved', {
          actorId: ctx.actorId,
          pariwarId: ctx.pariwarId,
          resourceLocator: `claim:${assignment.claimCaseId.toLowerCase()}`,
          context: {
            ground_inspection_id,
            claim_case_id: assignment.claimCaseId,
            question_key: questionKey,
            questionnaire_version_id: result!.questionnaireVersionId,
            // Counts only — ⛔ a code, ⛔ a value.
            code_count: normalized.length,
            superseded_dependant_count: result!.supersededDependants.length,
            ...(override ? { override_actor_id: override.byActorId } : {}),
          },
        });
      }
      const out: GroundInspectionSaveAnswerResponse = {
        questionKey,
        written: result!.written,
        supersededDependants: [...result!.supersededDependants],
        questionnaireVersionId: result!.questionnaireVersionId,
      };
      void reply.status(200);
      return out;
    },

    async certificate(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      const override = resolveInspectorOverride(request, ctx, assignment);
      const tx = request.scopeTx!.tx;
      const pid = ids.pariwarId(ctx.pariwarId);

      // GI4 — "confined to an assignment they hold": ⛔ a terminal assignment, ⛔ a claim outside the window.
      if (assignment.status !== 'scheduled') {
        throw new ConflictError('The ground-inspection assignment is not active', 'ground_inspection.not_active', {
          status: assignment.status,
        });
      }
      const claimRow = await claim.getClaimCase(tx, pid, assignment.claimCaseId);
      if (!claimRow) throw new NotFoundError('Claim not found', 'claim.not_found');
      if (!(await claim.isClaimInGroundInspectionWindow(tx, pid, assignment.claimCaseId, claimRow.currentState))) {
        throw new ConflictError(
          'Ground inspection is not allowed for the claim in its current state',
          'ground_inspection.not_allowed',
          { state: claimRow.currentState },
        );
      }

      const snapshot = await claim.readDeathCertificateSnapshot(tx, pid, assignment.claimCaseId);
      if (snapshot.currentUploadId === null) {
        translateGroundInspectionError(new claim.GroundInspectionNoCurrentCertificateError(assignment.claimCaseId));
      }
      const upload = await claim.getDeathCertificateUpload(tx, pid, assignment.claimCaseId, snapshot.currentUploadId);
      if (!upload) {
        translateGroundInspectionError(new claim.GroundInspectionNoCurrentCertificateError(assignment.claimCaseId));
      }
      const signedUrl = await deps.claimDocumentStorage.signedReadUrl(
        upload.storageObjectKey,
        CERTIFICATE_SIGNED_URL_TTL_SECONDS,
      );

      emitAuthAudit(deps, request, 'admin_ground_inspection.certificate_viewed', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: {
          claim_case_id: assignment.claimCaseId,
          ground_inspection_id,
          certificate_token: upload.uploadId,
          ...(override ? { override_actor_id: override.byActorId } : {}),
        },
      });
      void reply.status(200);
      return {
        certificateToken: upload.uploadId,
        contentType: upload.contentType,
        signedUrl,
        expiresInSeconds: CERTIFICATE_SIGNED_URL_TTL_SECONDS,
      };
    },

    /** POST …/ground-inspection/:ground_inspection_id/refusal — refusal disposition (AC4a). */
    async refuse(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const body = request.body as RefusalBody;
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      const override = resolveInspectorOverride(request, ctx, assignment);

      // The mandatory reason note is PII — encrypt before insert (non-empty enforced in the writer).
      const notesCiphertext = await encryptGroundInspectionField(body.reasonNote, ctx.pariwarId, deps.encryption);

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result;
      try {
        result = await claim.recordGroundInspectionRefusal(scopeTx.client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          groundInspectionId: ids.groundInspectionId(ground_inspection_id),
          actingActorId: ctx.actorId,
          override,
          disposition: body.disposition,
          refusalReason: body.refusalReason,
          notesCiphertext,
        });
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      emitAuthAudit(deps, request, 'admin_ground_inspection.refused', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: {
          ground_inspection_id,
          district: assignment.district,
          // Story 6.17 (review fix) — the dimension the conduct gate actually checked for this row.
          block: assignment.block,
          disposition: body.disposition,
          refusal_reason: body.refusalReason,
          ...(override ? { override_actor_id: override.byActorId } : {}),
        },
      });
      void reply.status(200);
      return { groundInspectionId: ground_inspection_id, status: result!.status };
    },

    /**
     * GET …/ground-inspection?district=… | ?block=… — read the claim's assignments under ONE
     * locator (AC5; Story 6.17 D4 added the block arm, with EXACTLY-ONE-OF enforced by the zod
     * schema, so this handler never has to pick a precedence).
     *
     * ⛔ (review fix, code review 2026-08-13) The preHandler gate (`conductFromQuery`) only checks
     * the QUERY's own dimension ONCE, at the request level — it does NOT re-run per row. A `?district=`
     * query matches every row carrying that district string, block-tagged or not, because `district`
     * stays populated on block rows too (D1). Left alone, that made a plain district-dimension grant
     * return block-tagged rows (with decrypted Tier-1 PII) that D2 says are authorized at
     * `dimension:'block'` — reachable only via block-grant exact match or district→block ancestry
     * through a published tree. That is exactly the "absence widens" shape D6 forbids, just on the
     * read path instead of the fallback hook everyone was watching. So EACH row is re-checked here at
     * ITS OWN dimension (`blockAware`'s rule, applied per row) before being included — a district
     * query no longer implies district-dimension authorization for a block-tagged row.
     *
     * A claim may hold assignments across districts/blocks (the unified multi-jurisdiction console
     * view is 6.10's, which calls the accessor server-side). Decrypts PII + mints short-lived signed
     * URLs (never bytes). No assignment under the locator (or none visible to this actor) → `[]` (the
     * absence-is-a-signal read).
     */
    async read(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const { district, block } = request.query as { district?: string; block?: string };
      const scopeTx = request.scopeTx!;

      const all = await claim.getClaimGroundInspection(
        scopeTx.tx,
        ids.pariwarId(ctx.pariwarId),
        ids.claimId(claimCaseId),
      );
      // Exactly one of the two is defined (the zod `.refine`), so this is a total choice, not a
      // precedence rule. A block query matches only block-TAGGED rows; a district query matches
      // every row in the district, block-tagged or not — the district IS still populated on both.
      const locatorMatch =
        block !== undefined
          ? all.filter((r) => r.inspection.block === block)
          : all.filter((r) => r.inspection.district === district);
      // Per-row re-check at the row's OWN dimension (see the doc comment above). `hasPermission` is
      // the pure, non-throwing predicate — no `authz.denied` audit fires for a row silently narrowed
      // out of a list; that is visibility filtering, not a denied action attempt.
      const grants = request.scopeGrants ?? [];
      const resolver = geoTreeResolverForRequest(request);
      const inScope = locatorMatch.filter((r) =>
        rbac.hasPermission(
          grants,
          CONDUCT_KEY,
          {
            dimension: r.inspection.block != null ? 'block' : 'district',
            value: r.inspection.block ?? r.inspection.district,
            pariwarId: ctx.pariwarId,
          },
          { resolver },
        ),
      );

      // ⭐ Story 6.27b code review round 2 (X6 — AC7's X1 A; X2; Y8; Y3) — the visit NOTE and each photo CAPTION are staff
      // free text on this claim: WITHHELD from a reader whose own ground visit here is pending unless they are its RECORDED
      // author (migration 0159 — `notes_author_actor_id`, `uploaded_by_actor_id`; `isSameActorId`); a pre-0159 row (⛔
      // author) stays withheld (fail CLOSED). The scheduler's BRIEFING is the scheduler's, so it stays withheld from the
      // inspector (Y2 A, ⛔ built until the Panel rules). Y3 — the flag is set on EVERY row / photo of a hidden reader whose
      // author they are ⛔, note or ⛔ note, so presence ⛔ signals. Location, family contact, dates and outcomes stay.
      // ⛔ Never decrypted. ONE statement (only when a row is shown); a failed read withholds (`check_failed`).
      const notesReason = withheldReasonOn(
        await readClaimsHiddenFromReader(scopeTx.client, scopeTx.tx, ctx.pariwarId, inScope.length > 0 ? [claimCaseId] : [], ctx.actorId, {
          label: 'ground_inspection_own_visit_pending',
          log: request.log,
        }),
        claimCaseId,
      );
      const assignments = await Promise.all(
        inScope.map(async (r) => {
          const notesWithheld = withheldUnlessAuthor(notesReason, r.inspection.notesAuthorActorId, ctx.actorId);
          // (review #4) Per-field fail-soft: a single corrupt/rotated/wrong-context envelope must
          // yield `null` for THAT field, not reject the whole read (which would blind the verifier
          // to every healthy assignment in the district — the opposite of the absence-is-a-signal
          // read). Log the failure so the corruption is observable.
          const decrypt = async (ct: string | null) => {
            if (ct == null) return null;
            try {
              return await decryptGroundInspectionField(ct, ctx.pariwarId, deps.encryption);
            } catch (decErr) {
              request.log.warn(
                { err: decErr, groundInspectionId: r.inspection.groundInspectionId },
                'ground-inspection field decrypt failed; returning null',
              );
              return null;
            }
          };
          const photos = await Promise.all(
            r.photos.map(async (p) => ({
              photoId: p.photoId,
              contentType: p.contentType,
              byteSize: p.byteSize,
              // Story 6.26a (GI4) — `site` | `original_certificate` (labelled apart on the page).
              photoKind: p.photoKind,
              // `2026-10-07-286` H1 — the certificate an original's photo was taken for (the token the Compare read
              // returns), so the page can tell the inspector a photo of a REPLACED certificate's original ⛔ counts
              // for nothing. NULL on a site photo. Non-PII.
              certificateToken: p.certificateUploadId ?? null,
              caption: withheldUnlessAuthor(notesReason, p.uploadedByActorId, ctx.actorId) !== null ? null : await decrypt(p.captionCiphertext),
              captionWithheld: withheldUnlessAuthor(notesReason, p.uploadedByActorId, ctx.actorId),
              signedUrl: await deps.claimDocumentStorage.signedReadUrl(p.storageObjectKey, PHOTO_SIGNED_URL_TTL_SECONDS),
            })),
          );
          return {
            groundInspectionId: r.inspection.groundInspectionId,
            district: r.inspection.district,
            block: r.inspection.block,
            inspectionStage: r.inspection.inspectionStage,
            inspectionSiteType: r.inspection.inspectionSiteType,
            inspectorActorId: r.inspection.inspectorActorId,
            scheduledAt: r.inspection.scheduledAt,
            status: r.inspection.status,
            refusalReason: r.inspection.refusalReason,
            supersedesGroundInspectionId: r.inspection.supersedesGroundInspectionId,
            completedAt: r.inspection.completedAt,
            structuredFindings: r.inspection.structuredFindings,
            locationDetail: await decrypt(r.inspection.locationCiphertext),
            familyContact: await decrypt(r.inspection.familyContactCiphertext),
            notes: notesWithheld !== null ? null : await decrypt(r.inspection.notesCiphertext),
            notesWithheld,
            // ⭐ Story 6.26a (GI4 / GI5) — the inspector's record: the verdict, the upload it was compared with, and the
            // date (+ the family's time) of death, decrypted here exactly as the notes are.
            originalCertificateVerdict: r.inspection.originalCertificateVerdict,
            comparedCertificateToken: r.inspection.comparedCertificateUploadId,
            deathDateSource: r.inspection.deathDateSource,
            deathDate: await decrypt(r.inspection.deathDateCiphertext),
            deathTime: await decrypt(r.inspection.deathTimeCiphertext),
            photos,
          };
        }),
      );

      // ⭐ Story 6.28 (`2026-10-11-319` OP14 (d)) — the OTHER claims of this death (count + each by REFERENCE and stage —
      // ⛔ no name, ⛔ no note, ⛔ no date) and whether one was already VISITED (with this claim's date of death). ONLY
      // when the caller holds an in-scope assignment of THIS claim — ⛔ never derived from the query locator alone (a
      // `block_admin` can name any claim id: the "absence widens" shape above forbids it). Information only — ⛔ no gate.
      // The other claims' rows may lie outside the caller's scope: booleans and references only (accepted, recorded).
      let otherClaimsForDeath: {
        count: number;
        claims: { reference: string; stage: string }[];
        visitedElsewhere: boolean;
        alreadyVisited: boolean;
      } | null = null;
      if (inScope.length > 0) {
        const pid = ids.pariwarId(ctx.pariwarId);
        const cid = ids.claimId(claimCaseId);
        // Information only (⛔ no gate) — a failed read degrades to `null` rather than 500ing the whole, already
        // decrypted detail view; the two reads are independent, run concurrently — under ONE SAVEPOINT (code review
        // round 3), so a swallowed SQL error ⛔ never leaves the request tx aborted.
        const otherClaims = await underSavepoint(scopeTx.client, 'ground_inspection_other_claims', () =>
          Promise.all([claim.readOtherClaimsForDeath(scopeTx.tx, pid, cid), claim.readOtherClaimVisits(scopeTx.tx, pid, cid)]),
        ).catch((err: unknown) => {
          request.log.warn({ err: err instanceof Error ? err.name : 'unknown' }, 'ground inspection: other-claims-for-death read unavailable');
          return null;
        });
        if (otherClaims !== null) {
          const [others, visits] = otherClaims;
          otherClaimsForDeath = {
            count: others.total,
            claims: others.claims.map((c) => ({ reference: claim.claimShortReference(c.claimCaseId), stage: c.stage })),
            visitedElsewhere: visits.visitedElsewhere,
            alreadyVisited: visits.alreadyVisited,
          };
        }
      }

      void reply.status(200);
      return { assignments, otherClaimsForDeath };
    },
  };
}

// ── Request body shapes (the routes validate these via Zod; these mirror the parsed types) ──

interface ScheduleBody {
  district: string;
  /** Story 6.17 — optional block-level jurisdiction; present ⇒ the row is gated at `dimension: 'block'`. */
  block?: string;
  inspectionStage: schema.ClaimGroundInspectionRow['inspectionStage'];
  inspectionSiteType: schema.ClaimGroundInspectionRow['inspectionSiteType'];
  inspectorActorId: string;
  scheduledAt: string;
  locationDetail?: string | null;
  familyContact?: string | null;
  notes?: string | null;
  structuredFindings?: unknown;
}

interface FindingsBody {
  structuredFindings?: unknown;
  notes?: string | null;
}

interface CompleteBody {
  structuredFindings?: unknown;
  notes?: string | null;
  /** Story 6.26a (GI4 / GI5) — the original-certificate record and the date / time of death. */
  originalCertificateVerdict?: schema.GroundInspectionCertificateVerdict | null;
  comparedCertificateToken?: string | null;
  deathDate?: string | null;
  deathTime?: string | null;
}

interface RefusalBody {
  disposition: 'photo_refused' | 'evidence_unavailable';
  refusalReason: schema.ClaimGroundInspectionRow['refusalReason'] & string;
  reasonNote: string;
}
