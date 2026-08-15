// Story 10.21 — off-portal DPDPA data-rights fulfilment ROUTES (AC3/AC-R1/AC-R2).
//
// ⛔ EVERY route here sits behind the FULL four-hook chain, and each hook is load-bearing:
//   requireAdminSession   — a staff session (this is an admin surface; the subject has no session)
//   scopeResolutionHook   — resolves the tenant scope tx the handlers write under (RLS)
//   requirePermissionHook — `member.data_rights` at `dimension: 'pariwar'`. ⛔ NOT `helpdesk.create`:
//                           filing a request and EXECUTING it on a member with no session are
//                           different authorities, which is the whole reason the key was minted.
//   requireStepUp         — a DISTINCT step-up context, so no other elevation satisfies it and this
//                           elevation satisfies nothing else.
// (The MEMBER redemption route is the one deliberate exception — see its own comment below.)
//
// ⚠ THE STEP-UP CONTEXT IS AN UNGUARDED STRING. `requireStepUp` compares a bare string by equality and
// the contract has no allow-list, so distinctness holds by string inequality alone. Both this route AND
// the admin client's OTP-request call import `DATA_RIGHTS_STEP_UP_CONTEXT` — ⛔ never a literal. A typo
// here fails closed (tolerable); a typo on the OTP side yields an elevation that can NEVER satisfy this
// gate, with nothing anywhere naming the cause.
//
// ⭐ DELIVERY (AC-R1) AND CORRECTION (AC-R2) ARE BUILT below. ⛔ NO trustee-authority destination —
// AC-R3 is CLOSED BY RULING, not open: `2026-08-14-109` clause 7 ruled that no DPDPA action inherently
// requires Trustee Panel authority, so AC-R3 closed with a recorded disposition and NO code changes.

import {
  ActiveDataRightsExportResponse,
  DATA_RIGHTS_STEP_UP_CONTEXT,
  DeliveryRedeemRequest,
  MemberDirectDeliveryRequest,
  MemberDirectDeliveryResponse,
  OffPortalErasureRequest,
  OffPortalErasureResponse,
  OffPortalExportRequest,
  OffPortalExportResponse,
  RecordCorrectionRequest,
  RecordCorrectionResponse,
  StaffMediatedDeliveryRequest,
  StaffMediatedDeliveryResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { requirePermissionHook } from '../rbac/index.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createMemberDataRightsHandlers } from './handlers.js';

const MEMBER_DATA_RIGHTS_TAG = 'member-data-rights';

/** The `member.data_rights` catalog key (v33), checked at the `pariwar` dimension. */
const MEMBER_DATA_RIGHTS_KEY = 'member.data_rights';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerMemberDataRightsRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberDataRightsHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const limits = namedRateLimits(deps);
  const requireDataRights = requirePermissionHook(deps, MEMBER_DATA_RIGHTS_KEY, { dimension: 'pariwar' });
  const stepUp = requireStepUp(deps, DATA_RIGHTS_STEP_UP_CONTEXT);

  // BUILD the access/portability artifact off-session. ⛔ Builds only — there is no download here.
  r.post(
    '/api/v1/p/:pariwarId/member-data-rights/export',
    {
      schema: {
        params: PariwarParam,
        body: OffPortalExportRequest,
        response: { 200: OffPortalExportResponse },
        tags: [MEMBER_DATA_RIGHTS_TAG],
      },
      config: { rateLimit: limits.write },
      preHandler: [adminSession, scope, requireDataRights, stepUp],
    },
    h.requestExport,
  );

  // The member's currently-active export, or `null` — a READ (code-review addition, this story). Lets
  // the operator surface recover `builtExportId` across a reload instead of relying solely on
  // in-memory `useMutation` state.
  r.get(
    '/api/v1/p/:pariwarId/member-data-rights/export/active',
    {
      schema: {
        params: PariwarParam,
        querystring: z.object({ member_id: z.string().uuid() }).strict(),
        response: { 200: ActiveDataRightsExportResponse },
        tags: [MEMBER_DATA_RIGHTS_TAG],
      },
      config: { rateLimit: limits.read },
      preHandler: [adminSession, scope, requireDataRights, stepUp],
    },
    h.getActiveExport,
  );

  // EXECUTE erasure off-session. ⛔ IRREVERSIBLE — see the handler's advisory lock and the
  // `Idempotency-Key` requirement.
  r.post(
    '/api/v1/p/:pariwarId/member-data-rights/erasure',
    {
      schema: {
        params: PariwarParam,
        body: OffPortalErasureRequest,
        response: { 200: OffPortalErasureResponse },
        tags: [MEMBER_DATA_RIGHTS_TAG],
      },
      config: { rateLimit: limits.write },
      preHandler: [adminSession, scope, requireDataRights, stepUp],
    },
    h.fulfilErasure,
  );

  // ── AC-R1 — DELIVERY. ⛔ A PRIMARY and a NARROW EXCEPTION, never two co-equal routes. ────────────

  // PRIMARY — member-direct. Issues a one-time OTP grant to the registered mobile.
  r.post(
    '/api/v1/p/:pariwarId/member-data-rights/delivery/member-direct',
    {
      schema: {
        params: PariwarParam,
        body: MemberDirectDeliveryRequest,
        response: { 200: MemberDirectDeliveryResponse },
        tags: [MEMBER_DATA_RIGHTS_TAG],
      },
      config: { rateLimit: limits.write },
      preHandler: [adminSession, scope, requireDataRights, stepUp],
    },
    h.grantMemberDirectDelivery,
  );

  // FALLBACK — staff-mediated, behind the THREE-PART GATE. ⛔ Element 2
  // (`primary_delivery_not_completed`) is SERVER-OBSERVED and is never accepted from the caller.
  r.post(
    '/api/v1/p/:pariwarId/member-data-rights/delivery/staff-mediated',
    {
      schema: {
        params: PariwarParam,
        body: StaffMediatedDeliveryRequest,
        response: { 200: StaffMediatedDeliveryResponse },
        tags: [MEMBER_DATA_RIGHTS_TAG],
      },
      config: { rateLimit: limits.write },
      preHandler: [adminSession, scope, requireDataRights, stepUp],
    },
    h.grantStaffMediatedDelivery,
  );

  // ── AC-R2 — the RECORDED correction process. ⛔ A record, not a member-profile write path. ───────
  r.post(
    '/api/v1/p/:pariwarId/member-data-rights/correction',
    {
      schema: {
        params: PariwarParam,
        body: RecordCorrectionRequest,
        response: { 200: RecordCorrectionResponse },
        tags: [MEMBER_DATA_RIGHTS_TAG],
      },
      config: { rateLimit: limits.write },
      preHandler: [adminSession, scope, requireDataRights, stepUp],
    },
    h.recordCorrection,
  );

  // ── The MEMBER redemption. ⛔ DELIBERATELY UNAUTHENTICATED, and deliberately NOT on the admin
  // chain above: the subject is a terminated member with no session, and issuing one is precisely what
  // Niyamavali §8.4 forecloses. Two secrets are required (the unguessable grant id AND the OTP), every
  // failure returns the SAME 404 so it is not an existence oracle. ⛔ Do not "fix" this by adding a
  // session guard — that would delete the route's whole purpose.
  // ⚠ RATE LIMIT: `limits.write` (code-review correction — this route WAS on `limits.read`, which is
  // the LOOSER of the two named tiers and backwards for an endpoint that verifies a short OTP code
  // against an unauthenticated caller and, on a match, returns the member's decrypted PII dossier.
  // `write` is also the more accurate classification on its own terms: this route mutates state (it
  // burns the grant via `consumeGrant`). Independent of the tier, `otpService.verifyOtp` already caps
  // GUESSES per code at `OTP_MAX_ATTEMPTS` (the grant id itself is an unguessable UUID) — this bump is
  // defense-in-depth against generic per-IP abuse, not the primary brute-force control.
  r.post(
    '/api/v1/member-data-rights/delivery/:grantId/redeem',
    {
      schema: {
        params: z.object({ grantId: z.string().uuid() }).strict(),
        body: DeliveryRedeemRequest,
        tags: [MEMBER_DATA_RIGHTS_TAG],
      },
      config: { rateLimit: limits.write },
    },
    h.redeemDelivery,
  );
}
