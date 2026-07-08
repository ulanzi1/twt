// Member WhatsApp opt-in handlers — Story 5.4 (Task 6; AC1/AC4).
//
// Three member-session-gated handlers over the @twt/domain waOptIn accessors:
//   · POST   /api/v1/member/wa-opt-in — mint a PENDING (or re-use an outstanding one) → deep-link + phrase.
//   · GET    /api/v1/member/wa-opt-in — current opt-in state (drives the settings toggle + copy).
//   · DELETE /api/v1/member/wa-opt-in — member-initiated revocation (ACTIVE → REVOKED; independently
//     revocable — touches ONLY whatsapp_opt_in).
//
// The member session (requireMemberSession) sets request.requestContext.actorId = member_id + .pariwarId.
// The PENDING match key is the member's STORED member_identities.mobile_blind_index (so the worker's inbound
// match — which recomputes the blind index from the sender `from` — agrees when the member messages from
// their registered number). Audit-or-throw via `audit.withCompensatingAudit` (ADR-0030): the audit line is
// written FIRST (servicePool, its own tx), then the consent + state transition run on the scope tx (rolled
// back together on failure, with a compensating `*_rolled_back` line settling the chain). NO secret value
// ever reaches an audit line (there is none in this flow).

import { audit, channelConfig, consent, ids, waOptIn } from '@twt/domain';
import type {
  CreateWaOptInResponse,
  RevokeWaOptInResponse,
  WaOptInStatusResponse,
} from '@twt/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ConflictError, UnauthorizedError } from '../../http-errors.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** Build the wa.me Send-Hello deep-link, pre-filled with the verification phrase. */
export function buildSendHelloDeepLink(displayPhoneNumber: string, verificationPhrase: string): string {
  const digits = displayPhoneNumber.replace(/\D/g, '');
  if (!digits) {
    // An admin-entered displayPhoneNumber with no digits would silently build a broken wa.me link.
    throw new ConflictError(
      'WhatsApp number is misconfigured for this Pariwar',
      'wa_opt_in.invalid_display_number',
    );
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(verificationPhrase)}`;
}

interface MemberCtx {
  memberId: string;
  pariwarId: string;
}

export function createWaOptInHandlers(deps: AppDeps) {
  /** Narrow the member session context (the guard guarantees it; this is defense-in-depth). */
  function memberCtx(request: FastifyRequest): MemberCtx {
    const memberId = request.requestContext.actorId;
    const pariwarId = request.requestContext.pariwarId;
    if (!memberId || !pariwarId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberId, pariwarId };
  }

  /** Build the audit-intent args for a member-initiated opt-in transition (ADR-0030). */
  function optInAuditIntent(args: {
    pariwarId: string;
    memberId: string;
    action: string;
    originatingChannel: waOptIn.WaOptInOriginatingChannel;
    beforeState: string;
    afterState: string;
    /** The phrase this transition matched/consumed, when already known (AC4 matched_member_identity). */
    verificationPhrase?: string | null;
    traceId: string | null;
  }): audit.AuditIntentArgs {
    return {
      pariwarId: args.pariwarId,
      actorId: args.memberId,
      actorRole: null,
      action: args.action,
      resourceLocator: `pariwar/${args.pariwarId}/member/${args.memberId}/wa-opt-in`,
      requestPayloadHash: waOptIn.waOptInAuditPayloadHash({
        originatingChannel: args.originatingChannel,
        memberId: args.memberId,
        verificationPhrase: args.verificationPhrase ?? null,
        beforeState: args.beforeState,
        afterState: args.afterState,
      }),
      traceId: args.traceId,
    };
  }

  return {
    /** POST — mint a PENDING (or re-use an outstanding one) and return the Send-Hello deep-link. */
    async mint(request: FastifyRequest): Promise<CreateWaOptInResponse> {
      const { memberId, pariwarId: pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const memberIdBranded = ids.memberId(memberId);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const config = await channelConfig.getWaConfig(scopeTx.tx, pariwarId);
        if (!config || !config.enabled || !config.displayPhoneNumber) {
          throw new ConflictError(
            'WhatsApp delivery is not enabled for this Pariwar',
            'wa_opt_in.channel_unavailable',
          );
        }
        // Captured as a local so the null-narrowing above survives into the `mutate` closure below (TS does
        // not carry a narrowed object-property type across a function boundary).
        const displayPhoneNumber = config.displayPhoneNumber;

        const existing = await waOptIn.getOptInForMember(scopeTx.tx, {
          pariwarId,
          memberId: memberIdBranded,
        });
        if (existing?.state === 'ACTIVE') {
          throw new ConflictError('You are already opted in to WhatsApp notifications', 'wa_opt_in.already_active');
        }
        if (existing?.state === 'PENDING') {
          // Re-tap: re-use the outstanding PENDING (re-issue the deep-link; no new transition, no audit).
          ok = true;
          return {
            state: 'PENDING',
            displayPhoneNumber,
            deepLink: buildSendHelloDeepLink(displayPhoneNumber, existing.verificationPhrase),
            verificationPhrase: existing.verificationPhrase,
          };
        }

        // Fresh mint (none / REVOKED / BLOCKED_BY_META / EXPIRED_24H_WINDOW) — a NEW PENDING + phrase (no
        // inferred re-consent; AC4). Use the member's stored identity blind index as the match key.
        const mobileBlindIndex = await waOptIn.getMemberMobileBlindIndex(scopeTx.tx, {
          pariwarId,
          memberId: memberIdBranded,
        });
        if (!mobileBlindIndex) {
          throw new ConflictError('No mobile number is on file for this member', 'wa_opt_in.no_mobile');
        }

        // Audit-or-throw (ADR-0030): the intent line is written FIRST (member_app; before 'none', after
        // PENDING), committed on its own tx before the mint; on failure (e.g. a concurrent-mint race) a
        // compensating rolled_back line settles the chain. No verificationPhrase yet (the phrase doesn't
        // exist until createPendingOptIn mints/regenerates it).
        return await audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: optInAuditIntent({
            pariwarId: pariwarIdStr,
            memberId,
            action: 'member.wa_opt_in_requested',
            originatingChannel: 'member_app',
            beforeState: 'none',
            afterState: 'PENDING',
            traceId: request.requestContext.traceId ?? null,
          }),
          mutate: async () => {
            const pending = await waOptIn.createPendingOptIn(scopeTx.tx, {
              pariwarId,
              memberId: memberIdBranded,
              mobileBlindIndex,
            });
            ok = true;
            return {
              state: 'PENDING',
              displayPhoneNumber,
              deepLink: buildSendHelloDeepLink(displayPhoneNumber, pending.verificationPhrase),
              verificationPhrase: pending.verificationPhrase,
            };
          },
        });
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** GET — the member's current opt-in status (drives the toggle + confirmation/retry copy). */
    async status(request: FastifyRequest): Promise<WaOptInStatusResponse> {
      const { memberId, pariwarId: pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const config = await channelConfig.getWaConfig(scopeTx.tx, pariwarId);
        const available = Boolean(config?.enabled && config?.displayPhoneNumber);
        const displayPhoneNumber = config?.displayPhoneNumber ?? null;
        const existing = await waOptIn.getOptInForMember(scopeTx.tx, {
          pariwarId,
          memberId: ids.memberId(memberId),
        });
        ok = true;
        const state = existing?.state ?? null;
        return {
          available,
          displayPhoneNumber,
          state,
          deepLink:
            state === 'PENDING' && displayPhoneNumber
              ? buildSendHelloDeepLink(displayPhoneNumber, existing!.verificationPhrase)
              : null,
          verificationPhrase: state === 'PENDING' ? existing!.verificationPhrase : null,
          windowExpiresAt:
            state === 'ACTIVE' && existing!.windowExpiresAt ? existing!.windowExpiresAt.toISOString() : null,
        };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** DELETE — member-initiated revocation (ACTIVE → REVOKED). Independently revocable (only whatsapp_opt_in). */
    async revoke(request: FastifyRequest): Promise<RevokeWaOptInResponse> {
      const { memberId, pariwarId: pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const existing = await waOptIn.getOptInForMember(scopeTx.tx, {
          pariwarId,
          memberId: ids.memberId(memberId),
        });
        if (!existing || existing.state !== 'ACTIVE') {
          throw new ConflictError('You have no active WhatsApp opt-in to revoke', 'wa_opt_in.not_active');
        }

        // Audit-or-throw (ADR-0030): intent FIRST (member_app; before ACTIVE, after REVOKED), then consent
        // revoke + state revoke in ONE scope tx (rolled back together on failure, compensated on the ledger).
        return await audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: optInAuditIntent({
            pariwarId: pariwarIdStr,
            memberId,
            action: 'member.wa_opt_in_revoked',
            originatingChannel: 'member_app',
            beforeState: 'ACTIVE',
            afterState: 'REVOKED',
            verificationPhrase: existing.verificationPhrase,
            traceId: request.requestContext.traceId ?? null,
          }),
          mutate: async ({ auditId }) => {
            if (existing.consentId) {
              await consent.revokeConsent(scopeTx.tx, {
                pariwarId,
                consentId: existing.consentId,
                reason: 'member revoked WhatsApp opt-in from app settings',
                revokedAuditId: auditId,
              });
            }
            await waOptIn.revokeOptIn(scopeTx.tx, {
              pariwarId,
              optInId: existing.optInId,
              toState: 'REVOKED',
            });
            ok = true;
            return { state: 'REVOKED' };
          },
        });
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST /p/:pariwarId/admin/members/:memberId/wa-opt-out — trustee force opt-out (admin_action;
     * trustee defensibility). On the scoped-admin chain [requireAdminSession, scopeResolutionHook,
     * requirePermissionHook(member.moderate)]; the scope-resolution hook set request.scopeTx. Idempotent —
     * a member with no ACTIVE opt-in is a 409 (nothing to revoke), never an illegal transition.
     */
    async adminOptOut(request: FastifyRequest): Promise<RevokeWaOptInResponse> {
      const scopeTx = request.scopeTx;
      const adminId = request.requestContext.actorId;
      if (!scopeTx || !adminId) {
        throw new Error('[wa-opt-in] admin handler ran without session + scope-resolution');
      }
      const pariwarIdStr = scopeTx.pariwarId;
      const { memberId } = request.params as { memberId: string };
      const pariwarId = ids.pariwarId(pariwarIdStr);

      const existing = await waOptIn.getOptInForMember(scopeTx.tx, {
        pariwarId,
        memberId: ids.memberId(memberId),
      });
      if (!existing || existing.state !== 'ACTIVE') {
        throw new ConflictError('This member has no active WhatsApp opt-in to revoke', 'wa_opt_in.not_active');
      }

      // Audit-or-throw (ADR-0030): intent FIRST (admin_action; actor = the admin user; before ACTIVE, after
      // REVOKED), then consent revoke + state revoke (compensated on failure).
      return audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId: pariwarIdStr,
          actorId: adminId,
          actorRole: null,
          action: 'member.wa_opt_in_revoked',
          resourceLocator: `pariwar/${pariwarIdStr}/member/${memberId}/wa-opt-in`,
          requestPayloadHash: waOptIn.waOptInAuditPayloadHash({
            originatingChannel: 'admin_action',
            memberId,
            verificationPhrase: existing.verificationPhrase,
            beforeState: 'ACTIVE',
            afterState: 'REVOKED',
          }),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async ({ auditId }) => {
          if (existing.consentId) {
            await consent.revokeConsent(scopeTx.tx, {
              pariwarId,
              consentId: existing.consentId,
              reason: 'trustee force opt-out (admin action)',
              revokedAuditId: auditId,
            });
          }
          await waOptIn.revokeOptIn(scopeTx.tx, {
            pariwarId,
            optInId: existing.optInId,
            toState: 'REVOKED',
          });
          return { state: 'REVOKED' };
        },
      });
    },
  };
}
