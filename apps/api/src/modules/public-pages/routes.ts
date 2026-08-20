// Story 11a.3 — the PUBLIC-PAGES routes (Task 3; AC1, AC6).
//
// ⛔ THIS MODULE IS DELIBERATELY UNAUTHENTICATED, AND THIS FILE IS ONE OF THE TWO PLACES THAT
// DECISION IS DEFENDED IN WRITING (the other is the `login-wall.spec.ts` allowlist entry, in the
// Story 10.21 AC-R1 style). The surface is `public` tier by Panel ruling (`2026-08-19-135`,
// affirmed by `-136`): the Member Directory is meant to be readable by anyone on the internet with
// no login, so there is no session to require. ⛔ Do not "fix" this by adding a session guard —
// that deletes the route's purpose, and there is no member session on this surface to add anyway
// (`2026-08-20-143` cl.7: members are token-bearer, there is no `apps/member-web`, and
// `apps/mobile` has no directory screen).
//
// ⭐ WHAT BOUNDS IT INSTEAD — four independent controls, each mechanized and each tested:
//   1. `config: { rateLimit: limits.search }` — the named SEARCH tier, UNMODIFIED. ⛔ Not
//      `limits.read` (the looser tier, and backwards for an enumeration surface), ⛔ not an inline
//      ad-hoc ceiling, and ⛔ NOT a hand-rolled `keyGenerator`: `limits.search` already keys on
//      `perSessionKey`, which falls through to `request.ip` for an unauthenticated caller, and
//      `trustProxy: true` makes `request.ip` read the forwarded chain. ⚠ The work of making that
//      key the VISITOR's rather than the SSR proxy's is `apps/public`'s forwarding — ⛔ not a
//      re-keying here. A `keyGenerator` override is exactly the ad-hoc deviation this clause
//      forbids, and it is asserted by test that two forwarded addresses land in DIFFERENT buckets.
//   2. The `.strict()` request schema — a bounded `limit` (so Story 1.14's forced-pagination guard,
//      which walks the committed OpenAPI surface, COVERS this route) and a bounded `page` (the
//      deep-pagination horizon). An unknown query parameter is a 400, which is what makes
//      `?format=csv` a refusal rather than an ignored no-op.
//   3. `X-Robots-Tag: noindex, nofollow` — ⚠ already stamped on EVERY response by the existing
//      global `onSend` hook. VERIFIED, ⛔ not rebuilt here.
//   4. The absence of a member-detail route and of any export affordance. ⛔ FR-91 forbids bulk
//      export from the public side; a per-member permalink is an enumeration primitive in its own
//      right and is in no AC.
//
// ⛔ NO SECOND ROUTE. One collection-returning GET. If a follow-up needs another, it needs its own
// allowlist entry, its own defence, and its own rate-limit choice — ⛔ never a quiet addition here.

import { PublicDirectoryQuery, PublicDirectoryResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { createPublicPagesHandlers } from './handlers.js';

const PUBLIC_PAGES_TAG = 'public-pages';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerPublicPagesRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createPublicPagesHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const limits = namedRateLimits(deps);

  r.get(
    '/api/v1/p/:pariwarId/public-pages/member-directory',
    {
      schema: {
        params: PariwarParam,
        querystring: PublicDirectoryQuery,
        response: { 200: PublicDirectoryResponse },
        tags: [PUBLIC_PAGES_TAG],
      },
      // ⛔ UNMODIFIED. See control 1 in the header before changing anything on this line.
      config: { rateLimit: limits.search },
    },
    h.memberDirectory,
  );
}
