// Member-auth handlers (Story 3.2, Tasks 4 + 7) — the Fastify glue for the member
// mobile+OTP login flow, the JWT session, refresh rotation, logout, multi-Pariwar
// scope selection, and the member step-up request/verify.
//
// Security posture (non-negotiable): enumeration defense (/otp/request always
// returns the same {sent:true} shape); audit carries otp_audit_tag + masked mobile
// only (never the code, never plaintext mobile, never a token); withdrawn members are
// blocked via the Story 3.1 accessor (getMemberStateAt), not a state-column read.

import { randomUUID } from 'node:crypto';

import type {
  MemberOtpRequestRequest,
  MemberOtpRequestResponse,
  MemberOtpVerifyRequest,
  MemberOtpVerifyResponse,
  MemberFullSession,
  MemberSelectPariwarRequest,
  MemberSelectPariwarResponse,
  MemberStepUpRequestRequest,
  MemberStepUpRequestResponse,
  MemberStepUpVerifyRequest,
  MemberStepUpVerifyResponse,
  MemberTokenRefreshRequest,
  MemberTokenRefreshResponse,
} from '@twt/contracts';
import { ids, member as memberDomain } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../../context.js';
import { ForbiddenError, UnauthorizedError } from '../../../http-errors.js';
import { PARIWAR_SELECT_TYP } from '../../../plugins/jwt/index.js';
import type { PariwarSelectClaims } from '../../../plugins/jwt/index.js';
import { emitAuthAudit } from '../shared/audit.js';
import { hmacOtpAuditCorrelation } from '../shared/otp.js';
import { maskMobile, mobileBlindIndex, normalizeMobile } from '../shared/mobile-index.js';
import * as authService from './member-auth.service.js';
import * as repo from './member-auth.repo.js';
import * as otpService from './member-otp.service.js';
import { signPariwarSelect, signSignupContinuation } from './tokens.js';

const secs = (ms: number): number => Math.max(1, Math.floor(ms / 1000));

/**
 * Resolve member state pre-scope (serviceDb / BYPASSRLS) and complete the session.
 * `otpAuditTag` is the HMAC-keyed otp_hash for the consume audit (P20/P28); absent
 * on the selectPariwar path (no OTP is verified there).
 */
export async function completeMemberLogin(
  deps: AppDeps,
  request: FastifyRequest,
  membership: { memberId: string; pariwarId: string },
  deviceId: string,
  deviceLabel: string | undefined,
  maskedMobile: string | undefined,
  otpAuditTag?: string,
): Promise<MemberFullSession> {
  const now = deps.clock();
  // Story 3.1 accessor (NOT a state-column read) — replays events_log across tenants.
  const state = await memberDomain.getMemberStateAt(
    deps.serviceDb,
    ids.memberId(membership.memberId),
    now,
  );

  // PR-Patch-5: `getMemberStateAt` is non-nullable — an empty event stream replays to
  // the initial 'pending-kyc' (a member mid-signup, which the spec admits), never null.
  // The former `state === null` "state unavailable" branch was unreachable dead code
  // and has been removed. Only the two terminal states block login.
  if (state === 'withdrawn' || state === 'anonymized') {
    emitAuthAudit(deps, request, 'member_login.failure', {
      actorId: membership.memberId,
      pariwarId: membership.pariwarId,
      context: { reason: state, ...(maskedMobile ? { masked_mobile: maskedMobile } : {}) },
    });
    // P6: timing-equalize the withdrawn block — without this, a withdrawn-member
    // response is measurably faster than the full session-issuance path, letting an
    // attacker enumerate account status via response time.
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 100));
    throw new ForbiddenError('Member is withdrawn', 'auth.member_withdrawn');
  }

  // P11: audit session-issuance failure so the event is never silently dropped.
  let issuedSession: Awaited<ReturnType<typeof authService.issueFullSession>>;
  try {
    issuedSession = await authService.issueFullSession(
      deps,
      request.server,
      { memberId: membership.memberId, pariwarId: membership.pariwarId, deviceId, deviceLabel },
      now,
    );
  } catch (err) {
    emitAuthAudit(deps, request, 'member_login.failure', {
      actorId: membership.memberId,
      pariwarId: membership.pariwarId,
      context: { reason: 'session_issuance_error', ...(maskedMobile ? { masked_mobile: maskedMobile } : {}) },
    });
    throw err;
  }
  const { session, droppedDevice } = issuedSession;

  emitAuthAudit(deps, request, 'member_login.otp_consume', {
    actorId: membership.memberId,
    pariwarId: membership.pariwarId,
    context: {
      result: 'full_session',
      ...(maskedMobile ? { masked_mobile: maskedMobile } : {}),
      // P20/P28: HMAC-keyed tag links this consume to the matching send event
      // without exposing the raw otp_hash (brute-forceable in <1 ms on 6 digits).
      ...(otpAuditTag ? { otp_audit_tag: otpAuditTag } : {}),
    },
  });
  emitAuthAudit(deps, request, 'member_device.bound', {
    actorId: membership.memberId,
    pariwarId: membership.pariwarId,
    context: { device_id: deviceId },
  });
  if (droppedDevice) {
    emitAuthAudit(deps, request, 'member_device.dropped', {
      actorId: membership.memberId,
      pariwarId: membership.pariwarId,
      context: { dropped_device_id: droppedDevice.deviceId, reason: 'device_cap' },
    });
  }
  return session;
}

export function createMemberAuthHandlers(deps: AppDeps) {
  return {
    // ── POST /otp/request — mint + deliver a login OTP (enumeration-safe) ────────
    async otpRequest(request: FastifyRequest): Promise<MemberOtpRequestResponse> {
      const body = request.body as MemberOtpRequestRequest;
      const blindIndex = await mobileBlindIndex(body.mobile, deps.encryption);
      // Identical response whether or not the mobile is valid/known (enumeration defense).
      if (blindIndex !== null) {
        const canonical = normalizeMobile(body.mobile);
        const masked = canonical ? maskMobile(canonical) : undefined;
        const { code, otpHash, expiresAt } = await otpService.requestOtp(deps, 'login', blindIndex, {});
        const auditTag = hmacOtpAuditCorrelation(otpHash, deps.config.auditOtpCorrelationKey);
        const delivery = {
          code,
          actorId: blindIndex,
          actionContext: 'member.login',
          ...(masked ? { destinationHint: masked } : {}),
        };
        // P8: audit delivery failures; do not re-throw (enumeration defense requires
        // the same 200 response regardless of delivery outcome).
        try {
          await deps.stepUpDelivery.deliver(delivery);
        } catch (err) {
          deps.stepUpDelivery.onPrimaryDeliveryFailure?.(delivery, err);
          emitAuthAudit(deps, request, 'member_login.failure', {
            context: {
              reason: 'otp_delivery_failed',
              otp_audit_tag: auditTag,
              ...(masked ? { masked_mobile: masked } : {}),
            },
          });
        }
        // P28: use HMAC-keyed tag instead of raw otp_hash (raw SHA-256 of a 6-digit
        // OTP is brute-forceable in <1 ms — the tag is non-invertible without the key).
        emitAuthAudit(deps, request, 'member_login.otp_send', {
          context: {
            otp_audit_tag: auditTag,
            ...(masked ? { masked_mobile: masked } : {}),
            sent_at: deps.clock().toISOString(),
            expires_at: expiresAt.toISOString(),
          },
        });
      }
      return { sent: true, expiresInSeconds: secs(deps.config.loginOtpTtlMs) };
    },

    // ── POST /otp/verify — verify OTP → session / select / signup-continuation ───
    async otpVerify(request: FastifyRequest): Promise<MemberOtpVerifyResponse> {
      const body = request.body as MemberOtpVerifyRequest;
      const canonical = normalizeMobile(body.mobile);
      const blindIndex = canonical ? await mobileBlindIndex(body.mobile, deps.encryption) : null;
      if (blindIndex === null) {
        emitAuthAudit(deps, request, 'member_login.failure', { context: { reason: 'invalid_mobile' } });
        throw new UnauthorizedError('Invalid code', 'auth.invalid_otp');
      }
      const masked = maskMobile(canonical as string);
      const result = await otpService.verifyOtp(deps, 'login', blindIndex, body.otp);
      if (!result.ok) {
        emitAuthAudit(deps, request, 'member_login.failure', { context: { masked_mobile: masked } });
        throw new UnauthorizedError('Invalid code', 'auth.invalid_otp');
      }

      // P28: compute the HMAC audit tag once; reused in consume events below.
      const otpAuditTag = hmacOtpAuditCorrelation(result.otpHash, deps.config.auditOtpCorrelationKey);

      // P9: memberships query throws AFTER the OTP was already consumed. Catch + audit
      // so the caller gets a 5xx they can retry (with a new OTP next time).
      let memberships: Awaited<ReturnType<typeof repo.resolveMembersByMobile>>;
      try {
        memberships = await repo.resolveMembersByMobile(deps.servicePool, blindIndex);
      } catch (err) {
        emitAuthAudit(deps, request, 'member_login.failure', {
          context: { masked_mobile: masked, reason: 'membership_lookup_error', otp_audit_tag: otpAuditTag },
        });
        throw err;
      }

      // First signup (R5) — no member yet → single-use continuation seam.
      if (memberships.length === 0) {
        const now = deps.clock();
        const jti = randomUUID();
        const expiresAt = new Date(now.getTime() + deps.config.signupContinuationTtlMs);
        await repo.insertSignupContinuation(deps.pool, { jti, mobileBlindIndex: blindIndex, expiresAt });
        const signupContinuationToken = signSignupContinuation(
          request.server,
          { mobileBlindIndex: blindIndex, jti },
          deps.config.signupContinuationTtlMs,
        );
        emitAuthAudit(deps, request, 'member_login.otp_consume', {
          context: { masked_mobile: masked, result: 'signup_continuation', otp_audit_tag: otpAuditTag },
        });
        return {
          sessionType: 'signup_continuation',
          signupContinuationToken,
          expiresAt: expiresAt.toISOString(),
        };
      }

      // Multi-Pariwar (R2) — client picks scope before a full session is issued.
      if (memberships.length > 1) {
        // P27: deviceId is required to bind the eventual session to the right device.
        if (!body.deviceId) {
          emitAuthAudit(deps, request, 'member_login.failure', {
            context: { masked_mobile: masked, reason: 'device_id_missing' },
          });
          throw new UnauthorizedError('deviceId is required for Pariwar selection', 'auth.device_id_required');
        }
        // PR-Patch-10: register a single-use jti so the select token cannot be replayed
        // to mint multiple full sessions within its TTL (mirrors signup_continuation).
        const now = deps.clock();
        const selectJti = randomUUID();
        const selectExpiresAt = new Date(now.getTime() + deps.config.pariwarSelectTtlMs);
        await repo.insertPariwarSelect(deps.pool, {
          jti: selectJti,
          mobileBlindIndex: blindIndex,
          expiresAt: selectExpiresAt,
        });
        // P30: use the dedicated pariwarSelectTtlMs (not the step-up elevated window).
        const selectToken = signPariwarSelect(
          request.server,
          {
            mobileBlindIndex: blindIndex,
            deviceId: body.deviceId,
            jti: selectJti,
            deviceLabel: body.deviceLabel,
            maskedMobile: masked,
          },
          deps.config.pariwarSelectTtlMs,
        );
        emitAuthAudit(deps, request, 'member_login.otp_consume', {
          context: {
            masked_mobile: masked,
            result: 'pariwar_select',
            membership_count: memberships.length,
            otp_audit_tag: otpAuditTag,
          },
        });
        return {
          sessionType: 'pariwar_select',
          memberships: memberships.map((m) => ({
            memberId: m.memberId,
            pariwarId: m.pariwarId,
            pariwarName: m.pariwarName,
          })),
          selectToken,
        };
      }

      // Single membership — state-gate, then issue the full session.
      const membership = memberships[0] as { memberId: string; pariwarId: string };
      return completeMemberLogin(deps, request, membership, body.deviceId, body.deviceLabel, masked, otpAuditTag);
    },

    // ── POST /otp/select-pariwar — multi-Pariwar scope selection (R2) ────────────
    async selectPariwar(request: FastifyRequest): Promise<MemberSelectPariwarResponse> {
      const body = request.body as MemberSelectPariwarRequest;
      let claims: PariwarSelectClaims & { iat: number; exp: number };
      try {
        claims = request.server.jwt.verify<PariwarSelectClaims & { iat: number; exp: number }>(
          body.selectToken,
        );
      } catch {
        throw new UnauthorizedError('Invalid selection token', 'auth.invalid_select_token');
      }
      if (claims.typ !== PARIWAR_SELECT_TYP) {
        throw new UnauthorizedError('Invalid selection token', 'auth.invalid_select_token');
      }
      const memberships = await repo.resolveMembersByMobile(deps.servicePool, claims.sub);
      const chosen = memberships.find((m) => m.pariwarId === body.pariwarId);
      if (!chosen) {
        // P12: audit the invalid selection before rejecting. The jti is NOT burned here
        // so a legitimate retry with the correct pariwarId still works (the membership
        // list was already disclosed at /otp/verify, so this leaks nothing new).
        emitAuthAudit(deps, request, 'member_login.failure', {
          context: { reason: 'invalid_pariwar_selection' },
        });
        throw new UnauthorizedError('Invalid Pariwar selection', 'auth.invalid_select');
      }
      // PR-Patch-10: atomically burn the single-use jti before issuing the session. A
      // replay (or a lost concurrent race) returns 409-class → one OTP yields exactly
      // one full session for the chosen Pariwar.
      const consume = await repo.consumePariwarSelect(deps.pool, claims.jti, deps.clock());
      if (consume !== 'consumed') {
        emitAuthAudit(deps, request, 'member_login.failure', {
          context: {
            reason: consume === 'already' ? 'pariwar_select_replayed' : 'pariwar_select_unknown',
            ...(claims.masked_mobile ? { masked_mobile: claims.masked_mobile } : {}),
          },
        });
        throw new UnauthorizedError('Selection token already used', 'auth.select_token_consumed');
      }
      // P13: masked_mobile is now carried in the select token (added by otpVerify).
      return completeMemberLogin(
        deps,
        request,
        chosen,
        claims.device_id,
        claims.device_label,
        claims.masked_mobile,
      );
    },

    // ── POST /token/refresh — rotate-on-use + reuse detection ────────────────────
    async tokenRefresh(request: FastifyRequest): Promise<MemberTokenRefreshResponse> {
      const body = request.body as MemberTokenRefreshRequest;
      const result = await authService.rotateRefresh(deps, request.server, body.refreshToken, deps.clock());
      if (!result.ok) {
        if (result.reason === 'reuse') {
          emitAuthAudit(deps, request, 'member_session.reuse_revoke', {
            actorId: result.memberId,
            context: { device_id: result.deviceId },
          });
        } else if (result.reason === 'member_blocked') {
          // PR-Patch-9: member is withdrawn/anonymized — the service already revoked the
          // chain. Record it and block with the same 403 the login gate uses.
          emitAuthAudit(deps, request, 'member_session.revoked', {
            actorId: result.memberId,
            context: { device_id: result.deviceId, reason: 'member_blocked' },
          });
          throw new ForbiddenError('Member is not active', 'auth.member_withdrawn');
        } else if (result.reason === 'concurrent') {
          // PR-Patch-11: benign concurrent rotation of the same token — the sibling
          // request already minted a fresh token; the chain is intact. No reuse audit,
          // no revoke; the client retries with the token from its other response.
          throw new UnauthorizedError('Refresh already in progress', 'auth.refresh_concurrent');
        }
        throw new UnauthorizedError('Invalid refresh token', 'auth.invalid_refresh');
      }
      emitAuthAudit(deps, request, 'member_session.refresh', {
        actorId: result.memberId,
        context: { device_id: result.deviceId },
      });
      return result.session;
    },

    // ── POST /logout — revoke the current device's refresh chain ─────────────────
    async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const memberId = request.requestContext.actorId;
      const user = request.user;
      const deviceId = user?.typ === 'access' ? user.device_id : undefined;
      if (memberId && deviceId) {
        await repo.revokeDeviceChain(deps.pool, memberId, deviceId, deps.clock());
        emitAuthAudit(deps, request, 'member_session.logout', {
          actorId: memberId,
          context: { device_id: deviceId },
        });
      } else if (memberId) {
        // P5: access token lacked device_id — the chain cannot be revoked without
        // a device key. Audit the miss so the gap is visible in the audit log.
        emitAuthAudit(deps, request, 'member_session.logout', {
          actorId: memberId,
          context: { device_id: null, reason: 'device_id_missing' },
        });
      }
      void reply.status(204).send();
    },

    // ── POST /step-up/request — mint + deliver a step-up OTP (AC-2) ───────────────
    async stepUpRequest(request: FastifyRequest): Promise<MemberStepUpRequestResponse> {
      const memberId = request.requestContext.actorId;
      if (!memberId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const body = request.body as MemberStepUpRequestRequest;
      const blindIndex = await repo.getMemberMobileBlindIndex(deps.servicePool, memberId);
      if (!blindIndex) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const { code, otpHash, expiresAt } = await otpService.requestOtp(deps, 'step_up', blindIndex, {
        memberId,
        actionContext: body.actionContext,
      });
      // P28: HMAC-keyed audit tag (same key → same tag for matching send+consume events).
      const auditTag = hmacOtpAuditCorrelation(otpHash, deps.config.auditOtpCorrelationKey);
      const delivery = { code, actorId: memberId, actionContext: body.actionContext };
      // PR-Patch-8: surface step-up delivery failures. The login path already audits +
      // calls the alert hook on a delivery throw; step-up previously let it 500 with no
      // record. This is an authenticated surface (no enumeration concern) → audit the
      // failure + invoke the alert hook, then propagate so the member sees a retriable error.
      try {
        await deps.stepUpDelivery.deliver(delivery);
      } catch (err) {
        deps.stepUpDelivery.onPrimaryDeliveryFailure?.(delivery, err);
        emitAuthAudit(deps, request, 'member_step_up.failure', {
          actorId: memberId,
          pariwarId: request.requestContext.pariwarId ?? null,
          context: { otp_audit_tag: auditTag, action_context: body.actionContext, reason: 'otp_delivery_failed' },
        });
        throw err;
      }
      emitAuthAudit(deps, request, 'member_step_up.send', {
        actorId: memberId,
        pariwarId: request.requestContext.pariwarId ?? null,
        context: { otp_audit_tag: auditTag, action_context: body.actionContext, sent_at: deps.clock().toISOString() },
      });
      void expiresAt;
      return { sent: true, expiresInSeconds: secs(deps.config.stepUpOtpTtlMs) };
    },

    // ── POST /step-up/verify — elevate the member for the action_context (AC-2) ───
    async stepUpVerify(request: FastifyRequest): Promise<MemberStepUpVerifyResponse> {
      const memberId = request.requestContext.actorId;
      if (!memberId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const body = request.body as MemberStepUpVerifyRequest;
      const blindIndex = await repo.getMemberMobileBlindIndex(deps.servicePool, memberId);
      if (!blindIndex) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      // PR-Patch-4: bind the step-up OTP lookup to THIS member so a shared-mobile
      // member (multi-Pariwar) cannot consume another member's step-up OTP.
      const result = await otpService.verifyOtp(deps, 'step_up', blindIndex, body.otp, {
        expectedMemberId: memberId,
      });
      if (!result.ok || !result.actionContext) {
        // P21: include action_context in failure audit when available.
        emitAuthAudit(deps, request, 'member_step_up.failure', {
          actorId: memberId,
          context: { action_context: result.ok ? result.actionContext : null },
        });
        throw new UnauthorizedError('Step-up verification failed', 'auth.step_up_failed');
      }
      const elevatedUntil = new Date(deps.clock().getTime() + deps.config.stepUpElevatedMs);
      // P22: wrap insertElevation — if it throws after the OTP was consumed, the member
      // effectively lost their elevation window. Audit the failure and propagate.
      try {
        await repo.insertElevation(deps.pool, {
          memberId,
          actionContext: result.actionContext,
          elevatedUntil,
        });
      } catch (err) {
        emitAuthAudit(deps, request, 'member_step_up.failure', {
          actorId: memberId,
          context: { action_context: result.actionContext, reason: 'elevation_insert_error' },
        });
        throw err;
      }
      // PR-Patch-2 (P20 residual): tag the consume with the HMAC-keyed otp_hash so it
      // links to the matching send event (AC2 non-repudiation), as the login path does.
      const stepUpAuditTag = hmacOtpAuditCorrelation(result.otpHash, deps.config.auditOtpCorrelationKey);
      emitAuthAudit(deps, request, 'member_step_up.consume', {
        actorId: memberId,
        context: { action_context: result.actionContext, otp_audit_tag: stepUpAuditTag },
      });
      return { elevated: true, elevatedUntil: elevatedUntil.toISOString() };
    },
  };
}
