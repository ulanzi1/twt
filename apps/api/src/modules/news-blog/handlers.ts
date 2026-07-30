// News/Blog admin handlers — Story 10.5 (Task 4; AC1/AC2/AC3/AC6).
//
// The News/Blog authoring surface: the paginated status-filtered list, the per-post read, and the
// workflow writes (create/edit + submit/approve/schedule/publish). Every WRITE runs in the caller's
// request scope tx (the multi-tenant lifecycle hook COMMITs on a 2xx, ROLLBACKs otherwise); the
// domain accessors never self-commit. Every transition is audit-logged (Story 1.10 global chain);
// `approve` ADDITIONALLY records the non-author tone-review sign-off through the dedicated
// `ToneReviewAuditSink` (never the raw copy — a `contentHash`).
//
// ── The fan-out is NOT here (the 10.4 crypto-boundary lesson) ──────────────────────────────────
// `publish`/`schedule` do NOT call `fanOutAlertToMembers` — that resolves MEMBER Tier-1 crypto, but
// this request path carries ADMIN-identity keys ([[project_helpdesk_responder_surface_104]]). They
// enqueue a `NEWS_PUBLISH` job (best-effort); the apps/jobs worker owns the audience fan-out.

import type {
  CreateDraftRequest,
  NewsPostListResponse,
  NewsPostResponse,
  ScheduleRequest,
  SubmitRequest,
  UpdateDraftRequest,
} from '@twt/contracts';
import { createHash } from 'node:crypto';

import { NewsPostAuthorReviewerError, audit, ids, newsBlog, rbac, type schema } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { loadActorGrants } from '../rbac/index.js';
import { recordToneReviewSignoff } from '../tone-review/index.js';

const NEWS_MANAGE_KEY = 'news.manage';

/** The audit action names for the six transitions (Story 1.10 taxonomy — dotted, past-tense). */
type NewsAuditAction =
  | 'news.created'
  | 'news.updated'
  | 'news.submitted'
  | 'news.approved'
  | 'news.scheduled'
  | 'news.published';

type NewsPostRow = schema.NewsPostRow;

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/** Project a domain row → the admin wire DTO (camelCase → snake_case). */
function toNewsPostResponse(row: NewsPostRow): NewsPostResponse {
  return {
    post_id: row.postId,
    pariwar_id: row.pariwarId,
    title: row.title,
    body_markdown: row.bodyMarkdown,
    title_hi: row.titleHi,
    body_markdown_hi: row.bodyMarkdownHi,
    audience_scope: row.audienceScope,
    audience_scope_value: row.audienceScopeValue,
    channels: row.channels,
    scheduled_publish_at: iso(row.scheduledPublishAt),
    status: row.status,
    author_actor_id: row.authorActorId,
    reviewer_actor_id: row.reviewerActorId,
    tone_signoff_content_hash: row.toneSignoffContentHash,
    tone_signoff_reviewed_at: iso(row.toneSignoffReviewedAt),
    published_at: iso(row.publishedAt),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

interface ActorCtx {
  actorId: string;
  pariwarId: ids.PariwarId;
  traceId: string;
}

export function createNewsBlogHandlers(deps: AppDeps) {
  function ctxOf(request: FastifyRequest): ActorCtx {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId), traceId: request.requestContext.traceId };
  }

  /** Fire-and-forget transition audit (Story 1.10 global chain) — never throws into the request path. */
  function emitTransitionAudit(ctx: ActorCtx, action: NewsAuditAction, postId: string, status: number): void {
    const input: audit.AuditEntryInput = {
      pariwarId: ctx.pariwarId,
      actorId: ctx.actorId,
      actorRole: null,
      action,
      resourceLocator: newsBlog.newsResourceLocator(postId),
      // The reviewed copy is never audited; hash the non-secret locator+action for the payload digest.
      requestPayloadHash: auditPayloadHash(action, postId),
      responseStatus: status,
      traceId: ctx.traceId,
    };
    void audit.writeAuditEntry(deps.servicePool, input).catch((err: unknown) => {
      console.error('[news-audit] failed to persist transition audit line', JSON.stringify({ action, error: String(err) }));
    });
  }

  return {
    /** GET the Pariwar's posts (paginated, status-filterable). */
    async list(request: FastifyRequest): Promise<NewsPostListResponse> {
      const ctx = ctxOf(request);
      const q = request.query as { status?: NewsPostRow['status']; limit?: number; offset?: number };
      // Capped at 199, one below the domain accessor's hard `clampLimit` ceiling (200) — the
      // "fetch one extra to detect hasMore" trick below requests `limit + 1`, and if that request
      // itself hit 201 it would be re-clamped back down to 200 by the accessor, making `hasMore`
      // always false at the boundary (a page of exactly 200 would look like the last page even if
      // more rows exist).
      const limit = clampInt(q.limit, 30, 199);
      const offset = Math.max(0, Number(q.offset ?? 0) || 0);
      const rows = await newsBlog.listPostsForPariwar(request.scopeTx!.tx, ctx.pariwarId, {
        status: q.status,
        limit: limit + 1, // fetch one extra to compute next_offset
        offset,
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      return {
        items: page.map(toNewsPostResponse),
        next_offset: hasMore ? offset + limit : null,
      };
    },

    /** GET a single post (admin). */
    async get(request: FastifyRequest): Promise<NewsPostResponse> {
      const ctx = ctxOf(request);
      const { postId } = request.params as { postId: string };
      const row = await newsBlog.getPostOrThrow(request.scopeTx!.tx, ctx.pariwarId, ids.newsPostId(postId));
      return toNewsPostResponse(row);
    },

    /** POST create a draft. */
    async create(request: FastifyRequest, reply: FastifyReply): Promise<NewsPostResponse> {
      const ctx = ctxOf(request);
      const body = request.body as CreateDraftRequest;
      const row = await newsBlog.createDraft(request.scopeTx!.tx, {
        pariwarId: ctx.pariwarId,
        title: body.title,
        bodyMarkdown: body.body_markdown,
        titleHi: body.title_hi ?? null,
        bodyMarkdownHi: body.body_markdown_hi ?? null,
        audienceScope: body.audience_scope,
        audienceScopeValue: body.audience_scope_value ?? null,
        channels: body.channels,
        scheduledPublishAt: body.scheduled_publish_at ? new Date(body.scheduled_publish_at) : null,
        authorActorId: ids.userId(ctx.actorId),
      });
      emitTransitionAudit(ctx, 'news.created', row.postId, 201);
      void reply.status(201);
      return toNewsPostResponse(row);
    },

    /** PATCH edit a draft (draft-only; edit-locked once submitted). */
    async update(request: FastifyRequest): Promise<NewsPostResponse> {
      const ctx = ctxOf(request);
      const { postId } = request.params as { postId: string };
      const body = request.body as UpdateDraftRequest;
      const row = await newsBlog.updateDraft(request.scopeTx!.tx, ctx.pariwarId, ids.newsPostId(postId), {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.body_markdown !== undefined ? { bodyMarkdown: body.body_markdown } : {}),
        ...(body.title_hi !== undefined ? { titleHi: body.title_hi } : {}),
        ...(body.body_markdown_hi !== undefined ? { bodyMarkdownHi: body.body_markdown_hi } : {}),
        ...(body.audience_scope !== undefined ? { audienceScope: body.audience_scope } : {}),
        ...(body.audience_scope_value !== undefined ? { audienceScopeValue: body.audience_scope_value } : {}),
        ...(body.channels !== undefined ? { channels: body.channels } : {}),
        ...(body.scheduled_publish_at !== undefined
          ? { scheduledPublishAt: body.scheduled_publish_at ? new Date(body.scheduled_publish_at) : null }
          : {}),
      });
      emitTransitionAudit(ctx, 'news.updated', row.postId, 200);
      return toNewsPostResponse(row);
    },

    /** POST submit for review (draft → submitted; reviewer ≠ author; reviewer must hold `news.manage`). */
    async submit(request: FastifyRequest): Promise<NewsPostResponse> {
      const ctx = ctxOf(request);
      const { postId } = request.params as { postId: string };
      const body = request.body as SubmitRequest;
      // `reviewer_id` names who will later be REQUIRED to be the approver (write.ts's reviewer-lock at
      // `approve`) — validate up front that it resolves to an actual `news.manage` holder in this
      // Pariwar, or a post could be submitted to a reviewer who can never legally approve it (stuck
      // forever short of a raw DB edit).
      const reviewerGrants = await loadActorGrants(request.scopeTx!, body.reviewer_id);
      const reviewerCheck = rbac.checkPermission({
        actorId: body.reviewer_id,
        grants: reviewerGrants,
        key: NEWS_MANAGE_KEY,
        resource: { dimension: 'pariwar', value: ctx.pariwarId, pariwarId: ctx.pariwarId },
      });
      if (!reviewerCheck.ok) {
        throw new NewsPostAuthorReviewerError(
          postId,
          body.reviewer_id,
          'reviewer_id does not hold news.manage for this Pariwar and could never approve this post',
        );
      }
      const row = await newsBlog.submitForReview(
        request.scopeTx!.tx,
        ctx.pariwarId,
        ids.newsPostId(postId),
        ids.userId(body.reviewer_id),
      );
      emitTransitionAudit(ctx, 'news.submitted', row.postId, 200);
      return toNewsPostResponse(row);
    },

    /** POST approve (submitted → approved) + record the non-author tone-review sign-off. */
    async approve(request: FastifyRequest): Promise<NewsPostResponse> {
      const ctx = ctxOf(request);
      const { postId } = request.params as { postId: string };
      const now = deps.clock();
      const { row, signoff } = await newsBlog.approve(
        request.scopeTx!.tx,
        ctx.pariwarId,
        ids.newsPostId(postId),
        ids.userId(ctx.actorId),
        now,
      );
      // Record the tone-review sign-off through the dedicated audit seam (tone_review.signoff — NOT the
      // auth taxonomy, NO raw copy: only the contentHash). Best-effort / never-throw (the sink's contract).
      recordToneReviewSignoff(deps, {
        reviewedBy: signoff.reviewedBy,
        resourceLocator: signoff.resourceLocator,
        contentHash: signoff.contentHash,
        pariwarId: ctx.pariwarId,
        traceId: ctx.traceId,
      });
      emitTransitionAudit(ctx, 'news.approved', row.postId, 200);
      return toNewsPostResponse(row);
    },

    /** POST schedule (approved → scheduled) + enqueue the DELAYED publish job. */
    async schedule(request: FastifyRequest): Promise<NewsPostResponse> {
      const ctx = ctxOf(request);
      const { postId } = request.params as { postId: string };
      const body = request.body as ScheduleRequest;
      const at = new Date(body.scheduled_publish_at);
      const now = deps.clock();
      const row = await newsBlog.schedule(request.scopeTx!.tx, ctx.pariwarId, ids.newsPostId(postId), at, now);
      emitTransitionAudit(ctx, 'news.scheduled', row.postId, 200);
      // Enqueue the DELAYED publish job (best-effort; the worker owns the fan-out — crypto boundary).
      await deps.newsPublishQueue
        ?.enqueuePublish({
          postId: row.postId,
          pariwarId: ctx.pariwarId,
          mode: 'scheduled',
          at,
          requestId: ctx.traceId,
          actorId: ctx.actorId,
          traceId: ctx.traceId,
        })
        .catch((err: unknown) => request.log.warn({ err }, 'news: schedule enqueue failed (the sweep/native delay heals)'));
      return toNewsPostResponse(row);
    },

    /** POST publish immediately (approved → published) + enqueue the zero-delay fan-out job. */
    async publish(request: FastifyRequest): Promise<NewsPostResponse> {
      const ctx = ctxOf(request);
      const { postId } = request.params as { postId: string };
      const now = deps.clock();
      const row = await newsBlog.publish(request.scopeTx!.tx, ctx.pariwarId, ids.newsPostId(postId), now);
      emitTransitionAudit(ctx, 'news.published', row.postId, 200);
      // The transition is synchronous (a DB write, no crypto); the audience fan-out is enqueued to the
      // apps/jobs worker (MEMBER Tier-1 crypto lives there, not in this admin-identity path).
      await deps.newsPublishQueue
        ?.enqueuePublish({
          postId: row.postId,
          pariwarId: ctx.pariwarId,
          mode: 'immediate',
          requestId: ctx.traceId,
          actorId: ctx.actorId,
          traceId: ctx.traceId,
        })
        .catch((err: unknown) => request.log.warn({ err }, 'news: publish fan-out enqueue failed'));
      return toNewsPostResponse(row);
    },
  };
}

function clampInt(v: unknown, def: number, cap: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(1, Math.min(Math.trunc(n), cap));
}

/** A non-secret digest of the audited coordinates (never the copy). 64-hex sha256. */
function auditPayloadHash(action: string, postId: string): string {
  return createHash('sha256').update(`${action}:${postId}`, 'utf8').digest('hex');
}
