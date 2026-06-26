// KYC signup-step routes — Story 3.3b (Task 3). The committed KYC member API surface.
//
// Routes under /api/v1/member/kyc/... (member-session-gated, token-bearer like the 3.2
// member surface) PLUS the PUBLIC /api/v1/kyc/callback (R3 — DigiLocker redirects the
// browser there with ?state&code and no member JWT; it is state-correlated, on the
// login-wall PUBLIC allowlist). The KYC handlers open their own scope tx (R3).

import {
  KycCallbackRequest,
  KycConfirmRequest,
  KycInitiateResponse,
  KycManualSubmitRequest,
  KycProfileSummaryResponse,
  KycStatusResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createKycHandlers } from './kyc.handlers.js';

const KYC_TAG = 'member-kyc';

export function registerKycRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createKycHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);
  // Per-IP ceiling for the unauthenticated callback (defense; the session routes inherit
  // the global rate limit). Mirrors the member-auth per-IP layer.
  const IP_RATE = { max: deps.config.loginRateMax, timeWindow: '1 minute' } as const;

  // ── Member-session-gated ────────────────────────────────────────────────────────
  r.post(
    '/api/v1/member/kyc/initiate',
    { schema: { response: { 200: KycInitiateResponse }, tags: [KYC_TAG] }, preHandler: [memberSession] },
    h.initiate,
  );

  r.post(
    '/api/v1/member/kyc/confirm',
    {
      schema: { body: KycConfirmRequest, response: { 200: KycStatusResponse }, tags: [KYC_TAG] },
      preHandler: [memberSession],
    },
    h.confirm,
  );

  r.post(
    '/api/v1/member/kyc/manual',
    {
      schema: { body: KycManualSubmitRequest, response: { 200: KycStatusResponse }, tags: [KYC_TAG] },
      preHandler: [memberSession],
    },
    h.manual,
  );

  r.get(
    '/api/v1/member/kyc/status',
    { schema: { response: { 200: KycStatusResponse }, tags: [KYC_TAG] }, preHandler: [memberSession] },
    h.status,
  );

  r.get(
    '/api/v1/member/kyc/profile-summary',
    {
      schema: { response: { 200: KycProfileSummaryResponse }, tags: [KYC_TAG] },
      preHandler: [memberSession],
    },
    h.profileSummary,
  );

  // ── PUBLIC (state-correlated; login-wall allowlisted) ─────────────────────────────
  r.post(
    '/api/v1/kyc/callback',
    {
      schema: {
        body: KycCallbackRequest,
        response: { 200: KycProfileSummaryResponse },
        tags: [KYC_TAG],
      },
      config: { rateLimit: IP_RATE },
    },
    h.callback,
  );
}
