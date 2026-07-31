// Feature-flag admin handlers — Story 10.8 (Task 7; AC3/AC4).
//
// Four routes under one module (routes.ts), ALL admin-session + scope-resolution + permission gated:
//   · GET  /api/v1/global/feature-flags                          — the global catalog (feature_flag.view)
//   · GET  …/p/:pariwarId/feature-flags                          — this tenant's effective inventory
//   · GET  …/p/:pariwarId/feature-flags/:flagKey/versions        — a flag's version history
//   · POST …/p/:pariwarId/feature-flags/:flagKey/versions        — THE FLIP (feature_flag.flip)
//
// ── The inventory is COMPLETE by construction (AC4) ───────────────────────────────────────────────
// Both read handlers delegate to `featureFlags.listEffectiveFlags`, which iterates the CODE REGISTRY
// and resolves each key — it does not SELECT whatever rows exist. There is therefore no code path
// here that can omit a registered flag, and no filter parameter that could be asked to. That is what
// makes prd.md:892's "no secret flags" a structural property rather than a promise.
//
// ── The narrow-write posture on the flip (AC3) ────────────────────────────────────────────────────
// `createFlagVersion` takes a PRE-GENERATED `auditId` anchor for the row; writing the audit LINE is
// THIS layer's obligation (the 10.1 registry posture). The flip therefore runs under
// `audit.withCompensatingAudit` (ADR-0030, the 10.1/10.4 helpdesk-create precedent): the INTENT line
// commits first in its own tx — which is what actually produces the `auditId` — then the row insert
// runs with it threaded on. If the insert fails, a `…_rolled_back` compensating line settles the
// chain and the original error is rethrown unmasked.
//
// ⚠ Not a fire-and-forget audit (deliberately unlike the news-blog transition audit) and not an
// after-the-fact write. A flag flip changes production behaviour for real members, so the audit line
// must exist BEFORE the row it describes — an after-write audit can be lost by a crash between the
// two, leaving a flipped flag with no trail, which is precisely the hole FR-58C exists to close.
//
// ⚠ ONE DEVIATION FROM THE AC'S LITERAL WORDING, stated plainly: AC3 asks for `flag_key` / prior and
// new version / prior and new state / `rationale` in "the audit context". `AuditEntryInput` has NO
// context field — the §1.5 chain content is a fixed tuple (actor, action, resourceLocator,
// requestPayloadHash, responseStatus, recordedAt, traceId) and widening it would change the hash
// content for every audit line in the system. So the same information is carried without touching
// the chain: `resourceLocator` = `feature_flag/<key>/v<version>` puts key + version IN the hashed
// content, `requestPayloadHash` is a digest over the whole flip input INCLUDING the rationale (so
// the rationale is tamper-evident), and the rationale text itself lives on the `feature_flag_versions`
// row that the line's `auditId` anchors — which is also what AC4's inventory renders. Nothing is
// lost; it is anchored rather than inlined.

import { createHash } from 'node:crypto';

import type {
  FeatureFlagFlipRequest,
  FeatureFlagFlipResponse,
  FeatureFlagInventoryResponse,
  FeatureFlagVersionsResponse,
} from '@twt/contracts';
import { audit, featureFlags, ids } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import { ADMIN_GLOBAL_NAMESPACE, type AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError, BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';

/** The RBAC keys this module's routes are gated on (Story 10.8 Decision 7). */
export const FEATURE_FLAG_VIEW_KEY = 'feature_flag.view';
export const FEATURE_FLAG_FLIP_KEY = 'feature_flag.flip';

/** The dotted audit actions (free-form lowercase per `audit/write.ts`; no central registry). */
const ACTION_VERSION_CREATED = 'feature_flag.version_created';
const ACTION_ROLLED_BACK = 'feature_flag.rolled_back';

interface AdminCtx {
  actorId: string;
  pariwarId: ids.PariwarId;
  traceId: string;
}

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

/** `YYYY-MM-DD` — the dead-by wire shape. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Project a resolved inventory entry into the wire shape. */
function toInventoryEntry(e: featureFlags.FlagInventoryEntry): FeatureFlagInventoryResponse['flags'][number] {
  return {
    flag_key: e.flagKey,
    description: e.description,
    state: e.document.state,
    source: e.source,
    flag_version: e.document.version,
    cohort_definition: e.document.cohortDefinition as FeatureFlagInventoryResponse['flags'][number]['cohort_definition'],
    fallback_default: e.document.fallbackDefault,
    owner: e.owner,
    dead_by: e.deadBy,
    effective_from: iso(e.effectiveFrom),
    effective_until: iso(e.effectiveUntil),
    last_flip_actor: e.actorWhoFlipped,
    rationale: e.rationale,
  };
}

export function createFeatureFlagsHandlers(deps: AppDeps) {
  function ctxOf(request: FastifyRequest): AdminCtx {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return {
      actorId,
      pariwarId: ids.pariwarId(scopeTx.pariwarId),
      traceId: request.requestContext.traceId,
    };
  }

  /** Parse + calendar-validate `dead_by` (YYYY-MM-DD). `new Date` + `isNaN` alone accepts a
   *  calendar-invalid date by silently rolling it forward (e.g. '2027-02-30' becomes March 2nd) —
   *  round-trip the parsed components against the input to catch that instead of storing a wrong
   *  date under a plausible-looking one.
   *  @throws BadRequestError on an invalid calendar date. */
  function parseValidatedDeadBy(deadByStr: string): Date {
    const deadBy = new Date(`${deadByStr}T00:00:00.000Z`);
    const [deadByYear, deadByMonth, deadByDay] = deadByStr.split('-').map(Number);
    const isCalendarValid =
      !Number.isNaN(deadBy.getTime()) &&
      deadBy.getUTCFullYear() === deadByYear &&
      deadBy.getUTCMonth() + 1 === deadByMonth &&
      deadBy.getUTCDate() === deadByDay;
    if (!isCalendarValid) {
      throw new BadRequestError(`Invalid dead_by '${deadByStr}' (expected YYYY-MM-DD)`, 'feature_flag.invalid_dead_by');
    }
    return deadBy;
  }

  /** Map the domain's typed create-version errors to their HTTP seams — shared by the per-Pariwar
   *  and global flip handlers. */
  function mapCreateFlagVersionError(err: unknown): never {
    if (err instanceof featureFlags.FlagVersionConflictError) {
      // A CONCURRENT flip, not necessarily a duplicate submission — the loser must re-read and
      // decide again, because the winner may have flipped to a different state entirely.
      throw new ConflictError(err.message, 'feature_flag.version_conflict');
    }
    if (err instanceof featureFlags.FlagVersionInvalidError) {
      throw new BadRequestError(err.message, 'feature_flag.invalid_version');
    }
    if (err instanceof featureFlags.FlagEffectiveFromOutOfOrderError) {
      throw new BadRequestError(err.message, 'feature_flag.effective_from_out_of_order');
    }
    throw err;
  }

  /** sha256 of the canonical flip input — the audit `requestPayloadHash`. NEVER the raw cohort
   *  definition: the audit payload boundary carries a digest, not the payload (audit/write.ts). */
  function flipPayloadHash(flagKey: string, body: FeatureFlagFlipRequest): string {
    const canonical = JSON.stringify({
      flag_key: flagKey,
      state: body.state,
      cohort_definition: body.cohort_definition,
      fallback_default: body.fallback_default,
      owner: body.owner,
      dead_by: body.dead_by,
      effective_from: body.effective_from ?? null,
      effective_until: body.effective_until ?? null,
    });
    return createHash('sha256').update(canonical).digest('hex');
  }

  return {
    FEATURE_FLAG_VIEW_KEY,
    FEATURE_FLAG_FLIP_KEY,

    /**
     * GET /api/v1/global/feature-flags — the CROSS-TENANT catalog. Resolves every registered flag
     * against the global tier only (`pariwarId: null`), so `source` is never `override` here.
     *
     * Runs on `deps.serviceDb` (BYPASSRLS) rather than a scope tx, because this route has no
     * `:pariwarId` and therefore no tenant to scope to — it is `super_admin`-gated at
     * `dimension: 'global'` (see routes.ts). Reading the service pool is safe here specifically
     * because the query is pinned to `pariwar_id IS NULL`: the global rows are cross-readable by
     * design and contain no tenant data. ⚠ Do NOT widen this call to a tenant scope on the service
     * pool — that would read every tenant's overrides with RLS bypassed.
     */
    async globalCatalog(request: FastifyRequest): Promise<FeatureFlagInventoryResponse> {
      // Still assert an authenticated actor: requireGlobalPermission needs the session, and this
      // keeps the 401-before-403 ordering consistent with every other route in the module.
      const actorId = request.requestContext.actorId;
      if (!actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const entries = await featureFlags.listEffectiveFlags(deps.serviceDb, null, new Date());
      return { flags: entries.map(toInventoryEntry) };
    },

    /**
     * GET …/p/:pariwarId/feature-flags — this tenant's EFFECTIVE inventory: override ≻ global ≻ code
     * default per flag, with `source` naming which tier answered (AC4's provenance requirement).
     */
    async pariwarInventory(request: FastifyRequest): Promise<FeatureFlagInventoryResponse> {
      const ctx = ctxOf(request);
      const entries = await featureFlags.listEffectiveFlags(request.scopeTx!.tx, ctx.pariwarId, new Date());
      return { flags: entries.map(toInventoryEntry) };
    },

    /** GET …/feature-flags/:flagKey/versions — the persisted version history (version 1 is code data,
     *  never a row, so it is never listed). 404 on an unregistered key. */
    async versions(request: FastifyRequest): Promise<FeatureFlagVersionsResponse> {
      const ctx = ctxOf(request);
      const { flagKey } = request.params as { flagKey: string };
      if (!featureFlags.isRegisteredFlag(flagKey)) {
        throw new NotFoundError(`Unknown feature flag '${flagKey}'`, 'feature_flag.unknown_key');
      }
      const rows = await featureFlags.listFlagVersions(request.scopeTx!.tx, flagKey, ctx.pariwarId);
      return {
        flag_key: flagKey,
        versions: rows.map((row) => ({
          flag_key: row.flagKey,
          pariwar_id: row.pariwarId,
          version: row.version,
          state: row.state,
          cohort_definition: row.cohortDefinition as FeatureFlagVersionsResponse['versions'][number]['cohort_definition'],
          fallback_default: row.fallbackDefault,
          owner: row.owner,
          dead_by: isoDate(row.deadBy),
          effective_from: row.effectiveFrom.toISOString(),
          effective_until: iso(row.effectiveUntil),
          actor_who_flipped: row.actorWhoFlipped,
          rationale: row.rationale,
          superseded_by_version: row.supersededByVersion,
          created_at: row.createdAt.toISOString(),
        })),
      };
    },

    /**
     * POST …/p/:pariwarId/feature-flags/:flagKey/versions — THE FLIP (AC3/AC7).
     *
     * Creates a new immutable version row for this tenant's scope, then writes the §1.5 hash-chain
     * audit line anchored to the pre-generated `auditId`. A `rolled_back` state gets its own audit
     * action so a rollback is greppable in the chain without parsing context.
     */
    async flip(request: FastifyRequest): Promise<FeatureFlagFlipResponse> {
      const ctx = ctxOf(request);
      const { flagKey } = request.params as { flagKey: string };
      const body = request.body as FeatureFlagFlipRequest;

      if (!featureFlags.isRegisteredFlag(flagKey)) {
        // A flag key that is not in the registry is also not in the capability bar (the gate pins
        // them equal), so this is the runtime backstop on "the bar cannot be expanded at runtime".
        throw new NotFoundError(`Unknown feature flag '${flagKey}'`, 'feature_flag.unknown_key');
      }

      // R5 attribution resolves FIRST, before any write — server-side from users.display_name, and
      // fail-closed: a missing name BLOCKS the flip rather than falling back to an email or an id
      // ([[project_admin_display_name_attribution]]). A flip's actor attribution is part of the
      // permanent audit record; an id-fallback would leave a record nobody can read later.
      const actorDisplay = await getDisplayName(deps.pool, ctx.actorId);
      if (actorDisplay === null) {
        throw new AdminDisplayNameMissingError(ctx.actorId);
      }

      const deadBy = parseValidatedDeadBy(body.dead_by);

      // A `rolled_back` flip gets its OWN audit action so a rollback is greppable in the chain
      // without parsing any payload — the one flag transition an incident review looks for first.
      const action = body.state === 'rolled_back' ? ACTION_ROLLED_BACK : ACTION_VERSION_CREATED;

      // The intent line commits FIRST (its own tx on the service pool), yielding the `auditId` that
      // is then threaded onto the version row — ADR-0030. A failed insert fires the compensating
      // `…_rolled_back` line and rethrows the original error unmasked.
      const row = await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId: ctx.pariwarId,
          actorId: ctx.actorId,
          actorRole: null,
          action,
          // key + version-to-be are IN the hashed chain content (see the header's AC3 note). The
          // version is known ahead of the insert only as "the next one", so the locator names the
          // key and the row carries the exact version — the anchor ties them together.
          resourceLocator: `feature_flag/${flagKey}`,
          // A DIGEST over the whole flip input INCLUDING the rationale — never the raw cohort
          // definition (the audit payload boundary). This is what makes the rationale tamper-evident.
          requestPayloadHash: flipPayloadHash(flagKey, body),
          traceId: ctx.traceId,
        },
        mutate: async ({ auditId }) => {
          try {
            return await featureFlags.createFlagVersion(request.scopeTx!.tx, {
              flagKey,
              pariwarId: ctx.pariwarId,
              state: body.state,
              cohortDefinition: body.cohort_definition,
              fallbackDefault: body.fallback_default,
              owner: body.owner,
              deadBy,
              rationale: body.rationale,
              effectiveFrom: body.effective_from ? new Date(body.effective_from) : undefined,
              effectiveUntil: body.effective_until ? new Date(body.effective_until) : null,
              actorWhoFlipped: ids.userId(ctx.actorId),
              auditId,
            });
          } catch (err: unknown) {
            mapCreateFlagVersionError(err);
          }
        },
      });

      return {
        flag_key: row.flagKey,
        pariwar_id: row.pariwarId,
        version: row.version,
        state: row.state,
        effective_from: row.effectiveFrom.toISOString(),
        audit_id: row.auditId,
      };
    },

    /**
     * POST /api/v1/global/feature-flags/:flagKey/versions — THE GLOBAL FLIP. Publishes a new
     * cross-tenant version (`pariwar_id IS NULL`) — the "trustee flips it for every Pariwar at once"
     * tier the three-tier resolution names (registry.ts header). `super_admin`-gated at
     * `dimension: 'global'` (routes.ts) — the same boundary as the global catalog read.
     *
     * ⚠ No `:pariwarId` param, so no scope tx: this runs on `deps.serviceDb` (BYPASSRLS), which is
     * safe here specifically because the write is pinned to `pariwarId: null` (see the AC1 note on
     * `globalCatalog` above — do NOT generalize this posture to a tenant-scoped write). The audit
     * chain's `pariwarId` column is NOT nullable (§1.5), so the audit line is attributed to
     * `ADMIN_GLOBAL_NAMESPACE` — the same nil-UUID sentinel `requireGlobalPermission` already uses
     * to stand in for "no active tenant" (rbac/index.ts). The row itself still carries the real
     * `pariwar_id: null`; only the audit chain's attribution needs a concrete value.
     */
    async globalFlip(request: FastifyRequest): Promise<FeatureFlagFlipResponse> {
      const actorId = request.requestContext.actorId;
      if (!actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const { flagKey } = request.params as { flagKey: string };
      const body = request.body as FeatureFlagFlipRequest;

      if (!featureFlags.isRegisteredFlag(flagKey)) {
        throw new NotFoundError(`Unknown feature flag '${flagKey}'`, 'feature_flag.unknown_key');
      }

      const actorDisplay = await getDisplayName(deps.pool, actorId);
      if (actorDisplay === null) {
        throw new AdminDisplayNameMissingError(actorId);
      }

      const deadBy = parseValidatedDeadBy(body.dead_by);
      const action = body.state === 'rolled_back' ? ACTION_ROLLED_BACK : ACTION_VERSION_CREATED;

      const row = await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId: ADMIN_GLOBAL_NAMESPACE,
          actorId,
          actorRole: null,
          action,
          resourceLocator: `feature_flag/${flagKey}`,
          requestPayloadHash: flipPayloadHash(flagKey, body),
          traceId: request.requestContext.traceId,
        },
        mutate: async ({ auditId }) => {
          try {
            return await featureFlags.createFlagVersion(deps.serviceDb, {
              flagKey,
              pariwarId: null,
              state: body.state,
              cohortDefinition: body.cohort_definition,
              fallbackDefault: body.fallback_default,
              owner: body.owner,
              deadBy,
              rationale: body.rationale,
              effectiveFrom: body.effective_from ? new Date(body.effective_from) : undefined,
              effectiveUntil: body.effective_until ? new Date(body.effective_until) : null,
              actorWhoFlipped: ids.userId(actorId),
              auditId,
            });
          } catch (err: unknown) {
            mapCreateFlagVersionError(err);
          }
        },
      });

      return {
        flag_key: row.flagKey,
        pariwar_id: row.pariwarId,
        version: row.version,
        state: row.state,
        effective_from: row.effectiveFrom.toISOString(),
        audit_id: row.auditId,
      };
    },
  };
}
