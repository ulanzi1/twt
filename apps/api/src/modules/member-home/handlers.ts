// Member home-screen read handlers — Story 3.7 (Task 3; AC1/AC2).
//
// ONE route: GET /api/v1/member/lock-in-status — the read seam that drives the topmost home-screen
// lock-in clock widget. A thin SURFACE over data that already exists on the member's event stream
// (the Story 3.6b `member.lock_in_entered` marker) — NO write path, NO new event, NO schema change.
//
// ── Module naming (Project Structure Notes) ────────────────────────────────────────────────────────
// Own `member-home/` module rather than folding into `vyawastha-shulk/` (that is the PAYMENT surface,
// not lifecycle/home) — mirrors 3.6b's choice to keep a self-contained module and avoid premature
// coupling with the Epic-8 "My Pool" surface that eventually replaces this widget (AC3).
//
// ── Server-authoritative clock (Dev Notes "Server-authoritative computation") ───────────────────────
// `unlockDate` + `daysRemaining` are computed HERE from `deps.clock()` so the figure is canonical and
// the client never re-derives policy. `unlockDate` uses leap-safe `setDate` arithmetic (NOT fixed-ms
// addition — `setDate` handles month/year rollover; mirrors the 3.6b P9 `validThrough` fix,
// `vyawastha-shulk/handlers.ts:138-140`). `daysRemaining` uses ms subtraction between two UTC instants —
// that is fine (ms arithmetic only breaks for *additions* spanning months, not for differences). Clamped ≥0.

import { ids, member as memberDomain } from '@twt/domain';
import type { MemberLockInStatusResponse } from '@twt/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function createMemberHomeHandlers(deps: AppDeps) {
  /** Read the authenticated member's (memberId, pariwarId) or fail 401. */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  return {
    /**
     * GET /api/v1/member/lock-in-status — the home widget's read. Returns the current lifecycle
     * `state` always; the `lockIn` clock figures ONLY while `state === 'lock-in'` (else `null`, so the
     * widget self-suppresses — AC1 "ONLY for members in lock-in state" + AC3 expiry behavior).
     */
    async lockInStatus(request: FastifyRequest): Promise<MemberLockInStatusResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const memberId = ids.memberId(memberIdStr);
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, now);

        // Not in lock-in → no clock; the widget renders nothing (AC1/AC3 self-suppression).
        if (state !== 'lock-in') {
          ok = true;
          return { state, lockIn: null };
        }

        const clock = await memberDomain.getLockInClock(scopeTx.tx, memberId, now);
        // In `lock-in` but no readable clock-start marker (absent or malformed payload) — fail-soft to
        // a null clock rather than 500; the widget simply does not render (Dev Notes home fail-soft).
        if (!clock) {
          ok = true;
          return { state, lockIn: null };
        }

        // unlockDate = enteredAt + lockInDays days (leap-safe; setDate handles month/year rollover).
        const unlockDate = new Date(clock.enteredAt);
        unlockDate.setDate(unlockDate.getDate() + clock.lockInDaysAtJoin);
        const daysRemaining = Math.max(
          0,
          Math.ceil((unlockDate.getTime() - now.getTime()) / MS_PER_DAY),
        );

        const result: MemberLockInStatusResponse = {
          state,
          lockIn: {
            enteredAt: clock.enteredAt.toISOString(),
            unlockDate: unlockDate.toISOString(),
            daysRemaining,
            lockInDays: clock.lockInDaysAtJoin,
            clauseId: memberDomain.LOCK_IN_POLICY_CLAUSE_ID,
            clauseVersion: clock.lockInPolicyVersion,
          },
        };
        ok = true;
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
