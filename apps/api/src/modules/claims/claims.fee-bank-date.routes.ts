// The finance officer's BANK DATE for a joining fee recorded after the death — Story 6.39a (Task 3.5; DL8, DL9, DL10).
//
// ⭐ BOTH routes are ADMIN routes composing the human-actor chain [requireAdminSession, scopeResolutionHook,
// requirePermissionHook] — enrolled in the claim-adjudication human-actor gate's COVERAGE_SET — and every path is a
// PLAIN STRING LITERAL (the gate fails a non-literal path).
// ⭐ Both gate on ONE key, `claim.record_fee_bank_date` (DL8, `finance_officer`):
//   · the LIST at `dimension: 'pariwar'` (its rows span districts; a finance officer's ceiling is the Pariwar);
//   · the RECORD at `dimension: 'district'` against the deceased member's SERVER-DERIVED posting district (6.18's exported
//     `resolveNomineeNameCheckDistrict` stash — the client never submits it; a `pariwar` grant satisfies it, `scopeContains`
//     rule 5), read through a LOCAL closure, THEN a FRESH step-up (`FEE_BANK_DATE_STEP_UP_CONTEXT`, the ONE constant the admin
//     caller imports — DL9) — AFTER the permission hook, so an unauthorized actor never reaches step-up.

import {
  FEE_BANK_DATE_STEP_UP_CONTEXT,
  FeeBankDateListQuery,
  FeeBankDateListResponse,
  FeeBankDateRequest,
  FeeBankDateWriteResponse,
} from '@twt/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { FEE_BANK_DATE_KEY, createFeeBankDateHandlers } from './claims.fee-bank-date.handlers.js';
import { resolveNomineeNameCheckDistrict } from './claims.nominee-name-check.routes.js';

const TAG = 'fee-bank-date';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();

export function registerFeeBankDateRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createFeeBankDateHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveNomineeNameCheckDistrict();
  const districtFromStash = (request: FastifyRequest): string | null => request.nomineeNameCheckDistrict ?? null;

  const canList = requirePermissionHook(deps, FEE_BANK_DATE_KEY, { dimension: 'pariwar' });
  const canRecord = requirePermissionHook(deps, FEE_BANK_DATE_KEY, { dimension: 'district', resolveValue: districtFromStash });
  const recordStepUp = requireStepUp(deps, FEE_BANK_DATE_STEP_UP_CONTEXT);

  // DL10 — the finance officer's list: the held claims, and those whose check now passes on a recorded bank date.
  r.get(
    '/api/v1/p/:pariwarId/admin/fee-bank-dates',
    {
      schema: { params: PariwarParam, querystring: FeeBankDateListQuery, response: { 200: FeeBankDateListResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canList],
    },
    h.getList,
  );

  // DL3 / DL5 — the finance officer RECORDS the bank's date, behind a fresh step-up (DL9).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/fee-bank-date',
    {
      schema: { params: ClaimParam, body: FeeBankDateRequest, response: { 201: FeeBankDateWriteResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canRecord, recordStepUp],
    },
    h.postBankDate,
  );
}
