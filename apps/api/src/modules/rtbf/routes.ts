// Member RTBF routes — Story 3.12 (Task 3). The committed member RTBF-anonymization API surface.
//
// ONE route under /api/v1/member — the RTBF confirm (member-session-gated + step-up-gated). The mobile
// flow's acknowledgment + final-confirm stages are client-side; the server sees a single step-up-gated
// confirm call.
//
// Step-up uses the DISTINCT action context 'rtbf' so no other elevation (withdrawal / nominee_change /
// medical_change / data_export / member.login) satisfies it, and vice-versa — RTBF is irreversible, so
// it MUST require its own fresh elevation. The route is session-guarded → automatically covered by the
// Story 1.14 login-wall CI gate (the MEMBER_SESSION_GUARD symbol on requireMemberSession carries the tag).

import { RtbfConfirmRequest, RtbfStatusResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberStepUp } from '../auth/member/member-step-up.gate.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createRtbfHandlers } from './handlers.js';

const RTBF_TAG = 'member-rtbf';
const RTBF_BASE = '/api/v1/member/rtbf';

export function registerRtbfRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createRtbfHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  // RTBF confirm — step-up gated (DISTINCT context 'rtbf'). Field-level anonymizes every member-PII
  // column + emits member.rtbf_anonymized → anonymized (soft-delete; row + history retained).
  r.post(
    RTBF_BASE,
    {
      schema: {
        body: RtbfConfirmRequest,
        response: { 200: RtbfStatusResponse },
        tags: [RTBF_TAG],
      },
      preHandler: [memberSession, requireMemberStepUp(deps, 'rtbf')],
    },
    h.confirm,
  );
}
