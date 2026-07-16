// Internal 3-stage appeal routes — Story 6.16 (Task 7; AC1–AC11). The LAST story of Epic 6.
//
// The appeal surface — member-facing initiate/status + the admin stage-adjudication routes:
//   · POST /api/v1/member/claims/:claimCaseId/appeal                       → member self-initiate (AC1/AC7)
//   · GET  /api/v1/member/claims/:claimCaseId/appeal                       → member appeal-status (AC7)
//   · POST …/admin/claims/:claimCaseId/appeal                             → operator on-behalf initiate (AR-61)
//   · POST …/admin/claims/:claimCaseId/appeal/stage1                      → Stage-1 review (AC2, district-gated)
//   · POST …/admin/claims/:claimCaseId/appeal/stage2/{open,vote,finalize,cancel} → Stage-2 panel (AC3, pariwar)
//   · POST …/admin/claims/:claimCaseId/appeal/stage3                      → Stage-3 decision (AC4, pariwar, step-up)
//   · GET  …/admin/claims/appeal/decisions-by-reviewer                    → the AC6 audit query (+ D-H SLA)
//
// The route IS the security control (AC10): every ADMIN stage-adjudication route requires an authenticated
// HUMAN admin session + the appeal WRITE key + tenant match — fail-closed, audited, and covered by the
// claim-adjudication human-actor CI gate. Stage 1 is checked at the deceased member's SERVER-DERIVED district
// (the verifier-decision precedent); Stage 2/3 at `dimension: 'pariwar'` (the r9_vote precedent). The
// reverse/deny-committing writes (stage-2 finalize, stage-3 decide) are ADDITIONALLY step-up-gated (the ₹50L
// stakes; the 6.14 finalize / 6.13 commit precedent). The member-facing INITIATE route is a CLAIMANT action —
// deliberately NOT in the adjudication-human-actor set (the operator on-behalf route uses the helpline key).

import {
  AdminAppealCaseResponse,
  AppealDecisionResponse,
  AppealDecisionsByReviewerQuery,
  AppealDecisionsByReviewerResponse,
  AppealPanelFinalizeResponse,
  AppealPanelSessionResponse,
  AppealPanelVoteResponse,
  AppealStage1ReviewRequest,
  AppealStage2CancelRequest,
  AppealStage2FinalizeRequest,
  AppealStage2OpenRequest,
  AppealStage2VoteRequest,
  AppealStage3DecideRequest,
  InitiateAppealRequest,
  InitiateAppealResponse,
  MemberAppealStatusResponse,
} from '@twt/contracts';
import { claim, ids, member as memberDomain } from '@twt/domain';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createAppealHandlers } from './claims.appeal.handlers.js';

const TAG = 'appeal';

/** Story 6.16 — the three new appeal keys (catalog 16→19). */
const APPEAL_REVIEW_KEY = 'claim.appeal_review'; // Stage 1 (district)
const APPEAL_VOTE_KEY = 'claim.appeal_vote'; // Stage 2 (pariwar)
const APPEAL_FINAL_KEY = 'claim.appeal_final'; // Stage 3 (pariwar)
/** The helpline capability the operator on-behalf initiate reuses (AR-61). */
const CLAIM_FILE_KEY = 'claim.file';

/** Step-up action contexts (free-form strings — no registry to extend). */
const STAGE2_FINALIZE_STEP_UP = 'appeal_stage2_finalize';
const STAGE3_DECIDE_STEP_UP = 'appeal_stage3_decide';

const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();
const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const MemberClaimParam = z.object({ claimCaseId: z.string().uuid() }).strict();

/**
 * PreHandler: derive the deceased member's latest posting district SERVER-SIDE and stash it so the
 * (synchronous) district `resolveValue` can read it (the client never submits the authz district — the
 * verifier-decision `resolveDecisionDistrict` precedent). A claim missing in this Pariwar stashes `null`
 * (⇒ the district gate fails closed to 403).
 */
function resolveAppealDistrict(): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    if (!scopeTx) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const { claimCaseId } = request.params as { claimCaseId: string };
    const claimRow = await claim.getClaimCase(scopeTx.tx, ids.pariwarId(scopeTx.pariwarId), ids.claimId(claimCaseId));
    if (!claimRow) {
      request.decisionDistrict = null;
      return;
    }
    const posting = await memberDomain.getMemberPostingLatest(scopeTx.tx, ids.pariwarId(scopeTx.pariwarId), claimRow.deceasedMemberId);
    request.decisionDistrict = posting?.district ?? null;
  };
}

export function registerAppealRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createAppealHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const memberSession = requireMemberSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveAppealDistrict();
  const districtFromStash = (request: FastifyRequest): string | null => request.decisionDistrict ?? null;

  const requireAppealReview = requirePermissionHook(deps, APPEAL_REVIEW_KEY, { dimension: 'district', resolveValue: districtFromStash });
  const requireAppealVote = requirePermissionHook(deps, APPEAL_VOTE_KEY, { dimension: 'pariwar' });
  const requireAppealFinal = requirePermissionHook(deps, APPEAL_FINAL_KEY, { dimension: 'pariwar' });
  const requireClaimFile = requirePermissionHook(deps, CLAIM_FILE_KEY, { dimension: 'pariwar' });

  /**
   * Admin case-read: EVERY stage's surface reads this route (Stage-1 District-Admin reviewer, Stage-2 panel
   * voter, Stage-3 Trustee) — gating it on `claim.appeal_vote` alone (a Stage-2/3-only key) locked Stage-1
   * reviewers out of the case they must review (6.16 review finding). Passes on ANY of the three appeal keys;
   * MUST run after `resolveDistrict` (requireAppealReview reads the stashed district).
   */
  const requireAnyAppealAccess: preHandlerHookHandler = async (request) => {
    // The three hooks above are each a single-arg `(request) => Promise<void>` at runtime (the
    // requirePermissionHook / resolveAppealDistrict shape) — cast to invoke them directly here rather than
    // through Fastify's hook-registration machinery.
    const hooks = [requireAppealVote, requireAppealFinal, requireAppealReview] as unknown as Array<
      (req: FastifyRequest) => Promise<void>
    >;
    let lastErr: unknown;
    for (const hook of hooks) {
      try {
        await hook(request);
        return;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr;
  };

  // ── AC1/AC7 — member self-initiate + status (member session; pariwar from the session). NOT an
  //    adjudication route (a claimant action) → deliberately excluded from the human-actor gate. ──
  r.post(
    '/api/v1/member/claims/:claimCaseId/appeal',
    { schema: { params: MemberClaimParam, body: InitiateAppealRequest, response: { 201: InitiateAppealResponse }, tags: [TAG] }, preHandler: [memberSession] },
    h.postMemberInitiate,
  );
  r.get(
    '/api/v1/member/claims/:claimCaseId/appeal',
    { schema: { params: MemberClaimParam, response: { 200: MemberAppealStatusResponse }, tags: [TAG] }, preHandler: [memberSession] },
    h.getMemberStatus,
  );

  // ── AC1/AR-61 — operator on-behalf initiate (admin session + helpline capability). Also NOT an
  //    adjudication route — the operator files on the claimant's behalf, they do not adjudicate. ──
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/appeal',
    { schema: { params: ClaimParam, body: InitiateAppealRequest, response: { 201: InitiateAppealResponse }, tags: [TAG] }, preHandler: [adminSession, scope, requireClaimFile] },
    h.postOperatorInitiate,
  );

  // ── Admin per-claim appeal case model (readable by any stage's adjudicator — the Stage surfaces render
  //    from it; `resolveDistrict` runs first so the Stage-1 branch of requireAnyAppealAccess can check it). ──
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/appeal',
    { schema: { params: ClaimParam, response: { 200: AdminAppealCaseResponse }, tags: [TAG] }, preHandler: [adminSession, scope, resolveDistrict, requireAnyAppealAccess] },
    h.getCase,
  );

  // ── AC2 — Stage-1 District-Admin review (district-gated; human-actor CI gate covers it). ──
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/appeal/stage1',
    { schema: { params: ClaimParam, body: AppealStage1ReviewRequest, response: { 201: AppealDecisionResponse }, tags: [TAG] }, preHandler: [adminSession, scope, resolveDistrict, requireAppealReview] },
    h.postStage1,
  );

  // ── AC3 — Stage-2 panel (pariwar-gated). finalize ADDS a step-up (after the permission hook). ──
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/appeal/stage2/open',
    { schema: { params: ClaimParam, body: AppealStage2OpenRequest, response: { 201: AppealPanelSessionResponse }, tags: [TAG] }, preHandler: [adminSession, scope, requireAppealVote] },
    h.postStage2Open,
  );
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/appeal/stage2/vote',
    { schema: { params: ClaimParam, body: AppealStage2VoteRequest, response: { 201: AppealPanelVoteResponse }, tags: [TAG] }, preHandler: [adminSession, scope, requireAppealVote] },
    h.postStage2Vote,
  );
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/appeal/stage2/finalize',
    { schema: { params: ClaimParam, body: AppealStage2FinalizeRequest, response: { 200: AppealPanelFinalizeResponse }, tags: [TAG] }, preHandler: [adminSession, scope, requireAppealVote, requireStepUp(deps, STAGE2_FINALIZE_STEP_UP)] },
    h.postStage2Finalize,
  );
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/appeal/stage2/cancel',
    { schema: { params: ClaimParam, body: AppealStage2CancelRequest, response: { 200: AppealPanelSessionResponse }, tags: [TAG] }, preHandler: [adminSession, scope, requireAppealVote] },
    h.postStage2Cancel,
  );

  // ── AC4 — Stage-3 Trustee discretion, final (pariwar-gated + step-up). ──
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/appeal/stage3',
    { schema: { params: ClaimParam, body: AppealStage3DecideRequest, response: { 201: AppealDecisionResponse }, tags: [TAG] }, preHandler: [adminSession, scope, requireAppealFinal, requireStepUp(deps, STAGE3_DECIDE_STEP_UP)] },
    h.postStage3,
  );

  // ── AC6 — the decisions-by-reviewer audit query (pariwar-gated; bounded/clamped/forced-pagination). ──
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/appeal/decisions-by-reviewer',
    { schema: { params: PariwarParam, querystring: AppealDecisionsByReviewerQuery, response: { 200: AppealDecisionsByReviewerResponse }, tags: [TAG] }, preHandler: [adminSession, scope, requireAppealVote] },
    h.getDecisionsByReviewer,
  );
}
