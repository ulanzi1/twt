// The correction CLOSURE — the District Admin's and the Pariwar Admin's routes (Story 6.19c; AC6, AC8c, AC17).
//
//   District Admin — at the deceased's SERVER-DERIVED posting district (6.18's `resolveNomineeNameCheckDistrict`):
//   · POST …/admin/claims/:claimCaseId/correction/closure/request                        — key (2) `claim.request_correction_closure`
//   · POST …/admin/claims/:claimCaseId/correction/no-correction-needed                   — key (8) `claim.record_no_correction_needed`
//   · POST …/admin/claims/:claimCaseId/correction/closure-letters                        — key (1) `claim.record_correction_letter`
//   · POST …/admin/claims/:claimCaseId/correction/closure-letters/:letterId/delivery     — key (1), multipart
//   · GET  …/admin/claims/:claimCaseId/correction/closure-letters/address                — key (1) + the fresh admin STEP-UP
//   · GET  …/admin/claims/:claimCaseId/correction/closure-letters/:letterId/screenshot   — key (1)
//   · GET  …/admin/correction/closure-letters                                            — key (1), a LIST (per-caller gate
//     target — `resolveQueueScopeStash(key (1))` — and per-row filtered in the handler)
//   Pariwar Admin — at `dimension: 'pariwar'` (the cycle.freeze ceiling rationale):
//   · GET  …/admin/correction/closure-queue                                              — key (3) `claim.decide_correction_closure`
//   · POST …/admin/claims/:claimCaseId/correction/closure/decision                       — key (3)
//   · POST …/admin/claims/:claimCaseId/correction/no-correction-needed/approve           — `cycle.freeze` (D27)
//   · POST …/admin/claims/:claimCaseId/correction/no-correction-needed/keep              — `cycle.freeze` (`-260` G2)
//
// Every route composes the authenticated-HUMAN chain [adminSession, scope, (district,) requirePermissionHook(…)]; a claim
// of another Pariwar resolves ⛔ no district (the district gate fails closed) or ⛔ no row in this tenant's scope (404).
// Every collection GET declares a bounded `limit` (forced pagination). Enrolled in
// `scripts/claim-adjudication-human-actor-invariant/check.ts`'s COVERAGE_SET.

import {
  ChangeCorrectionMustActResponse,
  ClosureDecisionClaimResponse,
  ClosureLetterAddressQuery,
  ClosureLetterDto,
  ClosureLettersOwedResponse,
  CorrectionClosureDecisionRequest,
  CorrectionClosureDto,
  ClosureLetterAddressResponse,
  ClosureLetterScreenshotResponse,
  NoCorrectionNeededApproveRequest,
  NoCorrectionNeededKeepRequest,
  NoCorrectionNeededRequest,
  NoCorrectionNeededResponse,
  PariwarClosureQueueResponse,
  RecordClosureLetterRequest,
  RequestCorrectionClosureRequest,
} from '@twt/contracts';
import { claim, rbac } from '@twt/domain';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { CORRECTION_LETTER_KEY } from './claims.correction-chase.handlers.js';
import {
  CLOSURE_DECIDE_KEY,
  CLOSURE_LETTER_ADDRESS_STEP_UP_CONTEXT,
  CLOSURE_REQUEST_KEY,
  CYCLE_FREEZE_KEY,
  NO_CORRECTION_NEEDED_KEY,
  createCorrectionClosureHandlers,
} from './claims.correction-closure.handlers.js';
import { resolveNomineeNameCheckDistrict, resolveQueueScopeStash } from './claims.nominee-name-check.routes.js';

const TAG = 'claim-correction-closure';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();
const LetterParam = z
  .object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid(), letterId: z.string().uuid() })
  .strict();
/** A bounded page — every collection GET (AR forced pagination); the domain read clamps again. */
const PageQuery = z.object({ limit: z.coerce.number().int().min(1).max(claim.CLOSURE_QUEUE_MAX_LIMIT).optional() }).strict();

export function registerCorrectionClosureRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createCorrectionClosureHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveNomineeNameCheckDistrict();
  const atDistrict = {
    dimension: 'district' as const,
    resolveValue: (request: FastifyRequest): string | null => request.nomineeNameCheckDistrict ?? null,
  };
  const canRequest = requirePermissionHook(deps, CLOSURE_REQUEST_KEY, atDistrict);
  const canRecordNoCorrection = requirePermissionHook(deps, NO_CORRECTION_NEEDED_KEY, atDistrict);
  const canRecordLetter = requirePermissionHook(deps, CORRECTION_LETTER_KEY, atDistrict);
  const canDecide = requirePermissionHook(deps, CLOSURE_DECIDE_KEY, { dimension: 'pariwar' });
  const canCycleFreeze = requirePermissionHook(deps, CYCLE_FREEZE_KEY, { dimension: 'pariwar' });
  const addressStepUp = requireStepUp(deps, CLOSURE_LETTER_ADDRESS_STEP_UP_CONTEXT);
  // The letters-owed LIST: a district-scoped caller is gated at their district, a pariwar-ceiling caller at the Pariwar.
  const resolveLetterQueueScope = resolveQueueScopeStash(CORRECTION_LETTER_KEY);
  const canReadLetterQueue = requirePermissionHook(deps, CORRECTION_LETTER_KEY, {
    dimension: 'district',
    resolveDimension: (request: FastifyRequest): rbac.ScopeDimension => request.nomineeNameCheckQueueScope?.dimension ?? 'district',
    resolveValue: (request: FastifyRequest): string | null => request.nomineeNameCheckQueueScope?.value ?? null,
  });

  // ── The District Admin ──────────────────────────────────────────────────────────────────────────────────────

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/closure/request',
    {
      schema: { params: ClaimParam, body: RequestCorrectionClosureRequest, response: { 201: CorrectionClosureDto }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canRequest],
    },
    h.requestClosure,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/no-correction-needed',
    {
      schema: { params: ClaimParam, body: NoCorrectionNeededRequest, response: { 201: NoCorrectionNeededResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canRecordNoCorrection],
    },
    h.recordNoCorrectionNeeded,
  );

  r.get(
    '/api/v1/p/:pariwarId/admin/correction/closure-letters',
    {
      schema: { params: PariwarParam, querystring: PageQuery, response: { 200: ClosureLettersOwedResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveLetterQueueScope, canReadLetterQueue],
    },
    h.getClosureLettersOwed,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/closure-letters',
    {
      schema: { params: ClaimParam, body: RecordClosureLetterRequest, response: { 201: ClosureLetterDto }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canRecordLetter],
    },
    h.recordClosureLetter,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/closure-letters/:letterId/delivery',
    {
      schema: { params: LetterParam, response: { 201: ClosureLetterDto }, tags: [TAG], consumes: ['multipart/form-data'] },
      preHandler: [adminSession, scope, resolveDistrict, canRecordLetter],
    },
    h.recordClosureLetterDelivery,
  );

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/closure-letters/address',
    {
      schema: { params: ClaimParam, querystring: ClosureLetterAddressQuery, response: { 200: ClosureLetterAddressResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canRecordLetter, addressStepUp],
    },
    h.readClosureLetterAddress,
  );

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/closure-letters/:letterId/screenshot',
    {
      schema: { params: LetterParam, response: { 200: ClosureLetterScreenshotResponse }, tags: [TAG] },
      // Code review patch (2026-10-02): `addressStepUp` added — a delivery-proof photo of a posted letter
      // plausibly shows the same recipient name/address the sibling address route step-up-gates one route above;
      // this route had no such gate.
      preHandler: [adminSession, scope, resolveDistrict, canRecordLetter, addressStepUp],
    },
    h.readClosureLetterScreenshot,
  );

  // ── The Pariwar Admin ───────────────────────────────────────────────────────────────────────────────────────

  r.get(
    '/api/v1/p/:pariwarId/admin/correction/closure-queue',
    {
      schema: { params: PariwarParam, querystring: PageQuery, response: { 200: PariwarClosureQueueResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canDecide],
    },
    h.getClosureQueue,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/closure/decision',
    {
      schema: { params: ClaimParam, body: CorrectionClosureDecisionRequest, response: { 201: ClosureDecisionClaimResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canDecide],
    },
    h.decideClosure,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/no-correction-needed/approve',
    {
      schema: { params: ClaimParam, body: NoCorrectionNeededApproveRequest, response: { 201: ClosureDecisionClaimResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canCycleFreeze],
    },
    h.approveNoCorrectionNeeded,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/no-correction-needed/keep',
    {
      schema: { params: ClaimParam, body: NoCorrectionNeededKeepRequest, response: { 201: ChangeCorrectionMustActResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canCycleFreeze],
    },
    h.keepNoCorrectionNeeded,
  );
}
