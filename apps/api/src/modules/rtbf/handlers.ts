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

/** A Postgres unique-violation, checked on BOTH the direct code and `err.cause.code` — the domain
 *  convention. ⛔ A direct-only check misses every error the domain wraps (which is all of them here). */
function isUniqueViolation(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  const direct = (err as { code?: unknown }).code;
  const cause = (err as { cause?: { code?: unknown } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

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
   * Guard + serialization for a member self-service erasure.
   *
   * ── Story 10.21 (AC7/AC13) — TWO CHANGES, both load-bearing ───────────────────────────────────────
   * (1) The permitted-set is no longer decided here. It comes from `member.resolveRtbfLegality`, the ONE
   *     predicate shared with the off-portal admin caller, so the two paths CANNOT diverge. ⛔ Do not
   *     re-inline a local state check: 10.21 relocated legality out of the reducer into the callers
   *     precisely so it lives in exactly one place, and two copies is how that guarantee dies.
   *     The rule is: legal from `withdrawn`, OR when the moderation overlay reads `terminated`.
   * (2) A transaction-scoped ADVISORY LOCK is taken BEFORE the legality read.
   *
   * ⛔ WHY THE LOCK, and why the pre-existing 23505 catch was NOT protection. `scope-tx.ts` issues a
   * bare `BEGIN` — READ COMMITTED, no serialization. Two concurrent erasures of the same member both
   * pass this guard, and the loser does NOT reliably hit 23505: it blocks on the winner's row locks
   * inside `anonymizeMember`, then `projectMemberState` re-reads the stream head AFTER the winner
   * commits, computes a valid `nextVersion`, and appends a SECOND `member.rtbf_anonymized`, returning
   * 200. The live failure mode was a DUPLICATE EVENT, not a conflict. The lock is what makes the guard
   * mean anything.
   *
   * Rejecting explicitly (rather than relying on the reducer's identity no-op) prevents a PHANTOM
   * anonymization — and since 10.21 widened the reducer arm, the reducer no longer no-ops at all, so
   * this guard is the ONLY thing standing between an illegal request and a real erasure.
   */
  async function assertAnonymizable(
    scopeTx: ScopeTx,
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
    at: Date,
    pariwarIdStr: string,
    memberIdStr: string,
  ): Promise<memberDomain.MemberLifecycleState> {
    const exists = await memberDomain.memberExists(scopeTx.tx, pariwarId, memberId);
    if (!exists) {
      throw new NotFoundError('Member not found', 'rtbf.member_not_found');
    }

    // ⛔ BEFORE the legality read, and `_xact_` (transaction-scoped), never `pg_advisory_lock`. A
    // session-scoped lock on a POOLED client without a manual unlock in a `finally` leaks the lock for
    // the connection's whole life. The key is NAMESPACE-PREFIXED (`member.rtbf:`) — a bare
    // `hashtext(member_id)` collides with the device-binding lock in `member-auth.service.ts`.
    await scopeTx.client.query('SELECT pg_advisory_xact_lock($1)', [
      memberDomain.rtbfAdvisoryLockKey(pariwarIdStr, memberIdStr).toString(),
    ]);

    const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, at);
    const legality = await memberDomain.resolveRtbfLegality(scopeTx.tx, memberId, state);
    if (legality.kind === 'already_anonymized') {
      throw new ConflictError(
        'Member has already been anonymized',
        'rtbf.already_anonymized',
      );
    }
    if (legality.kind === 'illegal') {
      throw new ConflictError(
        'RTBF is only permitted for a withdrawn membership',
        'rtbf.invalid_state',
      );
    }
    // ⚠ Returned so the caller writes the REAL replayed state into the event's `from_state`.
    return legality.fromState;
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
        const fromState = await assertAnonymizable(scopeTx, pariwarId, memberId, anonymizedAt, pariwarIdStr, memberIdStr);

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
            // ⛔ Story 10.21: was hardcoded `'withdrawn'`. Since the legality predicate now also admits a
            // member whose moderation overlay reads `terminated` — whose lifecycle state may be ANY live
            // label — a hardcoded value would write a FALSE AUDIT RECORD on the one event whose `from`
            // set this story widened. Write what was actually replayed.
            from_state: fromState,
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
        // ⚠ Story 10.21 — THIS BRANCH WAS INERT AND IS NOW CORRECT. It previously tested
        // `err.code === '23505'`, but `projectMemberState` wraps the violation in
        // `MemberStreamConcurrencyError`, which carries NO `code` property — so the branch could never
        // match, and the comment claimed a protection that did not exist. The domain convention is to
        // check BOTH the direct code and `err.cause.code` (see `claim/appeal-persist.ts`).
        // ⛔ The real serialization is the `pg_advisory_xact_lock` in `assertAnonymizable`; this remains
        // as a genuine backstop for the narrow window it can still cover, not as the primary guard.
        // ⛔ Do not delete it and do not restore the old single-property test.
        if (isUniqueViolation(err)) {
          throw new ConflictError('Member has already been anonymized', 'rtbf.already_anonymized');
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
