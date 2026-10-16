// The people-who-know-me CAMPAIGN routes — Story 6.36c (Task 4.2; AC7).
//
//   GET  /api/v1/p/:pariwarId/admin/known-people-campaigns                     → the list, newest first
//   POST /api/v1/p/:pariwarId/admin/known-people-campaigns                     → START  (IST dates, ≤ 30 days, ⛔ overlap)
//   POST /api/v1/p/:pariwarId/admin/known-people-campaigns/:campaignId/end     → END    (live, or a scheduled one — cancelled)
// `known_people.run_campaign` (pariwar dimension). ⛔ Step-up — a campaign shows a card and sends nothing (recorded).
// ⚠ Re-examination trigger (code review round 2): the ⛔ step-up holds ONLY while a campaign shows a card — re-examine it if a
// campaign ever sends or writes anything beyond showing a card (a message, a member-facing write, a list change).
// ⛔ Inside the member known-people module (member-session-gated) — this is an ADMIN surface.

import {
  KnownPeopleCampaignListQuery,
  KnownPeopleCampaignListResponse,
  KnownPeopleCampaignStartRequest,
  KnownPeopleCampaignWriteResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createKnownPeopleCampaignHandlers, KNOWN_PEOPLE_RUN_CAMPAIGN_KEY } from './handlers.js';

const TAG = 'known-people-campaigns';
const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const CampaignParam = z.object({ pariwarId: z.string().uuid(), campaignId: z.string().uuid() }).strict();

export function registerKnownPeopleCampaignRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createKnownPeopleCampaignHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const chain = [requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, KNOWN_PEOPLE_RUN_CAMPAIGN_KEY)];

  r.get(
    '/api/v1/p/:pariwarId/admin/known-people-campaigns',
    {
      schema: { params: PariwarParam, querystring: KnownPeopleCampaignListQuery, response: { 200: KnownPeopleCampaignListResponse }, tags: [TAG] },
      preHandler: chain,
    },
    h.list,
  );
  r.post(
    '/api/v1/p/:pariwarId/admin/known-people-campaigns',
    { schema: { params: PariwarParam, body: KnownPeopleCampaignStartRequest, response: { 201: KnownPeopleCampaignWriteResponse }, tags: [TAG] }, preHandler: chain },
    h.start,
  );
  r.post(
    '/api/v1/p/:pariwarId/admin/known-people-campaigns/:campaignId/end',
    { schema: { params: CampaignParam, response: { 200: KnownPeopleCampaignWriteResponse }, tags: [TAG] }, preHandler: chain },
    h.end,
  );
}
