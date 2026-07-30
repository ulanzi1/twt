// News/Blog admin routes — Story 10.5 (Task 4; AC1/AC2/AC3/AC6).
//
// EIGHT scope-gated admin routes — the News/Blog authoring surface:
//   · GET   …/p/:pariwarId/news                     → the paginated status-filterable post list
//   · POST  …/p/:pariwarId/news                     → create a draft
//   · GET   …/p/:pariwarId/news/:postId             → read one post
//   · PATCH …/p/:pariwarId/news/:postId             → edit a draft (draft-only; edit-locked once submitted)
//   · POST  …/p/:pariwarId/news/:postId/submit      → draft → submitted (reviewer ≠ author, 403)
//   · POST  …/p/:pariwarId/news/:postId/approve     → submitted → approved (author ≠ approver, 403; tone gate)
//   · POST  …/p/:pariwarId/news/:postId/schedule    → approved → scheduled (enqueues the delayed publish)
//   · POST  …/p/:pariwarId/news/:postId/publish     → approved → published (enqueues the fan-out)
//
// The route IS the security control: an authenticated HUMAN admin session + the NEW `news.manage` key
// at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the tenant IS the target, resolvable with no
// geo-tree; the helpdesk.create / reconciliation.review precedent). NOT step-up-gated (news publish is
// NOT freeze-firing / not in AR-24). The author≠reviewer fairness rule is an IDENTITY check inside the
// domain write path (403), distinct from this RBAC gate (which BOTH author and reviewer hold —
// Decision 2). The PUBLIC read is served by apps/public (unauthenticated), NOT here.

import {
  ApproveRequest,
  CreateDraftRequest,
  NewsPostListResponse,
  NewsPostResponse,
  PublishRequest,
  ScheduleRequest,
  SubmitRequest,
  UpdateDraftRequest,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createNewsBlogHandlers } from './handlers.js';

const TAG = 'news';

/** The NEW pariwar-dimension News/Blog admin key (Story 10.5, catalog v25). */
const NEWS_MANAGE_KEY = 'news.manage';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const PostParam = z.object({ pariwarId: z.string().uuid(), postId: z.string().uuid() }).strict();
const ListQuery = z
  .object({
    status: z.enum(['draft', 'submitted', 'approved', 'scheduled', 'published']).optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .strict();

export function registerNewsBlogRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createNewsBlogHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  // news.manage at dimension:'pariwar' (EXPLICIT — the target IS the tenant; resolveValue defaults to
  // scopeTx.pariwarId, the helpdesk.create / reconciliation.review pariwar-wide precedent; no district).
  const requireNews = requirePermissionHook(deps, NEWS_MANAGE_KEY, { dimension: 'pariwar' });
  const guard = [adminSession, scope, requireNews];

  r.get(
    '/api/v1/p/:pariwarId/news',
    {
      schema: { params: PariwarParam, querystring: ListQuery, response: { 200: NewsPostListResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.list,
  );

  r.post(
    '/api/v1/p/:pariwarId/news',
    {
      schema: { params: PariwarParam, body: CreateDraftRequest, response: { 201: NewsPostResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.create,
  );

  r.get(
    '/api/v1/p/:pariwarId/news/:postId',
    {
      schema: { params: PostParam, response: { 200: NewsPostResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.get,
  );

  r.patch(
    '/api/v1/p/:pariwarId/news/:postId',
    {
      schema: { params: PostParam, body: UpdateDraftRequest, response: { 200: NewsPostResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.update,
  );

  r.post(
    '/api/v1/p/:pariwarId/news/:postId/submit',
    {
      schema: { params: PostParam, body: SubmitRequest, response: { 200: NewsPostResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.submit,
  );

  r.post(
    '/api/v1/p/:pariwarId/news/:postId/approve',
    {
      schema: { params: PostParam, body: ApproveRequest, response: { 200: NewsPostResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.approve,
  );

  r.post(
    '/api/v1/p/:pariwarId/news/:postId/schedule',
    {
      schema: { params: PostParam, body: ScheduleRequest, response: { 200: NewsPostResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.schedule,
  );

  r.post(
    '/api/v1/p/:pariwarId/news/:postId/publish',
    {
      schema: { params: PostParam, body: PublishRequest, response: { 200: NewsPostResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.publish,
  );
}
