// The family memorial's MEMBER routes (Story 11b.4 — the "Named identifiers" table; `#decision-2026-10-24-398`).
//
//   GET  /api/v1/member/memorial/entry                   — the home probe (⛔ decrypt, ⛔ audit — AC1)
//   GET  /api/v1/member/memorial                         — the family's own view (AC1 / AC10)
//   POST /api/v1/member/memorial/submissions             — Send (multipart; Idempotency-Key — AC4 / AC7)
//   POST /api/v1/member/memorial/submissions/:id/withdraw — withdraw before review (⛔ body — AC8)
//
// The GETs are member-session gated and ⛔ step-up gated (the nominee-console precedent); a switch-off GET answers its own
// empty shape. The writes: ⭐ the MA17 switch preHandler is registered BEFORE `requireMemberStepUp` (AC19) — else a dark
// surface answers `403 auth.step_up_required` and the app texts the nominee a code first — then the session, then the
// nominee's handover elevation (`claim_handover`; after MA19 only the nominee route mints it).

import { MemorialEntryResponse, MemorialMemberViewResponse, MemorialSendResponse, MemorialWithdrawResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberStepUp } from '../auth/member/member-step-up.gate.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { CLAIM_HANDOVER_ACTION_CONTEXT } from '../claims/claims.service.js';
import { createMemorialHandlers, memorialNotFound } from './handlers.js';

const MEMORIAL_TAG = 'memorial';

const WithdrawParam = z.object({ id: z.string().uuid() }).strict();

export function registerMemorialRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemorialHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);
  const handoverStepUp = requireMemberStepUp(deps, CLAIM_HANDOVER_ACTION_CONTEXT);
  /** MA17 — the server switch, answering the ONE neutral 404 before anything else runs. */
  const memorialSwitch = async (): Promise<void> => {
    if (!deps.config.memorialAuthorshipEnabled) throw memorialNotFound();
  };
  const memberWrite: RouteRateLimit = {
    max: deps.config.writeRateMax,
    timeWindow: '1 minute',
    keyGenerator: perMemberKey,
    hook: 'preHandler',
  };

  r.get(
    '/api/v1/member/memorial/entry',
    { schema: { response: { 200: MemorialEntryResponse }, tags: [MEMORIAL_TAG] }, preHandler: [memberSession] },
    h.entry,
  );

  r.get(
    '/api/v1/member/memorial',
    { schema: { response: { 200: MemorialMemberViewResponse }, tags: [MEMORIAL_TAG] }, preHandler: [memberSession] },
    h.view,
  );

  // Multipart — ⛔ Zod `body` schema: the handler reads an explicit allow-list of parts (Trap 11).
  r.post(
    '/api/v1/member/memorial/submissions',
    {
      schema: { response: { 200: MemorialSendResponse, 201: MemorialSendResponse }, tags: [MEMORIAL_TAG] },
      config: { rateLimit: memberWrite },
      preHandler: [memorialSwitch, memberSession, handoverStepUp],
    },
    h.send,
  );

  // ⛔ No body: the route declares none, and the api-client sends `'{}'` (a bodyless JSON POST is a Fastify 400).
  r.post(
    '/api/v1/member/memorial/submissions/:id/withdraw',
    {
      schema: { params: WithdrawParam, response: { 200: MemorialWithdrawResponse }, tags: [MEMORIAL_TAG] },
      config: { rateLimit: memberWrite },
      preHandler: [memorialSwitch, memberSession, handoverStepUp],
    },
    h.withdraw,
  );
}
