// Member-facing banner handlers — Story 10.9 (Task 4; AC3/AC5/AC7/AC8).
//
// The member app's banner surface: the RESOLVED at-most-one-banner + at-most-one-popup read, and the
// idempotent dismiss write. Two rules are inherited VERBATIM from Story 10.2's member helpdesk
// surface ([[project_helpdesk_member_surface_102]]) and are the reason this file exists separately
// from `handlers.ts`:
//
// ── RLS ──────────────────────────────────────────────────────────────────────────────────────────
// There is NO scope-resolution HOOK on a member route (that middleware also computes RBAC grants,
// which members do not have) — so each handler opens its OWN RLS-scoped tx via `openScopeTx` and
// passes `scopeTx.tx` to the domain. It NEVER persists through an unscoped pool.
//
// ── 404, not 403 ─────────────────────────────────────────────────────────────────────────────────
// The member JWT is the tenancy authority. A `:pariwarId` path segment that does not match it is a
// 404 — indistinguishable from a non-existent resource, so there is no cross-tenant existence
// oracle. A 403 would confirm the tenant exists.
//
// ── Resolution happens HERE, on the server (AC5) ─────────────────────────────────────────────────
// The client receives a decided pair, not a candidate list: `resolveMemberBanners` applies the
// window, the dismissal-suppression join, the audience predicate and the pure total-order resolver.
// Every client therefore agrees on the winner, and the precedence rules exist in exactly one place.

import type { DismissBannerRequest, DismissBannerResponse, MemberBannerListResponse, MemberBannerResponse } from '@twt/contracts';
// The pure precedence resolver lives in @twt/contracts so the apps/admin browser bundle can call the
// SAME function for its AC5 visibility verdict (it cannot import @twt/domain, and @twt/domain cannot
// import @twt/contracts — a cycle). apps/api depends on both, so this is where the two halves meet:
// @twt/domain supplies the candidate set, @twt/contracts decides the winner.
import { resolveVisibleBanners } from '@twt/contracts';
import { banners as bannersDomain, ids, type schema } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

type BannerRow = schema.BannerRow;

/**
 * Project a domain row → the MEMBER wire DTO. Deliberately narrower than the admin projection: no
 * actor ids, no tone-signoff fields, no `audience_scope`/`audience_scope_value`, no `status`. A
 * member sees a banner because it is live; who wrote it, who reviewed it and which internal cohort
 * it was aimed at are not theirs to know. `valid_until` IS carried so the client can self-expire a
 * cached banner without another round trip.
 */
function toMemberBanner(row: BannerRow): MemberBannerResponse {
  return {
    banner_id: row.bannerId,
    title: row.title,
    body: row.body,
    title_hi: row.titleHi,
    body_hi: row.bodyHi,
    display_mode: row.displayMode,
    dismissible: row.dismissible,
    display_once_per_member: row.displayOncePerMember,
    severity: row.severity,
    revision: row.revision,
    valid_until: row.validUntil.toISOString(),
  };
}

export function createMemberBannerHandlers(deps: AppDeps) {
  /**
   * Read the authenticated member's (memberId, pariwarId) or fail 401; assert the path `pariwarId`
   * matches the session's (a member JWT is the tenancy authority — a mismatched path is treated as
   * not-found, no cross-tenant oracle). The 10.2 `memberCtx` contract, verbatim.
   */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const pathPariwarId = (request.params as { pariwarId?: string }).pariwarId;
    if (pathPariwarId && pathPariwarId !== pariwarIdStr) {
      throw new NotFoundError('Not found', 'banner.not_found');
    }
    return { memberIdStr, pariwarIdStr };
  }

  return {
    /**
     * GET /api/v1/p/:pariwarId/member/banners — the member's currently visible banner + popup,
     * RESOLVED server-side. Both fields may be non-null at once (independent lanes); a null field
     * means "nothing of that mode is visible to you right now", never an error.
     */
    async list(request: FastifyRequest): Promise<MemberBannerListResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const memberId = ids.memberId(memberIdStr);
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        // Two stages, one authority each: the domain applies status ∧ window ∧ dismissal-suppression
        // ∧ audience; the shared pure resolver picks at most one winner per lane.
        const candidates = await bannersDomain.listMemberBannerCandidates(scopeTx.tx, pariwarId, memberId, now, {
          info: (message, context) => request.log.info({ ...context }, message),
        });
        const resolved = resolveVisibleBanners(candidates, now);
        ok = true;
        return {
          banner: resolved.banner ? toMemberBanner(resolved.banner) : null,
          popup: resolved.popup ? toMemberBanner(resolved.popup) : null,
        };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST /api/v1/p/:pariwarId/member/banners/:bannerId/dismiss — record the member's
     * acknowledgement (AC3). Durable + server-side, so a reinstall or a second device cannot
     * resurrect a dismissed banner.
     *
     * The acted-on `revision` is read off the banner row inside the domain and is NOT a request
     * field: a client must not be able to suppress a revision it has never seen. IDEMPOTENT — a
     * replay upserts on the composite PK and answers 200 with the same (or a higher) revision.
     * A banner that does not exist in this tenant is a 404, the same shape as a `:pariwarId`
     * mismatch, so neither leaks the other's existence.
     */
    async dismiss(request: FastifyRequest): Promise<DismissBannerResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const memberId = ids.memberId(memberIdStr);
      const { bannerId: bannerIdStr } = request.params as { bannerId: string };
      const body = request.body as DismissBannerRequest;
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const row = await bannersDomain.recordDismissal(scopeTx.tx, {
          pariwarId,
          bannerId: ids.bannerId(bannerIdStr),
          memberId,
          kind: body.kind,
          now,
        });
        ok = true;
        return {
          banner_id: row.bannerId,
          dismissed_revision: row.dismissedRevision,
          kind: row.dismissalKind,
          dismissed_at: row.dismissedAt.toISOString(),
        };
      } catch (err) {
        // An absent banner is a clean read outcome, not a failed write — commit the (no-op) tx so
        // the 404 does not surface as a rollback-shaped 500.
        if (err instanceof bannersDomain.BannerNotFoundError) ok = true;
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
