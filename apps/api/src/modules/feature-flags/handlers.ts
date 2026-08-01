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
// row that the line's `auditId` anchors — which is also what AC4's inventory renders.
//
// ⚠ CORRECTED IN REVIEW PASS 3 — read this before trusting the paragraph above. Two of its claims
// were FALSE as shipped:
//   · "a digest … INCLUDING the rationale" — `rationale` was NOT in `flipPayloadHash`. It is now.
//   · "`resourceLocator` = `feature_flag/<key>/v<version>`" — the locator is `feature_flag/<key>`,
//     with NO version, and it cannot carry one: under ADR-0030 the intent line commits BEFORE the
//     insert (that is what produces the `auditId`), so at hash time the version does not exist yet.
// So the accurate statement is: the chain content carries the flag KEY and a digest over the full
// flip input INCLUDING the rationale; the VERSION is not in the chain and is recoverable only by
// following the `auditId` anchor to the row. That is a real, named limit rather than an implied
// completeness — the alternative (widening `AuditEntryInput` with a context field) would change the
// hash content of every audit line in the system and was rejected as out of scope.

import { createHash } from 'node:crypto';

import type {
  FeatureFlagFlipRequest,
  FeatureFlagFlipResponse,
  FeatureFlagInventoryResponse,
  FeatureFlagVersionsResponse,
} from '@twt/contracts';
import { audit, canonicalJsonStringify, featureFlags, idempotency, ids } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import { ADMIN_GLOBAL_NAMESPACE, type AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';

/** The RBAC keys this module's routes are gated on (Story 10.8 Decision 7). */
export const FEATURE_FLAG_VIEW_KEY = 'feature_flag.view';
export const FEATURE_FLAG_FLIP_KEY = 'feature_flag.flip';

/**
 * Idempotency-claim lifetime for a flip (Review Pass 3). Generous relative to the request itself:
 * the window that matters is the client's retry horizon (a timed-out console request, a proxy
 * retry), not the server's execution time.
 */
const FLAG_FLIP_IDEMPOTENCY_TTL_SECONDS = 300;

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

/**
 * Coerce a persisted `cohort_definition` into a contract-valid shape on the way OUT (Review Pass 4).
 *
 * ⚠ The domain deliberately TOLERATES a malformed cohort at evaluation time — the evaluator
 * shape-guards and falls back — because global rows are authored outside `validateFlagVersionInput`
 * by design. But the RESPONSE schema is strict, so a single such row used to fail serialization for
 * the WHOLE inventory, and the admin console rendered "Could not load the flag inventory", hiding
 * EVERY flag. A surface whose stated property is "no secret flags" must not be blanked by one bad
 * row. Sanitizing here — rather than loosening the contract — keeps the published wire shape honest
 * and means no consumer has to defend against garbage.
 */
function safeCohort(raw: unknown): FeatureFlagInventoryResponse['flags'][number]['cohort_definition'] {
  const clauses = (raw as { clauses?: unknown } | null | undefined)?.clauses;
  if (!Array.isArray(clauses)) return { clauses: [] };
  const clean = clauses.filter(
    (c): c is { dimension: string; op: string; values: string[] } =>
      c !== null &&
      typeof c === 'object' &&
      Array.isArray((c as { values?: unknown }).values) &&
      (c as { values: unknown[] }).values.length > 0,
  );
  return { clauses: clean } as FeatureFlagInventoryResponse['flags'][number]['cohort_definition'];
}

/** Project a resolved inventory entry into the wire shape. */
function toInventoryEntry(e: featureFlags.FlagInventoryEntry): FeatureFlagInventoryResponse['flags'][number] {
  return {
    flag_key: e.flagKey,
    description: e.description,
    state: e.document.state,
    source: e.source,
    flag_version: e.document.version,
    cohort_definition: safeCohort(e.document.cohortDefinition),
    fallback_default: e.document.fallbackDefault,
    owner: e.owner,
    dead_by: e.deadBy,
    effective_from: iso(e.effectiveFrom),
    effective_until: iso(e.effectiveUntil),
    last_flip_actor: e.actorWhoFlipped,
    // The human-readable half of AC4's "last flip actor". Null on rows written before migration
    // 0089 — deliberately NOT backfilled, so a consumer must render it as "not recorded" rather
    // than inventing a name (see the column comment in the schema).
    last_flip_actor_display: e.actorDisplay,
    rationale: e.rationale,
  };
}

/** Map the domain's typed create-version errors to their HTTP seams — shared by the per-Pariwar
 *  and global flip handlers. */
export function mapCreateFlagVersionError(err: unknown): never {
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
  // ── Review Pass 3: four arms that were missing, each of which surfaced as an opaque 500 ─────────
  //
  // These are NOT defensive padding. Every one is a caller-facing refusal the domain raises
  // deliberately, and every one was falling through to `throw err` → the app boundary's catch-all
  // → `500 internal.error` with the message suppressed. The typed errors carry carefully-written
  // operator guidance that was being discarded at the last step.
  if (err instanceof featureFlags.FlagStateTransitionError) {
    // The AC7 staged-rollout ladder. 409, not 400: the request is well-formed and authorized, and
    // whether it is legal depends on the flag's CURRENT state — i.e. on server state the caller
    // may simply have raced. `err.message` names the permitted next states, which is exactly what
    // the operator needs. This is the single most likely 4xx on this route in normal operation.
    throw new ConflictError(err.message, 'feature_flag.illegal_state_transition');
  }
  if (err instanceof featureFlags.FlagKeyNotAllowlistedError) {
    // The AC5/AC6 RUNTIME backstop on "the capability bar cannot be expanded at runtime". A 409
    // (conflict with governance state) rather than 400 — the request is well-formed; the flag key
    // is simply not admitted to the bar on THIS deploy. Reported as a governance refusal so the
    // operator can act on it, instead of as a crash.
    throw new ConflictError(err.message, 'feature_flag.not_allowlisted');
  }
  if (err instanceof featureFlags.CapabilityBarUnavailableError) {
    // A PACKAGING fault, not a caller fault: the deploy shipped @twt/domain without the repo-root
    // governance_boundary.yaml. Still a 500 — nothing the caller can do — but with a distinct code
    // so it is diagnosable rather than anonymous. Deliberately NOT collapsed into the next arm:
    // errors.ts separates "cannot be read" from "read but invalid" precisely so the app boundary
    // does not report a missing artifact as a malformed one.
    throw new ServiceUnavailableError(err.message, 'feature_flag.capability_bar_unavailable');
  }
  if (err instanceof featureFlags.CapabilityBarInvalidError) {
    // The bar was read and FAILED VALIDATION — a governance-content fault. Also operator-facing:
    // someone shipped a malformed bar and every flip is now blocked until it is fixed.
    throw new ServiceUnavailableError(err.message, 'feature_flag.capability_bar_invalid');
  }
  // ⚠ `FlagVersionDuplicateIdError` is deliberately NOT mapped: it can only be raised when the
  // caller supplies a row `id`, and neither flip handler passes one — `FeatureFlagFlipRequest` is
  // `.strict()` with no `id` field, so there is no HTTP path that can reach it. Adding an arm
  // would be dead code implying a reachable state. Revisit if a route ever accepts a caller id.
  throw err;
}

export function createFeatureFlagsHandlers(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  /**
   * Wrap a flip in the shared keyed idempotency store when the caller supplies `Idempotency-Key`
   * (Review Pass 3).
   *
   * ⚠ WHY THIS EXISTS. The `(pariwar_id, flag_key, version)` unique constraint only catches a
   * CONCURRENT double-flip — the 409 seam. A SEQUENTIAL replay (a timed-out request the client
   * retries, a double-clicked console button, a proxy retry) sees the winner already committed and
   * simply creates the NEXT version: two identical versions, two audit lines, and a version history
   * that reports two operator decisions where there was one. For a surface whose entire purpose is
   * provenance, that is a correctness problem, not just noise.
   *
   * ⚠ OPT-IN, by design. A caller that sends no header gets the previous behaviour exactly. Making
   * the key mandatory would break every existing client for a guarantee only some callers need.
   *
   * ⚠ The key is NAMESPACED by route + scope + flag. Two different flags, or two tenants, must never
   * collide on a client that reuses one key per user action — and a global flip must not collide
   * with a per-tenant flip of the same flag.
   */
  async function withIdempotency(
    request: FastifyRequest,
    namespace: string,
    run: () => Promise<FeatureFlagFlipResponse>,
  ): Promise<FeatureFlagFlipResponse> {
    const headerKey = request.headers['idempotency-key'];
    const idemKey = typeof headerKey === 'string' && headerKey.trim() !== '' ? `${namespace}:${headerKey.trim()}` : null;
    if (idemKey === null) return run();

    const claimOutcome = await idempotencyStore.claim(idemKey, FLAG_FLIP_IDEMPOTENCY_TTL_SECONDS);
    if (claimOutcome === 'already_claimed') {
      const stored = await idempotencyStore.getResult(idemKey);
      if (stored !== null) return stored as FeatureFlagFlipResponse;
      // Claimed but no result recorded yet — the original attempt is still in flight. 409 rather
      // than racing it: two flips landing would defeat the point of the key.
      throw new ConflictError(
        'A flip with this Idempotency-Key is already in progress — wait and retry',
        'feature_flag.idempotency_in_progress',
      );
    }

    try {
      const result = await run();
      // ⚠ Recorded BEFORE the caller's scope tx commits (the store runs on its own connection), so a
      // commit failure after this point would leave a recorded result for a flip that never landed.
      // That window is inherited from the sibling create routes and is not introduced here; the
      // replay is a read of the recorded response, so the worst case is a client being told about a
      // version it can then fail to find — noisy, not corrupting. Called out rather than hidden.
      await idempotencyStore.recordResult(idemKey, result);
      return result;
    } catch (err: unknown) {
      // Release the claim so a genuinely failed attempt can be retried immediately rather than
      // being locked out for the whole TTL (the member-handlers precedent).
      await idempotencyStore.release(idemKey).catch(() => undefined);
      throw err;
    }
  }

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


  /** sha256 of the canonical flip input — the audit `requestPayloadHash`. NEVER the raw cohort
   *  definition: the audit payload boundary carries a digest, not the payload (audit/write.ts). */
  function flipPayloadHash(flagKey: string, body: FeatureFlagFlipRequest): string {
    // ⚠ `canonicalJsonStringify` (RFC 8785), NEVER bespoke `JSON.stringify` (Review Pass 3, and the
    // standing `validity-cache/store.ts` rule). `cohort_definition` is a CLIENT-SUPPLIED nested
    // object whose key order the server does not control, so a plain stringify made the digest a
    // function of the client's serializer rather than of the flip's meaning — two byte-identical
    // flips could hash differently, which defeats the point of putting it in a tamper-evident chain.
    //
    // ⚠ `rationale` IS included (Review Pass 3). It was omitted while this file's header and
    // Completion Note 4(a) both asserted it was present — and that assertion was the stated reason
    // AC3's literal "audit context" requirement could be waived. FR-58C names the rationale
    // explicitly ("flag changes audit-logged with actor + rationale"); without it in the digest, two
    // different rationales on otherwise-identical flips produced byte-identical audit lines and the
    // rationale was protected only by the row's append-only trigger, never by the §1.5 chain.
    const canonical = canonicalJsonStringify({
      flag_key: flagKey,
      state: body.state,
      cohort_definition: body.cohort_definition,
      fallback_default: body.fallback_default,
      owner: body.owner,
      dead_by: body.dead_by,
      effective_from: body.effective_from ?? null,
      effective_until: body.effective_until ?? null,
      rationale: body.rationale,
    } as never);
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
     * `:pariwarId` and therefore no tenant to scope to.
     *
     * ⚠ WHY THE BYPASSRLS READ IS SAFE — corrected in Review Pass 3. This block used to say the
     * route is "`super_admin`-gated at `dimension: 'global'`", and anchored the safety argument to
     * that. It is NOT: Pass 1 loosened it to `requireGlobalOrAnyPariwarPermission(FEATURE_FLAG_VIEW_KEY)`
     * so any pariwar_admin can read the catalog (prd.md:892's "visible to Pariwar Admin and above").
     * The read is still safe, but for a STRUCTURAL reason rather than a gating one: the query is
     * pinned to `pariwar_id IS NULL` — `listEffectiveFlags(db, null, …)` skips the override tier
     * entirely and tier 2 filters `isNull(pariwarId)` — so it can only ever return the cross-tenant
     * global rows, which are cross-readable by design and contain no tenant data. An argument
     * anchored to a gate that later moved is worse than no argument, because it reads as verified.
     * ⚠ Do NOT widen this call to a tenant scope on the service pool — that would read every
     * tenant's overrides with RLS bypassed, and the pinning above is the only thing preventing it.
     *
     * ⚠ RE-EXAMINATION TRIGGER: revisit this BYPASSRLS read the moment the global catalog stops
     * being scope-invariant — i.e. if any global-tier response field ever varies by reader, or if a
     * flag key is ever made visible to some tenants and not others. Both would break the pinning
     * argument above, which is the only thing making the RLS bypass safe.
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
      const history = await featureFlags.listFlagVersions(request.scopeTx!.tx, flagKey, ctx.pariwarId);
      return {
        flag_key: flagKey,
        // `has_more` is surfaced rather than swallowed (Review Pass 2): this read used to truncate at
        // 100 rows with no signal, so an incomplete provenance history was indistinguishable from a
        // complete one.
        has_more: history.hasMore,
        versions: history.rows.map((row) => ({
          flag_key: row.flagKey,
          pariwar_id: row.pariwarId,
          version: row.version,
          state: row.state,
          cohort_definition: safeCohort(row.cohortDefinition) as FeatureFlagVersionsResponse['versions'][number]['cohort_definition'],
          fallback_default: row.fallbackDefault,
          owner: row.owner,
          dead_by: isoDate(row.deadBy),
          effective_from: row.effectiveFrom.toISOString(),
          effective_until: iso(row.effectiveUntil),
          actor_who_flipped: row.actorWhoFlipped,
          actor_display: row.actorDisplay,
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
      return withIdempotency(request, `feature_flag.flip:${ctx.pariwarId}:${flagKey}`, async () => {

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
              // ⚠ SNAPSHOT the resolved name onto the row (Review Pass 3). Until now this value was
              // fetched, null-checked, and thrown away — so the fail-closed gate above blocked a
              // flip on a missing name while the record it protects stored only a UUID.
              actorDisplay,
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
      });
    },

    /**
     * POST /api/v1/global/feature-flags/:flagKey/versions — THE GLOBAL FLIP. Publishes a new
     * cross-tenant version (`pariwar_id IS NULL`) — the "trustee flips it for every Pariwar at once"
     * tier the three-tier resolution names (registry.ts header). `super_admin`-gated at
     * `dimension: 'global'` via `requireGlobalPermission` (routes.ts).
     *
     * ⚠ This is NOT "the same boundary as the global catalog read" (corrected in Review Pass 3 — it
     * was, until Pass 1 loosened the READ). The read is now `requireGlobalOrAnyPariwarPermission`
     * (any pariwar_admin); the WRITE stays strictly `super_admin`. That asymmetry is deliberate and
     * is Decision 7's read/write split applied at global scope: seeing which flags govern every
     * tenant is a transparency property, authoring one is a trustee authority.
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
      return withIdempotency(request, `feature_flag.global_flip:${flagKey}`, async () => {

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
            // ⚠ WRAPPED IN A TRANSACTION (Review Pass 3). `deps.serviceDb` is a drizzle handle bound
            // to a POOL, not a client — so passing it directly let `createFlagVersion`'s four
            // statements (SELECT prior / `select now()` / INSERT / supersession UPDATE) land on
            // different pooled connections with no enclosing BEGIN, each autocommitted. A failure
            // between the INSERT and the forward-pointer UPDATE left the prior GLOBAL row
            // un-superseded permanently: the 0087 append-only trigger blocks a repair and there is
            // no DELETE grant, so the only fix would be a superuser write. The per-Pariwar flip
            // never had this problem — it rides `request.scopeTx.tx`, a single client in a real tx.
            return await deps.serviceDb.transaction(async (tx) =>
              featureFlags.createFlagVersion(tx, {
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
              actorDisplay,
              auditId,
              }),
            );
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
      });
    },
  };
}
