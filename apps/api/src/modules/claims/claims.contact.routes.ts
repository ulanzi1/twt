// The claim CONTACT RECORD — the ADMIN routes (Story 6.19a, Task 2; AC1, AC8a). The family's own write lives in
// `claims.routes.ts` (a member route, NON_ADJUDICATION in the human-actor gate).
//
//   · POST …/admin/claims/:claimCaseId/contact          — the helpline's write. `claim.file` + the operator's
//     OWN fresh admin step-up: the DPDPA helpline precedent (`claims.helpline.routes.ts`). ⭐ Why `claim.file`
//     still fits after intake: in the extra states the helpline only COMPLETES the filing (W5, add-only) —
//     the 6.8/6.9 precedent keeps `claim.file` for intake (`roles.ts`: *"CLAIM_FILE itself stays — it still
//     gates the intake route"*). Recorded in `2026-09-28-265` §2.
//   · GET  …/admin/claims/:claimCaseId/contact          — PRESENCE only, `claim.view_nominee_name_check` at the
//     deceased member's SERVER-DERIVED district (the 6.18 stash, `resolveNomineeNameCheckDistrict`); all four
//     holders. ⛔ No plaintext: that key's rationale forbids acquiring a second living subject's plaintext
//     *"as a side effect"* (`permissions.ts`).
//   · GET  …/admin/claims/:claimCaseId/contact/details  — the PLAINTEXT read-back, `claim.file` (the helpline
//     operator, the one role that re-types these fields); decrypted and audited per read.
// Every route composes the authenticated-HUMAN chain [adminSession, scope, requirePermissionHook(…)] — enrolled
// in `scripts/claim-adjudication-human-actor-invariant/check.ts`'s COVERAGE_SET.

import {
  ClaimContactDetailsResponse,
  ClaimContactPresenceResponse,
  RecordHelplineClaimContactRequest,
  RecordHelplineClaimContactResponse,
} from '@twt/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createClaimContactHandlers } from './claims.contact.handlers.js';
import { NOMINEE_NAME_CHECK_VIEW_KEY } from './claims.nominee-name-check.handlers.js';
import { resolveNomineeNameCheckDistrict } from './claims.nominee-name-check.routes.js';

const TAG = 'claim-contact';
const CLAIM_FILE_KEY = 'claim.file';
const CLAIM_FILE_STEP_UP_CONTEXT = 'claim_file';

const ContactParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();

export function registerClaimContactRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createClaimContactHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const canFileClaim = requirePermissionHook(deps, CLAIM_FILE_KEY);
  const stepUp = requireStepUp(deps, CLAIM_FILE_STEP_UP_CONTEXT);
  const resolveDistrict = resolveNomineeNameCheckDistrict();
  const requirePresenceView = requirePermissionHook(deps, NOMINEE_NAME_CHECK_VIEW_KEY, {
    dimension: 'district',
    // The authz district is the server-derived stash — the client value is never trusted.
    resolveValue: (request: FastifyRequest): string | null => request.nomineeNameCheckDistrict ?? null,
  });

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/contact',
    {
      schema: {
        params: ContactParam,
        body: RecordHelplineClaimContactRequest,
        response: { 201: RecordHelplineClaimContactResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, canFileClaim, stepUp],
    },
    h.recordHelpline,
  );

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/contact',
    {
      schema: { params: ContactParam, response: { 200: ClaimContactPresenceResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, requirePresenceView],
    },
    h.getPresence,
  );

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/contact/details',
    {
      schema: { params: ContactParam, response: { 200: ClaimContactDetailsResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canFileClaim],
    },
    h.getDetails,
  );
}
