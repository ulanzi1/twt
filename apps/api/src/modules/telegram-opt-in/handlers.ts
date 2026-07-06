// Member Telegram opt-in handlers — Story 5.5 (Task 6; AC4/AC10).
//
// Three member-session-gated handlers over the @twt/domain telegramOptIn accessors:
//   · POST   /api/v1/member/telegram-opt-in — mint a PENDING (or re-use an outstanding one) → the t.me deep-link.
//   · GET    /api/v1/member/telegram-opt-in — current opt-in state (drives the settings toggle + copy).
//   · POST   /api/v1/member/telegram-opt-in/revoke — member-initiated revocation (ACTIVE → REVOKED;
//     independently revocable — touches ONLY telegram_opt_in).
//
// The member session (requireMemberSession) sets request.requestContext.actorId = member_id + .pariwarId.
// Unlike WhatsApp there is NO mobile blind index (Telegram never shares the phone) — the match key is the
// verification code alone, minted by createPendingOptIn. Audit-or-throw: the audit line is written FIRST
// (servicePool, its own tx), then the consent + state transition run on the scope tx (rolled back together on
// failure). NO secret value ever reaches an audit line (there is none in this flow).

import { audit, channelConfig, consent, ids, telegramOptIn } from '@twt/domain';
import type {
  RevokeTelegramOptInResponse,
  TelegramOptInRequestResponse,
  TelegramOptInStatusResponse,
} from '@twt/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ConflictError, UnauthorizedError } from '../../http-errors.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** Build the t.me `/start` deep-link, pre-filled with the verification code. */
export function buildStartDeepLink(botUsername: string, verificationCode: string): string {
  const handle = botUsername.trim().replace(/^@/, '');
  if (!handle) {
    // An admin-entered botUsername with no usable handle would silently build a broken t.me link.
    throw new ConflictError(
      'Telegram bot is misconfigured for this Pariwar',
      'telegram_opt_in.invalid_bot_username',
    );
  }
  return `https://t.me/${encodeURIComponent(handle)}?start=${encodeURIComponent(verificationCode)}`;
}

interface MemberCtx {
  memberId: string;
  pariwarId: string;
}

export function createTelegramOptInHandlers(deps: AppDeps) {
  /** Narrow the member session context (the guard guarantees it; this is defense-in-depth). */
  function memberCtx(request: FastifyRequest): MemberCtx {
    const memberId = request.requestContext.actorId;
    const pariwarId = request.requestContext.pariwarId;
    if (!memberId || !pariwarId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberId, pariwarId };
  }

  /** Write one opt-in-transition audit line (servicePool, own tx). Returns the auditId + the facts needed to
   *  write a compensating `*_rolled_back` line if a later step in the same request rolls back. */
  async function writeOptInAudit(
    request: FastifyRequest,
    args: {
      pariwarId: string;
      memberId: string;
      action: string;
      originatingChannel: telegramOptIn.TelegramOptInOriginatingChannel;
      beforeState: string;
      afterState: string;
      verificationCode?: string | null;
      responseStatus?: number;
    },
  ): Promise<{ auditId: string; requestPayloadHash: string; resourceLocator: string }> {
    const resourceLocator = `pariwar/${args.pariwarId}/member/${args.memberId}/telegram-opt-in`;
    const requestPayloadHash = telegramOptIn.telegramOptInAuditPayloadHash({
      originatingChannel: args.originatingChannel,
      memberId: args.memberId,
      verificationCode: args.verificationCode ?? null,
      beforeState: args.beforeState,
      afterState: args.afterState,
    });
    const row = await audit.writeAuditEntry(deps.servicePool, {
      pariwarId: args.pariwarId,
      actorId: args.memberId,
      actorRole: null,
      action: args.action,
      resourceLocator,
      requestPayloadHash,
      responseStatus: args.responseStatus ?? 200,
      traceId: request.requestContext.traceId ?? null,
    });
    return { auditId: row.auditId, requestPayloadHash, resourceLocator };
  }

  /** Best-effort compensating `*_rolled_back` audit line (status 500). Never masks the original error. */
  async function writeCompensatingAudit(
    request: FastifyRequest,
    args: { pariwarId: string; memberId: string; action: string; requestPayloadHash: string; resourceLocator: string },
  ): Promise<void> {
    try {
      await audit.writeAuditEntry(deps.servicePool, {
        pariwarId: args.pariwarId,
        actorId: args.memberId,
        actorRole: null,
        action: args.action,
        resourceLocator: args.resourceLocator,
        requestPayloadHash: args.requestPayloadHash,
        responseStatus: 500,
        traceId: request.requestContext.traceId ?? null,
      });
    } catch {
      // swallow — the original error is the one the caller must see.
    }
  }

  return {
    /** POST — mint a PENDING (or re-use an outstanding one) and return the t.me `/start` deep-link. */
    async request(request: FastifyRequest): Promise<TelegramOptInRequestResponse> {
      const { memberId, pariwarId: pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const memberIdBranded = ids.memberId(memberId);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      // Compensating audit: armed once the 'requested' audit line is durably committed; consumed by the catch
      // below to settle the chain if the PENDING insert then fails (e.g. a concurrent-mint race).
      let compensation: { requestPayloadHash: string; resourceLocator: string } | null = null;
      try {
        const config = await channelConfig.getTelegramConfig(scopeTx.tx, pariwarId);
        if (!config || !config.enabled || !config.botUsername) {
          throw new ConflictError(
            'Telegram delivery is not enabled for this Pariwar',
            'telegram_opt_in.channel_unavailable',
          );
        }

        const existing = await telegramOptIn.getOptInForMember(scopeTx.tx, {
          pariwarId,
          memberId: memberIdBranded,
        });
        if (existing?.state === 'ACTIVE') {
          throw new ConflictError('You are already opted in to Telegram notifications', 'telegram_opt_in.already_active');
        }
        if (existing?.state === 'PENDING') {
          // Re-tap: re-use the outstanding PENDING (re-issue the deep-link; no new transition, no audit).
          // Build the deep-link BEFORE flipping `ok` — a misconfigured botUsername must not commit anything.
          const deepLink = buildStartDeepLink(config.botUsername, existing.verificationCode);
          ok = true;
          return { state: 'PENDING', deepLink };
        }

        // Fresh mint (none / REVOKED / BLOCKED / EXPIRED) — a NEW PENDING + code (no inferred re-consent; AC10).
        // Audit FIRST (member_app; before 'none', after PENDING) — committed on its own tx before the mint. No
        // verificationCode yet (the code doesn't exist until createPendingOptIn mints/regenerates it).
        const audited = await writeOptInAudit(request, {
          pariwarId: pariwarIdStr,
          memberId,
          action: 'member.telegram_opt_in_requested',
          originatingChannel: 'member_app',
          beforeState: 'none',
          afterState: 'PENDING',
        });
        compensation = { requestPayloadHash: audited.requestPayloadHash, resourceLocator: audited.resourceLocator };

        let pending;
        try {
          pending = await telegramOptIn.createPendingOptIn(scopeTx.tx, {
            pariwarId,
            memberId: memberIdBranded,
          });
        } catch (err) {
          if (err instanceof telegramOptIn.TelegramOptInPendingExistsError) {
            // A concurrent double-tap lost the DB race — re-use the winning row's deep-link (documented
            // recovery behavior) rather than surfacing a bare 409 to the loser. No state change here, so
            // settle the 'requested' audit line as rolled back for THIS request's attempt.
            await writeCompensatingAudit(request, {
              pariwarId: pariwarIdStr,
              memberId,
              action: 'member.telegram_opt_in_requested_rolled_back',
              requestPayloadHash: compensation.requestPayloadHash,
              resourceLocator: compensation.resourceLocator,
            });
            compensation = null;
            const deepLink = buildStartDeepLink(config.botUsername, err.verificationCode);
            ok = true;
            return { state: 'PENDING', deepLink };
          }
          throw err;
        }
        // Build the deep-link BEFORE flipping `ok` — a misconfigured botUsername must not commit the mint.
        const deepLink = buildStartDeepLink(config.botUsername, pending.verificationCode);
        ok = true;
        return { state: 'PENDING', deepLink };
      } catch (err) {
        if (compensation !== null) {
          await writeCompensatingAudit(request, {
            pariwarId: pariwarIdStr,
            memberId,
            action: 'member.telegram_opt_in_requested_rolled_back',
            requestPayloadHash: compensation.requestPayloadHash,
            resourceLocator: compensation.resourceLocator,
          });
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** GET — the member's current opt-in status (drives the toggle + confirmation/retry copy). */
    async status(request: FastifyRequest): Promise<TelegramOptInStatusResponse> {
      const { memberId, pariwarId: pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const config = await channelConfig.getTelegramConfig(scopeTx.tx, pariwarId);
        const available = Boolean(config?.enabled && config?.botUsername);
        const existing = await telegramOptIn.getOptInForMember(scopeTx.tx, {
          pariwarId,
          memberId: ids.memberId(memberId),
        });
        ok = true;
        const state = existing?.state ?? null;
        // A read-only status check must never throw on a misconfigured botUsername (e.g. a bare "@") — a
        // broken deep-link degrades to `null` rather than turning this GET into an error for the member.
        let deepLink: string | null = null;
        if (state === 'PENDING' && config?.botUsername) {
          try {
            deepLink = buildStartDeepLink(config.botUsername, existing!.verificationCode);
          } catch {
            deepLink = null;
          }
        }
        return { available, state, deepLink };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** DELETE — member-initiated revocation (ACTIVE → REVOKED). Independently revocable (only telegram_opt_in). */
    async revoke(request: FastifyRequest): Promise<RevokeTelegramOptInResponse> {
      const { memberId, pariwarId: pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      let compensation: { requestPayloadHash: string; resourceLocator: string } | null = null;
      try {
        const existing = await telegramOptIn.getOptInForMember(scopeTx.tx, {
          pariwarId,
          memberId: ids.memberId(memberId),
        });
        if (!existing || existing.state !== 'ACTIVE') {
          throw new ConflictError('You have no active Telegram opt-in to revoke', 'telegram_opt_in.not_active');
        }

        // Audit FIRST (member_app; before ACTIVE, after REVOKED).
        const audited = await writeOptInAudit(request, {
          pariwarId: pariwarIdStr,
          memberId,
          action: 'member.telegram_opt_in_revoked',
          originatingChannel: 'member_app',
          beforeState: 'ACTIVE',
          afterState: 'REVOKED',
          verificationCode: existing.verificationCode,
        });
        compensation = { requestPayloadHash: audited.requestPayloadHash, resourceLocator: audited.resourceLocator };

        // Consent revoke + state revoke in ONE scope tx (rolled back together on failure).
        if (existing.consentId) {
          await consent.revokeConsent(scopeTx.tx, {
            pariwarId,
            consentId: existing.consentId,
            reason: 'member revoked Telegram opt-in from app settings',
            revokedAuditId: audited.auditId,
          });
        }
        await telegramOptIn.revokeOptIn(scopeTx.tx, {
          pariwarId,
          optInId: existing.optInId,
          toState: 'REVOKED',
        });
        ok = true;
        return { state: 'REVOKED' };
      } catch (err) {
        if (compensation !== null) {
          await writeCompensatingAudit(request, {
            pariwarId: pariwarIdStr,
            memberId,
            action: 'member.telegram_opt_in_revoked_rolled_back',
            requestPayloadHash: compensation.requestPayloadHash,
            resourceLocator: compensation.resourceLocator,
          });
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
