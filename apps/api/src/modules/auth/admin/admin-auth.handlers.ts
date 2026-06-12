// admin-auth handlers (Story 1.9, Task 4) — the thin Fastify glue: parse the
// validated body, drive the service, manage the @fastify/session state machine
// (first-factor → MFA-pending → authenticated), rotate the session id on every
// auth-state change (§2.4), and emit the audit line for each privileged event.
//
// Login is two-step: POST /login (first factor) puts the session in MFA-pending;
// a second factor (passkey verify OR recovery consume) completes it. Session-id
// rotation (`regenerate`) defeats fixation at each transition.

import type {
  LoginRequest,
  LoginResponse,
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
} from '@twt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../../context.js';
import { ForbiddenError, UnauthorizedError } from '../../../http-errors.js';
import { emitAuthAudit } from '../shared/audit.js';
import * as service from './admin-auth.service.js';

/** Rotate the session id + establish the fully-authenticated state (§2.4). */
async function completeLogin(deps: AppDeps, request: FastifyRequest, userId: string): Promise<void> {
  await request.session.regenerate(); // new sid (rotation) — fresh, empty session
  request.session.userId = userId;
  request.session.absoluteExpiry = deps.clock().getTime() + deps.config.sessionAbsoluteMs;
  request.session.authStateVersion = (request.session.authStateVersion ?? 0) + 1;
  request.requestContext.actorId = userId;
}

export function createAdminAuthHandlers(deps: AppDeps) {
  return {
    // ── First factor ──────────────────────────────────────────────────────────
    async login(request: FastifyRequest): Promise<LoginResponse> {
      const body = request.body as LoginRequest;
      await deps.turnstile.verify({ token: body.turnstileToken, remoteIp: request.ip });

      const result = await service.verifyFirstFactor(deps, body.email, body.password);
      if (!result.ok) {
        emitAuthAudit(deps, request, result.reason === 'locked' ? 'login.lockout' : 'login.failure');
        if (result.reason === 'locked') {
          // Generic 401 (do not confirm the email exists); lockout is audited.
          throw new UnauthorizedError('Invalid credentials', 'auth.invalid_credentials');
        }
        throw new UnauthorizedError('Invalid credentials', 'auth.invalid_credentials');
      }

      // First factor OK → MFA-pending. Rotate to a fresh session carrying only the
      // pending subject (no privileges yet).
      await request.session.regenerate();
      request.session.pendingMfaUserId = result.userId;
      emitAuthAudit(deps, request, 'login.success', {
        actorId: result.userId,
        context: { stage: 'first_factor' },
      });
      return { status: 'mfa_required', methods: ['webauthn', 'recovery_code'] };
    },

    // ── Second factor: WebAuthn ────────────────────────────────────────────────
    async passkeyAuthOptions(request: FastifyRequest): Promise<unknown> {
      const userId = request.session.pendingMfaUserId ?? request.session.userId;
      if (!userId) throw new UnauthorizedError('No login in progress', 'auth.no_login');
      const { challenge, options } = await service.authOptions(deps, userId);
      request.session.webauthnChallenge = challenge;
      request.session.webauthnChallengeKind = 'authentication';
      return options;
    },

    async passkeyAuthVerify(request: FastifyRequest): Promise<PasskeyAuthVerifyResponse> {
      const userId = request.session.pendingMfaUserId;
      const challenge = request.session.webauthnChallenge;
      if (!userId || !challenge || request.session.webauthnChallengeKind !== 'authentication') {
        throw new UnauthorizedError('No authentication in progress', 'auth.no_login');
      }
      const body = request.body as PasskeyAuthVerifyRequest;
      const ok = await service.authVerify(deps, userId, body.response, challenge);
      if (!ok) {
        emitAuthAudit(deps, request, 'passkey.auth.failure', { actorId: userId });
        throw new UnauthorizedError('Authentication failed', 'auth.passkey_failed');
      }
      await completeLogin(deps, request, userId);
      emitAuthAudit(deps, request, 'passkey.auth', { actorId: userId });
      emitAuthAudit(deps, request, 'login.success', { actorId: userId, context: { stage: 'complete' } });
      return { authenticated: true };
    },

    // ── Second factor: recovery code ───────────────────────────────────────────
    async recoveryConsume(request: FastifyRequest): Promise<RecoveryConsumeResponse> {
      const userId = request.session.pendingMfaUserId;
      if (!userId) throw new UnauthorizedError('No login in progress', 'auth.no_login');
      const body = request.body as RecoveryConsumeRequest;
      const ok = await service.consumeRecovery(deps, userId, body.code);
      if (!ok) {
        emitAuthAudit(deps, request, 'recovery_code.failure', { actorId: userId });
        throw new UnauthorizedError('Invalid recovery code', 'auth.recovery_failed');
      }
      await completeLogin(deps, request, userId);
      emitAuthAudit(deps, request, 'recovery_code.consume', { actorId: userId });
      emitAuthAudit(deps, request, 'login.success', { actorId: userId, context: { stage: 'complete' } });
      return { authenticated: true };
    },

    // ── WebAuthn enrollment (the ceremony gate) ────────────────────────────────
    async passkeyRegisterOptions(request: FastifyRequest): Promise<unknown> {
      const body = request.body as PasskeyRegisterOptionsRequest;
      const userId = await service.resolveEnrollmentSubject(deps, {
        ...(request.session.userId ? { sessionUserId: request.session.userId } : {}),
        ...(body.enrollmentToken ? { enrollmentToken: body.enrollmentToken } : {}),
      });
      if (!userId) {
        throw new ForbiddenError('Enrollment not authorized', 'auth.enrollment_denied');
      }
      const { challenge, options } = await service.registerOptions(deps, userId, userId);
      request.session.webauthnChallenge = challenge;
      request.session.webauthnChallengeKind = 'registration';
      // Stash the resolved subject so verify uses the same one (token path has no session).
      request.session.pendingMfaUserId = request.session.userId ? undefined : userId;
      return options;
    },

    async passkeyRegisterVerify(request: FastifyRequest): Promise<PasskeyRegisterVerifyResponse> {
      const body = request.body as PasskeyRegisterVerifyRequest;
      const challenge = request.session.webauthnChallenge;
      if (!challenge || request.session.webauthnChallengeKind !== 'registration') {
        throw new ForbiddenError('No enrollment in progress', 'auth.no_enrollment');
      }
      const userId = await service.resolveEnrollmentSubject(deps, {
        ...(request.session.userId ? { sessionUserId: request.session.userId } : {}),
        ...(body.enrollmentToken ? { enrollmentToken: body.enrollmentToken } : {}),
        // The token path stashed the subject as pendingMfaUserId in options.
      });
      const subject = userId ?? request.session.pendingMfaUserId;
      if (!subject) throw new ForbiddenError('Enrollment not authorized', 'auth.enrollment_denied');

      const result = await service.registerVerify(
        deps,
        subject,
        body.response,
        challenge,
        body.deviceLabel,
      );
      request.session.webauthnChallenge = undefined;
      request.session.webauthnChallengeKind = undefined;
      if (!result.verified) {
        throw new ForbiddenError('Passkey verification failed', 'auth.enrollment_failed');
      }
      // Re-enrollment / new device is an auth-state change → rotate (if logged in).
      if (request.session.userId) request.session.authStateVersion = (request.session.authStateVersion ?? 0) + 1;
      emitAuthAudit(deps, request, 'passkey.enroll', { actorId: subject });
      return {
        verified: true,
        ...(result.recoveryCodes ? { recoveryCodes: result.recoveryCodes } : {}),
      };
    },

    // ── Password reset ─────────────────────────────────────────────────────────
    async passwordResetRequest(request: FastifyRequest): Promise<PasswordResetRequestResponse> {
      const body = request.body as PasswordResetRequestRequest;
      await deps.turnstile.verify({ token: body.turnstileToken, remoteIp: request.ip });
      const minted = await service.requestPasswordReset(deps, body.email);
      if (minted) {
        // Delivery is seamed (email channel → Story 5.x). Dev: log the link token.
        if (deps.config.nodeEnv !== 'production') {
          console.info('[password-reset:stub]', JSON.stringify({ userId: minted.userId, token: minted.token }));
        }
        emitAuthAudit(deps, request, 'password_reset.request', { actorId: minted.userId });
      }
      // Always 'sent' — never reveal whether the email exists.
      return { sent: true };
    },

    async passwordResetConsume(request: FastifyRequest): Promise<PasswordResetConsumeResponse> {
      const body = request.body as PasswordResetConsumeRequest;
      const result = await service.consumePasswordReset(deps, body.token, body.newPassword);
      if (!result.ok) {
        throw new ForbiddenError('Invalid or expired reset link', 'auth.reset_invalid');
      }
      // Revoke every session for the user (rotation/revocation, §2.4).
      await request.server.adminSessionStore.destroyForUser(result.userId);
      emitAuthAudit(deps, request, 'password_reset.consume', { actorId: result.userId });
      return { reset: true, webauthnReenrollmentRequired: true };
    },

    // ── Logout ─────────────────────────────────────────────────────────────────
    async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const actorId = request.session.userId;
      await request.session.destroy();
      if (actorId) emitAuthAudit(deps, request, 'login.success', { actorId, context: { event: 'logout' } });
      void reply.status(204).send();
    },
  };
}
