// The admin MODULE routes — Story 12.2 (`2026-11-01-433`; Task 5.1).
//
// EIGHT scope-gated admin routes under the path `packages/contracts/src/modules/README.md` reserved:
//   · GET  …/p/:pariwarId/modules                      → the cursor list (`state?`, `limit` ≤ 200, `cursor?`)
//   · GET  …/p/:pariwarId/modules/scope-options        → the audience picker's places (QE5)
//   · GET  …/p/:pariwarId/modules/partners             → the Pariwar's partners (`limit` 1–200; ⛔ cursor)
//   · POST …/p/:pariwarId/modules/partners             → register a partner
//   · POST …/p/:pariwarId/modules                      → author a draft
//   · GET  …/p/:pariwarId/modules/:moduleId            → one module (admin shape)
//   · POST …/p/:pariwarId/modules/:moduleId/publish    → publish (a NON-author; step-up `module_publish` — I5)
//   · POST …/p/:pariwarId/modules/:moduleId/withdraw   → archive `trustee_archived` (⛔ step-up — QE10)
//
// The route IS the security control: an authenticated HUMAN admin session (`requireAdminSession` — the login-wall gate)
// → the scope hook (zero grants in this Pariwar ⇒ 404, so tenants cannot be probed; a super_admin needs a grant ROW here)
// → `module.manage` at `dimension: 'pariwar'` (value = the tenant — a narrower grant is INERT, QE2). Static segments
// (`scope-options`, `partners`) beat the `:moduleId` param in find-my-way. EVERY route declares its 200 / 201 response
// schema — the forced-pagination gate examines only routes that do (G7, TR18).

import {
  AuthorModuleRequest,
  AuthorModuleResponse,
  CreateModulePartnerRequest,
  MODULE_PUBLISH_STEP_UP_CONTEXT,
  ModuleDetailResponse,
  ModuleListQuery,
  ModuleListResponse,
  ModulePartnerListQuery,
  ModulePartnerListResponse,
  ModulePartnerResponse,
  ModuleScopeOptionsResponse,
  PublishModuleRequest,
  PublishModuleResponse,
  WithdrawModuleRequest,
  WithdrawModuleResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createMarketplaceHandlers } from './handlers.js';

const TAG = 'modules';

/** The partner-module surface's ONE key (Story 12.2 QE2, catalog v57). */
export const MODULE_MANAGE_KEY = 'module.manage';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const ModuleParam = z.object({ pariwarId: z.string().uuid(), moduleId: z.string().uuid() }).strict();

export function registerMarketplaceRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMarketplaceHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const guard = [
    requireAdminSession(deps),
    scopeResolutionHook(deps),
    requirePermissionHook(deps, MODULE_MANAGE_KEY, { dimension: 'pariwar' }),
  ];

  r.get(
    '/api/v1/p/:pariwarId/modules',
    {
      schema: { params: PariwarParam, querystring: ModuleListQuery, response: { 200: ModuleListResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.list,
  );

  r.get(
    '/api/v1/p/:pariwarId/modules/scope-options',
    { schema: { params: PariwarParam, response: { 200: ModuleScopeOptionsResponse }, tags: [TAG] }, preHandler: guard },
    h.scopeOptions,
  );

  r.get(
    '/api/v1/p/:pariwarId/modules/partners',
    {
      schema: {
        params: PariwarParam,
        querystring: ModulePartnerListQuery,
        response: { 200: ModulePartnerListResponse },
        tags: [TAG],
      },
      preHandler: guard,
    },
    h.listPartners,
  );

  r.post(
    '/api/v1/p/:pariwarId/modules/partners',
    {
      schema: {
        params: PariwarParam,
        body: CreateModulePartnerRequest,
        response: { 201: ModulePartnerResponse },
        tags: [TAG],
      },
      preHandler: guard,
    },
    h.createPartner,
  );

  r.post(
    '/api/v1/p/:pariwarId/modules',
    {
      schema: { params: PariwarParam, body: AuthorModuleRequest, response: { 201: AuthorModuleResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.author,
  );

  r.get(
    '/api/v1/p/:pariwarId/modules/:moduleId',
    { schema: { params: ModuleParam, response: { 200: ModuleDetailResponse }, tags: [TAG] }, preHandler: guard },
    h.get,
  );

  r.post(
    '/api/v1/p/:pariwarId/modules/:moduleId/publish',
    {
      schema: { params: ModuleParam, body: PublishModuleRequest, response: { 200: PublishModuleResponse }, tags: [TAG] },
      // The step-up is checked LAST — after the session, the scope and the key (the workplaces / memorial order).
      preHandler: [...guard, requireStepUp(deps, MODULE_PUBLISH_STEP_UP_CONTEXT)],
    },
    h.publish,
  );

  r.post(
    '/api/v1/p/:pariwarId/modules/:moduleId/withdraw',
    {
      schema: { params: ModuleParam, body: WithdrawModuleRequest, response: { 200: WithdrawModuleResponse }, tags: [TAG] },
      preHandler: guard,
    },
    h.withdraw,
  );
}
