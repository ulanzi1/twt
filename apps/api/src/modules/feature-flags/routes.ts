// Feature-flag admin routes — Story 10.8 (Task 7). The committed FR-58C admin API surface.
//
// FOUR routes, all [requireAdminSession, scopeResolutionHook, requirePermissionHook(...)] gated (the
// 5.3 channel-config precedent). Unlike 10.7's reports module the permission key is STATIC per route,
// so it is a real preHandler rather than an in-handler check.
//
// ⚠ THE READ/WRITE KEY SPLIT IS THE POINT (Decision 7). The three reads carry `feature_flag.view`;
// only the flip carries `feature_flag.flip`. FR-58C makes inventory visibility deliberately BROADER
// than flip authority — "no secret flags" is a transparency property, flipping is a governance
// authority — so `auditor` holds the former and not the latter. If these ever collapse to one key,
// the transparency property goes with it.
//
// ── The GLOBAL catalog READ vs the GLOBAL FLIP: different boundaries, deliberately ────────────────
// `scopeResolutionHook` resolves the tenant from the `:pariwarId` PATH PARAM; a route without one
// cannot use it (it would read `''` and 404 with `pariwar.not_found`), so both global routes below
// take a global pre-handler chain instead of the per-Pariwar `readChain`/`writeChain`.
//
// The catalog READ is `requireGlobalOrAnyPariwarPermission`: a Pariwar Admin holding
// `feature_flag.view` in their own tenant can also view the cross-tenant catalog, per `prd.md:892`'s
// literal "visible to Pariwar Admin role and above" — the catalog's DATA does not vary by tenant (it
// is always the global tier resolved with no per-Pariwar override), so this is not a scope
// violation the way exposing another tenant's OVERRIDE row would be. Plain `requireGlobalPermission`
// cannot express "any of the actor's own pariwar-scoped grants" — see that hook's own header
// (`apps/api/src/modules/rbac/index.ts`) for why, and why this composes the existing pure
// `hasPermission` predicate rather than widening the RBAC scope-containment rule itself.
//
// The GLOBAL FLIP stays `requireGlobalPermission` — `super_admin` ONLY. A write that publishes one
// row governing EVERY Pariwar at once is a strictly higher-privilege action than viewing it (Decision
// 7's read/write key split applies at global scope too, not just per-Pariwar), and nothing about the
// AC4 visibility argument above extends to authoring it.

import {
  FeatureFlagFlipRequest,
  FeatureFlagFlipResponse,
  FeatureFlagInventoryResponse,
  FeatureFlagVersionsResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requireGlobalOrAnyPariwarPermission, requireGlobalPermission, requirePermissionHook } from '../rbac/index.js';
import { createFeatureFlagsHandlers } from './handlers.js';

const TAG = 'feature-flags';
const GLOBAL_BASE = '/api/v1/global/feature-flags';
const PARIWAR_BASE = '/api/v1/p/:pariwarId/feature-flags';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const FlagKeyParam = z.object({ pariwarId: z.string().uuid(), flagKey: z.string().min(1).max(128) }).strict();
const GlobalFlagKeyParam = z.object({ flagKey: z.string().min(1).max(128) }).strict();

export function registerFeatureFlagsRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createFeatureFlagsHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const canView = requirePermissionHook(deps, h.FEATURE_FLAG_VIEW_KEY);
  const canFlip = requirePermissionHook(deps, h.FEATURE_FLAG_FLIP_KEY);
  const readChain = [adminSession, scope, canView];
  const writeChain = [adminSession, scope, canFlip];

  // The GLOBAL catalog — every registered flag resolved against the cross-tenant tier. Complete: the
  // listing is registry-driven, so a never-flipped flag still appears (AC4). `pariwar_admin`+ (any
  // tenant) or `super_admin` — see the header.
  r.get(
    GLOBAL_BASE,
    {
      schema: { response: { 200: FeatureFlagInventoryResponse }, tags: [TAG] },
      preHandler: [adminSession, requireGlobalOrAnyPariwarPermission(deps, h.FEATURE_FLAG_VIEW_KEY)],
    },
    h.globalCatalog,
  );

  // THE GLOBAL FLIP — publishes a cross-tenant version (`pariwar_id: null`), the "one row governs
  // every Pariwar" tier the three-tier resolution names. `super_admin`-only: a write with this blast
  // radius is a strictly higher-privilege action than viewing the catalog (Decision 7's read/write
  // key split applies at global scope too, not just per-Pariwar).
  r.post(
    `${GLOBAL_BASE}/:flagKey/versions`,
    {
      schema: {
        params: GlobalFlagKeyParam,
        body: FeatureFlagFlipRequest,
        response: { 200: FeatureFlagFlipResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, requireGlobalPermission(deps, h.FEATURE_FLAG_FLIP_KEY)],
    },
    h.globalFlip,
  );

  // This tenant's EFFECTIVE inventory — override ≻ global ≻ default, with `source` provenance.
  r.get(
    PARIWAR_BASE,
    {
      schema: { params: PariwarParam, response: { 200: FeatureFlagInventoryResponse }, tags: [TAG] },
      preHandler: readChain,
    },
    h.pariwarInventory,
  );

  // A flag's persisted version history (version 1 is code data and is never listed).
  r.get(
    `${PARIWAR_BASE}/:flagKey/versions`,
    {
      schema: { params: FlagKeyParam, response: { 200: FeatureFlagVersionsResponse }, tags: [TAG] },
      preHandler: readChain,
    },
    h.versions,
  );

  // THE FLIP — creates a new immutable version + the §1.5 audit line. `feature_flag.flip` only.
  r.post(
    `${PARIWAR_BASE}/:flagKey/versions`,
    {
      schema: {
        params: FlagKeyParam,
        body: FeatureFlagFlipRequest,
        response: { 200: FeatureFlagFlipResponse },
        tags: [TAG],
      },
      preHandler: writeChain,
    },
    h.flip,
  );
}
