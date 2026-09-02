// Nominee-bank masking-schedule admin routes — Story 11b.3a (Task 5; AC5, AC6).
//
// The scoped admin chain [requireAdminSession, scopeResolutionHook, requirePermissionHook(
// pariwar.manage_nominee_bank_masking)] — the `directory-publication` precedent. Scope-resolution
// sets request.scopeTx + request.scopeGrants; the permission hook fail-closes on deny — 401 no
// session, 403 no permission, ⛔ never a silent no-op and ⛔ never a 200. Both routes register in
// openapi/v1.yaml (the EXPECTED diff for this story).
//
// ⛔ The chain is the ONLY permission boundary that matters here. The admin console deliberately
// carries NO client-side capability check: `pariwar.manage_nominee_bank_masking` is a
// PARIWAR-dimension grant and never appears in an admin session's `nationalGrants`, so a client-side
// gate modelled on the global-scope pattern would deny every operator including `super_admin`.
//
// ⛔⛔ AND THE HOLDER IS A RULING, ⛔ NOT AN AUTHORING CHOICE. `2026-09-02-178` (Trustee Panel) ruled
// `2026-08-28-160` cl.10(b)'s *"Trust-Admin controlled, per Pariwar"* speaks to AUTHORITY and means
// the **TRUST** — per-Pariwar in SCOPE, central in AUTHORITY, following `2026-08-19-136` cl.3's
// two-axis separation. ⛔ `pariwar_admin` is FORECLOSED; granting it "for symmetry" with the
// neighbouring pariwar-dimension content keys would reverse a ratified ruling by way of a catalog
// edit. ⛔ `district_admin` / `state_trustee` are excluded and INERT in both directions.

import { NomineeBankMaskingScheduleResponse, SetNomineeBankMaskingRequest } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createNomineeBankMaskingHandlers } from './handlers.js';

const NOMINEE_BANK_MASKING_TAG = 'nominee-bank-masking';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerNomineeBankMaskingRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createNomineeBankMaskingHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const manageNomineeBankMasking = requirePermissionHook(deps, h.MANAGE_NOMINEE_BANK_MASKING_KEY);
  const chain = [adminSession, scope, manageNomineeBankMasking];

  r.get(
    '/api/v1/p/:pariwarId/admin/nominee-bank-masking/schedule',
    {
      schema: {
        params: PariwarParam,
        response: { 200: NomineeBankMaskingScheduleResponse },
        tags: [NOMINEE_BANK_MASKING_TAG],
      },
      preHandler: chain,
    },
    h.getSchedule,
  );

  // ⭐ The `body` schema is the 400 boundary an empty rationale — or a day count outside 0…MAX —
  // hits. It is NOT a convenience: without it the request reaches the domain's
  // `UngovernedNomineeBankMaskingChangeError`, which is unregistered in the error-mapping registry
  // and would surface as an opaque 500 on a plain input error.
  // ⛔ AND THE BODY CARRIES NEITHER A DISPLAY NAME NOR AN `effectiveFrom`: the first is resolved
  // server-side (a browser-supplied one would let an operator lie about who made the change), the
  // second is the server's instant (a caller-supplied one would let an operator BACK-DATE a window,
  // retroactively re-characterising what the public could see and when). `.strict()` makes both
  // unrepresentable on the wire rather than merely unused.
  r.put(
    '/api/v1/p/:pariwarId/admin/nominee-bank-masking/schedule',
    {
      schema: {
        params: PariwarParam,
        body: SetNomineeBankMaskingRequest,
        response: { 200: NomineeBankMaskingScheduleResponse },
        tags: [NOMINEE_BANK_MASKING_TAG],
      },
      preHandler: chain,
    },
    h.setSchedule,
  );
}
