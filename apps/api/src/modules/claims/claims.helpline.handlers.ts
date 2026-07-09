// Helpline-mediated claim-filing handler — Story 6.3 (Task 3; AC1/AC3/AC4/AC5/AC6).
//
// The operator-console (Priya-path) intake — the admin-surface TWIN of the member-app
// (Ravi-mode) handler in claims.handlers.ts. ONE scope-gated handler:
//   · initiateHelplineIntake — resolve the deceased from the VALIDATED request (NOT the
//     session — the operator is not the deceased) → guard it is a real member in this Pariwar
//     → mint + freeze via the SHARED initiateIntake core, idempotently + convergently.
//
// ── Scope-tx discipline (the admin member-validity template) ────────────────────────────
// This is an admin route: [adminSession, scope, requirePermissionHook(claim.file),
// requireStepUp('claim_file')] have run, so `request.scopeTx` (the raw pg client + drizzle,
// pariwar scope already set) and `request.scopeGrants` are attached. The multi-tenant
// lifecycle hook COMMITs the scope tx on a 2xx / ROLLBACKs otherwise — this handler does NOT
// open or close its own tx (unlike the member handlers, which own their scope tx). Audit is
// emitted AFTER the write succeeds so a thrown intake never leaves an emitted-but-uncommitted
// state; on a throw the `intake_failed` line is emitted before rethrow (the freeze must never
// fail audit-silently), then the lifecycle hook rolls back.
//
// ── The trust model — the KEY difference from Ravi-mode (6.2) ────────────────────────────
// There is NO nominee handover-trust OTP here. Priya is an authenticated, RBAC-gated, admin
// step-up-elevated STAFF actor; her authority + the caller's verbal identity read-back (the
// `identityReadBackConfirmed` wire literal) is the operator-path trust anchor. §2.2's
// fresh-transactional-step-up-for-claim-filing is satisfied by the OPERATOR's OWN admin
// step-up (requireStepUp('claim_file') in the route), NOT a nominee OTP.
//
// ── PII discipline ────────────────────────────────────────────────────────────────────
// Every audit line is NON-PII: claim_case_id + deceased_member_id + intake_channel +
// relationship + lookup_method + the operator id (the audit actor) ONLY — NEVER caller/nominee
// PII. `lookup_method` is recorded in the audit context ONLY, never in the domain payload.

import { randomUUID } from 'node:crypto';

import type {
  HelplineClaimIntakeRequest,
  HelplineClaimIntakeResponse,
  HelplineOperatorEventRequest,
  HelplineOperatorEventResponse,
} from '@twt/contracts';
import { ids, member as memberDomain } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { NotFoundError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { HELPLINE_INTAKE_TRIGGER, initiateIntake } from './claims.service.js';

export function createHelplineClaimsHandlers(deps: AppDeps) {
  /** Read the scope-resolved (operator admin actor id, scope tx) or fail loud (500 — the
   * route chain guarantees both ran; a missing one is a wiring bug, not a client error). */
  function adminScopeCtx(request: FastifyRequest): {
    operatorId: string;
    scopeTx: NonNullable<FastifyRequest['scopeTx']>;
  } {
    const scopeTx = request.scopeTx;
    const operatorId = request.requestContext.actorId;
    if (!scopeTx || !operatorId) {
      throw new Error('[helpline-claims] handler ran without adminSession + scope-resolution');
    }
    return { operatorId, scopeTx };
  }

  return {
    /**
     * POST /api/v1/p/:pariwarId/admin/claims/intake — the operator files a claim on the
     * deceased member's behalf. The deceased comes from the VALIDATED request (the operator's
     * lookup result), never the session. Re-guards the deceased is a real member in this
     * Pariwar (defense-in-depth on RLS — a cross-tenant id 404s). Mints + freezes via the
     * shared `initiateIntake`, idempotently + convergently (returns the existing claim, no
     * second freeze, when a prior app/helpline claim exists for the death).
     */
    async initiateHelplineIntake(request: FastifyRequest): Promise<HelplineClaimIntakeResponse> {
      const body = request.body as HelplineClaimIntakeRequest;
      const { operatorId, scopeTx } = adminScopeCtx(request);
      const pariwarIdStr = scopeTx.pariwarId;
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const deceasedMemberId = ids.memberId(body.deceasedMemberId);
      const auditId = randomUUID();

      try {
        // Guard the deceased is a REAL member in this Pariwar. RLS already scopes the query, so
        // a cross-tenant deceasedMemberId resolves to "not found" here (defense-in-depth: a
        // claim — and its irreversible freeze — must never be filed against a phantom or
        // cross-tenant id). Inside the try block so a probing/invalid id is never audit-silent
        // (Review Finding — the account-freezing surface must never fail audit-silently, not
        // even on a 404).
        if (!(await memberDomain.memberExists(scopeTx.tx, pariwarId, deceasedMemberId))) {
          throw new NotFoundError('Member not found', 'member.not_found');
        }

        const outcome = await initiateIntake(deps, scopeTx, {
          deceasedMemberId,
          pariwarId,
          auditId,
          attribution: {
            intakeChannel: 'helpline',
            actor: 'operator',
            // Operator attribution (Decision #3): the OPERATOR's admin actor id is the
            // events_log.actor_id; claimant_actor_id stays null (v1 null-claimant policy).
            actorId: operatorId,
            claimantActorId: null,
            trigger: HELPLINE_INTAKE_TRIGGER,
          },
        });

        emitAuthAudit(
          deps,
          request,
          outcome.created ? 'helpline_claim.intake_initiated' : 'helpline_claim.intake_idempotent',
          {
            actorId: operatorId,
            pariwarId: pariwarIdStr,
            context: outcome.created
              ? {
                  claim_case_id: outcome.claimCaseId,
                  deceased_member_id: body.deceasedMemberId,
                  intake_channel: 'helpline',
                  relationship: body.relationship,
                  // lookup_method is NON-PII operational-insight AUDIT metadata (the search
                  // dimension the operator used) — recorded here ONLY, NEVER in the domain payload.
                  lookup_method: body.lookupMethod,
                  audit_id: auditId,
                }
              : {
                  // Convergence hit: the ORIGINAL intake's relationship is what's on record
                  // (in that intake's own audit line). This retry's relationship/lookup were
                  // NOT persisted; log them under distinct keys so the line never reads as
                  // "relationship updated."
                  claim_case_id: outcome.claimCaseId,
                  deceased_member_id: body.deceasedMemberId,
                  intake_channel: 'helpline',
                  relationship_submitted: body.relationship,
                  lookup_method: body.lookupMethod,
                  note: 'idempotent_hit_relationship_not_persisted',
                  audit_id: auditId,
                },
          },
        );

        return { claimCaseId: outcome.claimCaseId, state: outcome.state as HelplineClaimIntakeResponse['state'], created: outcome.created };
      } catch (err) {
        // An account-freezing operation must never fail audit-silently — covers BOTH the
        // memberExists 404 guard above and any initiateIntake failure. `err.message` (not just
        // `err.name`) is recorded for forensic value; these are system/domain error messages
        // (not-found / concurrency / validation), never caller-supplied PII.
        emitAuthAudit(deps, request, 'helpline_claim.intake_failed', {
          actorId: operatorId,
          pariwarId: pariwarIdStr,
          context: {
            deceased_member_id: body.deceasedMemberId,
            intake_channel: 'helpline',
            lookup_method: body.lookupMethod,
            audit_id: auditId,
            error: err instanceof Error ? `${err.name}: ${err.message}` : 'unknown',
          },
        });
        throw err;
      }
    },

    /**
     * POST /api/v1/p/:pariwarId/admin/claims/operator-event — a NON-FREEZING, audit-only line
     * for a read-back confirmation or an AR-61 supervisor escalation (Review Finding — AC4's
     * literal "every operator action... writes a NON-PII audit line" covers these too, not just
     * intake). No step-up required: neither action mutates claim/member state.
     */
    async recordOperatorEvent(request: FastifyRequest): Promise<HelplineOperatorEventResponse> {
      const body = request.body as HelplineOperatorEventRequest;
      const { operatorId, scopeTx } = adminScopeCtx(request);

      emitAuthAudit(deps, request, `helpline_claim.${body.event}`, {
        actorId: operatorId,
        pariwarId: scopeTx.pariwarId,
        context: {
          deceased_member_id: body.deceasedMemberId,
          intake_channel: 'helpline',
          lookup_method: body.lookupMethod,
        },
      });

      return { recorded: true };
    },
  };
}
