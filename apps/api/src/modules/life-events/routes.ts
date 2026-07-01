// Life Events panel routes — Story 3.9 (Task 5). The committed Life Events member API surface.
//
// Five routes under /api/v1/member/life-events (all member-session-gated, token-bearer). The panel
// lets a member update the four sub-types that change over a lifetime (FR-5):
//   · POST /nominees — step-up-gated ('nominee_change'); REUSES the 3.4 declare SERVICE unchanged
//     (re-declaration already emits member.nominees_declared — 3.4 AC5). Do NOT reimplement it.
//   · POST /medical  — step-up-gated ('medical_change'); REUSES the 3.5 submit SERVICE unchanged
//     (append-only history; emits member.medical_disclosed).
//   · POST /address  — NO step-up; NEW handler (append-only Tier-1 history + member.address_updated).
//   · POST /posting  — NO step-up; NEW handler (append-only history + member.posting_updated).
//   · GET  /         — NO step-up; the panel-index summary.
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
  NomineeStatusResponse,
  PostingUpdateRequest,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
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
    nomineeHandlers.declare,
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

  // Posting / transfer-in-out update — NO step-up; NEW append-only write + member.posting_updated.
  r.post(
    `${LIFE_EVENTS_BASE}/posting`,
    {
      schema: {
        body: PostingUpdateRequest,
        response: { 200: LifeEventsSummaryResponse },
        tags: [LIFE_EVENTS_TAG],
      },
      preHandler: [memberSession],
    },
    h.updatePosting,
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
