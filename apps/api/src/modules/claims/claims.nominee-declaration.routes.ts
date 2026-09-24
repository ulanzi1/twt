// The nominee declaration HISTORY routes — Story 6.20 (Task 4 / Task 5; AC3, AC4, AC7, D8, D12, D14).
//
// ⭐ EVERY route is an ADMIN route composing the human-actor chain [requireAdminSession,
// scopeResolutionHook, requirePermissionHook] — enrolled in the claim-adjudication human-actor gate's
// COVERAGE_SET — and every path is a PLAIN STRING LITERAL (the gate fails a non-literal path).
// ⭐ The per-claim routes gate at `dimension: 'district'` against the deceased member's SERVER-DERIVED
// posting district (6.18's `resolveNomineeNameCheckDistrict` stash — the client never submits it). The
// Pariwar-dimension routes (the raise, the Pariwar Admin's step, the refusal list) gate at the Pariwar.
// ⭐ A write requires the VIEW key too where the actor must have SEEN what they judge: the District Admin
// determines a timeline they may read, and approves a proposal they may read — and so does the Pariwar
// Admin, whose step APPLIES the change (code review 2026-09-24: that route used to rely on a comment
// saying the Pariwar Admin "holds the view key already"; it now ENFORCES it, at the deceased's district,
// which a pariwar-scope grant satisfies). The helpline raise carries its own pariwar-dimension key.
// ⛔ The family's raise through the app is a MEMBER route in `claims.routes.ts` (no admin chain).

import {
  NomineeCorrectionDecisionRequest,
  NomineeCorrectionListResponse,
  NomineeCorrectionPendingListResponse,
  NomineeCorrectionRaiseRequest,
  NomineeCorrectionWriteResponse,
  NomineeDeclarationSnapshotsResponse,
  NomineeDeclarationTimelineResponse,
  NomineeDeterminationRequest,
  NomineeDeterminationWriteResponse,
  NomineeRefusalListResponse,
} from '@twt/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import {
  NOMINEE_CORRECTION_DISTRICT_KEY,
  NOMINEE_CORRECTION_PARIWAR_KEY,
  NOMINEE_CORRECTION_RAISE_KEY,
  NOMINEE_DECLARATION_VIEW_KEY,
  NOMINEE_DETERMINATION_KEY,
  NOMINEE_REFUSAL_VIEW_KEY,
  createNomineeDeclarationHandlers,
} from './claims.nominee-declaration.handlers.js';
import { resolveNomineeNameCheckDistrict } from './claims.nominee-name-check.routes.js';

const TAG = 'nominee-declaration';
const REFUSAL_MAX_LIMIT = 200;

const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();
const CorrectionParam = z
  .object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid(), correctionId: z.string().uuid() })
  .strict();

export function registerNomineeDeclarationRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createNomineeDeclarationHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveNomineeNameCheckDistrict();
  const districtFromStash = (request: FastifyRequest): string | null => request.nomineeNameCheckDistrict ?? null;
  const pariwarFromScope = (request: FastifyRequest): string | null => request.scopeTx?.pariwarId ?? null;

  const requireView = requirePermissionHook(deps, NOMINEE_DECLARATION_VIEW_KEY, { dimension: 'district', resolveValue: districtFromStash });
  const requireDetermine = requirePermissionHook(deps, NOMINEE_DETERMINATION_KEY, { dimension: 'district', resolveValue: districtFromStash });
  const requireDistrictApproval = requirePermissionHook(deps, NOMINEE_CORRECTION_DISTRICT_KEY, { dimension: 'district', resolveValue: districtFromStash });
  const requireRaise = requirePermissionHook(deps, NOMINEE_CORRECTION_RAISE_KEY, { dimension: 'pariwar', resolveValue: pariwarFromScope });
  const requirePariwarApproval = requirePermissionHook(deps, NOMINEE_CORRECTION_PARIWAR_KEY, { dimension: 'pariwar', resolveValue: pariwarFromScope });
  const requireRefusalView = requirePermissionHook(deps, NOMINEE_REFUSAL_VIEW_KEY, { dimension: 'pariwar', resolveValue: pariwarFromScope });

  // D14 — the Pariwar Admin's `-239` refusal read surface (a NOTIFICATION, ⛔ not an approval step).
  r.get(
    '/api/v1/p/:pariwarId/admin/nominee-refusals',
    {
      schema: {
        params: z.object({ pariwarId: z.string().uuid() }).strict(),
        querystring: z.object({ limit: z.coerce.number().int().min(1).max(REFUSAL_MAX_LIMIT).optional() }).strict(),
        response: { 200: NomineeRefusalListResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireRefusalView],
    },
    h.listRefusals,
  );

  // AC7 — the Pariwar Admin's queue of corrections awaiting STEP 2 (they cannot open the verifier console).
  r.get(
    '/api/v1/p/:pariwarId/admin/nominee-corrections/pending',
    {
      schema: {
        params: z.object({ pariwarId: z.string().uuid() }).strict(),
        querystring: z.object({ limit: z.coerce.number().int().min(1).max(REFUSAL_MAX_LIMIT).optional() }).strict(),
        response: { 200: NomineeCorrectionPendingListResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requirePariwarApproval],
    },
    h.listPendingForPariwarAdmin,
  );

  // AC3 — the timeline (metadata), on demand — ⛔ not the console packet (D12).
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-declaration',
    {
      schema: { params: ClaimParam, response: { 200: NomineeDeclarationTimelineResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, requireView],
    },
    h.getTimeline,
  );

  // D10 — the decrypted snapshots, on demand, audited.
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-declaration/snapshots',
    {
      schema: { params: ClaimParam, response: { 200: NomineeDeclarationSnapshotsResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, requireView],
    },
    h.getSnapshots,
  );

  // AC4 — the District Admin's determination.
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-determination',
    {
      schema: {
        params: ClaimParam,
        body: NomineeDeterminationRequest,
        response: { 201: NomineeDeterminationWriteResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireView, requireDetermine],
    },
    h.postDetermination,
  );

  // AC7 — the corrections on a claim (target beside proposal).
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-corrections',
    {
      schema: { params: ClaimParam, response: { 200: NomineeCorrectionListResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, requireView],
    },
    h.listCorrections,
  );

  // AC7 / CC2 — the helpline operator raises on the family's behalf.
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-corrections',
    {
      schema: {
        params: ClaimParam,
        body: NomineeCorrectionRaiseRequest,
        response: { 201: NomineeCorrectionWriteResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireRaise],
    },
    h.postRaiseCorrection,
  );

  // AC7 — STEP 1, the District Admin.
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-corrections/:correctionId/district-decision',
    {
      schema: {
        params: CorrectionParam,
        body: NomineeCorrectionDecisionRequest,
        response: { 200: NomineeCorrectionWriteResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireView, requireDistrictApproval],
    },
    h.decide('district'),
  );

  // AC7 — STEP 2, the Pariwar Admin (applies on approve).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-corrections/:correctionId/pariwar-decision',
    {
      schema: {
        params: CorrectionParam,
        body: NomineeCorrectionDecisionRequest,
        response: { 200: NomineeCorrectionWriteResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireView, requirePariwarApproval],
    },
    h.decide('pariwar'),
  );
}
