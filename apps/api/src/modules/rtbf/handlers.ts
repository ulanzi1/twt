// Member-initiated RTBF (Right-To-Be-Forgotten) handler — Story 3.12 (Task 3; AC2/AC5).
//
// The member self-service SURFACE for DPDPA RTBF (FR-96). ONE confirm route:
// `POST /api/v1/member/rtbf` (step-up gated, DISTINCT context 'rtbf'). The load-bearing move is the
// `member.rtbf_anonymized` transition `withdrawn → anonymized` PLUS the field-level PII anonymization
// (member/anonymize.ts) — both in ONE scope tx.
//
// ── Soft-delete, NOT row-delete (architecture §2.12) ───────────────────────────────────────────────
// The member row is RETAINED at `state = anonymized`; the event stream is RETAINED (we APPEND
// `member.rtbf_anonymized`, never mutate — §1.14 immutability); contribution/payment/consent history is
// RETAINED. Only PII *fields* are overwritten/nulled (anonymizeMember). The mobile blind index is
// RETAINED so the Story 3.10 12-month rejoin lock keeps firing (AC4).
//
// ── Scope-tx discipline (mirror withdrawal/handlers.ts) ────────────────────────────────────────────
// `requireMemberSession` sets `request.requestContext.{actorId,pariwarId}` but does NOT open a scope
// tx, so the handler opens its own (`openScopeTx`). The anonymization writes + the event append + state
// projection run inside ONE scope tx so a torn view never exists; the audit line fires AFTER the
// response is built + ok is set (a rollback must not leave a phantom audit — nominee.handlers.ts:158).
//
// ── PII discipline (R1) ─────────────────────────────────────────────────────────────────────────────
// The `member.rtbf_anonymized` event payload is the frozen auditShape-only `.strict()` schema
// (structurally CANNOT carry PII). The audit context carries `anonymized_at` + `anonymization_actor`
// (the member_id) ONLY — NEVER any cleared PII. The response echoes NO cleared PII.

import type { RtbfStatusResponse } from '@twt/contracts';
import { ids, member as memberDomain } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import type { ScopeTx } from '../../types.js';

export function createRtbfHandlers(deps: AppDeps) {
  const enc = deps.encryption;

  /** Read the authenticated member's (memberId, pariwarId) or fail 401. */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  /**
   * Guard: RTBF is legal ONLY from `state = withdrawn` (Story 3.10 closes there). This is NOT the
   * withdrawal `assertWithdrawable` guard — that permits {active, active-in-grace, lapsed-unpaid}, the
   * WRONG permitted-set here. RTBF permits ONLY {withdrawn} and rejects everything else:
   *   · `anonymized` → 409 `rtbf.already_anonymized` (distinct code so a client that completed RTBF
   *     but lost the response can distinguish "already erased" from "not yet withdrawn").
   *   · any other non-withdrawn state → 409 `rtbf.invalid_state`.
   * Rejecting explicitly (rather than relying on the reducer's silent identity no-op) prevents a PHANTOM
   * anonymization: without this guard we would run anonymizeMember + append an event that never moved
   * the state.
   */
  async function assertAnonymizable(
    scopeTx: ScopeTx,
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
    at: Date,
  ): Promise<void> {
    const exists = await memberDomain.memberExists(scopeTx.tx, pariwarId, memberId);
    if (!exists) {
      throw new NotFoundError('Member not found', 'rtbf.member_not_found');
    }
    const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, at);
    if (state === 'anonymized') {
      throw new ConflictError(
        'Member has already been anonymized',
        'rtbf.already_anonymized',
      );
    }
    if (state !== 'withdrawn') {
      throw new ConflictError(
        'RTBF is only permitted for a withdrawn membership',
        'rtbf.invalid_state',
      );
    }
  }

  return {
    /**
     * POST /api/v1/member/rtbf — confirm RTBF anonymization (step-up gated, context 'rtbf'). In ONE
     * scope tx: field-level anonymize every member-PII column (anonymizeMember) + emit
     * `member.rtbf_anonymized` → `anonymized`. Audit AFTER the response is built (no phantom audit on
     * rollback). Returns the terminal state + the anonymization instant (NO cleared PII echoed — R1).
     */
    async confirm(request: FastifyRequest): Promise<RtbfStatusResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const anonymizedAt = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const memberId = ids.memberId(memberIdStr);
        const pariwarId = ids.pariwarId(pariwarIdStr);
        await assertAnonymizable(scopeTx, pariwarId, memberId, anonymizedAt);

        // Field-level anonymize every Tier-1 PII column (the inverse of data-export/assemble). Runs
        // under the scope tx; RETAINS mobile_blind_index (AC4) + all non-PII / history rows.
        await memberDomain.anonymizeMember(scopeTx.tx, enc, { memberId, pariwarId });

        // The load-bearing transition. The frozen auditShape-only `.strict()` payload cannot carry
        // any cleared PII (R1). The projector appends the event + projects the state in the same tx.
        await memberDomain.projectMemberState(scopeTx.client, {
          memberId,
          pariwarId,
          eventType: 'member.rtbf_anonymized',
          payload: {
            from_state: 'withdrawn',
            to_state: 'anonymized',
            trigger: 'rtbf_request',
            actor: 'member',
          },
          actorId: memberIdStr,
        });

        const result: RtbfStatusResponse = {
          state: 'anonymized',
          anonymizedAt: anonymizedAt.toISOString(),
        };
        ok = true;
        // NON-PII audit context: anonymized_at + anonymization_actor (the member_id) ONLY — NEVER any
        // cleared PII (the whole row was just anonymized). The actorId also carries the member_id.
        emitAuthAudit(deps, request, 'member_rtbf.completed', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: {
            anonymized_at: anonymizedAt.toISOString(),
            anonymization_actor: memberIdStr,
          },
        });
        return result;
      } catch (err: unknown) {
        // Concurrent RTBF: a parallel request already anonymized + projected `anonymized` between our
        // assertAnonymizable read and this projection. The event-stream `(stream_id, event_version)`
        // unique index raises 23505 → map to the same clean 409 the guard would have.
        if (
          err !== null &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: unknown }).code === '23505'
        ) {
          throw new ConflictError('Member has already been anonymized', 'rtbf.already_anonymized');
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
