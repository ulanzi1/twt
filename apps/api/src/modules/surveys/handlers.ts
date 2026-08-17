// Survey/Poll admin handlers — Story 10.15 (Task 6; AC1/AC2/AC4/AC7/AC8).
//
// The survey authoring + RESULTS surface: the paginated derived-display-state-filtered list, the
// per-survey read, the workflow writes (create / update / publish / close), and the two results reads
// (the aggregate + the unattributed free text). Every WRITE runs in the caller's request scope tx (the
// multi-tenant lifecycle hook COMMITs on a 2xx, ROLLBACKs otherwise); the domain accessors never
// self-commit. Every action is audit-logged (Story 1.10 global chain); `publish` ADDITIONALLY records
// the non-author tone-review sign-off through the dedicated `ToneReviewAuditSink` (never the raw copy
// and never the raw questions — a `contentHash`).
//
// ── The DERIVED display state is computed HERE, at the server's `now` ────────────────────────
// `display_state` is projected onto every response by `deriveSurveyDisplayState(row, deps.clock())`.
// It is never stored, and a client that caches the DTO across a window boundary holds a stale value —
// which is correct: the server's clock is the authority (AC2).
//
// ── ⛔ NO HANDLER HERE JOINS A RESPONSE TO A MEMBER (LBD-3) ───────────────────────────────────
// `aggregate` returns counts. `freeText` returns `{answer_text, submitted_at}`. Neither the domain
// accessors nor these projections can carry a member id, and the DTOs `.strict()`-refuse one. There
// is no "who answered" handler, and adding one would be a NEW story with a new key and a DPDPA
// consent question attached.

import { createHash } from 'node:crypto';

import type {
  SurveyAggregateResponse,
  SurveyDisplayState,
  SurveyFreeTextListResponse,
  SurveyListResponse,
  SurveyResponse,
  CreateSurveyRequest,
  UpdateSurveyRequest,
} from '@twt/contracts';
import { audit, ids, surveys as surveysDomain, type schema } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { recordToneReviewSignoff } from '../tone-review/index.js';

/**
 * The audit action names for the five auditable actions (Story 1.10 taxonomy — dotted, past-tense).
 *
 * ⚠ `survey.responses_viewed` is the odd one out: it audits a READ, not a write. It is here because
 * the free-text read is the one place an admin sees member-authored personal data (LBD-3), and an
 * unaudited read of PII is exactly the access nobody can later account for. It carries the survey id
 * and the audited question — ⛔ never the answer content, and — [Review][Patch] — code review of
 * 10-15-survey-poll (2026-08-17), resolved: NOT a count either. `requestPayloadHash` is a one-way
 * digest, so nothing hashed into it is later recoverable; the load-bearing fact this line proves is
 * WHO viewed WHICH question's answers, not how many. (Three prior copies of this "carries a count"
 * claim — here and at `handlers.ts`'s `freeText` docstring and `read.ts`'s equivalent — were never
 * implemented and have been corrected rather than built, per that decision.)
 *
 * ⚠ There is deliberately no `survey.revised` sibling to 10.9's `banner.revised`: a published
 * survey's copy and questionnaire cannot change at all (LBD-5), so there is no revision to
 * distinguish from an ordinary edit.
 */
type SurveyAuditAction =
  | 'survey.created'
  | 'survey.updated'
  | 'survey.published'
  | 'survey.closed'
  | 'survey.responses_viewed';

type SurveyRow = schema.SurveyRow;

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/** Project a domain row → the admin wire DTO (camelCase → snake_case) + the derived display state. */
function toSurveyResponse(row: SurveyRow, now: Date): SurveyResponse {
  return {
    survey_id: row.surveyId,
    pariwar_id: row.pariwarId,
    title: row.title,
    body: row.body,
    title_hi: row.titleHi,
    body_hi: row.bodyHi,
    // ⭐ Passed through UNMAPPED — the questionnaire's inner keys are snake_case on both sides
    // (domain `surveys/types.ts`), which is what the contracts round-trip sync-guard pins.
    questions: row.questions,
    audience_scope: row.audienceScope,
    audience_scope_value: row.audienceScopeValue,
    valid_from: row.validFrom.toISOString(),
    valid_until: row.validUntil.toISOString(),
    response_threshold: row.responseThreshold,
    status: row.status,
    display_state: surveysDomain.deriveSurveyDisplayState(row, now),
    created_by_actor_id: row.createdByActorId,
    tone_signoff_content_hash: row.toneSignoffContentHash,
    tone_signoff_reviewed_at: iso(row.toneSignoffReviewedAt),
    tone_signoff_reviewed_by: row.toneSignoffReviewedBy,
    published_at: iso(row.publishedAt),
    closed_at: iso(row.closedAt),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/**
 * The DERIVED display states that map onto a stored status, for narrowing the scan.
 *
 * ⚠ `scheduled` / `open` / `expired` all share `status='published'` and differ only by the clock, so
 * the SQL predicate can narrow to `published` but cannot answer the question — the final filter is
 * the pure derivation applied below. ⛔ Do not "optimise" this into a `now()` comparison in SQL: that
 * would be a second implementation of `deriveSurveyDisplayState`, drifting the first time either
 * changed ([[project_yogdaan_status_derivation_convention]]).
 */
const DISPLAY_STATE_TO_STATUSES: Readonly<Record<SurveyDisplayState, readonly schema.SurveyStatus[]>> = {
  draft: ['draft'],
  scheduled: ['published'],
  open: ['published'],
  expired: ['published'],
  closed: ['closed'],
};

interface ActorCtx {
  actorId: string;
  pariwarId: ids.PariwarId;
  traceId: string;
}

export function createSurveyHandlers(deps: AppDeps) {
  function ctxOf(request: FastifyRequest): ActorCtx {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId), traceId: request.requestContext.traceId };
  }

  /** Fire-and-forget action audit (Story 1.10 global chain) — never throws into the request path. */
  function emitAudit(ctx: ActorCtx, action: SurveyAuditAction, surveyId: string, status: number): void {
    const input: audit.AuditEntryInput = {
      pariwarId: ctx.pariwarId,
      actorId: ctx.actorId,
      actorRole: null,
      action,
      resourceLocator: surveysDomain.surveyResourceLocator(surveyId),
      // ⛔ The authored copy, the questions and every answer are NEVER audited; hash the non-secret
      // locator+action for the payload digest.
      requestPayloadHash: auditPayloadHash(action, surveyId),
      responseStatus: status,
      traceId: ctx.traceId,
    };
    void audit.writeAuditEntry(deps.servicePool, input).catch((err: unknown) => {
      console.error('[survey-audit] failed to persist action audit line', JSON.stringify({ action, error: String(err) }));
    });
  }

  return {
    /** GET the Pariwar's surveys (paginated, derived-display-state filterable). */
    async list(request: FastifyRequest): Promise<SurveyListResponse> {
      const ctx = ctxOf(request);
      const now = deps.clock();
      const q = request.query as { display_state?: SurveyDisplayState; limit?: number; offset?: number };
      // Capped at 199, one below the domain accessor's hard `clampLimit` ceiling (200) — the
      // "fetch one extra to detect hasMore" trick requests `limit + 1`, and if that itself hit 201 it
      // would be re-clamped back to 200, making `hasMore` always false at the boundary (the 10.5
      // news-list finding, applied here rather than repeated).
      const limit = clampInt(q.limit, 50, 199);
      const offset = Math.max(0, Number(q.offset ?? 0) || 0);
      const rows = await surveysDomain.listSurveysForPariwar(request.scopeTx!.tx, ctx.pariwarId, {
        ...(q.display_state ? { statuses: DISPLAY_STATE_TO_STATUSES[q.display_state] } : {}),
        limit: limit + 1,
        offset,
      });
      // ⭐ The DERIVED filter, applied after the SQL narrowing — see DISPLAY_STATE_TO_STATUSES.
      // ⚠ Applied BEFORE the hasMore slice, so a page never reports more rows than it returns.
      const matched = q.display_state
        ? rows.filter((r) => surveysDomain.deriveSurveyDisplayState(r, now) === q.display_state)
        : rows;
      const hasMore = matched.length > limit;
      const page = hasMore ? matched.slice(0, limit) : matched;
      return {
        items: page.map((r) => toSurveyResponse(r, now)),
        next_offset: hasMore ? offset + limit : null,
      };
    },

    /** GET a single survey (admin). */
    async get(request: FastifyRequest): Promise<SurveyResponse> {
      const ctx = ctxOf(request);
      const { surveyId } = request.params as { surveyId: string };
      const row = await surveysDomain.getSurveyOrThrow(request.scopeTx!.tx, ctx.pariwarId, ids.surveyId(surveyId));
      return toSurveyResponse(row, deps.clock());
    },

    /** POST create a draft. */
    async create(request: FastifyRequest, reply: FastifyReply): Promise<SurveyResponse> {
      const ctx = ctxOf(request);
      const body = request.body as CreateSurveyRequest;
      const row = await surveysDomain.createDraft(request.scopeTx!.tx, {
        pariwarId: ctx.pariwarId,
        title: body.title ?? null,
        body: body.body ?? null,
        titleHi: body.title_hi ?? null,
        bodyHi: body.body_hi ?? null,
        questions: body.questions ?? [],
        audienceScope: body.audience_scope,
        audienceScopeValue: body.audience_scope_value ?? null,
        validFrom: new Date(body.valid_from),
        validUntil: new Date(body.valid_until),
        responseThreshold: body.response_threshold ?? null,
        createdByActorId: ids.userId(ctx.actorId),
      });
      emitAudit(ctx, 'survey.created', row.surveyId, 201);
      void reply.status(201);
      return toSurveyResponse(row, deps.clock());
    },

    /**
     * PATCH edit a survey. On a DRAFT every field applies, re-validated; on a PUBLISHED survey only an
     * EXTENSION of `valid_until` survives the LBD-5 freeze and everything else is a typed 409 naming
     * the frozen field. The freeze decision is the DOMAIN's — this handler only maps the wire patch,
     * because "which fields are frozen" depends on the row's current status, which the client neither
     * knows nor may be trusted to assert.
     */
    async update(request: FastifyRequest): Promise<SurveyResponse> {
      const ctx = ctxOf(request);
      const { surveyId } = request.params as { surveyId: string };
      const body = request.body as UpdateSurveyRequest;
      const now = deps.clock();
      const row = await surveysDomain.updateSurvey(
        request.scopeTx!.tx,
        ctx.pariwarId,
        ids.surveyId(surveyId),
        {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.body !== undefined ? { body: body.body } : {}),
          ...(body.title_hi !== undefined ? { titleHi: body.title_hi } : {}),
          ...(body.body_hi !== undefined ? { bodyHi: body.body_hi } : {}),
          ...(body.questions !== undefined ? { questions: body.questions } : {}),
          ...(body.audience_scope !== undefined ? { audienceScope: body.audience_scope } : {}),
          ...(body.audience_scope_value !== undefined ? { audienceScopeValue: body.audience_scope_value } : {}),
          ...(body.valid_from !== undefined ? { validFrom: new Date(body.valid_from) } : {}),
          ...(body.valid_until !== undefined ? { validUntil: new Date(body.valid_until) } : {}),
          ...(body.response_threshold !== undefined ? { responseThreshold: body.response_threshold } : {}),
        },
        now,
      );
      emitAudit(ctx, 'survey.updated', row.surveyId, 200);
      return toSurveyResponse(row, now);
    },

    /**
     * POST publish (draft → published) + record the non-author tone-review sign-off + enqueue the
     * member fan-out.
     *
     * ⚠ The enqueue is BEST-EFFORT and never fails the request (AC8: "a fan-out failure never rolls
     * back the publish — the survey is published, the notification is retried"). ⛔ The fan-out
     * itself is NOT performed here: it needs MEMBER Tier-1 field crypto and this is the
     * admin-identity request path (the 10.4 crypto boundary).
     */
    async publish(request: FastifyRequest): Promise<SurveyResponse> {
      const ctx = ctxOf(request);
      const { surveyId } = request.params as { surveyId: string };
      const now = deps.clock();
      const { row, signoff } = await surveysDomain.publish(
        request.scopeTx!.tx,
        ctx.pariwarId,
        ids.surveyId(surveyId),
        ids.userId(ctx.actorId),
        now,
      );
      // Record the sign-off through the dedicated audit seam (tone_review.signoff — NOT the auth
      // taxonomy, and NO raw copy or raw questions: only the contentHash).
      recordToneReviewSignoff(deps, {
        reviewedBy: signoff.reviewedBy,
        resourceLocator: signoff.resourceLocator,
        contentHash: signoff.contentHash,
        pariwarId: ctx.pariwarId,
        traceId: ctx.traceId,
      });
      emitAudit(ctx, 'survey.published', row.surveyId, 200);
      await deps.surveyPublishQueue
        ?.enqueuePublish({
          surveyId: row.surveyId,
          pariwarId: ctx.pariwarId,
          requestId: ctx.traceId,
          actorId: ctx.actorId,
          traceId: ctx.traceId,
        })
        .catch((err: unknown) => request.log.warn({ err }, 'survey: publish fan-out enqueue failed'));
      return toSurveyResponse(row, now);
    },

    /** POST close (draft → closed as a discard, or published → closed). Terminal — no reopen. */
    async close(request: FastifyRequest): Promise<SurveyResponse> {
      const ctx = ctxOf(request);
      const { surveyId } = request.params as { surveyId: string };
      const now = deps.clock();
      const row = await surveysDomain.close(request.scopeTx!.tx, ctx.pariwarId, ids.surveyId(surveyId), now);
      emitAudit(ctx, 'survey.closed', row.surveyId, 200);
      return toSurveyResponse(row, now);
    },

    /**
     * GET the aggregate results (AC7).
     *
     * ⛔ Counts only. The domain accessor selects `answers` and nothing else, folds through the pure
     * `aggregateResponses`, and the DTO has no field that could hold an identifier. Deliberately NOT
     * audited as a PII read: an aggregate is not personal data — the free-text read below is, and
     * that one IS audited.
     */
    async aggregate(request: FastifyRequest): Promise<SurveyAggregateResponse> {
      const ctx = ctxOf(request);
      const { surveyId } = request.params as { surveyId: string };
      const agg = await surveysDomain.getSurveyAggregate(
        request.scopeTx!.tx,
        ctx.pariwarId,
        ids.surveyId(surveyId),
      );
      return { survey_id: surveyId, ...agg };
    },

    /**
     * GET the UNATTRIBUTED free-text answers to one question (AC7, LBD-3).
     *
     * ⭐ THIS IS THE ONE READ THAT SEES MEMBER-AUTHORED PERSONAL DATA, so it is the one read that
     * writes an audit line — carrying the survey id and the audited question, ⛔ never the answer
     * content and (code review of 10-15-survey-poll, 2026-08-17) never a count either, since the
     * payload field is a one-way hash. Free text is PII tier 3 at best: never logged, never in an
     * audit payload, and with no export path in v1 (Story 10.7's reports library is the seam if one is
     * ever wanted).
     */
    async freeText(request: FastifyRequest): Promise<SurveyFreeTextListResponse> {
      const ctx = ctxOf(request);
      const { surveyId, questionId } = request.params as { surveyId: string; questionId: string };
      const q = request.query as { limit?: number; offset?: number };
      const limit = clampInt(q.limit, 50, 199);
      const offset = Math.max(0, Number(q.offset ?? 0) || 0);
      const rows = await surveysDomain.listFreeTextAnswers(
        request.scopeTx!.tx,
        ctx.pariwarId,
        ids.surveyId(surveyId),
        questionId,
        { limit: limit + 1, offset },
      );
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      emitAudit(ctx, 'survey.responses_viewed', surveyId, 200);
      return {
        items: page.map((r) => ({ answer_text: r.answer_text, submitted_at: r.submitted_at.toISOString() })),
        next_offset: hasMore ? offset + limit : null,
      };
    },
  };
}

function clampInt(v: unknown, def: number, cap: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(1, Math.min(Math.trunc(n), cap));
}

/** A non-secret digest of the audited coordinates (⛔ never the copy, the questions or an answer). */
function auditPayloadHash(action: string, surveyId: string): string {
  return createHash('sha256').update(`${action}:${surveyId}`, 'utf8').digest('hex');
}
