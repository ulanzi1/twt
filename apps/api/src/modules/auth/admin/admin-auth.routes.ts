// admin-auth routes (Story 1.9, Task 4) — the committed auth API surface + the
// first real OpenAPI `paths`.
//
// CSRF posture (AC-3, recorded in ADR-0009): the GLOBAL Origin/Referer check
// (originCheckHook) + the SameSite=Lax session cookie are the baseline CSRF defense
// on every state-changing request. The @fastify/csrf-protection double-submit token
// (minted at GET /auth/csrf) is the defense-in-depth layer, applied to `logout`
// (a stable authenticated session) as the representative authenticated mutation;
// the login/MFA/enrollment flow regenerates the session id mid-flow (rotation) so a
// per-request double-submit token would churn — those rely on the origin + SameSite
// baseline. Downstream admin write-routes opt into `app.csrfProtection`. The
// passkey *options* POSTs generate a challenge (Dev Note: treated as idempotent
// reads) and are CSRF-exempt; only the verify/consume mutations are protected.

import {
  LoginRequest,
  LoginResponse,
  PasskeyAuthOptionsRequest,
  PasskeyAuthVerifyRequest,
  PasskeyAuthVerifyResponse,
  PasskeyRegisterOptionsRequest,
  PasskeyRegisterVerifyRequest,
  PasskeyRegisterVerifyResponse,
  PasswordResetConsumeRequest,
  PasswordResetConsumeResponse,
  PasswordResetRequestRequest,
  PasswordResetRequestResponse,
  RecoveryConsumeRequest,
  RecoveryConsumeResponse,
  SessionResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../../context.js';
import { requireAdminSession } from '../shared/session-guard.js';
import { createAdminAuthHandlers } from './admin-auth.handlers.js';
import { createSessionHandler } from './admin-session.handler.js';

const AUTH_TAG = 'admin-auth';

export function registerAdminAuthRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createAdminAuthHandlers(deps);
  const sessionHandler = createSessionHandler(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const LOGIN_RATE = { max: deps.config.loginRateMax, timeWindow: '1 minute' } as const;

  r.post(
    '/api/v1/auth/login',
    { schema: { body: LoginRequest, response: { 200: LoginResponse }, tags: [AUTH_TAG] }, config: { rateLimit: LOGIN_RATE } },
    h.login,
  );

  // ── Session introspection (Story 1.11b, DD-6) ───────────────────────────────
  // GET /api/v1/auth/session → { userId, nationalGrants[] }. The admin SPA reads
  // this on session boot to gate nav + routes on global-scope grants (advisory;
  // requireAdminSession is the real boundary). A read-only GET → no CSRF posture.
  r.get(
    '/api/v1/auth/session',
    { schema: { response: { 200: SessionResponse }, tags: [AUTH_TAG] }, preHandler: [requireAdminSession(deps)] },
    sessionHandler,
  );

  // ── Passkey enrollment ──────────────────────────────────────────────────────
  r.post(
    '/api/v1/auth/passkey/register/options',
    { schema: { body: PasskeyRegisterOptionsRequest, tags: [AUTH_TAG] } },
    h.passkeyRegisterOptions,
  );
  r.post(
    '/api/v1/auth/passkey/register/verify',
    { schema: { body: PasskeyRegisterVerifyRequest, response: { 200: PasskeyRegisterVerifyResponse }, tags: [AUTH_TAG] } },
    h.passkeyRegisterVerify,
  );

  // ── Passkey authentication (second factor) ──────────────────────────────────
  r.post(
    '/api/v1/auth/passkey/authenticate/options',
    { schema: { body: PasskeyAuthOptionsRequest, tags: [AUTH_TAG] } },
    h.passkeyAuthOptions,
  );
  r.post(
    '/api/v1/auth/passkey/authenticate/verify',
    { schema: { body: PasskeyAuthVerifyRequest, response: { 200: PasskeyAuthVerifyResponse }, tags: [AUTH_TAG] } },
    h.passkeyAuthVerify,
  );

  // ── Recovery code (second factor) ───────────────────────────────────────────
  r.post(
    '/api/v1/auth/recovery/consume',
    { schema: { body: RecoveryConsumeRequest, response: { 200: RecoveryConsumeResponse }, tags: [AUTH_TAG] } },
    h.recoveryConsume,
  );

  // ── Password reset ──────────────────────────────────────────────────────────
  r.post(
    '/api/v1/auth/password-reset/request',
    { schema: { body: PasswordResetRequestRequest, response: { 200: PasswordResetRequestResponse }, tags: [AUTH_TAG] }, config: { rateLimit: LOGIN_RATE } },
    h.passwordResetRequest,
  );
  r.post(
    '/api/v1/auth/password-reset/consume',
    { schema: { body: PasswordResetConsumeRequest, response: { 200: PasswordResetConsumeResponse }, tags: [AUTH_TAG] } },
    h.passwordResetConsume,
  );

  // ── Logout (authenticated; the representative double-submit-CSRF mutation) ────
  app.post(
    '/api/v1/auth/logout',
    { schema: { hide: true }, preHandler: [requireAdminSession(deps), app.csrfProtection] },
    h.logout,
  );
}
