// Nominee Console read handler — Story 9.1 (Task 1/3; AC1/AC3).
//
// ONE route: GET /api/v1/member/nominee-console — the server-authoritative read that drives Sunita's
// `<NomineeConsole>` surface (the FIRST Epic-9 surface). A thin compound read over data that ALREADY
// EXISTS (the acting member × their deceased-family claim × the spawned pool × the pool-open event) — NO
// write path, NO new event, NO schema change. It NEVER parses a statement, NEVER runs the matcher, NEVER
// flips a pill (those are Stories 9.2/9.4/9.5).
//
// ── The validated-nominee gate EXTENDS the Ravi-mode session model (decision #3) ────────────────────────
// §2.3 has no nominee-self-auth primitive; the nearest analog is the claim_handover / Ravi-mode elevation
// where the acting member session IS the deceased member's. So "validated nominee with an active pool" =
// a `live` pool whose originating claim's `deceased_member_id` equals the acting member (resolved in
// @twt/domain `resolveActiveNomineePool`). NO new nominee-role primitive, NO new identity column. The READ
// needs only the member session (the 8.2/8.3 read posture — reads are not step-up-gated); the WRITE
// actions (the Story 9.3 upload) will additionally be `requireMemberStepUp('claim_handover')`-gated — a
// documented seam, not built here.
//
// ── Fail-soft (AC1) — every degrade is `{ isNominee:false }`, never a 500 ───────────────────────────────
// Not a nominee, no live pool, a live pool with no pool-open event (integrity anomaly), or ANY thrown
// error in the pipeline → `{ isNominee:false }` (the console self-suppresses to null). The only
// propagating error is the 401 (no member session) — resolved BEFORE the tx opens. The 8.2/8.3 posture.
//
// ── The staff-takeover verdict is server-computed (AC3) ─────────────────────────────────────────────────
// The PURE `nomineeConsole.computeStaffTakeover` derivation runs HERE over `poolOpenAt` (resolved off the
// `pool.opened_for_contributions` event) with `lastEngagedAt=null` while the Story 9.3 engagement writer
// is unbuilt (the clock correctly runs from pool-open). The threshold is `deps.config`-driven (default 7 —
// not a magic literal). The client renders the grey "staff is helping" state on `eligible`; it resolves
// nothing itself.

import { ids, nomineeConsole, pool as poolDomain } from '@twt/domain';
import type { NomineeConsoleResponse } from '@twt/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { resolveCuratedPoolName } from '../member-pool/pool-identity.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

const NON_NOMINEE: NomineeConsoleResponse = { isNominee: false };

export function createNomineeConsoleHandlers(deps: AppDeps) {
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
     * GET /api/v1/member/nominee-console — the Nominee Console's server-authoritative read. Returns the
     * fully-resolved console model ONLY for a validated nominee with an ACTIVE (`live`) pool;
     * `{ isNominee:false }` (self-suppression) for every other case, incl. any error (fail-soft).
     */
    async nomineeConsole(request: FastifyRequest): Promise<NomineeConsoleResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const now = deps.clock();

      let scopeTx: ScopeTx | undefined;
      let ok = false;
      try {
        // Opening the scope tx is INSIDE the try (Review fix) — a throw here must still hit the fail-soft
        // catch below, never escape as an unhandled 500 (the documented AC1 "never a 500" contract).
        scopeTx = await openScopeTx(deps, pariwarIdStr);

        // (1) The gate — a live pool whose originating claim names this member as the deceased (the
        //     Ravi-mode session-as-deceased identity). `null` ⇒ not a validated nominee with an active pool.
        const active = await nomineeConsole.resolveActiveNomineePool(scopeTx.tx, { pariwarId, memberId });
        if (active === null) {
          ok = true;
          return NON_NOMINEE;
        }
        const { pool, poolCount, liveCount } = active;
        if (liveCount > 1) {
          // Not expected in v1 (one death → one claim → one pool) — surfaced, not silent (Review fix): the
          // OTHER live pool(s) get no console today, only the deterministically-chosen one does.
          request.log.warn(
            { memberId: memberIdStr, liveCount, chosenPoolId: pool.poolId },
            'nominee-console: member has multiple live nominee pools — showing only one',
          );
        }

        // (2) The pool-open instant (the day-N clock origin) — off the `pool.opened_for_contributions`
        //     event. A `live` pool with no open event is an integrity anomaly → fail-soft self-suppress
        //     (never fabricate a clock origin, [[feedback_record_unattested_no_backfill]]).
        const poolOpenAt = await nomineeConsole.resolvePoolOpenAt(scopeTx.tx, {
          pariwarId,
          poolId: pool.poolId,
        });
        if (poolOpenAt === null) {
          request.log.warn(
            { poolId: pool.poolId },
            'nominee-console: live pool has no pool.opened_for_contributions event — self-suppressing',
          );
          ok = true;
          return NON_NOMINEE;
        }

        // (3) The staff-takeover verdict — the PURE derivation, run server-side. `lastEngagedAt` is the
        //     nominee's LAST statement-upload instant (Story 9.3 closed the 9.1 seam: the latest
        //     `reconciliation.statement-uploaded` event's occurred_at, read off events_log). A nominee who
        //     uploads resets the day-N clock; one who never uploads resolves `null` and the derivation
        //     correctly falls through to `poolOpenAt` (the pre-9.3 behaviour preserved). Threshold is
        //     config-driven (default 7 — not a magic literal).
        const lastEngagedAt = await nomineeConsole.resolveLastEngagedAt(scopeTx.tx, {
          pariwarId,
          poolId: pool.poolId,
        });
        const takeover = nomineeConsole.computeStaffTakeover({
          lastEngagedAt,
          poolOpenAt,
          thresholdDays: deps.config.nomineeTakeoverThresholdDays,
          now,
        });

        // (4) The pool identity for the console header — letter code (always) + curated Mahabharata name
        //     (null → letter-code fallback; TWT-Bihar launch registry is empty) + canonical id (audit/a11y).
        const letterCode = poolDomain.poolLetterCode(pool.poolIndex);
        const curatedName = await resolveCuratedPoolName(
          scopeTx.tx,
          pariwarId,
          poolCount,
          pool.poolIndex,
          request,
        );

        ok = true;
        return {
          isNominee: true,
          pool: {
            letterCode,
            name: curatedName,
            canonicalIdentifier: pool.poolCanonicalIdentifier,
          },
          takeover: {
            eligible: takeover.takeoverEligible,
            daysSinceEngagement: takeover.daysSinceEngagement,
          },
          poolOpenAtIso: poolOpenAt.toISOString(),
          // The daily-delta "last updated" timestamp (UX spec L1560/L1700) — the server read instant.
          lastUpdatedIso: now.toISOString(),
        };
      } catch (err) {
        // Fail-soft (AC1): the console self-suppresses on ANY error rather than showing an error wall.
        request.log.error({ err, memberId: memberIdStr }, 'nominee-console: fail-soft to non-nominee');
        ok = true; // the scope tx did no writes — a clean close is correct
        return NON_NOMINEE;
      } finally {
        // scopeTx is undefined only if openScopeTx itself threw before assigning — nothing to close then.
        if (scopeTx) {
          await closeScopeTx(scopeTx, ok);
        }
      }
    },
  };
}
