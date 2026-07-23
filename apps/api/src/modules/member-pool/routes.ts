// My Pool home-card read routes — Story 8.2 (Task 2). The committed Epic-8 My Pool API surface.
//
// ONE route under /api/v1/member (member-session-gated, token-bearer like the member-home lock-in
// read): GET /active-contribution drives the topmost home-screen <ActiveContributionCard>.
// Session-guarded → automatically covered by the Story 1.14 login-wall CI gate; NOT added to the
// public allowlist (it is NOT public).

import {
  ActiveContributionCardResponse,
  ContributionHistoryResponse,
  PoolContributorListResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createMemberPoolHandlers } from './handlers.js';

const MEMBER_POOL_TAG = 'member-pool';

/**
 * The Contribution-Note render limit (Story 8.7, Task 4 / D9). Far stricter than the generic read
 * ceiling because a PDF render is orders of magnitude more expensive than any other member read in
 * this app — a member legitimately opens a handful of Notes in a sitting, never dozens per minute.
 * Per-MEMBER-keyed (`perMemberKey`, not `perSessionKey` — members are token-bearer and never populate
 * `request.session`), so it is a per-member cost bound, not a per-IP one; `hook: 'preHandler'` runs the
 * check after `requireMemberSession` so `request.requestContext.actorId` is already set. `onExceeded` +
 * `errorResponseBuilder` are inherited from the global rate-limit registration.
 */
const CONTRIBUTION_NOTE_RATE: RouteRateLimit = {
  max: 10,
  timeWindow: '1 minute',
  keyGenerator: perMemberKey,
  hook: 'preHandler',
};

export function registerMemberPoolRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberPoolHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  r.get(
    '/api/v1/member/active-contribution',
    {
      schema: { response: { 200: ActiveContributionCardResponse }, tags: [MEMBER_POOL_TAG] },
      preHandler: [memberSession],
    },
    h.activeContribution,
  );

  // Story 8.3 — the Live Contributor List read (confirmed rows + aggregate pending). Session-guarded →
  // auto-covered by the Story 1.14 login-wall CI gate; NOT public (Epic 11b owns the public Sahyog Vivran render).
  r.get(
    '/api/v1/member/pool-contributors',
    {
      schema: { response: { 200: PoolContributorListResponse }, tags: [MEMBER_POOL_TAG] },
      preHandler: [memberSession],
    },
    h.poolContributors,
  );

  // Story 8.6 — the Yogdaan Bahi contribution-history read (the member's OWN self-view, FR-12A). Session-
  // guarded → auto-covered by the Story 1.14 login-wall CI gate; NOT public (it is a member self-view).
  r.get(
    '/api/v1/member/contribution-history',
    {
      schema: { response: { 200: ContributionHistoryResponse }, tags: [MEMBER_POOL_TAG] },
      preHandler: [memberSession],
    },
    h.contributionHistory,
  );

  // Story 8.7 — the Yogdaan Pratigya (Contribution Note) PDF for ONE of the member's OWN contributions.
  // Session-guarded → auto-covered by the Story 1.14 login-wall CI gate; NOT public.
  //
  // Two things differ from its siblings and both are deliberate:
  //   · NO response schema — the body is `application/pdf` BYTES, not JSON. The path is documented by
  //     hand in the OpenAPI emitter (the Note has no JSON response shape to generate from).
  //   · A DEDICATED, STRICTER rate limit (not `named.read`): this is the only member endpoint in the
  //     app that spawns a browser render, which makes it the cheapest DoS surface here. The limit is
  //     per-member-keyed (`perMemberKey`, not the admin-only `perSessionKey`), and inherits the global
  //     audit emit + the ErrorResponse envelope on the 429.
  r.get(
    '/api/v1/member/contribution-note/:contributionId',
    {
      // `params` mirrors the hand-authored OpenAPI request schema (emit-openapi.ts) exactly, so the
      // enforced route matches the documented contract instead of relying on the handler's unchecked
      // `request.params as {...}` cast to reject a malformed id.
      schema: { params: z.object({ contributionId: z.string().min(1) }), tags: [MEMBER_POOL_TAG] },
      preHandler: [memberSession],
      config: { rateLimit: CONTRIBUTION_NOTE_RATE },
    },
    h.contributionNote,
  );
}
