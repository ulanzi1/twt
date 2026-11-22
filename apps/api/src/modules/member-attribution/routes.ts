// "Did someone help you register?" routes — Story 3.15 (Task 2.1; DL1).
//
//   · GET  /api/v1/member/signup/assisted-code — `{ recorded }` for the session's member (the step skips when a code is recorded).
//   · POST /api/v1/member/signup/assisted-code — `{ code }` (6 digits, strict) → 201 / 200 `{ recorded: true }`. A per-MEMBER rate
//     limit, exactly as member-language (`hook: 'preHandler'` so the actor id exists — without it `perMemberKey` falls back to the
//     IP; [[project_rate_limit_prehandler_hook_order]]). ⚠ 201-vs-422 tells a caller whether a code is held (Story 3.6's AC requires
//     refusing unknown codes): this limit is the bound; FR-86's anti-fraud throttling is Epic 13's (DL13).
//
// Both session-guarded → covered by the Story 1.14 login-wall CI gate (the MEMBER_SESSION_GUARD symbol on requireMemberSession).

import { MemberAssistedCodeRequest, MemberAssistedCodeResponse, MemberAssistedCodeStatusResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createMemberAttributionHandlers } from './handlers.js';

const MEMBER_SIGNUP_TAG = 'member-signup';
const ASSISTED_CODE_PATH = '/api/v1/member/signup/assisted-code';

export function registerMemberAttributionRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberAttributionHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);
  const memberWrite: RouteRateLimit = {
    max: deps.config.writeRateMax,
    timeWindow: '1 minute',
    keyGenerator: perMemberKey,
    hook: 'preHandler',
  };

  r.get(
    ASSISTED_CODE_PATH,
    {
      schema: { response: { 200: MemberAssistedCodeStatusResponse }, tags: [MEMBER_SIGNUP_TAG] },
      preHandler: [memberSession],
    },
    h.status,
  );

  r.post(
    ASSISTED_CODE_PATH,
    {
      schema: {
        body: MemberAssistedCodeRequest,
        response: { 200: MemberAssistedCodeResponse, 201: MemberAssistedCodeResponse },
        tags: [MEMBER_SIGNUP_TAG],
      },
      config: { rateLimit: memberWrite },
      preHandler: [memberSession],
    },
    h.record,
  );
}
