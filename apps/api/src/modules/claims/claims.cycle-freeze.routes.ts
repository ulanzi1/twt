// State-Trustee cycle-freeze admin routes — Story 6.13 (Task 6; AC1/AC5/AC7, D-B/D-G).
//
// THREE scope-gated admin routes — the FIRST surface any state_trustee grant authorizes against
// (grep-verified: state_trustee appears in NO apps/api authz before this):
//   · GET  …/admin/cycle-freeze/pending  → the two-bucket pending list (AC1)
//   · POST …/admin/cycle-freeze/decision → per-claim approve/deny/route/resolve (AC2/AC3/AC4/AC4b)
//   · POST …/admin/cycle-freeze/commit   → the step-up-gated bulk commit (AC5)
//
// The route IS the security control (AC7): an authenticated HUMAN admin session + the cycle.freeze WRITE
// key at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the member-validity / nominee-bank
// pariwar-dimension precedent; NO server-derived-district preHandler, the target IS the tenant) + tenant
// match — fail-closed, audited. v1 actor = pariwar_admin-as-Trustee-Lite (D-B; direct state_trustee gating
// is DEFERRED to the Epic-3 geo-tree resolver — see permissions.ts).
//
// ── Commit is additionally step-up-gated (D-G/AC5) ──────────────────────────────────────────
// The bulk commit requires a FRESH ~5-min elevation bound to `cycle_freeze_commit` (Story 1.9 / 5.9
// requireStepUp) — added AFTER the permission hook so an unauthorized actor never reaches step-up (the
// verbatim 6.11 revise pattern). The per-claim votes + freeze-open are NOT independently step-up-gated;
// the COMMIT is the single trustee-attestable action.

import { CycleFreezeCommitRequest, CycleFreezeCommitResponse, CycleFreezeDecisionRequest, CycleFreezeDecisionResponse, CycleFreezePendingResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createCycleFreezeHandlers } from './claims.cycle-freeze.handlers.js';

const TAG = 'cycle-freeze';

/** D-B (RATIFIED): the new pariwar-dimension cycle.freeze key (catalog 14→15). */
const CYCLE_FREEZE_KEY = 'cycle.freeze';

/** The step-up action context for the bulk commit (D-G; free-form string — no registry to extend). */
const COMMIT_STEP_UP_CONTEXT = 'cycle_freeze_commit';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerCycleFreezeRoutes(app: FastifyInstance, deps: AppDeps): void {
  // Inject the REAL post-commit pool-spawn trigger (Story 7.3) — the pg-boss-backed
  // CYCLE_SPAWN_PARENT producer, replacing the Story 6.13 `consolePoolSpawnTrigger` default.
  const h = createCycleFreezeHandlers(deps, (payload) => deps.poolSpawnQueue.enqueue(payload));
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  // cycle.freeze at dimension:'pariwar' (EXPLICIT, not left to the default — review addendum: this is the
  // FIRST surface any state_trustee/pariwar_admin grant authorizes against, so the tenant-scoping behavior
  // must be visible at the call site, not just documented in a comment). resolveValue defaults to
  // scopeTx.pariwarId — the member-validity / nominee-bank pariwar-wide precedent; the target IS the
  // tenant, no district derivation.
  const requireCycleFreeze = requirePermissionHook(deps, CYCLE_FREEZE_KEY, { dimension: 'pariwar' });

  // AC1 — the two-bucket pending list. Human-actor + cycle.freeze @ pariwar + tenant.
  r.get(
    '/api/v1/p/:pariwarId/admin/cycle-freeze/pending',
    {
      schema: { params: PariwarParam, response: { 200: CycleFreezePendingResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireCycleFreeze],
    },
    h.getPending,
  );

  // AC2/AC3/AC4/AC4b — the per-claim decision (approve/deny/route/resolve; outcome in body).
  r.post(
    '/api/v1/p/:pariwarId/admin/cycle-freeze/decision',
    {
      schema: {
        params: PariwarParam,
        body: CycleFreezeDecisionRequest,
        response: { 201: CycleFreezeDecisionResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireCycleFreeze],
    },
    h.postDecision,
  );

  // AC5/D-G — the bulk commit. Same human-actor chain + an ADDITIONAL step-up gate (after the permission
  // hook, so an unauthorized actor never reaches step-up).
  r.post(
    '/api/v1/p/:pariwarId/admin/cycle-freeze/commit',
    {
      schema: {
        params: PariwarParam,
        body: CycleFreezeCommitRequest,
        response: { 200: CycleFreezeCommitResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireCycleFreeze, requireStepUp(deps, COMMIT_STEP_UP_CONTEXT)],
    },
    h.postCommit,
  );
}
