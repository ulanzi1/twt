// Member-auth routes (Story 3.2, Tasks 4 + 6 + 7) — the committed member API surface.
//
// Routes under /api/v1/member/auth/... (parallel to the admin /api/v1/auth/...).
// CSRF posture: the member API is TOKEN-BEARER (Authorization header), not a
// cookie-session — bearer tokens are not auto-sent cross-site, so the admin
// double-submit/Origin cookie-CSRF model does not apply the same way (no
// app.csrfProtection here). The public OTP/refresh/select routes run BEFORE a
// session exists; the step-up routes + the synthetic probe sit behind
// requireMemberSession (login-wall.spec.ts MEMBER_SESSION_GUARD parity).
//
// Rate limiting (Task 6): the per-IP ceiling comes from the inline route limit
// (keyed by IP, members have no session); the per-PHONE 5/15-min send budget is the
// memberOtpSendThrottle preHandler (body-keyed, see its header).

import {
  MemberOtpRequestRequest,
  MemberOtpRequestResponse,
  MemberOtpVerifyRequest,
  MemberOtpVerifyResponse,
  MemberSelectPariwarRequest,
  MemberSelectPariwarResponse,
  MemberStepUpRequestRequest,
  MemberStepUpRequestResponse,
  MemberStepUpVerifyRequest,
  MemberStepUpVerifyResponse,
  MemberTokenRefreshRequest,
  MemberTokenRefreshResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../../context.js';
import { requireMemberSession } from '../shared/member-session-guard.js';
import { createMemberAuthHandlers } from './member-auth.handlers.js';
import { requireMemberStepUp } from './member-step-up.gate.js';
import { memberOtpSendThrottle, memberStepUpSendThrottle } from './otp-rate-limit.js';

const MEMBER_TAG = 'member-auth';

export function registerMemberAuthRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberAuthHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);
  const otpThrottle = memberOtpSendThrottle(deps);
  const stepUpThrottle = memberStepUpSendThrottle(deps);
  // Per-IP ceiling (default IP keyGenerator — members have no session). The per-phone
  // budget is the throttle preHandler; this is the inherited per-IP layer.
  const MEMBER_OTP_IP_RATE = { max: deps.config.loginRateMax, timeWindow: '1 minute' } as const;

  // ── Public (pre-session) ──────────────────────────────────────────────────────
  r.post(
    '/api/v1/member/auth/otp/request',
    {
      schema: { body: MemberOtpRequestRequest, response: { 200: MemberOtpRequestResponse }, tags: [MEMBER_TAG] },
      config: { rateLimit: MEMBER_OTP_IP_RATE },
      preHandler: [otpThrottle],
    },
    h.otpRequest,
  );

  r.post(
    '/api/v1/member/auth/otp/verify',
    {
      schema: { body: MemberOtpVerifyRequest, response: { 200: MemberOtpVerifyResponse }, tags: [MEMBER_TAG] },
      config: { rateLimit: MEMBER_OTP_IP_RATE },
    },
    h.otpVerify,
  );

  r.post(
    '/api/v1/member/auth/otp/select-pariwar',
    {
      schema: { body: MemberSelectPariwarRequest, response: { 200: MemberSelectPariwarResponse }, tags: [MEMBER_TAG] },
      config: { rateLimit: MEMBER_OTP_IP_RATE },
    },
    h.selectPariwar,
  );

  r.post(
    '/api/v1/member/auth/token/refresh',
    {
      schema: { body: MemberTokenRefreshRequest, response: { 200: MemberTokenRefreshResponse }, tags: [MEMBER_TAG] },
      config: { rateLimit: MEMBER_OTP_IP_RATE },
    },
    h.tokenRefresh,
  );

  // ── Authenticated (member-session-gated) ──────────────────────────────────────
  app.post(
    '/api/v1/member/auth/logout',
    { schema: { hide: true }, preHandler: [memberSession] },
    h.logout,
  );

  r.post(
    '/api/v1/member/auth/step-up/request',
    {
      schema: { body: MemberStepUpRequestRequest, response: { 200: MemberStepUpRequestResponse }, tags: [MEMBER_TAG] },
      // PR-Patch-1: per-IP ceiling + per-member send throttle (the step-up OTP is an SMS
      // send, like /otp/request — it must be throttled, not just session-gated).
      config: { rateLimit: MEMBER_OTP_IP_RATE },
      preHandler: [memberSession, stepUpThrottle],
    },
    h.stepUpRequest,
  );

  r.post(
    '/api/v1/member/auth/step-up/verify',
    {
      schema: { body: MemberStepUpVerifyRequest, response: { 200: MemberStepUpVerifyResponse }, tags: [MEMBER_TAG] },
      preHandler: [memberSession],
    },
    h.stepUpVerify,
  );

  // Synthetic step-up-gated probe (Task 7) — proves requireMemberStepUp end-to-end
  // (403 without a fresh elevation for this action_context; 200 with one). Hidden.
  app.post(
    '/api/v1/member/auth/step-up/protected-probe',
    { schema: { hide: true }, preHandler: [memberSession, requireMemberStepUp(deps, 'member.demo')] },
    () => ({ ok: true }),
  );
}
