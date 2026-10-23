// Member app-language routes — Story 6.35 (Task 2.2; LS2).
//
//   · GET /api/v1/member/language — the member's recorded choice (null until they change it) + the Pariwar's default.
//   · PUT /api/v1/member/language — an EXPLICIT change from the app (I1 — ⛔ first launch, ⛔ device language). ⛔ Idempotency-Key
//     (an absolute value: a repeat is the same state); a per-MEMBER rate limit (`hook: 'preHandler'` so the actor id exists —
//     without it `perMemberKey` falls back to the IP; [[project_rate_limit_prehandler_hook_order]]).
//
// Both session-guarded → covered by the Story 1.14 login-wall CI gate (the MEMBER_SESSION_GUARD symbol on requireMemberSession).

import { MemberLanguageResponse, MemberLanguageSetRequest } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createMemberLanguageHandlers } from './handlers.js';

const MEMBER_LANGUAGE_TAG = 'member-language';
const MEMBER_LANGUAGE_PATH = '/api/v1/member/language';

export function registerMemberLanguageRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberLanguageHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);
  const memberWrite: RouteRateLimit = {
    max: deps.config.writeRateMax,
    timeWindow: '1 minute',
    keyGenerator: perMemberKey,
    hook: 'preHandler',
  };

  r.get(
    MEMBER_LANGUAGE_PATH,
    {
      schema: { response: { 200: MemberLanguageResponse }, tags: [MEMBER_LANGUAGE_TAG] },
      preHandler: [memberSession],
    },
    h.get,
  );

  r.put(
    MEMBER_LANGUAGE_PATH,
    {
      schema: { body: MemberLanguageSetRequest, response: { 200: MemberLanguageResponse }, tags: [MEMBER_LANGUAGE_TAG] },
      config: { rateLimit: memberWrite },
      preHandler: [memberSession],
    },
    h.set,
  );
}
