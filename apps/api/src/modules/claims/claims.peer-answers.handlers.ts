// The APPROVERS' READ of the neighbours' answers — Story 6.27b (PM24; Task 3.2–3.4). `2026-10-10-310` CF2 (Trustee-
// ratified): *"whoever approves the claim at a later step — in practice the Pariwar Admin at the final vote or an R9 vote,
// or the Super Admin — for that claim at that step only"*. The SAME section the verifier console shows (6.27a's
// `assemblePeerSection`, through the ONE wire mapping `assemblePeerMeshSection`) — so PM25 (c)'s hide, the call-back
// rules and the audit travel WITH it.
//
// ⭐ THE STEP — FOUR arms, evaluated in order, the first that admits wins (⛔ no new state list — each arm reuses the
// shipped constant or predicate; a THROW in an arm is a 500, ⛔ never a 404):
//   1. the claim is in `TRUSTEE_VOTABLE_STATES` AND the reader holds `cycle.freeze` AND ⛔ live R9 routing (review round
//      2 S15 — a routed claim's approving step is R9's, arm 3) — the final vote and the no-correction approval (`final_vote`);
//   2. the claim is in `TRUSTEE_ESCALATION_RESOLVABLE_STATES` with a LIVE `escalated` verifier decision AND `cycle.freeze`
//      — the cycle-freeze escalation resolution (`escalation_resolution`; BF17);
//   3. the claim is in `R9_OUTCOME_FROM_STATES` with a LIVE R9 routing AND `claim.r9_vote` — an R9 vote or finalize
//      (`r9_vote`; BF18 — a routing outlives a denial, so the state test is load-bearing);
//   4. the claim is HELD for an escalated correction closure (`isCorrectionClaimHeld`) AND
//      `claim.review_escalated_closure` (the escalation DETAIL read's key) — the Super Admin's G1 step
//      (`super_admin_approval`).
// Else ONE 404 for "not at a later step", "unknown" and "another Pariwar". ⚠ RECORDED (PM24): every v1 actor past the
// route's `cycle.freeze` hook holds every arm's key, so the disjunction reduces to STATE gating — a Pariwar Admin may read
// in `state_trustee_freeze` while the Super Admin's G1 step is open (accepted).
//
// ⭐ The call-back number (`-328` read with `-329`): the Super Admin's rule ONLY on a `super_admin` MATCH of the admitting
// arm's key (`rbac.matchingGrantRole`, the SAME resolver as the gate); every other result is the Pariwar Admin's rule — a
// "Yes" to v3's words only. ⚠ RECORDED: `matchingGrantRole` prefers a SCOPED grant, so a Super Admin who also holds a
// pariwar grant is read as the Pariwar Admin — the restrictive rule (accepted).
// ⭐ Audit: ONE `admin_claim.peer_answers_read` per successful read (`hidden` / `empty` included; ⛔ a 404), and ONE
// `admin_claim.peer_callback_mobile_shown` per number shown — both emitted only AFTER the response is built (6.27a review
// S17). ⛔ Never a name, an answer, a code, a date or a number in either line.
// Reads run in `request.scopeTx` (the console's shape — the surface it shares a section with), each under its own raw
// SAVEPOINT, so a failed read ⛔ never aborts the request's transaction.

import type { ClaimPeerAnswersResponse } from '@twt/contracts';
import { claim, ids, kyc, rbac } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { geoTreeResolverForRequest, loadActorGrants } from '../rbac/index.js';
import { underSavepoint } from './later-approval-warnings.js';
import {
  assemblePeerMeshSection,
  assemblePeerSection,
  familyAccountAuditCounts,
  stitchPeerAnswerFlags,
  type PeerCallbackBasis,
} from './peer-answers-assembler.js';

/** The route's own gate (BF14) — admits exactly `pariwar_admin` and `super_admin`, every v1 later approver. */
export const PEER_ANSWERS_GATE_KEY = 'cycle.freeze';

/** Which later step admitted the read — the audit context's `step`. */
export type PeerAnswersStep = 'final_vote' | 'escalation_resolution' | 'r9_vote' | 'super_admin_approval';

/** One answer for every reason the read is ⛔ served (⛔ a hint which). */
function notAtAnApprovingStep(): NotFoundError {
  return new NotFoundError('There is nothing to show for this claim at this step', 'claim.peer_answers_not_found');
}

export function createPeerAnswersHandlers(deps: AppDeps) {
  return {
    /** GET …/admin/claims/:claimCaseId/peer-answers — the approvers' read (PM24). */
    async getPeerAnswers(request: FastifyRequest): Promise<ClaimPeerAnswersResponse> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const { claimCaseId } = request.params as { claimCaseId: string };
      const pariwarId = scopeTx.pariwarId;
      const pid = ids.pariwarId(pariwarId);
      const cid = ids.claimId(claimCaseId);
      const grants = request.scopeGrants ?? (await loadActorGrants(scopeTx, actorId));
      const authz = { resolver: geoTreeResolverForRequest(request) };
      const resource = { dimension: 'pariwar' as const, value: pariwarId, pariwarId };
      const holds = (key: string) => rbac.hasPermission(grants, key, resource, authz);

      const row = await claim.getClaimCase(scopeTx.tx, pid, cid);
      if (!row) throw notAtAnApprovingStep();
      const state = row.currentState as string;

      // ── THE STEP — four arms, in order; the cheap permission test first, then at most one statement per arm ──
      // ⭐ Code review round 2 (S15) — a LIVE R9 routing makes the approving step R9's, ⛔ the final vote's, so arm 1 yields to
      // arm 3 there (the audit names `r9_vote` and the R9 key). The routing read is shared by the two arms (ONE statement).
      let liveRouted: boolean | undefined;
      const routed = async () => (liveRouted ??= await claim.hasLiveRoutedRow(scopeTx.tx, pid, cid));
      let admitted: { step: PeerAnswersStep; key: string } | null = null;
      if ((claim.TRUSTEE_VOTABLE_STATES as readonly string[]).includes(state) && holds('cycle.freeze') && !(await routed())) {
        admitted = { step: 'final_vote', key: 'cycle.freeze' };
      } else if (
        (claim.TRUSTEE_ESCALATION_RESOLVABLE_STATES as readonly string[]).includes(state) &&
        holds('cycle.freeze') &&
        (await claim.getLiveDecision(scopeTx.tx, pid, cid))?.outcome === 'escalated'
      ) {
        admitted = { step: 'escalation_resolution', key: 'cycle.freeze' };
      } else if (
        (claim.R9_OUTCOME_FROM_STATES as readonly string[]).includes(state) &&
        holds('claim.r9_vote') &&
        (await routed())
      ) {
        admitted = { step: 'r9_vote', key: 'claim.r9_vote' };
      } else if (holds('claim.review_escalated_closure') && (await claim.isCorrectionClaimHeld(scopeTx.tx, pid, cid))) {
        admitted = { step: 'super_admin_approval', key: 'claim.review_escalated_closure' };
      }
      if (admitted === null) throw notAtAnApprovingStep();
      const { step } = admitted;
      const callbackViewer = rbac.matchingGrantRole(grants, admitted.key, resource, authz) === 'super_admin' ? 'super_admin' : 'pariwar_admin';

      // The deceased's name for the question words (`{member}`) — the console's own path minus its document read: ONE
      // KMS decrypt, ⛔ audited (as on the console); a failure ⇒ the literal "the member". ⛔ Never
      // `resolvePeerRequestMemberName` (a different, mode-resolved name).
      let memberName: string | null = null;
      try {
        const profile = await underSavepoint(scopeTx.client, 'peer_answers_member_name', () =>
          kyc.getMemberKycProfile(scopeTx.tx, pid, row.deceasedMemberId),
        );
        if (profile?.nameCiphertext) memberName = await decryptKycField(profile.nameCiphertext, pariwarId, deps.encryption);
      } catch (err) {
        request.log.warn({ err: (err as Error | null)?.name, claimCaseId }, 'peer-answers: the member name could not be read');
      }

      const shown: { pingId: string; basis: PeerCallbackBasis }[] = [];
      const section = await assemblePeerMeshSection(
        () =>
          assemblePeerSection(
            deps.encryption,
            {
              db: scopeTx.tx,
              pariwarId,
              claimCaseId,
              actorId,
              callbackViewer,
              log: request.log,
              onCallbackMobileShown: (pingId, basis) => shown.push({ pingId, basis }),
              run: (label, read) => underSavepoint(scopeTx.client, `peer_answers_${label}`, read),
            },
            () => {},
            memberName ?? 'the member',
          ),
        { claimCaseId, log: request.log },
      );

      // ── PM13's flags — from the warnings read, under its OWN SAVEPOINT (a failure ⇒ every flag `null`) ──
      let response: ClaimPeerAnswersResponse;
      if (section === undefined) {
        response = {};
      } else if (section.status !== 'present') {
        response = { peerMesh: section };
      } else {
        let peerAnswerFlags: ReadonlyMap<string, boolean> | null = null;
        try {
          peerAnswerFlags = (
            await underSavepoint(scopeTx.client, 'peer_answers_warnings', () => claim.readClaimApprovalWarnings(scopeTx.tx, pid, cid))
          ).peerAnswerFlags;
        } catch (err) {
          request.log.warn({ err: (err as Error | null)?.name, claimCaseId }, 'peer-answers: the warnings read failed; flags unknown');
        }
        response = { peerMesh: stitchPeerAnswerFlags(section, { peerAnswerFlags }) };
      }

      // ── The audit — only now the response is built (S17); ⛔ never a name, an answer, a date or a number ──
      const locator = `claim:${claimCaseId.toLowerCase()}`;
      const peer = response.peerMesh;
      emitAuthAudit(deps, request, 'admin_claim.peer_answers_read', {
        actorId,
        pariwarId,
        resourceLocator: locator,
        context: {
          step,
          section: peer === undefined ? 'hidden' : peer.status,
          ping_count: peer?.status === 'present' ? peer.transcript.pings.length : 0,
          answer_count:
            peer?.status === 'present' ? peer.transcript.pings.reduce((n, p) => n + (p.reply?.answers.length ?? 0), 0) : 0,
          // ⭐ Story 6.32 (second review S15) — the family's account the section carried (counts only).
          ...familyAccountAuditCounts(peer),
        },
      });
      // ⭐ Code review round 2 (S8) — only for a section the response ACTUALLY carries (`present`): the wire mapping runs
      // after the assembler reported its numbers, and its `catch → unavailable` would otherwise leave a line for a number
      // nobody was shown.
      const delivered = peer?.status === 'present' ? shown : [];
      for (const { pingId, basis } of delivered) {
        emitAuthAudit(deps, request, 'admin_claim.peer_callback_mobile_shown', {
          actorId,
          pariwarId,
          resourceLocator: `${locator}:ping:${pingId.toLowerCase()}`,
          context: { basis, step },
        });
      }
      return response;
    },
  };
}
