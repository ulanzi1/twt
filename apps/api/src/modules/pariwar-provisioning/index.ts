// Multi-Pariwar provisioning route module — Story 1.15 (AC-1).
//
// ── GLOBAL, not tenant-scoped ─────────────────────────────────────────────────
// Provisioning a NEW Pariwar is a GLOBAL action: there is no `/p/:pariwarId/` to
// scope to because the Pariwar does not exist yet. So these routes live under
// /api/v1/provisioning/... (NOT under /p/:pariwarId/), mirroring the /api/v1/audit/...
// global-convention deviation. The action boundary is the NEW global-scope gate
// `requireGlobalPermission(deps, 'pariwar.provision')` (Story 1.15 AC-1a) — the
// per-tenant `requirePermissionHook` would hard-throw 500 here (no request.scopeTx).
//
// ── The self-scoped provisioning write (chicken-and-egg) ──────────────────────
// `upsertPariwarPassport` writes through the tenant-isolation WRITE policy whose
// WITH CHECK requires `pariwar_id = current app.pariwar_id`. A NEW Pariwar has no
// membership + no prior scope, so we SELF-SCOPE to the freshly-minted id: open a
// scope tx on the new id, upsert, commit. The WITH CHECK passes because
// `row.pariwar_id === newId === app.pariwar_id`. RLS is exercised faithfully
// (scope-tx sheds superuser via SET LOCAL ROLE twt_app) — NO BYPASSRLS shortcut.
// The AUTHORIZATION to do this is the global `pariwar.provision` gate at the HTTP
// boundary; RLS is the data boundary (§2.6 "RLS then authz").
//
// Every route puts `requireAdminSession(deps)` FIRST so the Story 1.14 login-wall
// guard (route-registry `ADMIN_SESSION_GUARD` tag) passes by construction.

import { randomUUID } from 'node:crypto';

import {
  AddPariwarRequest,
  DeployTriggerResponse,
  ProvisionedPariwar,
  ProvisioningStatusList,
  type DeployStatusView,
  type PariwarPassportResponse,
} from '@twt/contracts';
import { ids, passport, pool as poolDomain, type schema } from '@twt/domain';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { requireGlobalPermission } from '../rbac/index.js';
import { buildPathScope, readDeployConfig } from './deploy-config.js';
import type { DeployResult } from './deploy-trigger.js';

const PROVISIONING_TAG = 'provisioning';
const PROVISION_KEY = 'pariwar.provision';

// Story 7.5 (D5) — the GENESIS fixed-amount (whole INR) seeded for a freshly-provisioned Pariwar so
// its effective-dated schedule always has a version-1 open head (effective_from = now()) and the
// spawn saga's getEffectiveFixedAmount never throws PoolFixedAmountNotConfiguredError in practice.
// Mirrors the retired POOL_SPAWN_FIXED_AMOUNT_INR default (500). Overridable via env; the trustee
// re-sets it thereafter via the standard-change (12-month notice) / emergency-override workflow.
const GENESIS_FIXED_AMOUNT_INR = Number(process.env['POOL_GENESIS_FIXED_AMOUNT_INR'] ?? 500);

// Module-load-time range validation (review hardening — the retired POOL_SPAWN_FIXED_AMOUNT_INR had
// an equivalent boot-time RangeError check in apps/jobs/boot.ts; this constant had none). Fails
// process startup on a misconfigured env var instead of surfacing only the first time a Pariwar is
// provisioned. Ceiling matches @twt/domain's MAX_POOL_FIXED_AMOUNT_INR (the same bound
// seedGenesisFixedAmount's assertPositiveAmount enforces at write time — this is the earlier,
// louder gate).
if (
  !Number.isInteger(GENESIS_FIXED_AMOUNT_INR) ||
  GENESIS_FIXED_AMOUNT_INR <= 0 ||
  GENESIS_FIXED_AMOUNT_INR > poolDomain.MAX_POOL_FIXED_AMOUNT_INR
) {
  throw new RangeError(
    `[pariwar-provisioning] POOL_GENESIS_FIXED_AMOUNT_INR must be a positive integer <= ` +
      `${String(poolDomain.MAX_POOL_FIXED_AMOUNT_INR)} (got ${String(GENESIS_FIXED_AMOUNT_INR)})`,
  );
}

type PariwarPassportRow = typeof schema.pariwarPassport.$inferSelect;

/** Path param for the deploy route. */
const DeployParams = z.object({ pariwarId: z.string().uuid() }).strict();

/** Bounded list query (forced-pagination, Story 1.14): max 100, default 30. */
const ListQuery = z
  .object({ limit: z.coerce.number().int().min(1).max(100).default(30) })
  .strict();

/** Map a Drizzle passport row → the camelCase transport response (Date → ISO-8601). */
function toPassportResponse(row: PariwarPassportRow): PariwarPassportResponse {
  return {
    // The domain TS brand + the Zod contract brand are name-aligned, not
    // symbol-identical (Story 1.7 "Branded-ID reconciliation"); cast at the wire
    // boundary. The Zod response schema re-parses + re-brands at serialization.
    pariwarId: row.pariwarId as unknown as PariwarPassportResponse['pariwarId'],
    displayNameEn: row.displayNameEn,
    displayNameHi: row.displayNameHi,
    legalName: row.legalName,
    trustRegistrationId: row.trustRegistrationId,
    brandingBundle: row.brandingBundle,
    localeDefault: row.localeDefault,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Map a deploy-seam result → the transport deploy-status view (Date → ISO-8601). */
function toDeployView(result: DeployResult): DeployStatusView {
  return {
    deployId: result.deployId,
    status: result.status,
    triggeredAt: result.triggeredAt.toISOString(),
    detail: result.detail ?? null,
  };
}

export function registerPariwarProvisioningModule(app: FastifyInstance, deps: AppDeps): void {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const named = namedRateLimits(deps);

  // ── POST /api/v1/provisioning/pariwars — provision a new Pariwar ─────────────
  r.post(
    '/api/v1/provisioning/pariwars',
    {
      schema: {
        body: AddPariwarRequest,
        response: { 200: ProvisionedPariwar },
        tags: [PROVISIONING_TAG],
      },
      preHandler: [requireAdminSession(deps), requireGlobalPermission(deps, PROVISION_KEY)],
      config: { rateLimit: named.write },
    },
    async (request) => {
      const body = request.body as AddPariwarRequest;
      const actorId = request.requestContext.actorId ?? null;

      // Mint a fresh pariwar_id (UUID v4 → branded PariwarId) and self-scope the write.
      const newId = ids.pariwarId(randomUUID());
      const scopeTx = await openScopeTx(deps, newId);
      let row: PariwarPassportRow;
      try {
        row = await passport.upsertPariwarPassport(scopeTx.tx, {
          pariwarId: newId,
          displayNameEn: body.displayNameEn,
          displayNameHi: body.displayNameHi,
          legalName: body.legalName,
          trustRegistrationId: body.trustRegistrationId ?? null,
          brandingBundle: body.brandingBundle,
          localeDefault: body.localeDefault,
        });
        // Story 7.5 (D5) — seed the genesis fixed-amount row in the SAME self-scoped tx (atomic with
        // the passport), so a freshly-provisioned Pariwar always has an effective contribution amount
        // and pool-spawn never fails loud for a missing schedule. Idempotent on (pariwar_id, version=1).
        await poolDomain.seedGenesisFixedAmount(scopeTx.tx, {
          pariwarId: newId,
          fixedAmount: GENESIS_FIXED_AMOUNT_INR,
          actorId: actorId ?? 'system:provisioning-genesis-seed',
        });
        await closeScopeTx(scopeTx, true); // COMMIT on success
      } catch (err) {
        try {
          await closeScopeTx(scopeTx, false); // ROLLBACK on failure
        } catch {
          // ROLLBACK failure must not shadow the original error.
        }
        throw err;
      }

      deps.auditSink.emit({
        type: 'pariwar.provisioned',
        actorId,
        pariwarId: newId,
        traceId: request.requestContext.traceId,
        context: { displayNameEn: body.displayNameEn, localeDefault: body.localeDefault },
        at: deps.clock(),
      });

      const latest = await deps.deployTrigger.latest(newId).catch(() => null);
      return {
        passport: toPassportResponse(row),
        pathScope: buildPathScope(newId),
        latestDeploy: latest ? toDeployView(latest) : null,
      } satisfies z.infer<typeof ProvisionedPariwar>;
    },
  );

  // ── POST /api/v1/provisioning/pariwars/:pariwarId/deploy — trigger a build ───
  r.post(
    '/api/v1/provisioning/pariwars/:pariwarId/deploy',
    {
      schema: {
        params: DeployParams,
        response: { 200: DeployTriggerResponse },
        tags: [PROVISIONING_TAG],
      },
      preHandler: [requireAdminSession(deps), requireGlobalPermission(deps, PROVISION_KEY)],
      config: { rateLimit: named.write },
    },
    async (request) => {
      const { pariwarId } = request.params as z.infer<typeof DeployParams>;
      const pid = ids.pariwarId(pariwarId);

      // Read the path-scoped deploy config from the Passport (404 if absent), then
      // fire the deploy seam (fake in dev/test, live Dokploy-API client in staging/prod).
      const config = await readDeployConfig(deps.db, pid);
      const result = await deps.deployTrigger.trigger(config);

      deps.auditSink.emit({
        type: 'pariwar.deploy_triggered',
        actorId: request.requestContext.actorId ?? null,
        pariwarId,
        traceId: request.requestContext.traceId,
        context: { deployId: result.deployId, status: result.status, pathScope: config.pathScope },
        at: deps.clock(),
      });

      return {
        // Re-brand the plain path-param string to the Zod contract brand (see
        // toPassportResponse — the response schema re-parses at serialization).
        pariwarId: pariwarId as z.infer<typeof DeployTriggerResponse>['pariwarId'],
        pathScope: config.pathScope,
        deploy: toDeployView(result),
      } satisfies z.infer<typeof DeployTriggerResponse>;
    },
  );

  // ── GET /api/v1/provisioning/pariwars — provisioning-status view ─────────────
  r.get(
    '/api/v1/provisioning/pariwars',
    {
      schema: {
        querystring: ListQuery,
        response: { 200: ProvisioningStatusList },
        tags: [PROVISIONING_TAG],
      },
      preHandler: [requireAdminSession(deps), requireGlobalPermission(deps, PROVISION_KEY)],
      config: { rateLimit: named.read },
    },
    async (request) => {
      const { limit } = request.query as z.infer<typeof ListQuery>;
      // Cross-readable passport list (no scope) — the carve-out SELECT policy.
      const rows = await passport.listPariwarPassports(deps.db, { limit });
      const items = await Promise.all(
        rows.map(async (row) => {
          const latest = await deps.deployTrigger.latest(row.pariwarId).catch(() => null);
          return {
            passport: toPassportResponse(row),
            pathScope: buildPathScope(row.pariwarId),
            latestDeploy: latest ? toDeployView(latest) : null,
          };
        }),
      );
      return items satisfies z.infer<typeof ProvisioningStatusList>;
    },
  );
}
