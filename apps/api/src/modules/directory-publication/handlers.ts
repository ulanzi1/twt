// Directory-publication kill-switch admin handlers — Story 10.30 (Task 3; AC1, AC2).
//
// Thin handlers over the `@twt/domain` member directory-publication accessors, on the scoped admin
// chain [requireAdminSession, scopeResolutionHook, requirePermissionHook(
// pariwar.manage_directory_publication)] (the degraded-mode precedent). The mechanism — rationale,
// audit anchor, actor/display consistency, the grant check — is owned ENTIRELY by
// `setDirectoryPublicationEnabled` and is ⛔ NOT re-implemented here. This module's whole job is to
// assemble a correctly-shaped input and call it.
//
// Governance of record: Decision `2026-08-21-148` (this story), discharging `2026-08-21-147` cl.2
// over `2026-08-21-146` cl.5. ⛔ The switch remains NOT an operational control — that status turns on
// a separate ≥2-trustee ratification, ⛔ not on this surface existing.
//
// ── The rejection paths, each with a DESIGNED status ────────────────────────────────────────────────
//   400 — an empty/whitespace rationale, rejected at the CONTRACT boundary
//         (`SetDirectoryPublicationRequest.rationale` is `.trim().min(1)`).
//   401 — no admin session (`requireAdminSession`).
//   403 — the session lacks the grant (`requirePermissionHook`). ⭐ THIS is the denial path.
//   409 — the acting admin has no `users.display_name` (`AdminDisplayNameMissingError`).
// ⛔ NONE of them is a 500. `UngovernedDirectoryPublicationChangeError` `extends Error` (not
// `ApiError`) and is NOT registered in `middleware/error-mapping/index.ts`, whose documented default
// is "Anything else → 500". It is the domain's BACKSTOP; if a denied caller ever reaches it, the
// route's own gate is missing — fix the gate, ⛔ never widen an assertion to accept the 500.
//
// ── PII discipline ──────────────────────────────────────────────────────────────────────────────────
// The config row + audit lines carry ids + timestamps + the target flag + a staff-authored rationale
// + the acting admin's controlled `users.display_name`. ⛔ NEVER a member mobile / name / device
// token. The audit request-hash is a SHA-256 digest of the canonical-JSON change fields (mirrors
// degraded-mode/handlers.ts's node:crypto usage).

import { createHash, randomUUID } from 'node:crypto';

import { audit, canonicalJsonStringify, ids, member as memberDomain, schema, type Db } from '@twt/domain';
import type {
  DirectoryPublicationStatusResponse,
  SetDirectoryPublicationRequest,
} from '@twt/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError } from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';

/**
 * The `pariwar.manage_directory_publication` key (Story 11a.3, catalog v38) — super_admin ONLY.
 * ⛔ Sourced from the domain constant, not re-typed: the key string lives in one place.
 */
const MANAGE_DIRECTORY_PUBLICATION_KEY = memberDomain.DIRECTORY_PUBLICATION_PERMISSION_KEY;

/** The Story 1.10 audit action — dotted-lowercase MULTI-dot (the writer's regex permits multiple dots). */
const AUDIT_ACTION_CHANGED = 'pariwar.directory_publication.changed';

/**
 * Serialize a config row → the transport DTO (Date → Iso8601 at the boundary).
 *
 * ⭐ A present row is ALWAYS `configured: true`, even when `enabled` is true — a Pariwar somebody
 * deliberately re-enabled and a Pariwar nobody ever touched are different facts and the operator is
 * shown which one they are looking at (AC1).
 */
function toStatusDto(
  row: schema.PariwarDirectoryPublicationRow | null,
): DirectoryPublicationStatusResponse {
  if (row === null) {
    // ⚠ The default is ENABLED, mirroring `resolveDirectoryPublicationEnabled`'s own asymmetry: an
    // absent row means "not individually disabled", ⛔ not "shielded".
    return {
      enabled: true,
      configured: false,
      changedByDisplay: null,
      rationale: null,
      updatedAt: null,
    };
  }
  return {
    enabled: row.enabled,
    configured: true,
    changedByDisplay: row.changedByDisplay,
    rationale: row.rationale,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createDirectoryPublicationHandlers(deps: AppDeps) {
  /** Read the scope-resolved tx + actor, or throw (the route chain guarantees both are present). */
  function scopeCtx(request: FastifyRequest): { tx: Db; pariwarIdStr: string; actorId: string } {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new Error('[directory-publication] handler ran without session + scope-resolution');
    }
    return { tx: scopeTx.tx, pariwarIdStr: scopeTx.pariwarId, actorId };
  }

  return {
    MANAGE_DIRECTORY_PUBLICATION_KEY,

    /** GET the current kill-switch state (absent row ⇒ the default-enabled, unconfigured shape). */
    async getStatus(request: FastifyRequest): Promise<DirectoryPublicationStatusResponse> {
      const { tx, pariwarIdStr } = scopeCtx(request);
      const row = await memberDomain.getDirectoryPublicationRow(tx, ids.pariwarId(pariwarIdStr));
      return toStatusDto(row);
    },

    /**
     * PUT the governed flip (upsert + audit, compensated on failure per ADR-0030).
     *
     * ⚠ The effect on the public surface is ⛔ NOT instantaneous: `/members` is `edge_cacheable` with
     * `s-maxage=300`, so warm PoPs keep serving the prior state, PER PAGE NUMBER, until those
     * entries expire (`2026-08-21-145` cl.5(e)). The console discloses this; nothing here may imply
     * otherwise.
     */
    async setStatus(request: FastifyRequest): Promise<DirectoryPublicationStatusResponse> {
      const { tx, pariwarIdStr, actorId } = scopeCtx(request);
      const body = request.body as SetDirectoryPublicationRequest;
      const pariwarId = ids.pariwarId(pariwarIdStr);

      // Fail-closed: a missing display name BLOCKS the flip rather than falling back to an email or
      // an id ([[project_admin_display_name_attribution]]). ⛔ The client NEVER supplies this — a
      // browser-supplied display name would let an operator lie about who pulled a Pariwar's
      // directory, which is exactly the accountability `2026-08-21-146` cl.4/5 requires. Resolved
      // BEFORE the domain write so the 409 arrives without a partial state change.
      const actorDisplay = await getDisplayName(deps.pool, actorId);
      if (actorDisplay === null) {
        throw new AdminDisplayNameMissingError(actorId);
      }

      // Pre-generate the §1.5 audit anchor so the audit intent line and the upserted row agree on it
      // (writing the LINE is the caller's obligation — the domain module's 10.12 narrow-write posture).
      const auditId = randomUUID();

      return audit.withCompensatingAudit(deps.servicePool, {
        // Audit over the PII-free change fields (ids + the target flag + the staff-authored rationale).
        auditIntent: {
          pariwarId: pariwarIdStr,
          actorId,
          actorRole: null,
          action: AUDIT_ACTION_CHANGED,
          // A NEW locator site — constructed narrowly (this Pariwar's switch + the target value) and
          // ⛔ not a widening of any existing locator (the `2026-08-21-146` open re-examination
          // trigger on resourceLocator widening).
          resourceLocator: `pariwar/${pariwarIdStr}/directory-publication;enabled=${String(body.enabled)}`,
          requestPayloadHash: createHash('sha256')
            .update(
              canonicalJsonStringify({
                pariwar_id: pariwarIdStr,
                audit_id: auditId,
                enabled: body.enabled,
                rationale: body.rationale,
              }),
              'utf8',
            )
            .digest('hex'),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async () => {
          const row = await memberDomain.setDirectoryPublicationEnabled(tx, {
            pariwarId,
            enabled: body.enabled,
            changedByActor: ids.userId(actorId),
            changedByDisplay: actorDisplay,
            rationale: body.rationale,
            auditId,
            // The grants `scopeResolutionHook` already loaded — ⛔ do NOT call loadActorGrants again.
            // `?? []` is the house fail-closed idiom: an absent value must resolve to NO grants, not
            // to an unchecked write (the reasoning is written out at member-moderation/handlers.ts).
            // ⚠ The domain's own check is a BACKSTOP; `requirePermissionHook` is what produces the
            // 403 a denied caller actually sees.
            actorGrants: request.scopeGrants ?? [],
          });
          return toStatusDto(row);
        },
      });
    },
  };
}
