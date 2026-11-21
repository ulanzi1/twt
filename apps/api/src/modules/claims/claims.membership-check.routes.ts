// The staff MEMBERSHIP CHECK before any drive, on the District Admin's console — Story 6.39 (Task 3.5; DL7, DL10).
//
// ⭐ BOTH routes are ADMIN routes composing the human-actor chain [requireAdminSession, scopeResolutionHook,
// requirePermissionHook] — enrolled in the claim-adjudication human-actor gate's COVERAGE_SET — and every path is a
// PLAIN STRING LITERAL (the gate fails a non-literal path).
// ⭐ Both gate on ONE key, `claim.check_membership` (DL7, `district_admin`), at `dimension: 'district'` against the
// deceased member's SERVER-DERIVED posting district (6.18's exported `resolveNomineeNameCheckDistrict` stash — the
// client never submits it), read through a LOCAL closure (`districtFromStash` is a per-file closure, ⛔ a shared helper).
// The preview read opens the certificate's date of death, so it needs the same key as the write.

import { MembershipCheckPreviewResponse, MembershipCheckRequest, MembershipCheckWriteResponse } from '@twt/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { MEMBERSHIP_CHECK_KEY, createMembershipCheckHandlers } from './claims.membership-check.handlers.js';
import { resolveNomineeNameCheckDistrict } from './claims.nominee-name-check.routes.js';

const TAG = 'membership-check';

const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();

export function registerMembershipCheckRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMembershipCheckHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveNomineeNameCheckDistrict();
  const districtFromStash = (request: FastifyRequest): string | null => request.nomineeNameCheckDistrict ?? null;

  const requireCheck = requirePermissionHook(deps, MEMBERSHIP_CHECK_KEY, { dimension: 'district', resolveValue: districtFromStash });

  // DL10 — the preview: both dates, the comparison, the identity trigger, the KYC route, the posting, the live check.
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/membership-check',
    {
      schema: { params: ClaimParam, response: { 200: MembershipCheckPreviewResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, requireCheck],
    },
    h.getPreview,
  );

  // DL2 / DL8 — the District Admin RECORDS the check (the server computes the fee comparison; they judge the identity).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/membership-check',
    {
      schema: {
        params: ClaimParam,
        body: MembershipCheckRequest,
        response: { 201: MembershipCheckWriteResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireCheck],
    },
    h.postCheck,
  );
}
