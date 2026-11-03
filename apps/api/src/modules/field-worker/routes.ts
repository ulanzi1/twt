// The field-worker REGISTRATION route — Story 13.1 (Task 7; QE9; AC8). The ONE route this story builds.
//
//   · POST …/p/:pariwarId/field-workers   → register a worker and allocate their attribution code (201 — ⛔ the code, QE22)
//
// The route IS the security control: an authenticated HUMAN admin session (`requireAdminSession`) → the scope hook (zero
// grants in this Pariwar ⇒ 404, so tenants cannot be probed) → `field_worker.register` at `dimension: 'district'`, the target
// being the BODY's `district` (QE9, TR12): `resolveValue` is SYNCHRONOUS (it reads the already-validated body, never the
// database) and returns `null` — which fails CLOSED — for anything but a string; a District Admin's grant matches by EXACT
// bytes (its own district only), a Pariwar Admin's covers any district of its Pariwar (the fill-in, `-441`). The gate stores
// its VERIFIED result on `request.authorizations['field_worker.register']` (QE18) — the handler passes that object on.
// The body is validated (400 `request.validation`) BEFORE the hooks run; the content rules are the handler's (422). The route
// declares its 201 response schema (the forced-pagination gate examines only routes that do).
// ⛔ A GET route (the lost-201 residual is TR11 — Story 13.1a builds the list), ⛔ a screen (Story 13.1a).

import { RegisterFieldWorkerRequest, RegisterFieldWorkerResponse } from '@twt/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { FIELD_WORKER_REGISTER_KEY, createFieldWorkerHandlers } from './handlers.js';

const TAG = 'field-workers';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

/** The gate's target: the body's REPORTING district, verbatim — `null` (deny) for anything that is not a string (TR12). */
export function registrationDistrict(request: FastifyRequest): string | null {
  const district = (request.body as { district?: unknown } | undefined)?.district;
  return typeof district === 'string' ? district : null;
}

export function registerFieldWorkerRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createFieldWorkerHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    '/api/v1/p/:pariwarId/field-workers',
    {
      schema: { params: PariwarParam, body: RegisterFieldWorkerRequest, response: { 201: RegisterFieldWorkerResponse }, tags: [TAG] },
      preHandler: [
        requireAdminSession(deps),
        scopeResolutionHook(deps),
        requirePermissionHook(deps, FIELD_WORKER_REGISTER_KEY, { dimension: 'district', resolveValue: registrationDistrict }),
      ],
    },
    h.register,
  );
}
