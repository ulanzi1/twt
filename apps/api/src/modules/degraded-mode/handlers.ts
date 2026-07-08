// Trustee degraded-mode declare/revoke/read handlers — Story 5.8 (Task 5; AC4, AC5).
//
// Thin handlers over the `@twt/domain` degradedMode accessors, on the scoped admin chain
// [requireAdminSession, scopeResolutionHook, requirePermissionHook(pariwar.declare_degraded_mode)] (the
// channel-config precedent). The route chain already enforced session + scope + permission; each handler
// uses the RLS-scoped `request.scopeTx.tx` for reads/writes and `deps.servicePool` for the audit line. Both
// the declaration AND the revocation are AUDITED via the Story 1.10 hash-chain writer (AC5).
//
// ── PII discipline ─────────────────────────────────────────────────────────────────────────────────────
// The declaration row + audit lines are PII-free: ids + timestamps + mode + reason (a trustee-authored
// justification) only. NEVER a member mobile / name / device token. The audit request-hash is a SHA-256
// digest of the canonical-JSON declaration fields (mirror channel-config/handlers.ts's node:crypto usage —
// NOT the `sha256Hex` @twt/channels helper apps/api does not import).

import { createHash, randomUUID } from 'node:crypto';

import { audit, canonicalJsonStringify, degradedMode, ids, schema, type Db } from '@twt/domain';
import type {
  DegradedModeActiveResponse,
  DegradedModeDeclarationResponse,
  DegradedModeDeclareRequest,
} from '@twt/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';

/** The `pariwar.declare_degraded_mode` key (Story 5.8, catalog v6) — the declare/revoke WRITE gate. */
const PARIWAR_DECLARE_DEGRADED_MODE_KEY = 'pariwar.declare_degraded_mode';

/** The Story 1.10 audit actions — dotted-lowercase MULTI-dot (the writer's regex permits multiple dots). */
const AUDIT_ACTION_DECLARED = 'pariwar.degraded_mode.declared';
const AUDIT_ACTION_REVOKED = 'pariwar.degraded_mode.revoked';

/** Serialize a declaration row → the transport DTO (Date → Iso8601 at the boundary). */
function toDeclarationDto(row: schema.PariwarDegradedModeDeclarationRow): DegradedModeDeclarationResponse {
  return {
    id: row.id,
    mode: row.mode as DegradedModeDeclarationResponse['mode'],
    effectiveFrom: row.effectiveFrom.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    declaredByActor: row.declaredByActor,
    reason: row.reason,
  };
}

export function createDegradedModeHandlers(deps: AppDeps) {
  /** Read the scope-resolved tx + actor, or throw (the route chain guarantees both are present). */
  function scopeCtx(request: FastifyRequest): { tx: Db; pariwarIdStr: string; actorId: string } {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new Error('[degraded-mode] handler ran without session + scope-resolution');
    }
    return { tx: scopeTx.tx, pariwarIdStr: scopeTx.pariwarId, actorId };
  }

  return {
    PARIWAR_DECLARE_DEGRADED_MODE_KEY,

    /** POST declare degraded mode (auto-revoke-then-insert + audit, compensated on failure per ADR-0030). */
    async declare(request: FastifyRequest): Promise<DegradedModeDeclarationResponse> {
      const { tx, pariwarIdStr, actorId } = scopeCtx(request);
      const body = request.body as DegradedModeDeclareRequest;
      // effectiveFrom defaults to now; the contract already rejected any backdated supplied value (AC4 #8).
      const effectiveFrom = body.effectiveFrom ? new Date(body.effectiveFrom) : new Date();
      const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      const pariwarId = ids.pariwarId(pariwarIdStr);

      // Pre-generate the declaration id so the audit intent line and the eventual INSERT agree on a
      // resourceLocator (declare is unconditional — unlike revoke, there is no no-op branch to decide here).
      const declarationId = randomUUID();

      return audit.withCompensatingAudit(deps.servicePool, {
        // Audit over the PII-free declaration fields (ids + timestamps + mode + reason).
        auditIntent: {
          pariwarId: pariwarIdStr,
          actorId,
          actorRole: null,
          action: AUDIT_ACTION_DECLARED,
          resourceLocator: `pariwar/${pariwarIdStr}/degraded-mode/declarations/${declarationId};mode=${body.mode}`,
          requestPayloadHash: createHash('sha256')
            .update(
              canonicalJsonStringify({
                pariwar_id: pariwarIdStr,
                declaration_id: declarationId,
                mode: body.mode,
                effective_from: effectiveFrom.toISOString(),
                expires_at: expiresAt ? expiresAt.toISOString() : null,
                reason: body.reason,
              }),
              'utf8',
            )
            .digest('hex'),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async () => {
          const row = await degradedMode.declareDegradedMode(tx, {
            id: declarationId,
            pariwarId,
            mode: body.mode,
            effectiveFrom,
            expiresAt,
            declaredByActor: ids.userId(actorId),
            reason: body.reason,
          });
          return toDeclarationDto(row);
        },
      });
    },

    /**
     * POST manual revocation (idempotent + audit, compensated on failure per ADR-0030). Returns the
     * now-active declaration (or null).
     *
     * The mutation decides whether an audit is warranted — NOT a pre-check read — because
     * `revokeDegradedMode`'s own WHERE clause (`id = declarationId AND revoked_at IS NULL`) is the only
     * race-free way to know whether THIS call actually revoked anything. A pre-check via
     * `getActiveDegradedMode` would use the WRONG predicate (temporally-active-now, not
     * exists-and-unrevoked-by-id — it would refuse to revoke a legitimate not-yet-active future-dated
     * declaration) and would reintroduce a TOCTOU race with a concurrent revoke of the same id (the exact
     * false-positive-audit shape the Review Finding below already fixed once). So `revoke` stays
     * mutate-then-decide; only the AUDITED branch (an actual revocation) routes through
     * `withCompensatingAudit`, covering the trailing read against a rollback after the audit commits.
     */
    async revoke(request: FastifyRequest): Promise<DegradedModeActiveResponse> {
      const { tx, pariwarIdStr, actorId } = scopeCtx(request);
      const { id } = request.params as { id: string };
      const at = new Date();
      const pariwarId = ids.pariwarId(pariwarIdStr);

      const revoked = await degradedMode.revokeDegradedMode(tx, {
        declarationId: id,
        revokedByActor: ids.userId(actorId),
        at,
      });

      // A no-op (already-revoked / nonexistent / cross-tenant id) must NOT produce an audit line claiming a
      // revocation happened (Review Finding: false-positive audit entry) — and nothing here is compensatable
      // (nothing was mutated), so it never enters `withCompensatingAudit`.
      if (!revoked) {
        const active = await degradedMode.getActiveDegradedMode(tx, pariwarId, at);
        return { active: active ? toDeclarationDto(active) : null };
      }

      return audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId: pariwarIdStr,
          actorId,
          actorRole: null,
          action: AUDIT_ACTION_REVOKED,
          resourceLocator: `pariwar/${pariwarIdStr}/degraded-mode/declarations/${id}/revoke`,
          requestPayloadHash: createHash('sha256')
            .update(
              canonicalJsonStringify({
                pariwar_id: pariwarIdStr,
                declaration_id: id,
                revoked_at: at.toISOString(),
              }),
              'utf8',
            )
            .digest('hex'),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async () => {
          const active = await degradedMode.getActiveDegradedMode(tx, pariwarId, at);
          return { active: active ? toDeclarationDto(active) : null };
        },
      });
    },

    /** GET the currently-active declaration, or null (the banner read). */
    async getActive(request: FastifyRequest): Promise<DegradedModeActiveResponse> {
      const { tx, pariwarIdStr } = scopeCtx(request);
      const active = await degradedMode.getActiveDegradedMode(tx, ids.pariwarId(pariwarIdStr), new Date());
      return { active: active ? toDeclarationDto(active) : null };
    },
  };
}
