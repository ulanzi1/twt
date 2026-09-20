// The nominee NAME CHECK routes — Story 6.18 (AC1, AC2, AC3).
//
//   · GET  /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-name-check  — `claim.view_nominee_name_check`
//   · POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-name-check  — `claim.check_nominee_name`
//
// ⭐ TWO KEYS ON ONE PATH, and that is the design (AC1). `2026-09-19-226` cl.1 gives the helpline
// operator the DUTY to make sure the names match at filing — so four roles must SEE — while cl.3
// reserves the REVIEW of a mismatch to the District Admin, so one role may RECORD. Gating both verbs
// on one key would either let the filer clear their own work or blind them to the names they are
// accountable for.
//
// Both are checked at `dimension: 'district'` against the deceased member's SERVER-DERIVED posting
// district (the Story 6.10 stash precedent — the client NEVER submits the authz district).

import { claim, ids, member as memberDomain, rbac } from '@twt/domain';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  ClaimsUnderCorrectionResponse,
  NomineeNameCheckRequest,
  NomineeNameCheckResponse,
  NomineeNameCheckWriteResponse,
} from '@twt/contracts';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { loadActorGrants, requirePermissionHook } from '../rbac/index.js';
import {
  NOMINEE_NAME_CHECK_VIEW_KEY,
  NOMINEE_NAME_CHECK_WRITE_KEY,
  createNomineeNameCheckHandlers,
} from './claims.nominee-name-check.handlers.js';

const TAG = 'nominee-name-check';

/** The correction queue's page ceiling — mirrors the domain read's own cap. */
const CORRECTION_QUEUE_MAX_LIMIT = 200;

const NameCheckParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();

/**
 * PreHandler: derive the deceased member's latest posting district SERVER-SIDE and stash it so the
 * (synchronous) district `resolveValue` can read it — the client never submits the authz district.
 * Runs AFTER scope-resolution (needs `request.scopeTx`). A claim missing in this Pariwar stashes
 * `null` ⇒ the district gate fails closed to 403, so the boundary never leaks existence.
 */
function resolveNomineeNameCheckDistrict(): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    if (!scopeTx) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const { claimCaseId } = request.params as { claimCaseId: string };
    const claimRow = await claim.getClaimCase(
      scopeTx.tx,
      ids.pariwarId(scopeTx.pariwarId),
      ids.claimId(claimCaseId),
    );
    if (!claimRow) {
      request.nomineeNameCheckDistrict = null;
      return;
    }
    const posting = await memberDomain.getMemberPostingLatest(
      scopeTx.tx,
      ids.pariwarId(scopeTx.pariwarId),
      claimRow.deceasedMemberId,
    );
    request.nomineeNameCheckDistrict = posting?.district ?? null;
  };
}

/**
 * PreHandler for the LIST route: work out WHICH DIMENSION to gate this caller at, and at what value.
 *
 * ⚠⚠ IT IS ⛔ NOT A SELF-APPROVING CHECK, though it looks like one at a glance. The gate answers
 * *"does this actor hold `claim.view_nominee_name_check` anywhere in this Pariwar?"* — a real
 * question, which a role holding neither key fails. What it deliberately does NOT do is decide
 * WHICH claims they see; `getClaimsUnderCorrection` does that, per row, with `rbac.scopeContains`.
 * Splitting the two is the only honest way to gate a list whose rows span districts.
 *
 * ⚠⚠ AND THE DIMENSION MUST MOVE WITH THE CALLER — A FIXED `district` GATE REFUSES A PARIWAR ADMIN.
 * This was written first as "stash the caller's district, or `null` for a pariwar-ceiling holder",
 * on the reasoning that a pariwar grant contains every geo target so the gate would pass anyway.
 * ⛔ IT DOES NOT. `scopeContains` fails an UNRESOLVED target closed before it looks at the grant:
 *     `if (target.dimension !== 'global' && target.value == null) return false;`
 * — so a `null` district target is a 403 for EVERYONE, `pariwar_admin` and `super_admin` included.
 * Verified against the predicate itself, ⛔ not assumed ([[feedback_negative_claims_checkable_in_repo]]).
 * ⇒ a caller holding a district-scoped grant is gated at `district` against THAT district; a caller
 * whose narrowest reach is the Pariwar is gated at `pariwar` against the Pariwar id, which their
 * pariwar-dimension grant satisfies. A caller with neither has nothing to gate on and fails closed.
 */
function resolveQueueScopeStash(): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const grants = request.scopeGrants ?? (await loadActorGrants(scopeTx, actorId));
    request.scopeGrants = grants;
    const here = grants.filter((g) => g.pariwarId === scopeTx.pariwarId);
    const districtGrant = here.find((g) => g.scopeDimension === 'district' && g.scopeValue != null);
    if (districtGrant) {
      request.nomineeNameCheckQueueScope = { dimension: 'district', value: districtGrant.scopeValue };
      return;
    }
    const broadGrant = here.find((g) => g.scopeDimension === 'pariwar' || g.scopeDimension === 'global');
    request.nomineeNameCheckQueueScope = broadGrant
      ? { dimension: 'pariwar', value: scopeTx.pariwarId }
      : // ⛔ Nothing to gate on — `null` fails the permission check closed, which is the right answer
        // for a caller with no grant that reaches this Pariwar at all.
        { dimension: 'district', value: null };
  };
}

export function registerNomineeNameCheckRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createNomineeNameCheckHandlers(deps);
  const resolveQueueScope = resolveQueueScopeStash();
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveNomineeNameCheckDistrict();
  // The authz district is the server-derived stash — the client value is never trusted.
  const districtFromStash = (request: FastifyRequest): string | null =>
    request.nomineeNameCheckDistrict ?? null;
  const requireView = requirePermissionHook(deps, NOMINEE_NAME_CHECK_VIEW_KEY, {
    dimension: 'district',
    resolveValue: districtFromStash,
  });
  const requireCheck = requirePermissionHook(deps, NOMINEE_NAME_CHECK_WRITE_KEY, {
    dimension: 'district',
    resolveValue: districtFromStash,
  });

  // ── AC11 — the District Admin's CORRECTION QUEUE ───────────────────────────────
  //
  // ⚠⚠ REGISTERED BEFORE THE `:claimCaseId` ROUTES ON PURPOSE. Fastify's radix router prefers a
  // STATIC segment over a parametric one, so ordering is not what makes this correct — but the
  // `NameCheckParam` schema requires `claimCaseId` to be a UUID, so `under-correction` could
  // ⛔ never have been swallowed by the per-claim route in any case. Kept adjacent and commented so
  // the next person does not have to re-derive that.
  //
  // ⭐ ⛔ NO NEW KEY — the existing `claim.view_nominee_name_check` (AC1), which `district_admin`,
  // `verifier`, `pariwar_admin` and `helpline_operator` already hold. AC11's "⛔ no new route, ⛔ no
  // new key" governs the RESUBMISSION, which stays DERIVED: nothing here writes, and the District
  // Admin's fresh check remains the only act that clears a return.
  //
  // ⚠⚠ AND THE GATE IS DELIBERATELY AT `pariwar` DIMENSION WHILE THE ROWS ARE DISTRICT-FILTERED.
  // A list has no single district to gate on. Checking the key at the Pariwar proves the caller may
  // use this surface at all; `getClaimsUnderCorrection` then drops every row outside the caller's
  // own grant using `rbac.scopeContains`, the SAME predicate the per-claim gate uses.
  // ⛔ This does NOT widen anybody's reach: a `district`-scoped grant does not satisfy a `pariwar`
  // check ([[project_rbac_geo_scope_containment]] — containment runs ONE way), so the gate below
  // would refuse a district_admin outright. That is why it resolves the caller's OWN grant scope
  // instead of the Pariwar id — the check asks *"do you hold this key here?"*, and the row filter
  // asks *"and which of these claims are yours?"*.
  const requireQueueView = requirePermissionHook(deps, NOMINEE_NAME_CHECK_VIEW_KEY, {
    dimension: 'district',
    // ⚠ BOTH halves are resolved per request (the 6.17 ground-inspection shape) — see
    // `resolveQueueScopeStash`: a district-scoped caller is gated at their district, a
    // pariwar-ceiling caller at the Pariwar. `null` fails closed.
    resolveDimension: (request: FastifyRequest): rbac.ScopeDimension =>
      request.nomineeNameCheckQueueScope?.dimension ?? 'district',
    resolveValue: (request: FastifyRequest): string | null =>
      request.nomineeNameCheckQueueScope?.value ?? null,
  });

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/under-correction',
    {
      schema: {
        params: z.object({ pariwarId: z.string().uuid() }).strict(),
        // ⚠⚠ A BOUNDED `limit` IS ARCHITECTURALLY MANDATORY on any collection-returning GET
        // (AR forced-pagination, AC-3), and `forced-pagination.spec.ts` enforces it against the
        // emitted OpenAPI surface — it caught this route the moment it was added. An unbounded
        // admin list is an availability problem waiting for the first Pariwar with a long queue.
        querystring: z
          .object({ limit: z.coerce.number().int().min(1).max(CORRECTION_QUEUE_MAX_LIMIT).optional() })
          .strict(),
        response: { 200: ClaimsUnderCorrectionResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveQueueScope, requireQueueView],
    },
    h.getClaimsUnderCorrection,
  );

  // AC2 — the two names, side by side. READ-ONLY, audited, human-actor-only.
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-name-check',
    {
      schema: {
        params: NameCheckParam,
        response: { 200: NomineeNameCheckResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireView],
    },
    h.getNomineeNameCheck,
  );

  // AC3 — the District Admin records the verdict.
  // ⭐ BOTH keys are required on the write: `requireView` runs first because recording a judgement
  // about two names you may not look at would be incoherent, and `-226` cl.5 forbids proceeding
  // without a selected reason — a rule that only means something to someone who has SEEN the names.
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-name-check',
    {
      schema: {
        params: NameCheckParam,
        body: NomineeNameCheckRequest,
        response: { 201: NomineeNameCheckWriteResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireView, requireCheck],
    },
    h.postNomineeNameCheck,
  );
}
