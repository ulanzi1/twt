// Voluntary withdrawal routes — Story 3.10 (Task 5). The committed member withdrawal API surface.
//
// ONE route under /api/v1/member — the withdrawal confirm (member-session-gated + step-up-gated). The
// mobile flow's acknowledgment + reason + final-confirm stages are client-side; the server sees a
// single step-up-gated confirm call.
//
// Step-up uses the DISTINCT action context 'withdrawal' (AC1c) so no other elevation
// (nominee_change / medical_change / member.login / member.demo) satisfies it, and vice-versa. The
// route is session-guarded → automatically covered by the Story 1.14 login-wall CI gate (the
// MEMBER_SESSION_GUARD symbol on requireMemberSession carries the tag).

import { WithdrawalConfirmRequest, WithdrawalStatusResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberStepUp } from '../auth/member/member-step-up.gate.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createWithdrawalHandlers } from './handlers.js';

const WITHDRAWAL_TAG = 'member-withdrawal';
const WITHDRAWAL_BASE = '/api/v1/member/withdrawal';

export function registerWithdrawalRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createWithdrawalHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  // Withdrawal confirm — step-up gated (DISTINCT context 'withdrawal'). Persists the withdrawal
  // record + emits member.withdrawal_completed → withdrawn.
  r.post(
    WITHDRAWAL_BASE,
    {
      schema: {
        body: WithdrawalConfirmRequest,
        response: { 200: WithdrawalStatusResponse },
        tags: [WITHDRAWAL_TAG],
      },
      preHandler: [memberSession, requireMemberStepUp(deps, 'withdrawal')],
    },
    h.confirm,
  );
}
