// The death certificate's clear-date rule on the District Admin's console — Story 6.21a (Task 4; D9, D13).
//
// ⭐ BOTH routes are ADMIN routes composing the human-actor chain [requireAdminSession, scopeResolutionHook,
// requirePermissionHook] — enrolled in the claim-adjudication human-actor gate's COVERAGE_SET — and every
// path is a PLAIN STRING LITERAL (the gate fails a non-literal path).
// ⭐ Both gate at `dimension: 'district'` against the deceased member's SERVER-DERIVED posting district
// (6.18's exported `resolveNomineeNameCheckDistrict` stash — the client never submits it), read through a
// LOCAL closure (`districtFromStash` is a per-file closure, ⛔ not a shared helper).
//   · the REVIEW write — `claim.review_death_certificate` (D13, `district_admin`);
//   · the HISTORY read — `claim.verify`, reused (its holders already see the certificate and its OCR date).
// ⛔ No member or helpline surface here — those are Story 6.21b's.

import {
  DeathCertificateHistoryResponse,
  DeathCertificateReviewRequest,
  DeathCertificateReviewWriteResponse,
} from '@twt/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import {
  DEATH_CERTIFICATE_HISTORY_KEY,
  DEATH_CERTIFICATE_REVIEW_KEY,
  createDeathCertificateHandlers,
} from './claims.death-certificate.handlers.js';
import { resolveNomineeNameCheckDistrict } from './claims.nominee-name-check.routes.js';

const TAG = 'death-certificate';

const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();

export function registerDeathCertificateRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createDeathCertificateHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveNomineeNameCheckDistrict();
  const districtFromStash = (request: FastifyRequest): string | null => request.nomineeNameCheckDistrict ?? null;

  const requireReview = requirePermissionHook(deps, DEATH_CERTIFICATE_REVIEW_KEY, { dimension: 'district', resolveValue: districtFromStash });
  const requireHistory = requirePermissionHook(deps, DEATH_CERTIFICATE_HISTORY_KEY, { dimension: 'district', resolveValue: districtFromStash });

  // D1 / D4 — the District Admin ACCEPTS (typing the date) or REJECTS the current certificate.
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/death-certificate/review',
    {
      schema: {
        params: ClaimParam,
        body: DeathCertificateReviewRequest,
        response: { 201: DeathCertificateReviewWriteResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireReview],
    },
    h.postReview,
  );

  // D9 — EVERY upload with its reviews, the dates and notes decrypted, on demand.
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/death-certificate/history',
    {
      schema: { params: ClaimParam, response: { 200: DeathCertificateHistoryResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, requireHistory],
    },
    h.getHistory,
  );
}
