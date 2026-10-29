// The Trust's announcement channels — routes (Story 5.14, Task 5; AC2, AC3). The admin three on the scoped chain [requireAdminSession,
// scopeResolutionHook, requirePermissionHook(pariwar.configure_channels)] (the channel-config precedent — 401 no session, 403 no
// permission); the member read on requireMemberSession (the member's OWN Pariwar from the session — F16). All four register in
// openapi/v1.yaml (the EXPECTED diff).

import {
  AnnouncementChannelsConfigResponse,
  AnnouncementChannelsConfigUpsertRequest,
  AnnouncementChannelsMemberResponse,
  AnnouncementPostsResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createAnnouncementChannelsHandlers } from './handlers.js';

const TAG = 'announcement-channels';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerAnnouncementChannelsRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createAnnouncementChannelsHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const chain = [requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, h.PARIWAR_CONFIGURE_CHANNELS_KEY)];
  // Review FD-P7 — the three ADMIN routes opt into the named per-session ceilings (§2.11; "every other GET route in the codebase opts into
  // this"). The Posts list is the one that matters: each row with words due decrypts a deceased member's name. The member read is a cheap
  // read of the member's own Pariwar's two links and stays on the global ceiling.
  const limits = namedRateLimits(deps);

  r.get(
    '/api/v1/p/:pariwarId/admin/announcement-channels',
    { schema: { params: PariwarParam, response: { 200: AnnouncementChannelsConfigResponse }, tags: [TAG] }, config: { rateLimit: limits.read }, preHandler: chain },
    h.getConfig,
  );
  r.put(
    '/api/v1/p/:pariwarId/admin/announcement-channels',
    {
      schema: { params: PariwarParam, body: AnnouncementChannelsConfigUpsertRequest, response: { 200: AnnouncementChannelsConfigResponse }, tags: [TAG] },
      config: { rateLimit: limits.write },
      preHandler: chain,
    },
    h.putConfig,
  );
  r.get(
    '/api/v1/p/:pariwarId/admin/announcement-channels/posts',
    { schema: { params: PariwarParam, response: { 200: AnnouncementPostsResponse }, tags: [TAG] }, config: { rateLimit: limits.read }, preHandler: chain },
    h.getPosts,
  );
  r.get(
    '/api/v1/member/announcement-channels',
    { schema: { response: { 200: AnnouncementChannelsMemberResponse }, tags: [TAG] }, preHandler: [requireMemberSession(deps)] },
    h.getMemberLinks,
  );
}
