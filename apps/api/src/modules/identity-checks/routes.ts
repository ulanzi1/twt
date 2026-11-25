// Staff check a TYPED-IN identity while the member is alive — Story 3.13 (Task 3.4; DL6, DL6a, DL11, DL13; AC8, AC8a, AC12).
//
// ⭐ FOUR ADMIN routes, each with a PLAIN STRING-LITERAL path and the human-actor chain INLINED as a literal array
// `[requireAdminSession, scopeResolutionHook, <scope stash>, requirePermissionHook]` (the member-moderation style).
// ⚠ ⛔ CI gate scans this module: `scripts/claim-adjudication-human-actor-invariant` reconciles only
// `apps/api/src/modules/claims/*.routes.ts` (F7b). A missing `requireAdminSession` here would ship green — the per-route
// chain tests in `tests/integration/identity-checks/` are the ONLY guard (Trap 12).
//
// ⭐ THE GATE'S DIMENSION MOVES WITH THE CALLER (DL6, F7a — `scopeContains` refuses a null target for EVERYONE, so a fixed
// `district` gate would refuse even a Pariwar Admin for a member with no posting). `resolveIdentityCheckScope` asks each of
// the caller's own grants, alone, whether it holds the route's key at its own scope (the 6.18 `resolveQueueScopeStash`
// shape, copied per file): a pariwar-or-broader grant ⇒ `pariwar` against the Pariwar id; else a district grant ⇒
// `district` against the MEMBER's server-derived CURRENT posting district (per-member routes — `getMemberCurrentDistrict`
// as of `deps.clock()`) or the caller's OWN district (the queue). ⛔ A client-supplied district or dimension is read.

import {
  IdentityCheckDetailResponse,
  IdentityCheckMobileResponse,
  IdentityCheckQueueQuery,
  IdentityCheckQueueResponse,
  IdentityCheckRecordRequest,
  IdentityCheckRecordResponse,
} from '@twt/contracts';
import { ids, memberGeo, rbac } from '@twt/domain';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { loadActorGrants, requirePermissionHook } from '../rbac/index.js';
import { REVEAL_MOBILE_KEY, VALIDATE_IDENTITY_KEY, createIdentityCheckHandlers } from './handlers.js';

const TAG = 'identity-checks';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const MemberParam = z.object({ pariwarId: z.string().uuid(), memberId: z.string().uuid() }).strict();

/**
 * Stash the scope this caller is gated at for `key` (see the header). `mode: 'member'` resolves a district caller against the
 * member's current posting district; `mode: 'queue'` against the caller's own. `null` fails the permission check closed.
 */
export function resolveIdentityCheckScope(deps: AppDeps, key: string, mode: 'member' | 'queue'): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const grants = request.scopeGrants ?? (await loadActorGrants(scopeTx, actorId));
    request.scopeGrants = grants;
    // ⚠ ONLY grants whose role carries the key, each asked ALONE at its own scope (the 6.18 code-review lesson: a key-less
    // grant must never choose the gate target).
    const here = grants.filter(
      (g) =>
        g.pariwarId === scopeTx.pariwarId &&
        rbac.hasPermission([g], key, { dimension: g.scopeDimension, value: g.scopeValue, pariwarId: g.pariwarId }),
    );
    if (here.some((g) => g.scopeDimension === 'pariwar' || g.scopeDimension === 'global')) {
      request.identityCheckScope = { dimension: 'pariwar', value: scopeTx.pariwarId };
      return;
    }
    const districtGrant = here.find((g) => g.scopeDimension === 'district' && g.scopeValue != null);
    if (!districtGrant) {
      request.identityCheckScope = { dimension: 'district', value: null };
      return;
    }
    if (mode === 'queue') {
      request.identityCheckScope = { dimension: 'district', value: districtGrant.scopeValue };
      return;
    }
    const { memberId } = request.params as { memberId: string };
    const district = await memberGeo.getMemberCurrentDistrict(
      scopeTx.tx,
      ids.pariwarId(scopeTx.pariwarId),
      ids.memberId(memberId),
      deps.clock(),
    );
    request.identityCheckScope = { dimension: 'district', value: district };
  };
}

export function registerIdentityCheckRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createIdentityCheckHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const limits = namedRateLimits(deps);
  const gate = (key: string) =>
    requirePermissionHook(deps, key, {
      dimension: 'district',
      resolveDimension: (request: FastifyRequest): rbac.ScopeDimension => request.identityCheckScope?.dimension ?? 'district',
      resolveValue: (request: FastifyRequest): string | null => request.identityCheckScope?.value ?? null,
    });

  // DL11 — the QUEUE (FR-2's trustee-action queue). ⛔ PII. Readable with the REVEAL key (every holder of the check key holds
  // it too) so a verifier or helpline operator can find the member. A BOUNDED `limit` (forced pagination).
  r.get(
    '/api/v1/p/:pariwarId/admin/members/identity-checks',
    {
      schema: { params: PariwarParam, querystring: IdentityCheckQueueQuery, response: { 200: IdentityCheckQueueResponse }, tags: [TAG] },
      config: { rateLimit: limits.read },
      preHandler: [
        requireAdminSession(deps),
        scopeResolutionHook(deps),
        resolveIdentityCheckScope(deps, REVEAL_MOBILE_KEY, 'queue'),
        gate(REVEAL_MOBILE_KEY),
      ],
    },
    h.getQueue,
  );

  // DL8 — the DETAIL: the typed-in name, date of birth and photo (one audited view), the masked mobile, the history.
  r.get(
    '/api/v1/p/:pariwarId/admin/members/:memberId/identity-check',
    {
      schema: { params: MemberParam, response: { 200: IdentityCheckDetailResponse }, tags: [TAG] },
      config: { rateLimit: limits.read },
      preHandler: [
        requireAdminSession(deps),
        scopeResolutionHook(deps),
        resolveIdentityCheckScope(deps, VALIDATE_IDENTITY_KEY, 'member'),
        gate(VALIDATE_IDENTITY_KEY),
      ],
    },
    h.getDetail,
  );

  // DL1–DL3 — RECORD the act (confirmed / not confirmed). `Idempotency-Key` required.
  r.post(
    '/api/v1/p/:pariwarId/admin/members/:memberId/identity-check',
    {
      schema: {
        params: MemberParam,
        body: IdentityCheckRecordRequest,
        response: { 200: IdentityCheckRecordResponse, 201: IdentityCheckRecordResponse },
        tags: [TAG],
      },
      config: { rateLimit: limits.write },
      preHandler: [
        requireAdminSession(deps),
        scopeResolutionHook(deps),
        resolveIdentityCheckScope(deps, VALIDATE_IDENTITY_KEY, 'member'),
        gate(VALIDATE_IDENTITY_KEY),
      ],
    },
    h.postRecord,
  );

  // DL6a — the member's FULL number, ONE audited press (`-502` Q3 B). ⛔ Idempotency-Key: every press is its own showing.
  r.post(
    '/api/v1/p/:pariwarId/admin/members/:memberId/identity-check/mobile',
    {
      schema: { params: MemberParam, response: { 200: IdentityCheckMobileResponse }, tags: [TAG] },
      config: { rateLimit: limits.write },
      preHandler: [
        requireAdminSession(deps),
        scopeResolutionHook(deps),
        resolveIdentityCheckScope(deps, REVEAL_MOBILE_KEY, 'member'),
        gate(REVEAL_MOBILE_KEY),
      ],
    },
    h.postRevealMobile,
  );
}
