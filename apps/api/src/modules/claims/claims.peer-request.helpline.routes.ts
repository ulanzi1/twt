// The neighbours' answer screens — the HELPLINE routes (Story 6.27a PM12; `2026-10-10-311`). Handlers:
// `claims.peer-request.handlers.ts` (shared with the member routes).
//
//   · GET  /api/v1/p/:pariwarId/admin/claims/helpline/members/:memberId/peer-requests?limit=                     — the caller's OPEN requests (AUDITED)
//   · PUT  /api/v1/p/:pariwarId/admin/claims/helpline/members/:memberId/peer-requests/:pingId/answers/:questionKey — record ONE answer
//   · POST /api/v1/p/:pariwarId/admin/claims/helpline/members/:memberId/peer-requests/:pingId/submit             — lock the reply
// ⭐ Second-pass review S12 (BigDev 2026-10-13, "bind and audit"): the writes carry the caller's `:memberId` — PM12's
// original ping-only paths let an operator write ANY texted ping in the Pariwar. The writes take an Idempotency-Key (S18).
//
// ⭐ 6.3's chain on EVERY route: [requireAdminSession, scopeResolutionHook, requirePermissionHook('claim.file'),
// requireStepUp('claim_file')] — ⛔ no new key (a reuse, 6.21b D5's precedent); ⛔ no step-up ⇒ refused. ENROLLED in the
// human-actor invariant's `COVERAGE_SET` (⛔ never an `ENROLMENT_OWED` entry, which the gate prints as debt).
// ⭐ Gated on a TEXTED ping exactly like the member routes (`send_outcome = 'accepted'` — an untexted one is the same 404 on
// the list, the save and the submit), so before 6.27c texts anyone the helpline panel is EMPTY and the helpline can
// ⛔ never name a reported death to a member the Trust has ⛔ not texted. The operator sees ONLY the answers of the
// neighbour on the phone (PM25 (b)) — ⛔ another neighbour's, ⛔ the warning lines, ⛔ the counts.

import {
  HelplinePeerRequestAnswerPathParams,
  HelplinePeerRequestListResponse,
  HelplinePeerRequestPathParams,
  PeerRequestListQuery,
  PeerRequestSaveAnswerRequest,
  PeerRequestSaveAnswerResponse,
  PeerRequestSubmitResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createPeerRequestHandlers } from './claims.peer-request.handlers.js';

const TAG = 'peer-request-helpline';
/** 6.3's key — ⛔ a new one (PM12). */
const CLAIM_FILE_KEY = 'claim.file';
/** 6.3's step-up context. */
const CLAIM_FILE_STEP_UP_CONTEXT = 'claim_file';

const HelplineMemberParam = z.object({ pariwarId: z.string().uuid(), memberId: z.string().uuid() }).strict();

export function registerPeerRequestHelplineRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createPeerRequestHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const canFileClaim = requirePermissionHook(deps, CLAIM_FILE_KEY);
  const stepUp = requireStepUp(deps, CLAIM_FILE_STEP_UP_CONTEXT);

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/helpline/members/:memberId/peer-requests',
    {
      schema: { params: HelplineMemberParam, querystring: PeerRequestListQuery, response: { 200: HelplinePeerRequestListResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canFileClaim, stepUp],
    },
    h.helplineList,
  );

  r.put(
    '/api/v1/p/:pariwarId/admin/claims/helpline/members/:memberId/peer-requests/:pingId/answers/:questionKey',
    {
      schema: {
        params: HelplinePeerRequestAnswerPathParams,
        body: PeerRequestSaveAnswerRequest,
        response: { 200: PeerRequestSaveAnswerResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, canFileClaim, stepUp],
    },
    h.helplineSave,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/helpline/members/:memberId/peer-requests/:pingId/submit',
    {
      schema: { params: HelplinePeerRequestPathParams, response: { 200: PeerRequestSubmitResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canFileClaim, stepUp],
    },
    h.helplineSubmit,
  );
}
