// Banner/Popup admin handlers — Story 10.9 (Task 4; AC1/AC2/AC4/AC5/AC6).
//
// The banner authoring surface: the paginated derived-display-state-filtered list, the per-banner
// read, and the workflow writes (create / update / publish / retract). Every WRITE runs in the
// caller's request scope tx (the multi-tenant lifecycle hook COMMITs on a 2xx, ROLLBACKs otherwise);
// the domain accessors never self-commit. Every action is audit-logged (Story 1.10 global chain);
// `publish` and the REVISION arm of `update` ADDITIONALLY record the non-author tone-review sign-off
// through the dedicated `ToneReviewAuditSink` (never the raw copy — a `contentHash`).
//
// ── There is NOTHING to enqueue here (Decision 2) ────────────────────────────────────────────
// UNLIKE 10.5's news handlers, `publish` does NOT enqueue anything: a banner's activation and
// auto-archive are pure read-time window predicates, not jobs. And UNLIKE 10.4/10.5 there is no
// fan-out at all (the epic AC: banners are in-app, NOT channel-dispatched), so the crypto-boundary
// concern that pushed fan-out into apps/jobs does not arise — nothing fans out.
//
// ── The DERIVED display state is computed HERE, at the server's `now` ────────────────────────
// `display_state` is projected onto every response by `deriveBannerDisplayState(row, deps.clock())`.
// It is never stored, and a client that caches the DTO across a window boundary will hold a stale
// value — which is correct: the server's clock is the authority (AC2).

import { createHash } from 'node:crypto';

import type {
  BannerDisplayState,
  BannerListResponse,
  BannerResponse,
  CreateBannerRequest,
  UpdateBannerRequest,
} from '@twt/contracts';
// The DERIVED display state is read-time presentation policy and lives in @twt/contracts, not
// @twt/domain — the apps/admin browser bundle must call the SAME function and cannot import domain.
import { deriveBannerDisplayState } from '@twt/contracts';
import { audit, banners as bannersDomain, ids, type schema } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { recordToneReviewSignoff } from '../tone-review/index.js';

/**
 * The audit action names for the five auditable actions (Story 1.10 taxonomy — dotted, past-tense).
 * `banner.revised` is DISTINCT from `banner.updated` on purpose: a revision is the only edit that
 * changes what members see AND invalidates every prior dismissal, so it must be separable in the
 * audit trail from "the admin extended the window by a day".
 */
type BannerAuditAction =
  | 'banner.created'
  | 'banner.updated'
  | 'banner.revised'
  | 'banner.published'
  | 'banner.retracted';

type BannerRow = schema.BannerRow;

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/** Project a domain row → the admin wire DTO (camelCase → snake_case) + the derived display state. */
function toBannerResponse(row: BannerRow, now: Date): BannerResponse {
  return {
    banner_id: row.bannerId,
    pariwar_id: row.pariwarId,
    title: row.title,
    body: row.body,
    title_hi: row.titleHi,
    body_hi: row.bodyHi,
    audience_scope: row.audienceScope,
    audience_scope_value: row.audienceScopeValue,
    valid_from: row.validFrom.toISOString(),
    valid_until: row.validUntil.toISOString(),
    display_mode: row.displayMode,
    dismissible: row.dismissible,
    display_once_per_member: row.displayOncePerMember,
    severity: row.severity,
    revision: row.revision,
    status: row.status,
    display_state: deriveBannerDisplayState(row, now),
    created_by_actor_id: row.createdByActorId,
    tone_signoff_content_hash: row.toneSignoffContentHash,
    tone_signoff_reviewed_at: iso(row.toneSignoffReviewedAt),
    tone_signoff_reviewed_by: row.toneSignoffReviewedBy,
    published_at: iso(row.publishedAt),
    retracted_at: iso(row.retractedAt),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

interface ActorCtx {
  actorId: string;
  pariwarId: ids.PariwarId;
  traceId: string;
}

export function createBannerHandlers(deps: AppDeps) {
  function ctxOf(request: FastifyRequest): ActorCtx {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId), traceId: request.requestContext.traceId };
  }

  /** Fire-and-forget action audit (Story 1.10 global chain) — never throws into the request path. */
  function emitAudit(ctx: ActorCtx, action: BannerAuditAction, bannerId: string, status: number): void {
    const input: audit.AuditEntryInput = {
      pariwarId: ctx.pariwarId,
      actorId: ctx.actorId,
      actorRole: null,
      action,
      resourceLocator: bannersDomain.bannerResourceLocator(bannerId),
      // The authored copy is NEVER audited; hash the non-secret locator+action for the payload digest.
      requestPayloadHash: auditPayloadHash(action, bannerId),
      responseStatus: status,
      traceId: ctx.traceId,
    };
    void audit.writeAuditEntry(deps.servicePool, input).catch((err: unknown) => {
      console.error('[banner-audit] failed to persist action audit line', JSON.stringify({ action, error: String(err) }));
    });
  }

  return {
    /** GET the Pariwar's banners (paginated, derived-display-state filterable). */
    async list(request: FastifyRequest): Promise<BannerListResponse> {
      const ctx = ctxOf(request);
      const now = deps.clock();
      const q = request.query as { display_state?: BannerDisplayState; limit?: number; offset?: number };
      // Capped at 199, one below the domain accessor's hard `clampLimit` ceiling (200) — the
      // "fetch one extra to detect hasMore" trick below requests `limit + 1`, and if that request
      // itself hit 201 it would be re-clamped back down to 200 by the accessor, making `hasMore`
      // always false at the boundary (the 10.5 news-list finding, applied here rather than repeated).
      // Default 50, matching the admin console's own hardcoded default (apps/admin/src/api/client.ts
      // `listBanners`) — omitting `limit` from a future caller should get the same page size the
      // console itself always requests, not a silently different one.
      const limit = clampInt(q.limit, 50, 199);
      const offset = Math.max(0, Number(q.offset ?? 0) || 0);
      const rows = await bannersDomain.listBannersForPariwar(request.scopeTx!.tx, ctx.pariwarId, now, {
        displayState: q.display_state,
        limit: limit + 1,
        offset,
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      return {
        items: page.map((r) => toBannerResponse(r, now)),
        next_offset: hasMore ? offset + limit : null,
      };
    },

    /** GET a single banner (admin). */
    async get(request: FastifyRequest): Promise<BannerResponse> {
      const ctx = ctxOf(request);
      const { bannerId } = request.params as { bannerId: string };
      const row = await bannersDomain.getBannerOrThrow(request.scopeTx!.tx, ctx.pariwarId, ids.bannerId(bannerId));
      return toBannerResponse(row, deps.clock());
    },

    /** POST create a draft. */
    async create(request: FastifyRequest, reply: FastifyReply): Promise<BannerResponse> {
      const ctx = ctxOf(request);
      const body = request.body as CreateBannerRequest;
      const row = await bannersDomain.createDraft(request.scopeTx!.tx, {
        pariwarId: ctx.pariwarId,
        title: body.title ?? null,
        body: body.body ?? null,
        titleHi: body.title_hi ?? null,
        bodyHi: body.body_hi ?? null,
        audienceScope: body.audience_scope,
        audienceScopeValue: body.audience_scope_value ?? null,
        validFrom: new Date(body.valid_from),
        validUntil: new Date(body.valid_until),
        displayMode: body.display_mode,
        dismissible: body.dismissible,
        displayOncePerMember: body.display_once_per_member ?? false,
        severity: body.severity,
        createdByActorId: ids.userId(ctx.actorId),
      });
      emitAudit(ctx, 'banner.created', row.bannerId, 201);
      void reply.status(201);
      return toBannerResponse(row, deps.clock());
    },

    /**
     * PATCH edit a banner — the ONE unified edit (Decision 5). The SERVER's content hash decides
     * whether this was a copy revision: on a published banner a copy change requires a fresh
     * non-author tone-review sign-off (409 without one) and bumps `revision`, invalidating every
     * prior dismissal. The client never declares its intent, so it cannot edit copy while claiming
     * not to.
     */
    async update(request: FastifyRequest): Promise<BannerResponse> {
      const ctx = ctxOf(request);
      const { bannerId } = request.params as { bannerId: string };
      const body = request.body as UpdateBannerRequest;
      const now = deps.clock();
      const { row, revised, signoff } = await bannersDomain.updateBanner(
        request.scopeTx!.tx,
        ctx.pariwarId,
        ids.bannerId(bannerId),
        {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.body !== undefined ? { body: body.body } : {}),
          ...(body.title_hi !== undefined ? { titleHi: body.title_hi } : {}),
          ...(body.body_hi !== undefined ? { bodyHi: body.body_hi } : {}),
          ...(body.audience_scope !== undefined ? { audienceScope: body.audience_scope } : {}),
          ...(body.audience_scope_value !== undefined ? { audienceScopeValue: body.audience_scope_value } : {}),
          ...(body.valid_from !== undefined ? { validFrom: new Date(body.valid_from) } : {}),
          ...(body.valid_until !== undefined ? { validUntil: new Date(body.valid_until) } : {}),
          ...(body.display_mode !== undefined ? { displayMode: body.display_mode } : {}),
          ...(body.dismissible !== undefined ? { dismissible: body.dismissible } : {}),
          ...(body.display_once_per_member !== undefined
            ? { displayOncePerMember: body.display_once_per_member }
            : {}),
          ...(body.severity !== undefined ? { severity: body.severity } : {}),
        },
        ids.userId(ctx.actorId),
        now,
      );
      if (revised && signoff) {
        // A copy revision re-binds the sign-off — record it through the dedicated audit seam
        // (tone_review.signoff — NOT the auth taxonomy, NO raw copy: only the contentHash).
        recordToneReviewSignoff(deps, {
          reviewedBy: signoff.reviewedBy,
          resourceLocator: signoff.resourceLocator,
          contentHash: signoff.contentHash,
          pariwarId: ctx.pariwarId,
          traceId: ctx.traceId,
        });
      }
      emitAudit(ctx, revised ? 'banner.revised' : 'banner.updated', row.bannerId, 200);
      return toBannerResponse(row, now);
    },

    /** POST publish (draft → published) + record the non-author tone-review sign-off. */
    async publish(request: FastifyRequest): Promise<BannerResponse> {
      const ctx = ctxOf(request);
      const { bannerId } = request.params as { bannerId: string };
      const now = deps.clock();
      const { row, signoff } = await bannersDomain.publish(
        request.scopeTx!.tx,
        ctx.pariwarId,
        ids.bannerId(bannerId),
        ids.userId(ctx.actorId),
        now,
      );
      recordToneReviewSignoff(deps, {
        reviewedBy: signoff.reviewedBy,
        resourceLocator: signoff.resourceLocator,
        contentHash: signoff.contentHash,
        pariwarId: ctx.pariwarId,
        traceId: ctx.traceId,
      });
      emitAudit(ctx, 'banner.published', row.bannerId, 200);
      // NOTHING is enqueued and nothing fans out (Decision 2 + the in-app-only epic AC). The banner
      // becomes visible when the clock passes `valid_from`, on the next member read.
      return toBannerResponse(row, now);
    },

    /** POST retract (draft → retracted as a discard, or published → retracted). Terminal. */
    async retract(request: FastifyRequest): Promise<BannerResponse> {
      const ctx = ctxOf(request);
      const { bannerId } = request.params as { bannerId: string };
      const now = deps.clock();
      const row = await bannersDomain.retract(request.scopeTx!.tx, ctx.pariwarId, ids.bannerId(bannerId), now);
      emitAudit(ctx, 'banner.retracted', row.bannerId, 200);
      return toBannerResponse(row, now);
    },
  };
}

function clampInt(v: unknown, def: number, cap: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(1, Math.min(Math.trunc(n), cap));
}

/** A non-secret digest of the audited coordinates (never the copy). 64-hex sha256. */
function auditPayloadHash(action: string, bannerId: string): string {
  return createHash('sha256').update(`${action}:${bannerId}`, 'utf8').digest('hex');
}
