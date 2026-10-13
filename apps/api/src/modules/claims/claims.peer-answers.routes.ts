// The APPROVERS' READ of the neighbours' answers — Story 6.27b (PM24; `2026-10-10-310` CF2).
//   · GET …/admin/claims/:claimCaseId/peer-answers → the console's peer-mesh section, for a later approver
//
// The route IS the first control: an authenticated HUMAN admin session + `cycle.freeze` at `dimension: 'pariwar'` (the
// cycle-freeze route's hook shape — it admits exactly `pariwar_admin` and `super_admin`, every v1 later approver; a
// District Admin or a verifier ⇒ 403) + tenant match — fail-closed, audited. The handler then admits the read ONLY at a
// later approving step (four arms — the handlers' header); anything else is ONE 404.
// The `schema.response` IS the OpenAPI registration (swagger reads it at runtime). A single-object GET — ⛔ a collection.

import { ClaimPeerAnswersResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createPeerAnswersHandlers, PEER_ANSWERS_GATE_KEY } from './claims.peer-answers.handlers.js';

const TAG = 'peer-answers';

const PeerAnswersParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();

export function registerPeerAnswersRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createPeerAnswersHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/peer-answers',
    {
      schema: { params: PeerAnswersParam, response: { 200: ClaimPeerAnswersResponse }, tags: [TAG] },
      preHandler: [
        requireAdminSession(deps),
        scopeResolutionHook(deps),
        requirePermissionHook(deps, PEER_ANSWERS_GATE_KEY, { dimension: 'pariwar' }),
      ],
    },
    h.getPeerAnswers,
  );
}
