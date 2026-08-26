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
// ⭐ WHAT BOUNDS IT INSTEAD — FIVE independent controls, each mechanized and each tested.
// ⚠ FIVE, matching `login-wall.spec.ts`'s allowlist entry exactly. This list used to say FOUR (it
// folded the page-size cap and the page horizon into one bullet) while that entry said FIVE — two
// files both nominated as the authoritative written defence of a deliberately-unauthenticated PII
// route, disagreeing on how many controls exist. ⛔ Keep the two counts identical.
//   1. `config: { rateLimit: limits.search }` — the named SEARCH tier, UNMODIFIED. ⛔ Not
//      `limits.read` (the looser tier, and backwards for an enumeration surface), ⛔ not an inline
//      ad-hoc ceiling, and ⛔ NOT a hand-rolled `keyGenerator`: `limits.search` already keys on
//      `perSessionKey`, which falls through to `request.ip` for an unauthenticated caller, and
//      `trustProxy: true` makes `request.ip` read the forwarded chain. ⚠ The work of making that
//      key the VISITOR's rather than the SSR proxy's is `apps/public`'s forwarding — ⛔ not a
//      re-keying here. A `keyGenerator` override is exactly the ad-hoc deviation this clause
//      forbids, and it is asserted by test that two forwarded addresses land in DIFFERENT buckets.
//      ⭐ AND `apps/public` FORWARDS ONLY `Astro.clientAddress` (`2026-08-21-145` cl.2). It used to
//      APPEND that to the browser's inbound `X-Forwarded-For`, and since `trustProxy` reads the
//      LEFTMOST entry, the caller was choosing this key. ⛔ Never restore the inbound chain.
//   2. A bounded `limit` in the `.strict()` request schema — the page-size cap
//      (`PUBLIC_SURFACE_PAGE_SIZE_CAP` = 50), which is also what makes Story 1.14's
//      forced-pagination guard COVER this route.
//   3. A bounded `page` — the deep-pagination HORIZON (`PUBLIC_DIRECTORY_PAGE_HORIZON` = 200),
//      the ceiling that actually bounds a full walk, since offset paging was KEPT (D2(a)).
//      ⚠ A separate control from the cap: the cap bounds ONE request, the horizon bounds the WALK.
//      An unknown query parameter is a 400, which is what makes `?format=csv` a refusal rather
//      than an ignored no-op.
//   4. `X-Robots-Tag: noindex, nofollow` — ⚠ already stamped on EVERY response by the existing
//      global `onSend` hook. VERIFIED, ⛔ not rebuilt here.
//   5. The absence of a member-detail route and of any export affordance. ⛔ FR-91 forbids bulk
//      export from the public side; a per-member permalink is an enumeration primitive in its own
//      right and is in no AC.
//
// ── ⭐ THE TWO-ROUTE RULE (Story 11b.1) — ⛔ THIS CLAUSE IS UPDATED, ⛔ NOT DELETED ─────────────
// This header used to read *"⛔ NO SECOND ROUTE. One collection-returning GET. If a follow-up needs
// another, it needs its own allowlist entry, its own defence, and its own rate-limit choice —
// ⛔ never a quiet addition here."*
//
// ⭐ THAT CLAUSE DID EXACTLY WHAT IT WAS WRITTEN TO DO. Story 11b.1 needed a second route, and the
// clause named its price: an allowlist entry, a written defence, a deliberate rate-limit choice.
// All three were paid. ⇒ the rule is now TWO collection-returning GETs, and the SAME price stands
// for a third — ⛔ still never a quiet addition here.
//
// ⚠ BOTH ROUTES ARE DEFENDED BY THE SAME FIVE CONTROLS ABOVE, and that is a finding rather than a
// convenience: the controls are properties of "an unauthenticated, paginated, PII-bearing public
// collection", ⛔ not of the Member Directory specifically. A third route that CANNOT reuse them
// unchanged is a third route that needs its own ruling, ⛔ not its own bullet list.
//
// ⭐ WHAT THE SECOND ROUTE ADDS THAT THE FIRST DOES NOT HAVE — a per-subject CONSENT gate
// (`sahyog_drive_publication`, 11b.1 AC12), evaluated BEFORE the Tier-1 decrypt so an unconsented
// row costs zero KMS calls. ⚠ It gates the NAME, ⛔ never the ROW: an unconsented drive still
// renders in full, so the index degrades PER-POOL, ⛔ never per-page. ⛔ The Member Directory has no
// such gate and is ⛔ not made to have one by this addition.
//
// ⛔⛔ AND BUILT IS ⛔ NOT PUBLISHED. Three independent gates stand between the Sahyog Drive route
// and a live page — counsel's HELD DPDPA review of this exact subject (`2026-08-24-157` cl.3(a),
// returning 2026-09-07), Row 17's ≥2-trustee publication posture extended by C-5 (this surface has
// ⛔ no ratification of its own), and the per-subject consent gate. ⛔ Registering this route closes
// NONE of them, and ⛔ nothing here may be read as enabling the surface for any Pariwar.
// ⚠ Counsel HAS NOT REVIEWED this subject — ⛔ never write that counsel is not engaged, which has
// been false since 2026-06-21 (`2026-08-24-158`).

import {
  PublicDirectoryQuery,
  PublicDirectoryResponse,
  PublicSahyogDriveQuery,
  PublicSahyogDriveResponse,
} from '@twt/contracts';
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

  // ── Story 11b.1 — the SECOND collection-returning GET (D6(a)) ────────────────────────────────
  // ⭐ ITS OWN DEFENCE IS THE HEADER'S TWO-ROUTE CLAUSE + THE FIVE CONTROLS, reused UNCHANGED and
  // deliberately: see the header for why reusing them is a finding rather than a shortcut.
  // ⚠ Its own `login-wall.spec.ts` allowlist entry states the SAME control count — ⛔ two
  // authoritative documents disagreeing on how many controls exist is the defect this file records
  // having already had once.
  r.get(
    '/api/v1/p/:pariwarId/public-pages/sahyog-drive',
    {
      schema: {
        params: PariwarParam,
        querystring: PublicSahyogDriveQuery,
        response: { 200: PublicSahyogDriveResponse },
        tags: [PUBLIC_PAGES_TAG],
      },
      // ⛔ UNMODIFIED, and the SAME named tier as the directory. See control 1 in the header before
      // changing anything on this line. ⛔ Not `limits.read` (looser, and backwards for an
      // enumeration surface), ⛔ not an inline ceiling, ⛔ not a hand-rolled `keyGenerator`.
      config: { rateLimit: limits.search },
    },
    h.sahyogDrive,
  );
}
