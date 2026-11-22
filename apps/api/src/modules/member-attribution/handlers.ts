// "Did someone help you register?" — the signup `assisted` step's handlers (Story 3.15, Task 2.1; DL1–DL5; author-commit
// 2026-11-22-494).
//
// ⭐ The POST, in ONE scope tx, in this order (DL2):
//   (1) the member is signing up — `pending-kyc` or `pending-fee` — else 409 `attribution.not_signing_up`;
//   (2) an existing capture: the same code ⇒ 200 `{ recorded: true }` (⛔ new row); a different one ⇒ 409
//       `attribution.already_recorded` (a recorded code is ⛔ changed — N3);
//   (3) insert the capture (`payment.insertMemberAttribution`, the ONE writer — N6);
//   (4) resolve it through Story 13.2's API door AS OF THAT CAPTURE (`asOf: { captureId }` — the instant is named and compared in
//       SQL, ⛔ read into JS); ⛔ holder ⇒ throw 422 `attribution.code_not_found`, so the tx ROLLS BACK and ⛔ row is stored;
//   (5) commit, THEN the audit line (`member_attribution.captured`, ⛔ context — N2).
// Two racing taps: the loser's INSERT raises 23505 on `member_attribution_member_uq`, which ABORTS its transaction — it is rolled
// back and the whole attempt re-run in a FRESH transaction, where step (2) answers it ([[project_domain_limit_clamp_and_savepoint_retry]]).
//
// ⭐ N2 / DL4 — the handler never branches on the worker. The door's answer is used ONLY as "held by someone / by nobody": an
// active worker, one never approved, suspended, ended or dead all answer 201 `{ recorded: true }` (Decision 2026-11-22-493 A).
// ⛔ `acceptsNewAttributions` here: whether the worker is credited is Story 13.5's, from the stored capture (DL11).
// ⭐ N5 — the Pariwar is the session's (`requestContext.pariwarId`, set by the member-session guard), never the body; the door
// re-checks that the scope tx is that Pariwar's.

import type { MemberAssistedCodeRequest, MemberAssistedCodeResponse, MemberAssistedCodeStatusResponse } from '@twt/contracts';
import { ids, member as memberDomain, payment as paymentDomain } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ApiError, ConflictError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { resolveAttributionForRequest } from '../field-worker/attribution-code-access.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** The lifecycle states in which a member is still signing up (N3) — the only ones that may record a code. */
const SIGNING_UP_STATES: ReadonlySet<string> = new Set(['pending-kyc', 'pending-fee']);

export interface MemberAttributionHandlers {
  status(request: FastifyRequest): Promise<MemberAssistedCodeStatusResponse>;
  record(request: FastifyRequest, reply: FastifyReply): Promise<MemberAssistedCodeResponse>;
}

function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
  const memberIdStr = request.requestContext.actorId;
  const pariwarIdStr = request.requestContext.pariwarId;
  if (!memberIdStr || !pariwarIdStr) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  return { memberIdStr, pariwarIdStr };
}

export function createMemberAttributionHandlers(deps: AppDeps): MemberAttributionHandlers {
  /** One attempt of DL2 (1)–(5) in its own scope tx. `created` ⇔ this attempt stored the row. */
  async function attempt(request: FastifyRequest, code: string): Promise<'created' | 'existing'> {
    const { memberIdStr, pariwarIdStr } = memberCtx(request);
    const memberId = ids.memberId(memberIdStr);
    const pariwarId = ids.pariwarId(pariwarIdStr);
    const scopeTx = await openScopeTx(deps, pariwarIdStr);
    let ok = false;
    try {
      // (1) signing up — a member with ⛔ row in this Pariwar is ⛔ signing up here either.
      const exists = await memberDomain.memberExists(scopeTx.tx, pariwarId, memberId);
      const state = exists ? await memberDomain.getCurrentMemberState(scopeTx.tx, memberId) : null;
      if (state === null || !SIGNING_UP_STATES.has(state)) {
        throw new ConflictError('A code can be recorded only while signing up', 'attribution.not_signing_up');
      }
      // (2) an existing capture.
      const existing = await paymentDomain.readMemberAttributionForMember(scopeTx.tx, memberId);
      if (existing !== null) {
        if (existing.attributionSource !== code) {
          throw new ConflictError('A different code is already recorded', 'attribution.already_recorded');
        }
        ok = true;
        return 'existing';
      }
      // (3) the capture, then (4) resolve it as of itself — ⛔ holder rolls the capture back.
      const row = await paymentDomain.insertMemberAttribution(scopeTx.tx, { memberId, pariwarId, attributionSource: code });
      const holder = await resolveAttributionForRequest(request, scopeTx, { code, asOf: { captureId: row.attributionId } });
      if (holder === null) {
        throw new ApiError(422, 'attribution.code_not_found', 'Nobody in this Pariwar holds that code');
      }
      ok = true;
      return 'created';
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }

  return {
    /** GET /api/v1/member/signup/assisted-code — a READ: is a code already recorded for the session's member? */
    async status(request) {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const existing = await paymentDomain.readMemberAttributionForMember(scopeTx.tx, ids.memberId(memberIdStr));
        ok = true;
        return { recorded: existing !== null };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** POST /api/v1/member/signup/assisted-code — record the code once (201), or answer a repeat of it (200). */
    async record(request, reply) {
      const { code } = request.body as MemberAssistedCodeRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      let outcome: 'created' | 'existing';
      try {
        outcome = await attempt(request, code);
      } catch (err) {
        // Two taps raced and the other committed first: this transaction is already rolled back — answer from a fresh one.
        if (!paymentDomain.isMemberAttributionDuplicate(err)) throw err;
        outcome = await attempt(request, code);
      }
      if (outcome === 'created') {
        emitAuthAudit(deps, request, 'member_attribution.captured', { actorId: memberIdStr, pariwarId: pariwarIdStr });
      }
      reply.code(outcome === 'created' ? 201 : 200);
      return { recorded: true };
    },
  };
}
