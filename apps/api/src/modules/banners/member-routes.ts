// Member-facing banner routes — Story 10.9 (Task 4; AC3/AC7/AC8).
//
// TWO routes under `/api/v1/p/:pariwarId/member/banners…`, member-session-gated
// (`requireMemberSession` — auto-covered by the Story 1.14 login-wall CI gate via the
// MEMBER_SESSION_GUARD tag; NOT public, so no allowlist entry):
//   · GET  …/member/banners                      → the RESOLVED at-most-one-banner + one-popup pair
//   · POST …/member/banners/:bannerId/dismiss    → the idempotent per-member acknowledgement
//
// ── NO RBAC key, NO scope-resolution hook (AC7) ──────────────────────────────────────────────
// Deliberate, and the mirror image of the admin routes. `scopeResolutionHook` also computes RBAC
// grants, which members do not have; the member JWT is the tenancy authority and the handler opens
// its OWN RLS tx via `openScopeTx`. A `:pariwarId` that does not match the token is a 404, never a
// 403 (a 403 would confirm the tenant exists). The 10.2 member-helpdesk pattern, verbatim.
//
// ── Rate limit (FR-88) ───────────────────────────────────────────────────────────────────────
// The dismiss route carries the FR-88 protected-surface WRITE rate-limit, keyed PER-MEMBER
// (`perMemberKey`, `hook:'preHandler'`) — NOT `namedRateLimits.write` (which is `perSessionKey` and
// falls through to the shared IP for token-bearer members, rate-limiting every member behind a NAT
// together). The per-member key is the correct member-route budget (the 10.2 helpdesk /
// contribution-note precedent). The GET is a plain read and carries no write budget.

import { DismissBannerRequest, DismissBannerResponse, MemberBannerListResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createMemberBannerHandlers } from './member-handlers.js';

const TAG = 'banners';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const BannerParam = z.object({ pariwarId: z.string().uuid(), bannerId: z.string().uuid() }).strict();

export function registerMemberBannerRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberBannerHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  // Per-member FR-88 write budget (see the header). `hook:'preHandler'` so `actorId` is set first.
  const memberWrite: RouteRateLimit = {
    max: deps.config.writeRateMax,
    timeWindow: '1 minute',
    keyGenerator: perMemberKey,
    hook: 'preHandler',
  };

  // GET — the member's currently visible banner + popup, already resolved server-side.
  r.get(
    '/api/v1/p/:pariwarId/member/banners',
    {
      schema: { params: PariwarParam, response: { 200: MemberBannerListResponse }, tags: [TAG] },
      preHandler: [memberSession],
    },
    h.list,
  );

  // POST — record a dismissal (or the automatic display-once `shown` acknowledgement). Idempotent.
  r.post(
    '/api/v1/p/:pariwarId/member/banners/:bannerId/dismiss',
    {
      schema: {
        params: BannerParam,
        body: DismissBannerRequest,
        response: { 200: DismissBannerResponse },
        tags: [TAG],
      },
      config: { rateLimit: memberWrite },
      preHandler: [memberSession],
    },
    h.dismiss,
  );
}
