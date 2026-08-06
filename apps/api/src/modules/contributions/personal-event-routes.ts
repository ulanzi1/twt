// The personal-event ASSERTION route — Story 10.26 (Task 5; AC1, AC7).
//
// ⚠ THE ROUTE NAME IS PART OF THE CONTRACT. `personal-events`, and the handler is `record`. NOT
// `excuse-requests`, NOT `exemptions`, NOT `applications` — AC1's strongest failure mode is not a
// copy slip but a route or field name that makes a FALSE PROMISE STRUCTURAL, telling the member in
// the shape of the API that something might come of asserting. Nothing will: the ratified Niyamavali
// §3.1 says the assertion "grants no restoration relief and carries no consequence of its own".
//
// ── Gates (AC7), following the Story 10.2 member-surface pattern ─────────────────────────────────
// `requireMemberSession` (auto-covered by the Story 1.14 login-wall CI gate via the
// MEMBER_SESSION_GUARD tag; NOT public, so no allowlist entry), plus the FR-88 protected-surface
// WRITE rate limit keyed PER-MEMBER (`perMemberKey`, `hook: 'preHandler'` so `actorId` is set
// first) — NOT `namedRateLimits.write`, which is `perSessionKey` and falls through to the shared IP
// for token-bearer members, rate-limiting every member behind one NAT together. The
// `Idempotency-Key` requirement is enforced in the handler (it rides a HEADER, not the body).

import { PersonalEventAssertionRequest, PersonalEventAssertionResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createPersonalEventHandlers } from './personal-event-handlers.js';

const CONTRIBUTIONS_TAG = 'contributions';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerPersonalEventRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createPersonalEventHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  const memberWrite: RouteRateLimit = {
    max: deps.config.writeRateMax,
    timeWindow: '1 minute',
    keyGenerator: perMemberKey,
    hook: 'preHandler',
  };

  // POST — RECORD that a personal event affected a contribution. 201 on record, 200 on an
  // idempotent replay. There is no GET: there is nothing to check back on, and adding a
  // "my assertions" read would invite the member to look for a decision that will never come.
  r.post(
    '/api/v1/p/:pariwarId/member/contributions/personal-events',
    {
      schema: {
        params: PariwarParam,
        body: PersonalEventAssertionRequest,
        response: { 200: PersonalEventAssertionResponse, 201: PersonalEventAssertionResponse },
        tags: [CONTRIBUTIONS_TAG],
      },
      config: { rateLimit: memberWrite },
      preHandler: [memberSession],
    },
    h.record,
  );
}
