// Banner/Popup admin routes — Story 10.9 (Task 4; AC1/AC4/AC5/AC6/AC7).
//
// SIX scope-gated admin routes — the banner authoring surface:
//   · GET   …/p/:pariwarId/banners                    → the paginated derived-state-filterable list
//   · POST  …/p/:pariwarId/banners                    → create a draft
//   · GET   …/p/:pariwarId/banners/:bannerId          → read one banner
//   · PATCH …/p/:pariwarId/banners/:bannerId          → the ONE unified edit (the server hash decides
//                                                       whether it is a re-reviewed copy REVISION)
//   · POST  …/p/:pariwarId/banners/:bannerId/publish  → draft → published (tone-gated)
//   · POST  …/p/:pariwarId/banners/:bannerId/retract  → draft|published → retracted (terminal)
//
// The route IS the security control: an authenticated HUMAN admin session + the NEW `banner.manage`
// key at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the tenant IS the target, resolvable
// with no geo-tree; the helpdesk.create / news.manage / feature_flag.* precedent). NOT step-up-gated
// (a banner publish is NOT freeze-firing and is NOT in the AR-24 list). The author≠publisher fairness
// rule needs no separate identity check: the shipped tone-review gate is already default-deny on
// `reviewedBy === authoredBy` (unlike 10.5, which needed one only because it also had a
// reviewer-ASSIGNMENT step).
//
// ⚠ There is deliberately no route that "activates" or "archives" a banner: `valid_from`/
// `valid_until` are a pure READ-TIME window (Decision 2). The MEMBER surface lives in
// `member-routes.ts` and touches NO RBAC key at all.

import {
  BannerListResponse,
  BannerResponse,
  CreateBannerRequest,
  PublishBannerRequest,
  RetractBannerRequest,
  UpdateBannerRequest,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createBannerHandlers } from './handlers.js';

const TAG = 'banners';

/** The NEW pariwar-dimension Banner/Popup admin key (Story 10.9, catalog v28). */
const BANNER_MANAGE_KEY = 'banner.manage';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const BannerParam = z.object({ pariwarId: z.string().uuid(), bannerId: z.string().uuid() }).strict();
const ListQuery = z
  .object({
    // The DERIVED display state (AC2) — five values, of which only `draft`/`retracted` correspond to
    // a stored status; `scheduled`/`live`/`expired` are window predicates against the server clock.
    display_state: z.enum(['draft', 'scheduled', 'live', 'expired', 'retracted']).optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .strict();

export function registerBannerRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createBannerHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  // banner.manage at dimension:'pariwar' (EXPLICIT — the target IS the tenant; resolveValue defaults
  // to scopeTx.pariwarId, the news.manage / helpdesk.create pariwar-wide precedent; no district —
  // district_admin is DEFERRED because a district-ceiling grant can never satisfy this check).
  const requireBanner = requirePermissionHook(deps, BANNER_MANAGE_KEY, { dimension: 'pariwar' });
  const guard = [adminSession, scope, requireBanner];

  r.get(
    '/api/v1/p/:pariwarId/banners',
    {
      schema: { params: PariwarParam, querystring: ListQuery, response: { 200: BannerListResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.list,
  );

  r.post(
    '/api/v1/p/:pariwarId/banners',
    {
      schema: { params: PariwarParam, body: CreateBannerRequest, response: { 201: BannerResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.create,
  );

  r.get(
    '/api/v1/p/:pariwarId/banners/:bannerId',
    {
      schema: { params: BannerParam, response: { 200: BannerResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.get,
  );

  r.patch(
    '/api/v1/p/:pariwarId/banners/:bannerId',
    {
      schema: { params: BannerParam, body: UpdateBannerRequest, response: { 200: BannerResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.update,
  );

  r.post(
    '/api/v1/p/:pariwarId/banners/:bannerId/publish',
    {
      schema: { params: BannerParam, body: PublishBannerRequest, response: { 200: BannerResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.publish,
  );

  r.post(
    '/api/v1/p/:pariwarId/banners/:bannerId/retract',
    {
      schema: { params: BannerParam, body: RetractBannerRequest, response: { 200: BannerResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.retract,
  );
}
