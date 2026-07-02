// Voluntary withdrawal handler — Story 3.10 (Task 5; AC1/AC4/AC5).
//
// The member self-service SURFACE for voluntary exit (FR-6). ONE confirm route: the mobile flow's
// acknowledgment + optional reason + step-up + final confirm all resolve to a single
// `POST /api/v1/member/withdrawal` (so the OPTIONAL `member.withdrawal_requested` marker is OMITTED —
// it adds no audit value for a single-call flow; Dev Notes §"withdrawal_requested marker"). The
// load-bearing move is the `member.withdrawal_completed` transition → `withdrawn`.
//
// ── Scope-tx discipline (mirror life-events/nominee handlers) ──────────────────────────────────────
// `requireMemberSession` sets `request.requestContext.{actorId,pariwarId}` but does NOT open a scope
// tx, so the handler opens its own (`openScopeTx`) and the projector gets the raw `scopeTx.client`.
// The withdrawal-record INSERT + the event append + state projection run inside ONE scope tx so a
// torn view never exists; the audit line fires AFTER the response is built + ok is set (a rollback
// must not leave a phantom audit — nominee.handlers.ts:158).
//
// ── PII discipline (R1) ──────────────────────────────────────────────────────────────────────────
// The OPTIONAL free-text reason is Tier-1-encrypted in the handler before the accessor sees it; the
// event payload is the frozen auditShape-only `.strict()` schema (structurally CANNOT carry the
// reason); the audit context carries `reason_code` (bounded enum) + `rejoin_permitted_at` ONLY —
// NEVER the free-text `reason_text`. No refund is issued (the ₹110 is forfeited, not returned).

import type { WithdrawalConfirmRequest, WithdrawalStatusResponse } from '@twt/contracts';
import { ids, member as memberDomain } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import type { ScopeTx } from '../../types.js';
import { encryptWithdrawalReason } from './withdrawal-crypto.js';

/** The ONLY lifecycle states a voluntary withdrawal is legal from (FR-6; reducer state.ts:110). */
const WITHDRAWABLE_STATES = new Set<memberDomain.MemberLifecycleState>([
  'active',
  'active-in-grace',
  'lapsed-unpaid',
]);

/** The 12-month rejoin-lock window (AC3). */
const REJOIN_LOCK_MONTHS = 12;

/**
 * `withdrawnAt + 12 months`, leap-safe calendar arithmetic (`setMonth`, NOT fixed-ms — mirrors the
 * renewal grace-window `setDate` seam, renewal-read.ts:61). Clock-injected upstream (no raw Date.now()).
 * Month-end clamping: if the target month has fewer days (e.g., Feb 29 + 12 months in a non-leap year
 * overflows to Mar 1), roll back to the last day of the intended month (Feb 28).
 */
function addMonths(from: Date, months: number): Date {
  const out = new Date(from);
  const targetMonth = (out.getMonth() + months) % 12;
  out.setMonth(out.getMonth() + months);
  if (out.getMonth() !== targetMonth) {
    out.setDate(0);
  }
  return out;
}

export function createWithdrawalHandlers(deps: AppDeps) {
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
   * Guard: the member exists AND is in a WITHDRAWABLE state. This is NOT the life-events
   * `assertMemberExistsAndNotTerminal` guard — that only rejects {withdrawn, anonymized} and throws
   * `life_events.member_terminal` (the wrong check + wrong code here). This ONLY permits
   * {active, active-in-grace, lapsed-unpaid} and rejects EVERYTHING else — including the pre-active
   * states (pending-kyc/fee/valid, lock-in) where the reducer would silently return identity (a
   * `member.withdrawal_completed` from lock-in is a no-op, so without this guard we would persist a
   * withdrawal row + emit an event that never moved the state — a phantom withdrawal). Rejected with
   * the withdrawal-specific `withdrawal.invalid_state`.
   */
  async function assertWithdrawable(
    scopeTx: ScopeTx,
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
    at: Date,
  ): Promise<memberDomain.MemberLifecycleState> {
    const exists = await memberDomain.memberExists(scopeTx.tx, pariwarId, memberId);
    if (!exists) {
      throw new NotFoundError('Member not found', 'withdrawal.member_not_found');
    }
    const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, at);
    if (!WITHDRAWABLE_STATES.has(state)) {
      throw new ConflictError(
        'Withdrawal is only permitted for an active membership',
        'withdrawal.invalid_state',
      );
    }
    return state;
  }

  return {
    /**
     * POST /api/v1/member/withdrawal — confirm a voluntary withdrawal (step-up gated, context
     * 'withdrawal'). In ONE scope tx: persist the Tier-1-reason-encrypted `member_withdrawals` row
     * (with the 12-month `rejoin_permitted_at`) + emit `member.withdrawal_completed` → `withdrawn`.
     * Audit AFTER the response is built (no phantom audit on rollback). Returns the terminal state +
     * the rejoin-lock window (NO reason echoed — R1).
     */
    async confirm(request: FastifyRequest): Promise<WithdrawalStatusResponse> {
      const body = request.body as WithdrawalConfirmRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const withdrawnAt = deps.clock();
      const rejoinPermittedAt = addMonths(withdrawnAt, REJOIN_LOCK_MONTHS);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const memberId = ids.memberId(memberIdStr);
        const pariwarId = ids.pariwarId(pariwarIdStr);
        const fromState = await assertWithdrawable(scopeTx, pariwarId, memberId, withdrawnAt);

        // Tier-1-encrypt the OPTIONAL free-text reason (only when present).
        const reasonTextCiphertext = body.reasonText
          ? await encryptWithdrawalReason(body.reasonText, pariwarIdStr, enc)
          : null;

        await memberDomain.insertMemberWithdrawal(scopeTx.tx, {
          memberId,
          pariwarId,
          reasonCode: body.reasonCode ?? null,
          reasonTextCiphertext,
          withdrawnAt,
          rejoinPermittedAt,
        });

        // The load-bearing transition. The frozen auditShape-only `.strict()` payload cannot carry
        // the reason (R1) — the reason lives Tier-1-encrypted in member_withdrawals only.
        await memberDomain.projectMemberState(scopeTx.client, {
          memberId,
          pariwarId,
          eventType: 'member.withdrawal_completed',
          payload: {
            from_state: fromState,
            to_state: 'withdrawn',
            trigger: 'voluntary_withdrawal',
            actor: 'member',
          },
          actorId: memberIdStr,
        });

        const result: WithdrawalStatusResponse = {
          state: 'withdrawn',
          withdrawnAt: withdrawnAt.toISOString(),
          rejoinPermittedAt: rejoinPermittedAt.toISOString(),
        };
        ok = true;
        // NON-PII audit context: reason_code (bounded enum) + rejoin_permitted_at ONLY — NEVER the
        // free-text reason_text. The actorId carries the member_id; masked mobile is omitted here (it
        // would require decrypting the Tier-1 mobile just for the audit line — the member_id already
        // identifies the actor).
        emitAuthAudit(deps, request, 'member_withdrawal.completed', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: {
            ...(body.reasonCode ? { reason_code: body.reasonCode } : {}),
            rejoin_permitted_at: rejoinPermittedAt.toISOString(),
          },
        });
        return result;
      } catch (err: unknown) {
        // Concurrent withdrawal: a parallel request already committed the member_withdrawals PK
        // row between our assertWithdrawable read and this insert. Map the unique-violation to
        // a clean 409 instead of propagating a raw DB error.
        if (
          err !== null &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: unknown }).code === '23505'
        ) {
          throw new ConflictError('Member has already withdrawn', 'withdrawal.invalid_state');
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
