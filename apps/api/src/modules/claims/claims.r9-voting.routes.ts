// R9 special-case voting admin routes — Story 6.14 (Task 8; AC1–AC10, D-B/D-E).
//
// SEVEN scope-gated admin routes — the R9 panel surface that consumes the claims 6.13's routeToR9 parks:
//   · GET  …/admin/r9-voting/queue                → the R9 voting queue (AC1)
//   · GET  …/admin/r9-voting/:claimCaseId          → the per-claim panel model (AC1)
//   · POST …/admin/r9-voting/:claimCaseId/open     → open a session (AC2)
//   · POST …/admin/r9-voting/:claimCaseId/vote     → cast/revise a vote (AC3)
//   · POST …/admin/r9-voting/:claimCaseId/finalize → finalize the outcome (AC4) — ADDITIONALLY step-up-gated
//   · POST …/admin/r9-voting/:claimCaseId/cancel   → cancel/correct (AC5)
//   · GET  …/admin/r9-voting/votes-by-trustee       → the votes-by-trustee transcript (AC8)
//
// The route IS the security control (AC6): an authenticated HUMAN admin session + the claim.r9_vote WRITE
// key at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the cycle.freeze pariwar-dimension precedent; NO
// server-derived-district preHandler, the target IS the tenant) + tenant match — fail-closed, audited. v1
// actor = pariwar_admin-as-Trustee-Lite (D-B; direct state_trustee gating DEFERRED to the Epic-3 geo-tree
// resolver — see permissions.ts).
//
// ── Finalize is additionally step-up-gated (D-E/AC4/AC6, BigDev-ratified) ────────────────────
// Given the ₹50L stakes, the R9 FINALIZE route requires a FRESH ~5-min elevation bound to `r9_finalize`
// (Story 1.9 / 5.9 requireStepUp) — added AFTER the permission hook so an unauthorized actor never reaches
// step-up (the 6.13 cycle_freeze_commit precedent). The queue/panel/open/vote/cancel are NOT independently
// step-up-gated (only the outcome-committing finalize is), mirroring 6.13's "votes free, the attesting write
// gated" posture. This is IN ADDITION to the downstream 6.13 cycle-commit step-up on an approved claim.

import {
  R9CancelRequest,
  R9FinalizeRequest,
  R9FinalizeResponse,
  R9OpenSessionRequest,
  R9PanelResponse,
  R9QueueResponse,
  R9SessionResponse,
  R9VoteRequest,
  R9VoteResponse,
  R9VotesByTrusteeQuery,
  R9VotesByTrusteeResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createR9VotingHandlers } from './claims.r9-voting.handlers.js';

const TAG = 'r9-voting';

/** D-B (RATIFIED): the new pariwar-dimension claim.r9_vote key (catalog 15→16). */
const R9_VOTE_KEY = 'claim.r9_vote';

/** The step-up action context for finalize (D-E; free-form string — no registry to extend). */
const FINALIZE_STEP_UP_CONTEXT = 'r9_finalize';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();
// The queue is a collection GET — it declares a bounded `limit` (the forced-pagination invariant, Story 1.14;
// the read model additionally clampLimit-bounds the scan). Admin-tier cap 200.
const QueueQuery = z.object({ limit: z.coerce.number().int().positive().max(200).optional() }).strict();

export function registerR9VotingRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createR9VotingHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  // claim.r9_vote at dimension:'pariwar' (EXPLICIT — the target IS the tenant; resolveValue defaults to
  // scopeTx.pariwarId, the cycle.freeze pariwar-wide precedent; no district derivation). Each route inlines
  // the [adminSession, scope, requireR9Vote] human-actor chain explicitly (the human-actor CI gate scans the
  // preHandler array statically — a shared/spread variable is opaque to it; the 6.13 cycle-freeze pattern).
  const requireR9Vote = requirePermissionHook(deps, R9_VOTE_KEY, { dimension: 'pariwar' });

  // AC1 — the queue.
  r.get(
    '/api/v1/p/:pariwarId/admin/r9-voting/queue',
    {
      schema: { params: PariwarParam, querystring: QueueQuery, response: { 200: R9QueueResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireR9Vote],
    },
    h.getQueue,
  );

  // AC8 — votes-by-trustee. Fastify's radix router distinguishes static from param segments, so this route's
  // position relative to the /:claimCaseId route below is not load-bearing; declared here (before it) purely
  // for readability — the static "votes-by-trustee" segment reads naturally alongside the other collection-
  // level routes.
  r.get(
    '/api/v1/p/:pariwarId/admin/r9-voting/votes-by-trustee',
    {
      schema: { params: PariwarParam, querystring: R9VotesByTrusteeQuery, response: { 200: R9VotesByTrusteeResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireR9Vote],
    },
    h.getVotesByTrustee,
  );

  // AC1 — the per-claim panel model.
  r.get(
    '/api/v1/p/:pariwarId/admin/r9-voting/:claimCaseId',
    { schema: { params: ClaimParam, response: { 200: R9PanelResponse }, tags: [TAG] }, preHandler: [adminSession, scope, requireR9Vote] },
    h.getPanel,
  );

  // AC2 — open a session.
  r.post(
    '/api/v1/p/:pariwarId/admin/r9-voting/:claimCaseId/open',
    {
      schema: { params: ClaimParam, body: R9OpenSessionRequest, response: { 201: R9SessionResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireR9Vote],
    },
    h.postOpen,
  );

  // AC3 — cast/revise a vote.
  r.post(
    '/api/v1/p/:pariwarId/admin/r9-voting/:claimCaseId/vote',
    {
      schema: { params: ClaimParam, body: R9VoteRequest, response: { 201: R9VoteResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireR9Vote],
    },
    h.postVote,
  );

  // AC4/D-E — finalize the outcome. Same human-actor chain + an ADDITIONAL step-up gate (after the permission
  // hook, so an unauthorized actor never reaches step-up).
  r.post(
    '/api/v1/p/:pariwarId/admin/r9-voting/:claimCaseId/finalize',
    {
      schema: { params: ClaimParam, body: R9FinalizeRequest, response: { 200: R9FinalizeResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireR9Vote, requireStepUp(deps, FINALIZE_STEP_UP_CONTEXT)],
    },
    h.postFinalize,
  );

  // AC5 — cancel/correct.
  r.post(
    '/api/v1/p/:pariwarId/admin/r9-voting/:claimCaseId/cancel',
    {
      schema: { params: ClaimParam, body: R9CancelRequest, response: { 200: R9SessionResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireR9Vote],
    },
    h.postCancel,
  );
}
