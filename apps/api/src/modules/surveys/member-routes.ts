// Member-facing survey routes — Story 10.15 (Task 7; AC6).
//
// TWO routes under `/api/v1/p/:pariwarId/member/surveys…`, member-session-gated
// (`requireMemberSession` — auto-covered by the Story 1.14 login-wall CI gate via the
// MEMBER_SESSION_GUARD tag; NOT public, so no allowlist entry):
//   · GET  …/member/surveys                        → the member's open, in-audience surveys
//   · POST …/member/surveys/:surveyId/responses    → the ONE-per-member response
//
// ── NO RBAC key, NO scope-resolution hook (AC6/AC9) ──────────────────────────────────────────
// Deliberate, and the mirror image of the admin routes. `scopeResolutionHook` also computes RBAC
// grants, which members do not have; the member JWT is the tenancy authority and each handler opens
// its OWN RLS tx via `openScopeTx`. A `:pariwarId` that does not match the token is a 404, never a
// 403 (a 403 would confirm the tenant exists). The 10.2 member-helpdesk / 10.9 member-banner pattern,
// verbatim. ⭐ This file is what discharges AC9's "the member survey routes touch NO key at all".
//
// ── Rate limit (FR-88) ───────────────────────────────────────────────────────────────────────
// The submit route carries the FR-88 protected-surface WRITE rate-limit, keyed PER-MEMBER
// (`perMemberKey`, `hook:'preHandler'`) — ⛔ NOT `namedRateLimits.write`, which is `perSessionKey`
// and falls through to the shared IP for token-bearer members, rate-limiting every member behind one
// NAT together. The per-member key is the correct member-route budget (the 10.2 helpdesk / 10.9
// banner precedent). The GET is a plain read and carries no write budget.
//
// The submit ADDITIONALLY carries a Turnstile bot-gate and a required `Idempotency-Key`, both HEADERS
// verified in the handler before any DB work — see `member-handlers.ts`.

import { MemberSurveyListResponse, SubmitSurveyResponseRequest, SubmitSurveyResponseResult } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createMemberSurveyHandlers } from './member-handlers.js';

const TAG = 'surveys';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const SurveyParam = z.object({ pariwarId: z.string().uuid(), surveyId: z.string().uuid() }).strict();
// ⭐ The forced-pagination invariant (Story 1.14 AC-3, FR-91): every collection-returning GET must
// declare a BOUNDED `limit` in the OpenAPI surface. The domain accessor already clamps internally,
// but a bound hidden in an accessor is invisible to the contract — and `surveys` grows with tenant
// data, which is exactly the unbounded-read hazard that invariant exists to prevent.
const MemberListQuery = z
  .object({ limit: z.coerce.number().int().positive().max(200).optional() })
  .strict();

export function registerMemberSurveyRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberSurveyHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  // Per-member FR-88 write budget (see the header). `hook:'preHandler'` so `actorId` is set first.
  const memberWrite: RouteRateLimit = {
    max: deps.config.writeRateMax,
    timeWindow: '1 minute',
    keyGenerator: perMemberKey,
    hook: 'preHandler',
  };

  // GET — the member's open, in-audience surveys, each with its own `answered` flag.
  r.get(
    '/api/v1/p/:pariwarId/member/surveys',
    {
      schema: {
        params: PariwarParam,
        querystring: MemberListQuery,
        response: { 200: MemberSurveyListResponse },
        tags: [TAG],
      },
      preHandler: [memberSession],
    },
    h.list,
  );

  // POST — record the member's response. ONE per member, final (LBD-6): a genuine second submission
  // is a 409, while a replay carrying the same Idempotency-Key returns the original 201.
  r.post(
    '/api/v1/p/:pariwarId/member/surveys/:surveyId/responses',
    {
      schema: {
        params: SurveyParam,
        body: SubmitSurveyResponseRequest,
        response: { 201: SubmitSurveyResponseResult },
        tags: [TAG],
      },
      config: { rateLimit: memberWrite },
      preHandler: [memberSession],
    },
    h.submit,
  );
}
