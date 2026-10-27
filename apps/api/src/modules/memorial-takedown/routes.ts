// The helpline's take-down routes — Story 11b.4a, Task 7.2 (`#decision-2026-10-27-412` MP6). Every route: an admin session,
// the scope middleware (a Pariwar with ⛔ no grant ⇒ its `404 pariwar.not_found` first) and `memorial.takedown` at the pariwar
// dimension. ⭐ The admin step-up `memorial_takedown` guards the TAKE-DOWN act ONLY (`{ outcome: 'taken_down' }`) — `kept` and
// `superseded` change nothing public. ⛔ No route here obeys the memorial switch (MP13).

import {
  MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT,
  MemorialTakedownDriveResponse,
  MemorialTakedownMemberDrivesResponse,
  MemorialTakedownOpenRequestsResponse,
  MemorialTakedownOutcomeInput,
  MemorialTakedownOutcomeResponse,
  MemorialTakedownRequestInput,
  MemorialTakedownRequestListQuery,
  MemorialTakedownRequestResponse,
} from '@twt/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createMemorialTakedownHandlers } from './handlers.js';

const TAG = 'memorial-takedown';

/** MP6 — held by `helpline_operator` (+ derived `super_admin`). */
const MEMORIAL_TAKEDOWN_KEY = 'memorial.takedown';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const MemberParam = z.object({ pariwarId: z.string().uuid(), memberId: z.string().uuid() }).strict();
const PoolParam = z.object({ pariwarId: z.string().uuid(), poolId: z.string().uuid() }).strict();
const RequestParam = z.object({ pariwarId: z.string().uuid(), requestId: z.string().uuid() }).strict();

export function registerMemorialTakedownRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemorialTakedownHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const guards = [requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, MEMORIAL_TAKEDOWN_KEY, { dimension: 'pariwar' })];
  // ⭐ The step-up binds the TAKE-DOWN only — the body is validated before `preHandler` runs, so the outcome is known here.
  // `requireStepUp`'s hook is `async (request) => void` — it reads only the session — so it is awaited directly here.
  const stepUp = requireStepUp(deps, MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT) as unknown as (request: FastifyRequest) => Promise<void>;
  async function stepUpForTakedown(request: FastifyRequest): Promise<void> {
    if ((request.body as { outcome?: string } | undefined)?.outcome === 'taken_down') await stepUp(request);
  }

  r.get(
    '/api/v1/p/:pariwarId/memorial-takedowns/members/:memberId/drives',
    { schema: { params: MemberParam, response: { 200: MemorialTakedownMemberDrivesResponse }, tags: [TAG] }, preHandler: guards },
    h.memberDrives,
  );
  r.get(
    '/api/v1/p/:pariwarId/memorial-takedowns/drives/:poolId',
    { schema: { params: PoolParam, response: { 200: MemorialTakedownDriveResponse }, tags: [TAG] }, preHandler: guards },
    h.drive,
  );
  r.get(
    '/api/v1/p/:pariwarId/memorial-takedowns/requests',
    {
      schema: { params: PariwarParam, querystring: MemorialTakedownRequestListQuery, response: { 200: MemorialTakedownOpenRequestsResponse }, tags: [TAG] },
      preHandler: guards,
    },
    h.openRequests,
  );
  r.post(
    '/api/v1/p/:pariwarId/memorial-takedowns/drives/:poolId/requests',
    {
      schema: { params: PoolParam, body: MemorialTakedownRequestInput, response: { 201: MemorialTakedownRequestResponse }, tags: [TAG] },
      preHandler: guards,
    },
    async (request, reply) => {
      const out = await h.recordRequest(request);
      return reply.status(201).send(out);
    },
  );
  r.post(
    '/api/v1/p/:pariwarId/memorial-takedowns/requests/:requestId/outcome',
    {
      schema: { params: RequestParam, body: MemorialTakedownOutcomeInput, response: { 200: MemorialTakedownOutcomeResponse }, tags: [TAG] },
      preHandler: [...guards, stepUpForTakedown],
    },
    h.decide,
  );
}
