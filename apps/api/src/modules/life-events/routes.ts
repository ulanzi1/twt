// Life Events panel routes — Story 3.9 (Task 5). The committed Life Events member API surface.
//
// Five routes under /api/v1/member/life-events (all member-session-gated, token-bearer). The panel
// lets a member update the four sub-types that change over a lifetime (FR-5):
//   · POST /nominees — step-up-gated ('nominee_change'); REUSES the 3.4 declare SERVICE unchanged
//     (re-declaration already emits member.nominees_declared — 3.4 AC5). Do NOT reimplement it.
//   · POST /medical  — step-up-gated ('medical_change'); REUSES the 3.5 submit SERVICE unchanged
//     (append-only history; emits member.medical_disclosed).
//   · POST /address  — NO step-up; NEW handler (append-only Tier-1 history + member.address_updated).
//   · POST /posting  — NO step-up; NEW handler (append-only history + member.posting_updated). ⭐ Story 6.36a: the body is
//     a choice (a listed workplace · *"isn't listed"* · retired · or, with ⛔ no list, the district box), with a start
//     date; a REQUIRED `Idempotency-Key` (in the handler — it rides a header) and a per-MEMBER write rate limit.
//   · GET  /         — NO step-up; the panel-index summary.
//   · GET  /workplaces/districts, GET /workplaces, GET /postings — Story 6.36a's reads (the picker's districts and search,
//     the member's own history); each a bounded `limit` (the forced-pagination guard).
//   · POST /workplace-requests/:requestId/answer — Story 6.36c: the member's "Yes" / "No" to a Pariwar Admin's suggested
//     workplace (NO step-up; an `Idempotency-Key`; the per-member write limit).
//
// Step-up on nominee + medical ONLY (AC4): address + posting are lower-sensitivity self-service
// updates. The two step-up routes use DISTINCT action contexts so an elevation for one does not
// satisfy the other. All routes are session-guarded → automatically covered by the Story 1.14
// login-wall CI gate (the MEMBER_SESSION_GUARD symbol on requireMemberSession carries the tag).

import {
  AddressUpdateRequest,
  LifeEventsSummaryResponse,
  MedicalDiscloseRequest,
  MedicalDisclosureStatusResponse,
  NomineeDeclareRequest,
  NomineeMarksSaveRequest,
  NomineeStatusResponse,
  PostingHistoryQuery,
  PostingHistoryResponse,
  PostingUpdateRequest,
  WorkplaceAnswerRequest,
  WorkplaceAnswerResponse,
  WorkplaceDistrictsQuery,
  WorkplaceDistrictsResponse,
  WorkplaceSearchQuery,
  WorkplaceSearchResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberStepUp } from '../auth/member/member-step-up.gate.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createMedicalHandlers } from '../medical/medical.handlers.js';
import { createNomineeHandlers } from '../nominee/nominee.handlers.js';
import { createLifeEventsHandlers } from './handlers.js';

const LIFE_EVENTS_TAG = 'member-life-events';
const LIFE_EVENTS_BASE = '/api/v1/member/life-events';

export function registerLifeEventsRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createLifeEventsHandlers(deps);
  const nomineeHandlers = createNomineeHandlers(deps);
  const medicalHandlers = createMedicalHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  // Nominee update — step-up gated; re-runs the 3.4 declare SERVICE (emits member.nominees_declared).
  r.post(
    `${LIFE_EVENTS_BASE}/nominees`,
    {
      schema: {
        body: NomineeDeclareRequest,
        response: { 200: NomineeStatusResponse },
        tags: [LIFE_EVENTS_TAG],
      },
      preHandler: [memberSession, requireMemberStepUp(deps, 'nominee_change')],
    },
    // Story 6.36e (NE4) — the ONE route that accepts a nominee's `memberLink`.
    nomineeHandlers.declare({ allowLink: true }),
  );

  // Story 6.36f (MK1, `2026-10-26-407`) — the MARKS-ONLY nominee save: the same preHandlers as the save above; the body carries
  // each rank's mark + the version the phone saw (⛔ a detail); the server copies the stored details.
  r.post(
    `${LIFE_EVENTS_BASE}/nominees/marks`,
    {
      schema: {
        body: NomineeMarksSaveRequest,
        response: { 200: NomineeStatusResponse },
        tags: [LIFE_EVENTS_TAG],
      },
      preHandler: [memberSession, requireMemberStepUp(deps, 'nominee_change')],
    },
    nomineeHandlers.marks,
  );

  // Medical update — step-up gated; re-runs the 3.5 submit SERVICE (append-only; emits member.medical_disclosed).
  r.post(
    `${LIFE_EVENTS_BASE}/medical`,
    {
      schema: {
        body: MedicalDiscloseRequest,
        response: { 200: MedicalDisclosureStatusResponse },
        tags: [LIFE_EVENTS_TAG],
      },
      preHandler: [memberSession, requireMemberStepUp(deps, 'medical_change')],
    },
    medicalHandlers.submit,
  );

  // Address update — NO step-up; NEW append-only Tier-1 write + member.address_updated.
  r.post(
    `${LIFE_EVENTS_BASE}/address`,
    {
      schema: {
        body: AddressUpdateRequest,
        response: { 200: LifeEventsSummaryResponse },
        tags: [LIFE_EVENTS_TAG],
      },
      preHandler: [memberSession],
    },
    h.updateAddress,
  );

  // Story 6.36a (SW8) — the posting write's per-MEMBER rate limit (`perMemberKey`, `hook: 'preHandler'` so `actorId` is
  // set first — ⛔ `namedRateLimits.write`, which is `perSessionKey` and falls through to the shared IP for token-bearer
  // members). The `Idempotency-Key` requirement is enforced in the handler (it rides a HEADER).
  const memberWrite: RouteRateLimit = {
    max: deps.config.writeRateMax,
    timeWindow: '1 minute',
    keyGenerator: perMemberKey,
    hook: 'preHandler',
  };

  // Posting / transfer-in-out update — NO step-up; NEW append-only write + member.posting_updated.
  r.post(
    `${LIFE_EVENTS_BASE}/posting`,
    {
      schema: {
        body: PostingUpdateRequest,
        response: { 200: LifeEventsSummaryResponse },
        tags: [LIFE_EVENTS_TAG],
      },
      config: { rateLimit: memberWrite },
      preHandler: [memberSession],
    },
    h.updatePosting,
  );

  // Story 6.36c (AC4) — the MEMBER answers a Pariwar Admin's suggested workplace ("Yes" writes a posting; "No" re-queues it).
  // NO step-up (the posting route's posture); the same per-member rate limit; a REQUIRED `Idempotency-Key` (the handler).
  r.post(
    `${LIFE_EVENTS_BASE}/workplace-requests/:requestId/answer`,
    {
      schema: {
        params: z.object({ requestId: z.string().uuid() }).strict(),
        body: WorkplaceAnswerRequest,
        response: { 200: WorkplaceAnswerResponse },
        tags: [LIFE_EVENTS_TAG],
      },
      config: { rateLimit: memberWrite },
      preHandler: [memberSession],
    },
    h.answerWorkplaceSuggestion,
  );

  // Story 6.36a — the picker's LISTED districts (+ whether the Pariwar has a list at all).
  r.get(
    `${LIFE_EVENTS_BASE}/workplaces/districts`,
    {
      schema: { querystring: WorkplaceDistrictsQuery, response: { 200: WorkplaceDistrictsResponse }, tags: [LIFE_EVENTS_TAG] },
      preHandler: [memberSession],
    },
    h.workplaceDistricts,
  );

  // Story 6.36a — the picker's server-side search: one district's listed schools or offices.
  r.get(
    `${LIFE_EVENTS_BASE}/workplaces`,
    {
      schema: { querystring: WorkplaceSearchQuery, response: { 200: WorkplaceSearchResponse }, tags: [LIFE_EVENTS_TAG] },
      preHandler: [memberSession],
    },
    h.searchWorkplaces,
  );

  // Story 6.36a — the member's OWN posting history, newest first.
  r.get(
    `${LIFE_EVENTS_BASE}/postings`,
    {
      schema: { querystring: PostingHistoryQuery, response: { 200: PostingHistoryResponse }, tags: [LIFE_EVENTS_TAG] },
      preHandler: [memberSession],
    },
    h.postingHistory,
  );

  // Panel-index summary read — NO step-up.
  r.get(
    LIFE_EVENTS_BASE,
    {
      schema: { response: { 200: LifeEventsSummaryResponse }, tags: [LIFE_EVENTS_TAG] },
      preHandler: [memberSession],
    },
    h.summary,
  );
}
