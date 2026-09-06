// error-mapping middleware (AC-5, Task 1.4).
//
// The single transport-error boundary: every thrown error becomes a typed JSON
// `ErrorResponse` envelope (`_common/errors.ts`) carrying the request correlation
// id. Mapping order:
//   1. Zod validation failures (fastify-type-provider-zod) → 400 `request.validation`.
//   2. `ApiError` (this surface's own errors) → its statusCode/code/details.
//   3. `AuthorizationDeniedError` (RBAC second guard) → 403 via its own projector.
//   3a. `ToneReviewRequiredError` (tone-review publish gate, Story 2.2) → 409 via projector.
//   4. Known domain errors (scope invalid/missing, branded-id invalid) → mapped 4xx/5xx.
//   5. Anything else → 500 `internal.error` with NO internal detail leaked.
//
// The 500 path never exposes `err.message`/stack — it logs server-side (with the
// traceId) and returns an opaque envelope, per architecture §3.2 "uncaught → 500,
// no internal leak".

import { KycProviderError } from '@twt/contracts';
import {
  AuthorizationDeniedError,
  BannerBilingualRequiredError,
  BannerNotFoundError,
  BannerPopupMustBeDismissibleError,
  BannerStateError,
  BannerWindowInvalidError,
  SurveyAlreadyRespondedError,
  SurveyAnswerInvalidError,
  SurveyAudienceUnsupportedError,
  SurveyAudienceValueRequiredError,
  SurveyBilingualRequiredError,
  SurveyFrozenFieldError,
  SurveyNotFoundError,
  SurveyQuestionnaireInvalidError,
  SurveyStateError,
  SurveyWindowInvalidError,
  ClaimStateDirectWriteError,
  ClauseIdConflictError,
  ClauseNotFoundError,
  ClausePayloadPiiError,
  DraftNotFoundError,
  DraftSelfReviewError,
  DraftStateError,
  DriveTargetEffectiveFromSkewError,
  DriveTargetInvalidError,
  DriveTargetVersionConflictError,
  DriveTargetVisibilityInvalidError,
  UngovernedDriveTargetChangeError,
  InvalidPariwarScopeError,
  ModerationActionNotFoundError,
  ModerationDwellNotElapsedError,
  ModerationDwellPolicyUnprovisionedError,
  ModerationGroundAlreadySupersededError,
  ModerationAppealNotAppealableError,
  ModerationAppealAlreadyOpenError,
  ModerationAppealAlreadyDecidedError,
  ModerationAppealAdjudicatorExcludedError,
  ModerationAppealNotFoundError,
  ModerationGroundNotFoundError,
  ModerationPrimaryGroundImmutableError,
  ModerationEscalationNotApplicableError,
  ModerationEscalationRequiredError,
  ModerationEscalationRestatementError,
  ModerationEvidenceRefInvalidError,
  ModerationRationaleRequiredError,
  ModerationReasonCodeInvalidError,
  ModerationStateError,
  NewsPostAuthorReviewerError,
  NewsPostBilingualRequiredError,
  NewsPostNotFoundError,
  NewsPostScheduleInPastError,
  NewsPostStateError,
  PariwarScopeMissingError,
  TcPinnedClauseNotFoundError,
  TcStateError,
  TcVersionConflictError,
  TcVersionNotFoundError,
  TelegramOptInNotFoundError,
  TelegramOptInPendingExistsError,
  TelegramOptInStateError,
  ToneReviewRequiredError,
  WaOptInNotFoundError,
  WaOptInPendingExistsError,
  WaOptInStateError,
  ids,
  member as memberDomain,
  type ErrorResponseShape,
} from '@twt/domain';
// ⭐ Namespace import (Pass 2 / G2): the keyed idempotency store's own failure classes had ⛔ no arm.
import { idempotency } from '@twt/domain';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import { ApiError, ServiceUnavailableError } from '../../http-errors.js';

/** KYC error-code → HTTP status (Story 3.3b). transport-down → 502; everything else 4xx. */
const KYC_ERROR_STATUS: Readonly<Record<string, number>> = {
  transaction_not_found: 404,
  transaction_expired: 409,
  user_consent_denied: 422,
  verification_failed: 422,
  signature_invalid: 422,
  certificate_stale: 422,
  provider_unavailable: 502,
};

/**
 * Story 10.20 (WS-A/WS-C) — the record model's typed refusals that all resolve to 422. Each says
 * the request is malformed as a GOVERNANCE RECORD, not that the state forbids the action (that
 * stays the 409 `ModerationStateError` mapping, and the two must remain tellable apart):
 *   ModerationEscalationRequiredError      → a termination omits part (a) or (b), or one is below
 *                                            the substance floor; the error names WHICH part and WHY
 *   ModerationEscalationNotApplicableError → a suspend/restore carries an escalation part — the
 *                                            0099 CHECK is an `iff` and bites both ways; this keeps
 *                                            a 23514 from surfacing as a 500
 *   ModerationEscalationRestatementError   → part (a) merely restates part (b) under normalization
 *                                            — a plaintext-only check, envelope encryption is
 *                                            non-deterministic
 *   ModerationEvidenceRefInvalidError      → evidence must be bounded `{kind, ref}` identifiers,
 *                                            never prose
 * Grouped rather than four identical if-blocks — same status, same `toErrorResponse` call — so a
 * future addition to this family cannot get pasted with the wrong status code.
 */
const MODERATION_RECORD_SHAPE_ERROR_CLASSES = [
  ModerationEscalationRequiredError,
  ModerationEscalationNotApplicableError,
  ModerationEscalationRestatementError,
  ModerationEvidenceRefInvalidError,
] as const;

function isModerationRecordShapeError(
  error: unknown,
): error is InstanceType<(typeof MODERATION_RECORD_SHAPE_ERROR_CLASSES)[number]> {
  return MODERATION_RECORD_SHAPE_ERROR_CLASSES.some((ErrorClass) => error instanceof ErrorClass);
}

function envelope(code: string, message: string, requestId: string, details?: unknown): ErrorResponseShape {
  return {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      request_id: requestId,
    },
  };
}

/**
 * The Fastify error handler. Bound to the app in `buildServer`. `request.requestContext`
 * is always set by the request-context middleware (it runs first), so `traceId`
 * is reliably present.
 */
export function errorMappingHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const requestId = request.requestContext?.traceId ?? 'unknown';

  // (1) Zod request-validation failure surfaced by fastify-type-provider-zod.
  if (hasZodFastifySchemaValidationErrors(error)) {
    void reply
      .status(400)
      .send(
        envelope('request.validation', 'Request failed schema validation', requestId, {
          issues: error.validation,
        }),
      );
    return;
  }

  // (2) This surface's own typed errors.
  if (error instanceof ApiError) {
    void reply.status(error.statusCode).send(error.toErrorResponse(requestId));
    return;
  }

  // (3) RBAC denial (the second guard — §2.6).
  if (error instanceof AuthorizationDeniedError) {
    void reply.status(403).send(error.toErrorResponse(requestId));
    return;
  }

  // (3a) Tone-review publish gate denial (Story 2.2) → 409 `tone_review.required`
  // (matches Story 2.4 publish contract). Same own-projector pattern as the RBAC 403.
  if (error instanceof ToneReviewRequiredError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }

  // (3a′) KYC provider failure (Story 3.3b, AC2/AC5). The normalized, provider-neutral
  // KycProviderError thrown by the DigiLocker provider's verifyAndPullProfile/getStatus.
  // Its own `toErrorResponse` projector carries `{ code, retriable }` so the member app
  // branches to the manual-fallback empathy path. Mapped to HTTP by code (the callback is
  // the throw site; the 3.3a transport stays fenced).
  if (KycProviderError.is(error)) {
    const status = KYC_ERROR_STATUS[error.code] ?? 422;
    void reply.status(status).send(error.toErrorResponse(requestId));
    return;
  }

  // (3b) Niyamavali registry typed errors (Story 2.4, AC6 + the draft state machine).
  // Each owns its code + projector — the 2.3-deferred 409/404 mapping lands here.
  //   ClauseIdConflictError → 409 niyamavali.clause_id_conflict (create allocation race)
  //   ClauseNotFoundError   → 404 niyamavali.clause_not_found   (amend/deprecate absent)
  //   DraftNotFoundError    → 404 niyamavali.draft_not_found
  //   DraftStateError       → 409 niyamavali.draft_invalid_state (illegal transition)
  //   DraftSelfReviewError  → 409 niyamavali.draft_self_review   (author signed own draft)
  //   ClausePayloadPiiError → 422 niyamavali.clause_payload_pii  (Story 11a.4 AC3a —
  //     naked PII in the payload; well-formed request, unpublishable CONTENT).
  //     ⭐ Registered HERE deliberately: an unregistered domain error surfaces as a
  //     500, which is ⛔ NOT a designed rejection (the Story 10.30 finding). The
  //     status is pinned at this boundary and asserted by test.
  if (error instanceof ClauseIdConflictError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ClauseNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof DraftNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof DraftStateError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof DraftSelfReviewError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ClausePayloadPiiError) {
    // ⛔ `toErrorResponse` carries pattern TYPES only — ⛔ never the matched value.
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }

  // (3b′) News/Blog typed errors (Story 10.5). Each owns its code + projector.
  //   NewsPostNotFoundError         → 404 news.post_not_found
  //   NewsPostStateError            → 409 news.post_invalid_state (illegal transition / edit-locked)
  //   NewsPostAuthorReviewerError   → 403 news.author_is_reviewer (author == reviewer/approver, AC2)
  //   NewsPostBilingualRequiredError→ 422 news.bilingual_required (missing hi copy for public/members-all, AC7)
  //   NewsPostScheduleInPastError   → 422 news.schedule_in_past (scheduled_publish_at at/before now)
  if (error instanceof NewsPostNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof NewsPostStateError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof NewsPostAuthorReviewerError) {
    void reply.status(403).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof NewsPostBilingualRequiredError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof NewsPostScheduleInPastError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }

  // (3b″) Banner/Popup typed errors (Story 10.9). Each owns its code + projector.
  //   BannerNotFoundError                → 404 banner.not_found (absent, cross-tenant, or a member
  //                                        `:pariwarId` mismatch — one shape, no existence oracle)
  //   BannerStateError                   → 409 banner.invalid_state (illegal transition / edit on a
  //                                        retracted banner / a concurrent state change)
  //   BannerPopupMustBeDismissibleError  → 422 banner.popup_must_be_dismissible (AC4 "no member
  //                                        trapped" — the domain half of the DB CHECK)
  //   BannerBilingualRequiredError       → 422 banner.bilingual_required (all four copy fields are
  //                                        required at publish, FR-58B/FR-68)
  //   BannerWindowInvalidError           → 422 banner.window_invalid (valid_until <= valid_from)
  // ⚠ The tone-review DENY path (publish by the author, or a copy revision without a fresh
  // non-author sign-off) is NOT here: it reuses the shipped ToneReviewRequiredError → 409, mapped
  // below, so the gate's structured denial reaches the client unchanged.
  if (error instanceof BannerNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof BannerStateError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof BannerPopupMustBeDismissibleError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof BannerBilingualRequiredError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof BannerWindowInvalidError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }

  // (3b‴′) Survey/Poll typed errors (Story 10.15). Each owns its code + projector.
  //   SurveyNotFoundError               → 404 survey.not_found (absent, cross-tenant, an unpublished
  //                                       draft on the member path, or a member `:pariwarId` mismatch
  //                                       — ONE shape, so there is no existence oracle)
  //   SurveyStateError                  → 409 survey.invalid_state (illegal transition, an edit on a
  //                                       closed survey, a concurrent state change, OR a response
  //                                       against a survey that is not open at `now` — expiry is
  //                                       enforced on the WRITE path, not merely hidden from the read)
  //   SurveyFrozenFieldError            → 409 survey.frozen_field (an edit touching a field frozen by
  //                                       publish — LBD-5. A 409 not a 422: the payload is not
  //                                       malformed, it conflicts with the resource's CURRENT STATE)
  //   SurveyAlreadyRespondedError       → 409 survey.already_responded (LBD-6 — one response per
  //                                       member, and submission is final). ⚠ DISTINCT from an
  //                                       `Idempotency-Key` replay, which is not an error at all and
  //                                       returns the original 201.
  //   SurveyWindowInvalidError          → 422 survey.window_invalid (valid_until <= valid_from, OR a
  //                                       SHORTENED valid_until on a published survey — the message
  //                                       points at `close`, the transition that exists for it)
  //   SurveyBilingualRequiredError      → 422 survey.bilingual_required (all four copy fields are
  //                                       required at publish, FR-68)
  //   SurveyQuestionnaireInvalidError   → 422 survey.questionnaire_invalid (a closed-vocabulary
  //                                       violation NAMING the offending question_id and the bound)
  //   SurveyAnswerInvalidError          → 422 survey.answer_invalid (likewise for one member's
  //                                       answers). ⛔ Never echoes `answer_text` — a free-text
  //                                       failure reports the LENGTH and the BOUND (LBD-3).
  //   SurveyAudienceUnsupportedError    → 422 survey.audience_unsupported (`public`/`role`/`cohort`
  //                                       can never resolve to a survey audience — ⚠ `public` is
  //                                       rejected here and ALLOWED for banners, deliberately: LBD-7)
  //   SurveyAudienceValueRequiredError  → 422 survey.audience_value_required (`state` with no value)
  // ⚠ The tone-review DENY path (publish by the author, or publish without a sign-off) is NOT here:
  // it reuses the shipped ToneReviewRequiredError → 409, mapped below.
  if (error instanceof SurveyNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof SurveyStateError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof SurveyFrozenFieldError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof SurveyAlreadyRespondedError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof SurveyWindowInvalidError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof SurveyBilingualRequiredError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof SurveyQuestionnaireInvalidError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof SurveyAnswerInvalidError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof SurveyAudienceUnsupportedError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof SurveyAudienceValueRequiredError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }

  // (3b‴) Member-moderation typed errors (Story 10.10). Each owns its code + projector.
  //   ModerationStateError                → 409 member_moderation.invalid_state (the action is illegal
  //                                         from the CURRENT overlay status — including the
  //                                         Decision-2 `none --terminate-->` and a re-suspend; raised
  //                                         BEFORE any write, so a no-op never returns 200)
  //   ModerationReasonCodeInvalidError    → 422 member_moderation.reason_code_invalid (the code is
  //                                         undeclared, or its `appliesTo` excludes this action — e.g.
  //                                         a restore code offered to justify a termination)
  //   ModerationRationaleRequiredError    → 422 member_moderation.rationale_required (the rationale is
  //                                         mandatory on EVERY action, not only on an "other" code)
  //   (Actor-display attribution is resolved and validated entirely at the apps/api layer via
  //   AdminDisplayNameMissingError, mapped below — `moderateMember`'s `actorDisplay` is a required
  //   `string`, so the domain has no code path that can raise a "missing" error of its own.)
  if (error instanceof ModerationStateError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ModerationReasonCodeInvalidError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ModerationRationaleRequiredError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  // Story 10.20 (WS-A/WS-C) — see MODERATION_RECORD_SHAPE_ERROR_CLASSES above for the per-class
  // breakdown. All 422: each says the request is malformed as a GOVERNANCE RECORD, not that the
  // state forbids the action (that stays the 409 above, and the two must remain tellable apart).
  if (isModerationRecordShapeError(error)) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  // Story 10.20 (WS-D) — the dwell precondition. ⚠ The two differ in KIND, not in severity:
  //   ModerationDwellNotElapsedError            → 409 …dwell_not_elapsed. DISTINCT from
  //                                               `invalid_state` on purpose: "too soon" and
  //                                               "illegal transition" are different facts, and this
  //                                               one resolves by waiting OR by recording a reason
  //                                               for the immediate-termination exception. It is NOT
  //                                               a blanket refusal to terminate during the dwell.
  //   ModerationDwellPolicyUnprovisionedError   → 503 …dwell_policy_unprovisioned. NOT a 409,
  //                                               because no amount of waiting provisions a registry
  //                                               clause — this is a configuration gap an admin
  //                                               closes, and a 409 would send a trustee away to
  //                                               wait for something that will never arrive.
  if (error instanceof ModerationDwellNotElapsedError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ModerationDwellPolicyUnprovisionedError) {
    void reply.status(503).send(error.toErrorResponse(requestId));
    return;
  }
  // Story 10.20 (WS-E) — the append-only grounds.
  //   ModerationActionNotFoundError         → 404 …action_not_found. 404-NOT-403 on a cross-tenant
  //                                           or cross-member id: answering 403 would turn this into
  //                                           an existence oracle for another Pariwar's decisions.
  //   ModerationGroundNotFoundError         → 404 …ground_not_found (the superseded ground is not on
  //                                           this action).
  //   ModerationPrimaryGroundImmutableError → 409 …primary_ground_immutable. The partial unique index
  //                                           is the BACKSTOP; this is the INTERFACE. ⛔ A 23505
  //                                           must never reach a caller as a 500 — "the primary
  //                                           ground is fixed at the action" is a fact a trustee has
  //                                           to be able to read off the error.
  //   ModerationGroundAlreadySupersededError → 409 …ground_already_superseded. Same backstop/interface
  //                                            split, against `member_moderation_grounds_supersedes_
  //                                            target_idx` (migration 0100) — at most one active
  //                                            superseder per target.
  if (error instanceof ModerationActionNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ModerationGroundNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ModerationPrimaryGroundImmutableError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ModerationGroundAlreadySupersededError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }

  // (3b-ii) Story 10.22 — the Niyamavali §8.8 moderation APPEAL. Five typed refusals whose statuses
  //   differ IN KIND, not in severity; ⛔ do not flatten them.
  //   ModerationAppealNotAppealableError    → 422 …appeal_not_appealable. The request is not coherent:
  //                                           an unmoderated member has no act to appeal against.
  //   ModerationAppealAlreadyOpenError      → 409 …appeal_already_open. A STATE objection, and ⛔ NOT
  //                                           an exhaustion — §8.8 permits a further appeal against
  //                                           the same act once the open one is determined. The
  //                                           partial UNIQUE index is the BACKSTOP; this is the
  //                                           INTERFACE, and a 23505 must never surface as a 500.
  //   ModerationAppealAlreadyDecidedError   → 409 …appeal_already_decided. §8.8 gives ONE review; a
  //                                           recorded determination is immutable.
  //   ModerationAppealAdjudicatorExcludedError
  //                                         → ⭐ 409 …appeal_adjudicator_excluded. ⛔ NEVER 403, and
  //                                           the distinction is load-bearing: the actor HOLDS
  //                                           `member.decide_moderation_appeal` and may determine any
  //                                           other appeal. What is refused is their RELATIONSHIP to
  //                                           this case — they imposed the act, or contributed a
  //                                           ground it rests on (§8.8's different-individual
  //                                           requirement; Deed Clause 26 natural justice). A 403
  //                                           would tell a Panel member they lack a capability they
  //                                           in fact hold, with nothing naming the real cause.
  //   ModerationAppealNotFoundError         → 404 …appeal_not_found. ⛔ Not 403 — a 403 on an
  //                                           ownership read is a tenant-existence oracle.
  if (error instanceof ModerationAppealNotAppealableError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ModerationAppealAlreadyOpenError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ModerationAppealAlreadyDecidedError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ModerationAppealAdjudicatorExcludedError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ModerationAppealNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }

  // (3c) T&C registry typed errors (Story 2.6, AC6/AC7). Each owns its code + projector.
  //   TcVersionConflictError      → 409 terms_and_conditions.version_conflict (concurrent create race)
  //   TcVersionNotFoundError      → 404 terms_and_conditions.version_not_found
  //   TcStateError                → 409 terms_and_conditions.invalid_state (illegal transition)
  //   TcPinnedClauseNotFoundError → 422 terms_and_conditions.pinned_clause_not_found (absent/cross-tenant pin)
  if (error instanceof TcVersionConflictError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof TcVersionNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof TcStateError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof TcPinnedClauseNotFoundError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }

  // (3c-bis) Per-Pariwar DRIVE TARGET typed errors (Story 11b.13, AC2/AC3/AC4). Each owns its code
  // + projector.
  //   DriveTargetVersionConflictError    → 409 pariwar.drive_target_version_conflict
  //   DriveTargetVisibilityInvalidError  → 422 pariwar.drive_target_visibility_invalid
  //   DriveTargetInvalidError            → 400 pariwar.drive_target_invalid
  //   UngovernedDriveTargetChangeError   → 422 pariwar.drive_target_ungoverned_change
  //   DriveTargetEffectiveFromSkewError  → 400 pariwar.drive_target_effective_from_skew
  //
  // ⛔⛔ THESE ARMS ARE ⛔ NOT OPTIONAL, and this block is the reason the classes are exported at the
  // `@twt/domain` top level. `2026-09-05-201` cl.4 rules the version conflict must reach the wire as
  // a 409 with its OWN REGISTERED code — ⛔ never a bare `23505`, ⛔ never an opaque 500. The
  // neighbouring masking module is the counter-example the ruling cites: its
  // `UngovernedNomineeBankMaskingChangeError` `extends Error`, is NOT registered here, and therefore
  // surfaces as a 500 on a plain governance refusal (Story 11b.3a chunk G2). ⛔ Do not add a
  // drive-target throw without an arm here.
  //
  // ⚠ THE STATUSES ARE CHOSEN, ⛔ not defaulted:
  //   · 409 for the version conflict — the request is well-formed; the world moved. The operator
  //     re-reads and re-submits (the `TcVersionConflictError` precedent immediately above).
  //   · 422 for the visibility refusal — the request is well-formed and the STATE is fine; the
  //     COMBINATION is forbidden (`2026-09-04-189` cl.3, *member ≥ public*). ⛔ Not a 409: nothing
  //     raced, and telling an operator to retry would be false.
  //   · 400 for an invalid target — a plain input error. ⚠ The contract's `.positive()` should have
  //     caught it first; this arm exists so a non-HTTP caller, or a contract regression, still gets
  //     a 4xx rather than a 500.
  //   · 422 for a missing rationale / audit anchor / display name / grant — the request is malformed
  //     as a GOVERNANCE RECORD (the Story 10.20 moderation-record family's own reasoning).
  if (error instanceof DriveTargetVersionConflictError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof DriveTargetVisibilityInvalidError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof DriveTargetInvalidError) {
    void reply.status(400).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof UngovernedDriveTargetChangeError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }
  // ⭐ 400 (code review Pass 2, decision D-B; ⚠ RATIONALE CORRECTED in G2). A backwards
  // `effective_from` beyond the permitted clock skew is a CALLER-SIDE / DEPLOYMENT error, ⛔ not a
  // conflict between two operators — "re-read the current target and re-submit" would be the wrong
  // instruction, since there is nothing about the caller's own view to re-read.
  // ⚠⛔ THE ORIGINAL RATIONALE HERE WAS WRONG and is corrected rather than quietly dropped: it read
  // *"retrying the same instant fails identically"*. ⛔ The caller supplies ⛔ NO instant — the wire
  // contract has no `effectiveFrom` field and the handler passes `deps.clock()` — so the instant
  // ADVANCES with wall-clock and the retry actually SUCCEEDS once the nodes' clocks converge.
  // ⇒ the honest reading: this fires only when THIS node's clock trails the open head's by more
  // than the bound, i.e. a multi-node NTP-skew condition, ⛔ never anything the operator typed.
  // ⚠ Consequently it is ⛔ UNREACHABLE on a single-instance deployment.
  if (error instanceof DriveTargetEffectiveFromSkewError) {
    void reply.status(400).send(error.toErrorResponse(requestId));
    return;
  }
  // ⭐⭐ THE IDEMPOTENCY STORE'S OWN FAILURES (code review Pass 2 / G2). ⛔ Previously UNREGISTERED,
  // and the consequence was ⛔ not merely an ugly status: `recordResult` runs AFTER `run()` has
  // succeeded and AFTER `withCompensatingAudit` returned, so a throw there produced a 500 while
  // ⛔ no compensating audit line fired — leaving a committed audit line asserting a change the
  // 500 then rolled back. ⚠ `IdempotencyKeyNotClaimedError` is the narrow case (`rowCount === 0`);
  // ⭐ the ordinary one is any transient pool/DB error from claim/getResult/recordResult/release.
  // 503, ⛔ not 500: the write itself may well have landed, and a retry WITH THE SAME KEY is the
  // correct client action — which is exactly what the key exists to make safe.
  if (error instanceof idempotency.IdempotencyKeyNotClaimedError) {
    void reply.status(503).send(
      new ServiceUnavailableError(
        'The idempotency record could not be written — retry with the same Idempotency-Key',
        'idempotency.record_failed',
      ).toErrorResponse(requestId),
    );
    return;
  }

  // (3d) WA opt-in typed errors (Story 5.4, AC1/AC3/AC4). Each owns its code + projector.
  //   WaOptInNotFoundError       → 404 wa_opt_in.not_found
  //   WaOptInPendingExistsError  → 409 wa_opt_in.pending_exists (a PENDING is already outstanding)
  //   WaOptInStateError          → 409 wa_opt_in.invalid_state (illegal transition, e.g. a concurrent race)
  if (error instanceof WaOptInNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof WaOptInPendingExistsError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof WaOptInStateError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }

  // (3e) Telegram opt-in typed errors (Story 5.5, AC4/AC10). Each owns its code + projector.
  //   TelegramOptInNotFoundError      → 404 telegram_opt_in.not_found
  //   TelegramOptInPendingExistsError → 409 telegram_opt_in.pending_exists (a PENDING is already outstanding)
  //   TelegramOptInStateError         → 409 telegram_opt_in.invalid_state (illegal transition, e.g. a race)
  if (error instanceof TelegramOptInNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof TelegramOptInPendingExistsError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof TelegramOptInStateError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }

  // (3f) Claim-state direct-write rejection (Story 6.1 typed error, Story 6.2 boundary). The
  // DB trigger rejects any write to `claims.current_state` not issued by the projector — an
  // architectural violation (§AC3). 6.2 never writes current_state directly (always via
  // projectClaimState), so this is a forward-safe guard: map → 500 with the stable code, no
  // internal leak (the P0 audit line is the catching write-boundary's job, not the mapper's).
  if (error instanceof ClaimStateDirectWriteError) {
    request.log.error({ err: error, traceId: requestId }, 'claims.current_state direct write rejected');
    void reply.status(500).send(error.toErrorResponse(requestId));
    return;
  }

  // (4) Known domain errors.
  //
  // MemberStreamConcurrencyError: two concurrent writers raced the SAME member's event stream
  // (any `member.*` event append — moderation suspend/terminate/restore, medical disclosure,
  // RTBF, life-events, …) and the loser lost the `events_log` `(stream_id, event_version)`
  // unique-index race (`packages/domain/src/member/project.ts`). This is an EXPECTED, retriable
  // condition, not a server bug — the caller re-reads the member's current standing and retries.
  // Mapped centrally here (rather than per-module) so every `projectMemberState` caller gets a
  // clean 409 instead of falling through to the generic 500 (Story 10.10 review finding).
  if (error instanceof memberDomain.MemberStreamConcurrencyError) {
    void reply
      .status(409)
      .send(
        envelope(
          'member.stream_concurrency_conflict',
          'A concurrent update to this member was already applied — please retry',
          requestId,
        ),
      );
    return;
  }
  if (error instanceof InvalidPariwarScopeError) {
    void reply.status(400).send(envelope('scope.invalid', 'Invalid Pariwar scope', requestId));
    return;
  }
  if (error instanceof ids.InvalidBrandedIdError) {
    void reply.status(400).send(envelope('id.invalid', 'Malformed identifier', requestId));
    return;
  }
  if (error instanceof PariwarScopeMissingError) {
    // A missing scope at a query path is a server bug (middleware did not run) —
    // surface as 500 (loud) but with a stable code, not the raw message.
    request.log.error({ err: error, traceId: requestId }, 'pariwar scope missing at query path');
    void reply.status(500).send(envelope('scope.missing', 'Internal error', requestId));
    return;
  }

  // Fastify's own HTTP errors (e.g. 404 not-found, 429 from rate-limit) carry a
  // statusCode; preserve it but wrap in the envelope.
  const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
  if (statusCode >= 400 && statusCode < 500) {
    void reply
      .status(statusCode)
      .send(envelope(error.code ?? 'request.error', 'Request error', requestId));
    return;
  }

  // (5) Uncaught — log server-side, leak nothing.
  request.log.error({ err: error, traceId: requestId }, 'unhandled error');
  void reply.status(500).send(envelope('internal.error', 'Internal server error', requestId));
}
