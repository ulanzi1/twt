// Story 6.22 — the fraud register's investigation: ROUTES (Task 4.3; DL4–DL7, DL10 (iv); `2026-11-01-438` item 5). Every path
// contains `fraud-investigation(s)` (the human-actor gate's COVERAGE_SET entry names that substring).
//
//   · the flag and the helpline's per-member list — `claim.flag_fraud` at `{ dimension: 'pariwar' }` (the helpline operator is
//     ⛔ district-scoped; ⛔ resolver — the house shape of `claim.file` / `claim.raise_nominee_correction`);
//   · the FINDING — `claim.record_fraud_finding` at the deceased's SERVER-DERIVED district (`resolveNomineeNameCheckDistrict()`),
//     then a FRESH step-up (`FRAUD_FINDING_STEP_UP_CONTEXT`, the ONE constant the admin caller imports) — AFTER the permission
//     hook, so an unauthorized actor never reaches step-up;
//   · the console read — `claim.verify` at the district (the console's own key); the work-list — `claim.record_fraud_finding`
//     gated at the caller's own scope (`resolveQueueScopeStash`), each ROW then checked at its district in the handler.

import {
  FRAUD_FINDING_STEP_UP_CONTEXT,
  FraudFindingRequest,
  FraudFindingResponse,
  FraudFlagRequest,
  FraudFlagResponse,
  FraudInvestigationResponse,
  MemberFraudClaimsResponse,
  OpenFraudInvestigationsResponse,
} from '@twt/contracts';
import { claim, type rbac } from '@twt/domain';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import {
  FRAUD_FINDING_KEY,
  FRAUD_FLAG_KEY,
  FRAUD_INVESTIGATION_READ_KEY,
  createFraudInvestigationHandlers,
} from './claims.fraud-investigation.handlers.js';
import { resolveNomineeNameCheckDistrict, resolveQueueScopeStash } from './claims.nominee-name-check.routes.js';

const TAG = 'fraud-investigation';

const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();
const MemberParam = z.object({ pariwarId: z.string().uuid(), memberId: z.string().uuid() }).strict();
const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const PageQuery = z.object({ limit: z.coerce.number().int().min(1).max(claim.OPEN_FRAUD_INVESTIGATIONS_MAX_LIMIT).optional() }).strict();

export function registerFraudInvestigationRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createFraudInvestigationHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveNomineeNameCheckDistrict();
  const districtFromStash = (request: FastifyRequest): string | null => request.nomineeNameCheckDistrict ?? null;

  const canFlag = requirePermissionHook(deps, FRAUD_FLAG_KEY, { dimension: 'pariwar' });
  const canFind = requirePermissionHook(deps, FRAUD_FINDING_KEY, { dimension: 'district', resolveValue: districtFromStash });
  const findingStepUp = requireStepUp(deps, FRAUD_FINDING_STEP_UP_CONTEXT);
  const canRead = requirePermissionHook(deps, FRAUD_INVESTIGATION_READ_KEY, { dimension: 'district', resolveValue: districtFromStash });
  const resolveWorkListScope = resolveQueueScopeStash(FRAUD_FINDING_KEY);
  const canReadWorkList = requirePermissionHook(deps, FRAUD_FINDING_KEY, {
    dimension: 'district',
    resolveDimension: (request: FastifyRequest): rbac.ScopeDimension => request.nomineeNameCheckQueueScope?.dimension ?? 'district',
    resolveValue: (request: FastifyRequest): string | null => request.nomineeNameCheckQueueScope?.value ?? null,
  });

  // (a) DL4 — the helpline operator FLAGS a claim (any state, once).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/fraud-investigation/flag',
    {
      schema: { params: ClaimParam, body: FraudFlagRequest, response: { 200: FraudFlagResponse, 201: FraudFlagResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canFlag],
    },
    h.postFlag,
  );

  // (b) DL5 — EVERY claim naming the member the operator has found and read back (every state; ⛔ PII).
  r.get(
    '/api/v1/p/:pariwarId/admin/members/:memberId/fraud-investigation/claims',
    {
      schema: { params: MemberParam, response: { 200: MemberFraudClaimsResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canFlag],
    },
    h.getMemberClaims,
  );

  // (c) DL3 — the District Admin's FINDING, behind a fresh step-up.
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/fraud-investigation/finding',
    {
      schema: { params: ClaimParam, body: FraudFindingRequest, response: { 200: FraudFindingResponse, 201: FraudFindingResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canFind, findingStepUp],
    },
    h.postFinding,
  );

  // (d) DL7 — the console read (notes withheld uniformly unless the viewer may record a finding here).
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/fraud-investigation',
    {
      schema: { params: ClaimParam, response: { 200: FraudInvestigationResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canRead],
    },
    h.getInvestigation,
  );

  // (e) DL10 (iv) — the District Admin's work-list.
  r.get(
    '/api/v1/p/:pariwarId/admin/fraud-investigations',
    {
      schema: { params: PariwarParam, querystring: PageQuery, response: { 200: OpenFraudInvestigationsResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveWorkListScope, canReadWorkList],
    },
    h.getOpenInvestigations,
  );
}
