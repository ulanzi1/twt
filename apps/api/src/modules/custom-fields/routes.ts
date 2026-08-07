// Per-Pariwar custom-field admin routes — Story 10.12 (Task 6; AC7).
//
// FOUR routes, all `[requireAdminSession, scopeResolutionHook, requirePermissionHook(...)]` gated
// (the 5.3 channel-config / 10.8 feature-flags precedent). The permission key is STATIC per route, so
// it is a real preHandler rather than an in-handler check.
//
// ⚠ THE READ/WRITE KEY SPLIT IS THE POINT. The two reads carry `pariwar.view_custom_fields`; the two
// writes carry `pariwar.manage_custom_fields`. A definition set is the tenant's DATA CONTRACT — what
// a Pariwar collects about its members and at what declared PII tier — so anyone auditing it must be
// able to READ without holding the authority to CHANGE. `auditor` holds the former and not the
// latter. If these ever collapse to one key, that transparency property goes with it (the 10.8
// doctrine, verbatim).
//
// ⚠ NO GLOBAL TIER, and there must not be one. Every route is under `/p/:pariwarId/`: a
// globally-authored custom field would be a schema change wearing a tenant's clothes. Contrast 10.8's
// feature flags, which DO have a global tier — a flag is a behaviour toggle the platform owns, a
// custom field is tenant data the tenant owns.
//
// ⚠ ONE POST FOR PUBLISH AND RETIRE. `retired_at` in the body routes to `retireDefinition()`. See
// handlers.ts's header for why a separate `/retire` route would be a governance hazard.

import {
  CustomFieldDefinitionsResponse,
  MemberCustomFieldsResponse,
  PublishCustomFieldDefinitionRequest,
  PublishCustomFieldDefinitionResponse,
  SetMemberCustomFieldsRequest,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createCustomFieldsHandlers } from './handlers.js';

const TAG = 'custom-fields';
const BASE = '/api/v1/p/:pariwarId/custom-fields';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
// `hostEntity` is bounded to the v1 host here as well as at the DB CHECK and in the domain
// validator — a path param that could name an unsupported host would 500 at the constraint rather
// than 400 at the boundary.
const DefinitionParam = z
  .object({
    pariwarId: z.string().uuid(),
    hostEntity: z.enum(['member']),
    fieldKey: z.string().min(1).max(64),
  })
  .strict();
const MemberParam = z.object({ pariwarId: z.string().uuid(), memberId: z.string().uuid() }).strict();

export function registerCustomFieldsRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createCustomFieldsHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const canView = requirePermissionHook(deps, h.CUSTOM_FIELD_VIEW_KEY);
  const canManage = requirePermissionHook(deps, h.CUSTOM_FIELD_MANAGE_KEY);
  const readChain = [adminSession, scope, canView];
  const writeChain = [adminSession, scope, canManage];

  // The in-force definition set + the full version history, in one read (see the handler's note on
  // why they are not two calls).
  r.get(
    `${BASE}/definitions`,
    {
      schema: { params: PariwarParam, response: { 200: CustomFieldDefinitionsResponse }, tags: [TAG] },
      preHandler: readChain,
    },
    h.listDefinitions,
  );

  // PUBLISH or RETIRE — one route. Runs the frozen-governance fence, the naked-PII detector, the
  // PII-tier gate and the cardinality bound before anything is written.
  r.post(
    `${BASE}/definitions/:hostEntity/:fieldKey/versions`,
    {
      schema: {
        params: DefinitionParam,
        body: PublishCustomFieldDefinitionRequest,
        response: { 200: PublishCustomFieldDefinitionResponse },
        tags: [TAG],
      },
      preHandler: writeChain,
    },
    h.publishDefinition,
  );

  // A member's stored envelope. Includes values for since-RETIRED fields — §1.7's deprecation window.
  r.get(
    `${BASE}/members/:memberId/values`,
    {
      schema: { params: MemberParam, response: { 200: MemberCustomFieldsResponse }, tags: [TAG] },
      preHandler: readChain,
    },
    h.readMemberValues,
  );

  // A WHOLE-SET replace (hence PUT, not PATCH). Unknown keys are REJECTED, never dropped — the D6
  // rule, and the JSONB analogue of the contracts layer's `.strict()`.
  r.put(
    `${BASE}/members/:memberId/values`,
    {
      schema: {
        params: MemberParam,
        body: SetMemberCustomFieldsRequest,
        response: { 200: MemberCustomFieldsResponse },
        tags: [TAG],
      },
      preHandler: writeChain,
    },
    h.setMemberValues,
  );
}
