// Fixed-amount schedule admin routes — Story 7.5 (Task 4; AC1/AC3/AC4).
//
// THREE scope-gated admin routes — the FR-15 fixed-amount schedule surface:
//   · GET  …/admin/pool-fixed-amount           → the current schedule + effective amount (AC1)
//   · POST …/admin/pool-fixed-amount/schedule  → a STANDARD (12-month-notice) change (AC1)
//   · POST …/admin/pool-fixed-amount/emergency → an EMERGENCY adjustment override (AC3/AC4)
//
// The route IS the security control: an authenticated HUMAN admin session + the fixed-amount WRITE
// key at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the cycle.freeze / claim.r9_vote
// pariwar-wide precedent; the fixed amount is a Pariwar-wide policy) + tenant match — fail-closed,
// audited. v1 actor = pariwar_admin-as-Trustee-Lite; direct state_trustee gating DEFERRED to the
// Epic-3 geo-tree resolver (see permissions.ts).
//
// ── The emergency route is ADDITIONALLY step-up-gated (D3) ─────────────────────
// The emergency override requires a FRESH ~5-min elevation bound to `pool_fixed_amount_emergency`
// (requireStepUp) — added AFTER the permission hook so an unauthorized actor never reaches step-up
// (the R9-finalize / cycle-freeze-commit precedent). This is the governance posture EQUIVALENT to
// R9 — step-up, recorded trustee attestation, auditability — WITHOUT the R9 voting lifecycle (no
// session/vote/quorum). Do NOT reuse the R9 voting subsystem here.

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  PoolFixedAmountEmergencyRequest,
  PoolFixedAmountEmergencyResponse,
  PoolFixedAmountScheduleRequest,
  PoolFixedAmountScheduleResponse,
  PoolFixedAmountView,
} from '@twt/contracts';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createPoolFixedAmountHandlers } from './handlers.js';

const TAG = 'pool-fixed-amount';

/** Story 7.5 — the pariwar-dimension standard-change key (catalog 19→21). */
const FIXED_AMOUNT_SET_KEY = 'pool.fixed_amount_set';
/** Story 7.5 — the pariwar-dimension emergency-override key. */
const FIXED_AMOUNT_EMERGENCY_KEY = 'pool.fixed_amount_emergency';
/** The step-up action context for the emergency override (free-form string — no registry to extend). */
const EMERGENCY_STEP_UP_CONTEXT = 'pool_fixed_amount_emergency';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerPoolFixedAmountModule(app: FastifyInstance, deps: AppDeps): void {
  const h = createPoolFixedAmountHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  // Both keys at dimension:'pariwar' (EXPLICIT — the target IS the tenant; resolveValue defaults to
  // scopeTx.pariwarId, the cycle.freeze pariwar-wide precedent). Each route inlines the
  // [adminSession, scope, require…] human-actor chain explicitly (the human-actor CI gate scans the
  // preHandler array statically — a shared/spread variable is opaque to it; the 6.13/6.14 pattern).
  const requireSet = requirePermissionHook(deps, FIXED_AMOUNT_SET_KEY, { dimension: 'pariwar' });
  const requireEmergency = requirePermissionHook(deps, FIXED_AMOUNT_EMERGENCY_KEY, { dimension: 'pariwar' });

  // AC1 — the current schedule + effective amount.
  r.get(
    '/api/v1/p/:pariwarId/admin/pool-fixed-amount',
    {
      schema: { params: PariwarParam, response: { 200: PoolFixedAmountView }, tags: [TAG] },
      preHandler: [adminSession, scope, requireSet],
    },
    h.getView,
  );

  // AC1 — a STANDARD (12-month-notice) change. The server re-checks the +365d floor (DB-authoritative).
  r.post(
    '/api/v1/p/:pariwarId/admin/pool-fixed-amount/schedule',
    {
      schema: {
        params: PariwarParam,
        body: PoolFixedAmountScheduleRequest,
        response: { 201: PoolFixedAmountScheduleResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireSet],
    },
    h.postSchedule,
  );

  // AC3/AC4 — an EMERGENCY override. Same human-actor chain + an ADDITIONAL step-up gate (after the
  // permission hook, so an unauthorized actor never reaches step-up).
  r.post(
    '/api/v1/p/:pariwarId/admin/pool-fixed-amount/emergency',
    {
      schema: {
        params: PariwarParam,
        body: PoolFixedAmountEmergencyRequest,
        response: { 201: PoolFixedAmountEmergencyResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireEmergency, requireStepUp(deps, EMERGENCY_STEP_UP_CONTEXT)],
    },
    h.postEmergency,
  );
}
