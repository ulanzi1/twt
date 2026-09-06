// Per-Pariwar DRIVE TARGET admin handlers — Story 11b.13 (Task 4; AC2, AC3, AC5).
//
// Thin handlers over the `@twt/domain` drive-target accessors, on the scoped admin chain
// [requireAdminSession, scopeResolutionHook, requirePermissionHook(<the key for THIS route>)] — the
// `nominee-bank-masking` / `directory-publication` precedent. The mechanism — rationale, audit
// anchor, actor/display consistency, the grant checks, `expectedVersion`, the
// close-head-then-insert-head supersession, the `member ≥ public` refusal — is owned ENTIRELY by
// `pool/drive-target-policy.ts` and is ⛔ NOT re-implemented here.
//
// Governance of record: `2026-09-04-190` cl.7 (Trustee-ratified — Dhiraj Rahul + Kalpana Bharti) ·
// `-191` cl.4 · `-189` cl.3 · `2026-09-05-201` (the two concurrency controls) · `2026-09-06-203`.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔⛔ THIS MODULE SHIPS A CONTROL WITH ⛔ NO VISIBLE OUTPUT, AND THAT IS CORRECT
// ══════════════════════════════════════════════════════════════════════════════════════════════
// `2026-09-04-190` cl.7(b) makes the target invisible to members and the public. ⇒ setting it here
// changes ⛔ NOTHING any visitor or member sees, today or after this story. Story 11b.14 is its
// first consumer and reads it **SERVER-SIDE ONLY** — the value reaches a read model, ⛔ never a
// response body. ⛔ Do ⛔ not "finish the job" by adding a preview, and ⛔ do not add the target to
// any public or member shape.
//
// ── ⭐⭐ TWO GATES, TWO RESOURCES — the authority split is in the ROUTE TABLE ────────────────────
//   · the TARGET routes gate on `pariwar.manage_drive_target`            (`pariwar_admin` + super)
//   · the REVEAL routes gate on `pariwar.manage_drive_target_visibility` (⛔ `super_admin` ONLY)
// ⛔ There is ⛔ NO handler that branches on the caller's role to decide what to return. AC5's
// *"the reveal switches are visible only to a super_admin"* is satisfied by a **403 on a separate
// route**, ⛔ never by shaping one response two ways — which would put the boundary D1 and D2 made
// structural back inside a handler.
//
// ── The rejection paths, each with a DESIGNED status ────────────────────────────────────────────
//   400 — a blank rationale, a non-integer/non-positive/absurd target, rejected at the CONTRACT
//         boundary (`SetDriveTargetRequest`).
//   401 — no admin session (`requireAdminSession`).
//   403 — the session lacks the grant (`requirePermissionHook`). ⭐ THIS is the denial a
//         `pariwar_admin` hits on the REVEAL routes, and it is AC3's regression guard at the wire.
//   409 — `admin.display_name_missing`; `pariwar.drive_target_version_conflict` (a stale
//         `expectedVersion`); `pariwar.drive_target_idempotency_in_progress`.
//   422 — `pariwar.drive_target_visibility_invalid` (public-revealed while members hidden).
// ⛔ NONE of them is a 500. Every domain error class this module can raise IS REGISTERED in
// `middleware/error-mapping/index.ts` — ⛔ this is deliberately ⛔ NOT the masking module's posture,
// whose `UngovernedNomineeBankMaskingChangeError` is unregistered and reaches the wire as an opaque
// 500 (Story 11b.3a chunk G2's finding). ⛔ Do not add a domain throw here without registering it.
//
// ── PII discipline ──────────────────────────────────────────────────────────────────────────────
// ⛔ NOTHING HERE READS, DECRYPTS, LOGS OR ECHOES MEMBER DATA. This module writes a per-Pariwar
// FIGURE and two booleans. The rows + audit lines carry ids + timestamps + the chosen values + a
// staff-authored rationale + the acting admin's controlled `users.display_name`.

import { createHash, randomUUID } from 'node:crypto';

import type {
  DriveTargetResponse,
  DriveTargetVisibilityResponse,
  SetDriveTargetRequest,
  SetDriveTargetVisibilityRequest,
} from '@twt/contracts';
import {
  audit,
  canonicalJsonStringify,
  idempotency,
  ids,
  pool as poolDomain,
  schema,
  type Db,
} from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError, ConflictError } from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';

/**
 * The two keys (catalog v41, Story 11b.13 / Decision `2026-09-06-203`).
 * ⛔ Sourced from the domain constants, ⛔ not re-typed: each key string lives in one place.
 */
const MANAGE_DRIVE_TARGET_KEY = poolDomain.DRIVE_TARGET_PERMISSION_KEY;
const MANAGE_DRIVE_TARGET_VISIBILITY_KEY = poolDomain.DRIVE_TARGET_VISIBILITY_PERMISSION_KEY;

/** Story 1.10 audit actions — dotted-lowercase MULTI-dot (the writer's regex permits multiple). */
const AUDIT_ACTION_TARGET_CHANGED = 'pariwar.drive_target.changed';
const AUDIT_ACTION_VISIBILITY_CHANGED = 'pariwar.drive_target_visibility.changed';

/**
 * Idempotency TTL for a target change. Matches the feature-flag flip window — an operator retry or a
 * proxy retry lands well inside it, and a genuinely new decision minutes later is a new intent.
 */
const DRIVE_TARGET_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/** Serialize a schedule row → the transport DTO (Date → Iso8601 at the boundary). */
function toTargetDto(row: schema.PariwarDriveTargetScheduleRow | null): DriveTargetResponse {
  if (row === null) {
    // ⭐ `configured: false` is reported EXPLICITLY, ⛔ never inferred from all-null fields. It is a
    // DIFFERENT fact from a Pariwar that set a small target: Story 11b.14's ruling makes an unset
    // target *"⛔ no bar"*, not *"a bar at 0%"*.
    return {
      targetInr: null,
      configured: false,
      effectiveFrom: null,
      changedByDisplay: null,
      rationale: null,
      version: null,
    };
  }
  return {
    targetInr: row.targetInr,
    configured: true,
    effectiveFrom: row.effectiveFrom.toISOString(),
    changedByDisplay: row.changedByDisplay,
    rationale: row.rationale,
    version: row.version,
  };
}

/** Serialize a visibility row → the transport DTO. An absent row is the ruled FAIL-CLOSED default. */
function toVisibilityDto(
  row: schema.PariwarDriveTargetVisibilityRow | null,
): DriveTargetVisibilityResponse {
  if (row === null) {
    // ⭐⭐ cl.7(b): nobody has chosen this, and what applies is HIDDEN FROM EVERYONE. ⚠⛔ The
    // deliberate OPPOSITE of the masking control's `D8-default` FAIL-OPEN — and the operator is told
    // WHICH state they are looking at, because *"nobody configured this"* and *"the Trust decided to
    // hide it"* are different facts.
    return {
      visibility: { revealToMembers: false, revealToPublic: false },
      configured: false,
      changedByDisplay: null,
      rationale: null,
      updatedAt: null,
    };
  }
  return {
    visibility: { revealToMembers: row.revealToMembers, revealToPublic: row.revealToPublic },
    configured: true,
    changedByDisplay: row.changedByDisplay,
    rationale: row.rationale,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createDriveTargetHandlers(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  /** Read the scope-resolved tx + actor, or throw (the route chain guarantees both are present). */
  function scopeCtx(request: FastifyRequest): { tx: Db; pariwarIdStr: string; actorId: string } {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new Error('[drive-target] handler ran without session + scope-resolution');
    }
    return { tx: scopeTx.tx, pariwarIdStr: scopeTx.pariwarId, actorId };
  }

  /**
   * ⭐⭐ `2026-09-05-201` cl.3 — `Idempotency-Key`, OPT-IN, reusing the shared keyed store.
   *
   * ⛔⛔ AND IT RUNS **FIRST**, BEFORE `expectedVersion`. SAID HERE AT THE CALL SITE BECAUSE `-201`
   * cl.2 REQUIRES IT SAID HERE. Reversed, the two fight each other: a legitimate retry after a
   * timeout carries the STALE version, the version guard fires, and the operator is told *"someone
   * else changed this"* — ⛔ when the someone was **themselves**. That is a false signal on a
   * governance surface, and it drives them to re-check and re-submit, ⇒ manufacturing exactly the
   * duplicate the key exists to prevent. ⛔ Do ⛔ not reorder them.
   *
   * ⚠ WHY BOTH, AND ⛔ WHY NEITHER SUBSTITUTES FOR THE OTHER (`-201` cl.1): `expectedVersion`
   * answers *"is the world as you last saw it?"* (a CONCURRENT lost update); this answers *"have I
   * already applied this exact intent?"* (a SEQUENTIAL replay — a timed-out retry, a double-clicked
   * button, a proxy retry creating a second version and a second audit line, on a surface whose
   * entire purpose is provenance).
   *
   * ⚠ NAMESPACED by route + scope + `pariwarId` — the precedent's own warning is that two tenants
   * must ⛔ never collide on a client reusing one key per user action.
   *
   * ⚠⛔ AND THE INHERITED WINDOW IS RESTATED RATHER THAN SILENTLY ADOPTED (`-201` cl.3): the result
   * is recorded BEFORE the caller's scope tx commits (the store runs on its own connection), so a
   * commit failure afterwards leaves a recorded result for a write that never landed. ⛔ That window
   * is INHERITED from the feature-flags precedent, ⛔ not introduced here; the replay is a read of
   * the recorded response, so the worst case is a client being told about a version it can then fail
   * to find — noisy, ⛔ not corrupting.
   */
  async function withIdempotency<T>(
    request: FastifyRequest,
    namespace: string,
    run: () => Promise<T>,
  ): Promise<T> {
    const headerKey = request.headers['idempotency-key'];
    const idemKey =
      typeof headerKey === 'string' && headerKey.trim() !== ''
        ? `${namespace}:${headerKey.trim()}`
        : null;
    // ⛔ No header ⇒ previous behaviour EXACTLY (`-201` cl.3). Making the key mandatory would break
    // a caller for a guarantee only some callers need.
    if (idemKey === null) return run();

    const claimOutcome = await idempotencyStore.claim(
      idemKey,
      DRIVE_TARGET_IDEMPOTENCY_TTL_SECONDS,
    );
    if (claimOutcome === 'already_claimed') {
      const stored = await idempotencyStore.getResult(idemKey);
      if (stored !== null) return stored as T;
      // Claimed but no result recorded yet — the original attempt is still in flight. A 409 rather
      // than racing it: two changes landing would defeat the point of the key.
      throw new ConflictError(
        'A drive-target change with this Idempotency-Key is already in progress — wait and retry',
        'pariwar.drive_target_idempotency_in_progress',
      );
    }

    try {
      const result = await run();
      await idempotencyStore.recordResult(idemKey, result);
      return result;
    } catch (err: unknown) {
      // Release the claim so a genuinely failed attempt can be retried immediately rather than being
      // locked out for the whole TTL (the feature-flags / member-handlers precedent).
      await idempotencyStore.release(idemKey).catch(() => undefined);
      throw err;
    }
  }

  /** Resolve the acting admin's controlled display name, or fail closed with a 409. */
  async function requireDisplayName(actorId: string): Promise<string> {
    // ⛔ The client NEVER supplies this — a browser-supplied display name would let an operator lie
    // about who made the change. Resolved BEFORE the domain write so the 409 arrives with no partial
    // state change ([[project_admin_display_name_attribution]]).
    const actorDisplay = await getDisplayName(deps.pool, actorId);
    if (actorDisplay === null) throw new AdminDisplayNameMissingError(actorId);
    return actorDisplay;
  }

  return {
    MANAGE_DRIVE_TARGET_KEY,
    MANAGE_DRIVE_TARGET_VISIBILITY_KEY,

    /**
     * GET the Pariwar's current target (absent row ⇒ the unset shape).
     *
     * ⚠ Reads the OPEN HEAD (what is set), ⛔ not the window in force at `now` — they differ only
     * for a head whose `effective_from` is in the future, which this write path cannot create. The
     * console shows what a person set, and the `version` it returns is what the next PUT echoes back
     * as `expectedVersion`.
     */
    async getTarget(request: FastifyRequest): Promise<DriveTargetResponse> {
      const { tx, pariwarIdStr } = scopeCtx(request);
      const row = await poolDomain.getDriveTargetHead(tx, ids.pariwarId(pariwarIdStr));
      return toTargetDto(row);
    },

    /** PUT the governed target change (close the head + insert a new one + audit, compensated). */
    async setTarget(request: FastifyRequest): Promise<DriveTargetResponse> {
      const { tx, pariwarIdStr, actorId } = scopeCtx(request);
      const body = request.body as SetDriveTargetRequest;
      const pariwarId = ids.pariwarId(pariwarIdStr);

      // ⛔⛔ THE IDEMPOTENCY SEAM WRAPS EVERYTHING, so it is evaluated BEFORE the domain's
      // `expectedVersion` check — `-201` cl.2. ⛔ Do not move the domain call outside this wrapper.
      return withIdempotency(request, `drive-target:set:${pariwarIdStr}`, async () => {
        const actorDisplay = await requireDisplayName(actorId);
        const auditId = randomUUID();
        // ⭐ ONE INSTANT for the close and the insert — the accessor closes the prior head AT this
        // instant and opens the new one AT it, so there is ⛔ no sub-millisecond gap with no row in
        // force. ⛔ Never let the accessor default it, and ⛔ never accept a caller-supplied instant
        // (the contract has no such field): a back-dated window would retroactively re-characterise
        // what target was in force, and when.
        const effectiveFrom = deps.clock();

        return audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: pariwarIdStr,
            actorId,
            actorRole: null,
            action: AUDIT_ACTION_TARGET_CHANGED,
            // A NEW locator site — constructed narrowly (this Pariwar's target) and ⛔ not a
            // widening of any existing locator (the `2026-08-21-146` re-examination trigger).
            resourceLocator: `pariwar/${pariwarIdStr}/drive-target`,
            requestPayloadHash: createHash('sha256')
              .update(
                // ⚠ `canonicalJsonStringify` (RFC 8785), ⛔ NEVER a bespoke `JSON.stringify` — the
                // standing rule, so a digest is a function of the change's MEANING rather than of a
                // serializer's key order.
                canonicalJsonStringify({
                  pariwar_id: pariwarIdStr,
                  audit_id: auditId,
                  target_inr: body.targetInr,
                  expected_version: body.expectedVersion,
                  effective_from: effectiveFrom.toISOString(),
                  rationale: body.rationale,
                }),
                'utf8',
              )
              .digest('hex'),
            traceId: request.requestContext.traceId ?? null,
          },
          mutate: async () => {
            const row = await poolDomain.setDriveTargetSchedule(tx, {
              pariwarId,
              targetInr: body.targetInr,
              // ⭐⭐ `-201` cl.4's REQUIRED guard, threaded from the wire. ⛔ Not defaulted, ⛔ not
              // `?? null` — the contract makes it required, so an omission is a 400, ⛔ never a
              // silently unguarded write.
              expectedVersion: body.expectedVersion,
              effectiveFrom,
              changedByActor: ids.userId(actorId),
              changedByDisplay: actorDisplay,
              rationale: body.rationale,
              auditId,
              // The grants `scopeResolutionHook` already loaded — ⛔ do NOT call loadActorGrants
              // again. `?? []` is the house fail-closed idiom. ⚠ The domain check is a BACKSTOP;
              // `requirePermissionHook` is what produces the 403 a denied caller actually sees.
              actorGrants: request.scopeGrants ?? [],
            });
            return toTargetDto(row);
          },
        });
      });
    },

    /**
     * GET the Pariwar's reveal posture. ⛔ `super_admin` ONLY — a `pariwar_admin` gets a **403**
     * from the route's gate, which is how AC5's *"visible only to a super_admin"* is satisfied
     * without a handler branching on the caller's role.
     */
    async getVisibility(request: FastifyRequest): Promise<DriveTargetVisibilityResponse> {
      const { tx, pariwarIdStr } = scopeCtx(request);
      const row = await poolDomain.getDriveTargetVisibilityRow(tx, ids.pariwarId(pariwarIdStr));
      return toVisibilityDto(row);
    },

    /**
     * PUT the reveal switches — the `super_admin`-only DISCLOSURE act (cl.7(c)).
     *
     * ⛔ It ⛔ cannot touch the target: `targetInr` is not on the request shape and not a column on
     * the record this writes (D2).
     */
    async setVisibility(request: FastifyRequest): Promise<DriveTargetVisibilityResponse> {
      const { tx, pariwarIdStr, actorId } = scopeCtx(request);
      const body = request.body as SetDriveTargetVisibilityRequest;
      const pariwarId = ids.pariwarId(pariwarIdStr);

      return withIdempotency(request, `drive-target:visibility:${pariwarIdStr}`, async () => {
        const actorDisplay = await requireDisplayName(actorId);
        const auditId = randomUUID();
        const now = deps.clock();

        return audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: pariwarIdStr,
            actorId,
            actorRole: null,
            action: AUDIT_ACTION_VISIBILITY_CHANGED,
            resourceLocator: `pariwar/${pariwarIdStr}/drive-target-visibility`,
            requestPayloadHash: createHash('sha256')
              .update(
                canonicalJsonStringify({
                  pariwar_id: pariwarIdStr,
                  audit_id: auditId,
                  reveal_to_members: body.visibility.revealToMembers,
                  reveal_to_public: body.visibility.revealToPublic,
                  updated_at: now.toISOString(),
                  rationale: body.rationale,
                }),
                'utf8',
              )
              .digest('hex'),
            traceId: request.requestContext.traceId ?? null,
          },
          mutate: async () => {
            const row = await poolDomain.setDriveTargetVisibility(tx, {
              pariwarId,
              visibility: body.visibility,
              changedByActor: ids.userId(actorId),
              changedByDisplay: actorDisplay,
              rationale: body.rationale,
              auditId,
              actorGrants: request.scopeGrants ?? [],
              now,
            });
            return toVisibilityDto(row);
          },
        });
      });
    },
  };
}
