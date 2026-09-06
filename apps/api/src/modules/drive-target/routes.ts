// Per-Pariwar DRIVE TARGET admin routes — Story 11b.13 (Task 4; AC2, AC3, AC5).
//
// FOUR routes under TWO DIFFERENT GATES, and the split is visible right here in the route table —
// which is the point. `2026-09-04-190` cl.7 separates SETTING the target (cl.7(a), the Pariwar
// Admin) from REVEALING it (cl.7(c), the Super Admin); Decision `2026-09-06-203` made that split
// structural in the CATALOG (D1, two keys) and in the SUBSTRATE (D2, two records). ⇒ ⛔ it must not
// be re-merged at the transport layer.
//
//   GET  /admin/drive-target             → pariwar.manage_drive_target            (pariwar_admin +)
//   PUT  /admin/drive-target             → pariwar.manage_drive_target
//   GET  /admin/drive-target/visibility  → pariwar.manage_drive_target_visibility (⛔ super_admin)
//   PUT  /admin/drive-target/visibility  → pariwar.manage_drive_target_visibility (⛔ super_admin)
//
// ⭐⭐ AC5's *"the reveal switches are visible ⛔ only to a `super_admin`"* is satisfied by a **403
// on a separate resource**, ⛔ NEVER by one endpoint shaping its response two ways. A handler that
// returned the flags *"when the caller also holds the reveal key"* would put an authority boundary
// INSIDE A HANDLER — the exact shape Trap 2 rejects and the reason D1 minted two keys instead of
// one-key-plus-a-role-check. ⛔ Do not "save a round trip" by merging the two GETs.
//
// The scoped admin chain [requireAdminSession, scopeResolutionHook, requirePermissionHook(key)] —
// the `nominee-bank-masking` precedent. Scope-resolution sets request.scopeTx + request.scopeGrants;
// the permission hook fail-closes on deny — 401 no session, 403 no permission, ⛔ never a silent
// no-op and ⛔ never a 200. All four register in openapi/v1.yaml (the EXPECTED diff for this story).
//
// ⛔ The chain is the ONLY permission boundary that matters here. The admin console deliberately
// carries NO client-side capability check: both keys are PARIWAR-dimension grants and never appear
// in an admin session's `nationalGrants`, so a client-side gate modelled on the global-scope pattern
// would deny every operator including `super_admin`.
//
// ⛔⛔ AND THE HOLDERS ARE A RULING, ⛔ NOT AN AUTHORING CHOICE. `2026-09-04-190` cl.7(a)/(c)
// (Trustee Panel — Dhiraj Rahul + Kalpana Bharti). ⚠ Note what is DIFFERENT from the neighbouring
// `nominee-bank-masking` module, so a reader does not mis-file it: THERE `pariwar_admin` is
// FORECLOSED, because that control governs DISCLOSURE. HERE `pariwar_admin` holds the write key
// because **SETTING the target discloses NOTHING** (cl.7(b) hides the figure from everyone) — while
// the REVEAL half stays `super_admin`-only, exactly matching the masking key's shape. ⛔ That
// foreclosure is untouched by this module; see `2026-09-06-203` cl.3.

import {
  DriveTargetResponse,
  DriveTargetVisibilityResponse,
  SetDriveTargetRequest,
  SetDriveTargetVisibilityRequest,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createDriveTargetHandlers } from './handlers.js';

const DRIVE_TARGET_TAG = 'drive-target';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerDriveTargetRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createDriveTargetHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);

  // ⭐⭐ TWO CHAINS, DIFFERING ONLY IN THE KEY. That single difference is the whole authority split,
  // and keeping the two chains as separate values (rather than one chain with a conditional key)
  // is what makes it readable at every route registration below.
  const targetChain = [adminSession, scope, requirePermissionHook(deps, h.MANAGE_DRIVE_TARGET_KEY)];
  const revealChain = [
    adminSession,
    scope,
    requirePermissionHook(deps, h.MANAGE_DRIVE_TARGET_VISIBILITY_KEY),
  ];

  r.get(
    '/api/v1/p/:pariwarId/admin/drive-target',
    {
      schema: {
        params: PariwarParam,
        response: { 200: DriveTargetResponse },
        tags: [DRIVE_TARGET_TAG],
      },
      preHandler: targetChain,
    },
    h.getTarget,
  );

  // ⭐ The `body` schema is the 400 boundary a blank rationale — or a non-integer, zero, negative or
  // absurd target — hits. ⚠ It is ⛔ NOT merely a convenience here: `0` in particular must be
  // refused, because Story 11b.14's meter divides by this figure and a ₹0 target is a division by
  // zero. `.positive()`, ⛔ never `.nonnegative()`.
  // ⛔ AND THE BODY CARRIES NEITHER A DISPLAY NAME NOR AN `effectiveFrom`: the first is resolved
  // server-side (a browser-supplied one would let an operator lie about who made the change), the
  // second is the server's instant (a caller-supplied one would let an operator BACK-DATE a
  // window). `.strict()` makes both unrepresentable on the wire rather than merely unused.
  // ⭐⭐ IT DOES carry `expectedVersion`, REQUIRED and nullable — `2026-09-05-201` cl.4.
  r.put(
    '/api/v1/p/:pariwarId/admin/drive-target',
    {
      schema: {
        params: PariwarParam,
        body: SetDriveTargetRequest,
        response: { 200: DriveTargetResponse },
        tags: [DRIVE_TARGET_TAG],
      },
      preHandler: targetChain,
    },
    h.setTarget,
  );

  // ⛔⛔ THE REVEAL RESOURCE — `super_admin` ONLY. A `pariwar_admin` reaching either of the two
  // routes below gets a 403 from `requirePermissionHook`, which is AC3's regression guard AT THE
  // WIRE: the write key must ⛔ never quietly carry the reveal.
  r.get(
    '/api/v1/p/:pariwarId/admin/drive-target/visibility',
    {
      schema: {
        params: PariwarParam,
        response: { 200: DriveTargetVisibilityResponse },
        tags: [DRIVE_TARGET_TAG],
      },
      preHandler: revealChain,
    },
    h.getVisibility,
  );

  r.put(
    '/api/v1/p/:pariwarId/admin/drive-target/visibility',
    {
      schema: {
        params: PariwarParam,
        body: SetDriveTargetVisibilityRequest,
        response: { 200: DriveTargetVisibilityResponse },
        tags: [DRIVE_TARGET_TAG],
      },
      preHandler: revealChain,
    },
    h.setVisibility,
  );
}
