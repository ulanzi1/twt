// The neighbours' answer screens — the MEMBER routes (Story 6.27a PM11; `2026-10-10-311`). Handlers:
// `claims.peer-request.handlers.ts`.
//
//   · GET  /api/v1/p/:pariwarId/member/peer-requests?limit=                       — the session member's OPEN requests
//   · GET  /api/v1/p/:pariwarId/member/peer-requests/:pingId                      — one request (the pinned questionnaire)
//   · GET  /api/v1/p/:pariwarId/member/peer-requests/by-link/:code                — ⭐ Story 6.27c (R13 / R14): the texted link's
//          code → `{ pingId }` (the session member's TEXTED ping only; everything else the SAME 404); a per-member READ budget;
//          `logLevel: 'warn'` — Fastify's `info` request lines carry `req.url`, and the code must reach ⛔ log line (PM21 (e))
//   · PUT  /api/v1/p/:pariwarId/member/peer-requests/:pingId/answers/:questionKey — the auto-save (Idempotency-Key)
//   · POST /api/v1/p/:pariwarId/member/peer-requests/:pingId/submit               — locks the reply (Idempotency-Key)
//
// `requireMemberSession` (auto-covered by the login-wall gate's MEMBER_SESSION_GUARD tag) + the per-member FR-88 write
// budget (`perMemberKey`, `hook:'preHandler'` — the helpdesk / polls precedent). ⛔ NO Turnstile (F34). ⛔ Not an
// adjudication route: classified in the human-actor invariant's `NON_ADJUDICATION_ROUTES` (a member's own answers move
// ⛔ no claim — the event is an identity annotation). The list declares a bounded `limit` (forced pagination; cap 5).
// ⭐ DARK until 6.27c texts anyone: every route answers ONE 404 for a ping that was ⛔ never texted.

import {
  PeerRequestAnswerPathParams,
  PeerRequestByLinkPathParams,
  PeerRequestByLinkResponse,
  PeerRequestDetailResponse,
  PeerRequestListQuery,
  PeerRequestListResponse,
  PeerRequestPathParams,
  PeerRequestSaveAnswerRequest,
  PeerRequestSaveAnswerResponse,
  PeerRequestSubmitResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createPeerRequestHandlers } from './claims.peer-request.handlers.js';

const TAG = 'peer-request';
const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerPeerRequestMemberRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createPeerRequestHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);
  const memberWrite: RouteRateLimit = {
    max: deps.config.writeRateMax,
    timeWindow: '1 minute',
    keyGenerator: perMemberKey,
    hook: 'preHandler',
  };
  const memberRead: RouteRateLimit = {
    max: deps.config.readRateMax,
    timeWindow: '1 minute',
    keyGenerator: perMemberKey,
    hook: 'preHandler',
  };

  r.get(
    '/api/v1/p/:pariwarId/member/peer-requests',
    {
      schema: { params: PariwarParam, querystring: PeerRequestListQuery, response: { 200: PeerRequestListResponse }, tags: [TAG] },
      preHandler: [memberSession],
    },
    h.memberList,
  );

  r.get(
    '/api/v1/p/:pariwarId/member/peer-requests/:pingId',
    {
      schema: { params: PeerRequestPathParams, response: { 200: PeerRequestDetailResponse }, tags: [TAG] },
      preHandler: [memberSession],
    },
    h.memberDetail,
  );

  r.get(
    '/api/v1/p/:pariwarId/member/peer-requests/by-link/:code',
    {
      schema: { params: PeerRequestByLinkPathParams, response: { 200: PeerRequestByLinkResponse }, tags: [TAG] },
      // ⭐ R13 — the route's OWN logger level: the incoming / completed request lines are `info` and carry the URL (the code).
      logLevel: 'warn',
      config: { rateLimit: memberRead },
      preHandler: [memberSession],
    },
    h.memberByLink,
  );

  r.put(
    '/api/v1/p/:pariwarId/member/peer-requests/:pingId/answers/:questionKey',
    {
      schema: {
        params: PeerRequestAnswerPathParams,
        body: PeerRequestSaveAnswerRequest,
        response: { 200: PeerRequestSaveAnswerResponse },
        tags: [TAG],
      },
      config: { rateLimit: memberWrite },
      preHandler: [memberSession],
    },
    h.memberSave,
  );

  r.post(
    '/api/v1/p/:pariwarId/member/peer-requests/:pingId/submit',
    {
      schema: { params: PeerRequestPathParams, response: { 200: PeerRequestSubmitResponse }, tags: [TAG] },
      config: { rateLimit: memberWrite },
      preHandler: [memberSession],
    },
    h.memberSubmit,
  );
}
