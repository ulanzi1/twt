// Fixed-amount schedule admin handlers — Story 7.5 (Task 4; AC1/AC3/AC4/AC5).
//
// The three trustee surfaces that fill + read the per-Pariwar effective-dated fixed-amount schedule
// (FR-15): the current schedule/effective-amount view, the STANDARD (12-month-notice) change, and
// the EMERGENCY adjustment override. v1 actor = pariwar_admin-as-Trustee-Lite; the route chain
// proves an authenticated HUMAN admin + the pariwar-wide key + tenant, and the emergency route ADDS
// a step-up gate.
//
// ── Governance posture (D3) — equivalent to R9, WITHOUT the R9 voting lifecycle ──
// The emergency override is a recorded, step-up-gated trustee attestation — the governance posture
// is EQUIVALENT to R9 (step-up + recorded trustee attestation + auditability). It is deliberately
// NOT the R9 voting lifecycle (no session/vote/quorum). Do NOT pull the R9 subsystem in here.
//
// ── Concerns THIS file owns (the 6.11/6.13/6.14 posture) ──────────────────────
// (1) ACTOR-DISPLAY (R5) resolves FIRST, before any tx — server-side from users.display_name;
//     NULL/empty → AdminDisplayNameMissingError (409) fail-closed, no row/event/audit. The emergency
//     PANEL member displays are ALSO resolved fail-closed — they are the immutable attestation
//     record's attribution ([[project_admin_display_name_attribution]]), never id-fallback.
// (2) AUDIT IS A POST-COMMIT SINK — NON-PII: change_type + version + fixed_amount + effective_from,
//     and (emergency) the panel roster ids + documented_reason (policy/operational ONLY — never
//     member-specific, D3, so it is safe in the audit line). Rejected attempts are audited too.
// (3) The notification SEAM fires POST-COMMIT (deps.poolFixedAmountChangedHook) — a console
//     placeholder in v1 (Story 5.1 dispatcher precedent), NOT live fan-out.

import {
  type PoolFixedAmountEmergencyRecord,
  type PoolFixedAmountEmergencyRequest,
  type PoolFixedAmountEmergencyResponse,
  type PoolFixedAmountScheduleEntry,
  type PoolFixedAmountScheduleRequest,
  type PoolFixedAmountScheduleResponse,
  type PoolFixedAmountView,
} from '@twt/contracts';
import { ids, pool as poolDomain, type schema } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

type ScheduleRow = typeof schema.poolFixedAmountSchedule.$inferSelect;
type AttestationRow = typeof schema.poolFixedAmountEmergencyAttestations.$inferSelect;

/** Map a fixed-amount domain error to its stable HTTP shape. Rethrows ApiErrors + unknown as-is. */
function translateFixedAmountError(err: unknown): never {
  if (err instanceof poolDomain.PoolFixedAmountNoticeTooShortError) {
    throw new BadRequestError(
      'A standard change must take effect at least 12 months (365 days) in the future',
      'pool.fixed_amount_notice_too_short',
    );
  }
  if (err instanceof poolDomain.PoolFixedAmountReasonRequiredError) {
    throw new BadRequestError(
      'An emergency override requires a documented policy/operational reason',
      'pool.fixed_amount_reason_required',
    );
  }
  if (err instanceof poolDomain.PoolFixedAmountAttestationRequiredError) {
    throw new BadRequestError(
      'An emergency override requires a non-empty State-Trustee panel attestation',
      'pool.fixed_amount_attestation_required',
    );
  }
  if (err instanceof poolDomain.PoolFixedAmountPanelTooSmallError) {
    throw new BadRequestError(
      `An emergency override requires an attesting panel of at least ${String(err.minimum)} distinct State-Trustees`,
      'pool.fixed_amount_panel_too_small',
    );
  }
  if (err instanceof poolDomain.PoolFixedAmountPanelDuplicateActorError) {
    throw new BadRequestError(
      'The attesting panel roster must not list the same actor more than once',
      'pool.fixed_amount_panel_duplicate_actor',
    );
  }
  if (err instanceof poolDomain.PoolFixedAmountInvalidError) {
    throw new BadRequestError(
      'The fixed amount must be a positive whole-rupee integer within the guard-rail ceiling',
      'pool.fixed_amount_invalid',
    );
  }
  if (err instanceof poolDomain.PoolFixedAmountVersionConflictError) {
    throw new ConflictError('The schedule was updated concurrently — reload and try again', 'pool.fixed_amount_version_conflict');
  }
  throw err;
}

/** The error's class name for the 'rejected' audit line (non-PII). */
function rejectionReason(err: unknown): string {
  return err instanceof Error ? err.name : 'unknown';
}

interface FixedAmountContext {
  actorId: string;
  pariwarId: ids.PariwarId;
  pariwarIdStr: string;
  /** The R5 decision-time display snapshot — resolved FIRST (fail-closed on missing). */
  actorDisplay: string;
}

export function createPoolFixedAmountHandlers(deps: AppDeps) {
  /**
   * Establish the request context + resolve the actor-display snapshot (R5) FIRST — before any tx.
   * A missing/empty display name BLOCKS with AdminDisplayNameMissingError (409), fail-closed: no
   * row, no event, no audit line. NO fallback of any kind.
   */
  async function contextOf(request: FastifyRequest): Promise<FixedAmountContext> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const actorDisplay = await getDisplayName(deps.pool, actorId);
    if (actorDisplay === null) {
      // Rejected attempts are audited too (this file's own posture, item 2) — the actor's OWN
      // missing R5 display is a rejection just like a downstream domain-validation failure, so it
      // gets the same audit line even though no FixedAmountContext exists yet to build it from.
      emitAuthAudit(deps, request, 'admin_pool_fixed_amount.rejected', {
        actorId,
        pariwarId: ids.pariwarId(scopeTx.pariwarId),
        context: { action: 'context', reason: 'AdminDisplayNameMissingError' },
      });
      throw new AdminDisplayNameMissingError(actorId);
    }
    return {
      actorId,
      pariwarId: ids.pariwarId(scopeTx.pariwarId),
      pariwarIdStr: scopeTx.pariwarId,
      actorDisplay,
    };
  }

  function audit(
    request: FastifyRequest,
    type: AuthAuditEventType,
    ctx: FixedAmountContext,
    context: Record<string, unknown>,
  ): void {
    emitAuthAudit(deps, request, type, { actorId: ctx.actorId, pariwarId: ctx.pariwarId, context });
  }

  function toEmergencyRecord(row: AttestationRow): PoolFixedAmountEmergencyRecord {
    return {
      schedule_version: row.scheduleVersion,
      fixed_amount: row.fixedAmount,
      panel: row.panel.map((m) => ({ actor_id: m.actor_id, actor_display: m.actor_display })),
      attested_by_actor: row.attestedByActor,
      attested_display: row.attestedDisplay,
      documented_reason: row.documentedReason,
      attested_at: row.attestedAt.toISOString(),
    };
  }

  function toEntry(
    row: ScheduleRow,
    emergencyByVersion: ReadonlyMap<number, AttestationRow>,
  ): PoolFixedAmountScheduleEntry {
    const rec = row.changeType === 'emergency' ? emergencyByVersion.get(row.version) : undefined;
    return {
      version: row.version,
      fixed_amount: row.fixedAmount,
      effective_from: row.effectiveFrom.toISOString(),
      effective_until: row.effectiveUntil ? row.effectiveUntil.toISOString() : null,
      change_type: row.changeType,
      created_by_actor: row.createdByActor,
      created_at: row.createdAt.toISOString(),
      emergency_record: rec ? toEmergencyRecord(rec) : null,
    };
  }

  return {
    /** GET …/admin/pool-fixed-amount — the current schedule + the amount effective NOW (AC1). */
    async getView(request: FastifyRequest, reply: FastifyReply): Promise<PoolFixedAmountView> {
      const ctx = await contextOf(request);
      const tx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      try {
        // Amount effective NOW (DB now() default — this read is a display, not the spawn path).
        const effective = await poolDomain.resolveEffectiveFixedAmountRow(tx.tx, ctx.pariwarId);
        const schedule = await poolDomain.listFixedAmountSchedule(tx.tx, ctx.pariwarId);
        const attestations = await poolDomain.listEmergencyAttestations(tx.tx, ctx.pariwarId);
        const emergencyByVersion = new Map(attestations.rows.map((a) => [a.scheduleVersion, a]));
        ok = true;
        void reply.status(200);
        return {
          pariwar_id: ctx.pariwarIdStr,
          effective_amount: effective ? effective.fixedAmount : null,
          effective_version: effective ? effective.version : null,
          schedule: schedule.rows.map((r) => toEntry(r, emergencyByVersion)),
          schedule_has_more: schedule.hasMore,
        };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },

    /** POST …/admin/pool-fixed-amount/schedule — a STANDARD (12-month-notice) change (AC1). */
    async postSchedule(request: FastifyRequest, reply: FastifyReply): Promise<PoolFixedAmountScheduleResponse> {
      const ctx = await contextOf(request);
      const body = request.body as PoolFixedAmountScheduleRequest;
      const effectiveFrom = new Date(body.effective_from);
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let entry: ScheduleRow;
      try {
        entry = await poolDomain.scheduleStandardChange(scopeTx.tx, {
          pariwarId: ctx.pariwarId,
          fixedAmount: body.fixed_amount,
          effectiveFrom,
          actorId: ctx.actorId,
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_pool_fixed_amount.rejected', ctx, {
          action: 'schedule',
          fixed_amount: body.fixed_amount,
          effective_from: body.effective_from,
          reason: rejectionReason(err),
        });
        return translateFixedAmountError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, 'admin_pool_fixed_amount.schedule', ctx, {
        change_type: entry.changeType,
        version: entry.version,
        fixed_amount: entry.fixedAmount,
        effective_from: entry.effectiveFrom.toISOString(),
      });
      // Notification seam (post-commit) — queued cadence for a standard change (v1 inert).
      fireHook(deps, request, entry, 'queued');
      void reply.status(201);
      return { entry: toEntry(entry, new Map()) };
    },

    /** POST …/admin/pool-fixed-amount/emergency — an EMERGENCY override (AC3/AC4). Step-up-gated. */
    async postEmergency(request: FastifyRequest, reply: FastifyReply): Promise<PoolFixedAmountEmergencyResponse> {
      const ctx = await contextOf(request);
      const body = request.body as PoolFixedAmountEmergencyRequest;
      const effectiveFrom = new Date(body.effective_from);

      // Resolve the attesting PANEL member displays FAIL-CLOSED — they are the immutable attestation
      // record's attribution (the 6.11 admin-display discipline), never id-fallback. A missing display
      // blocks the whole override (no row, no attestation) — the same posture as ctx display. Audited
      // as a rejection too (this file's own posture, item 2) — a panel-member display gap is a real
      // rejected attempt, not a silent no-audit-trail 409.
      const panel: schema.PoolFixedAmountPanelMember[] = [];
      for (const actorId of body.panel_actor_ids) {
        const display = await getDisplayName(deps.pool, actorId);
        if (display === null) {
          audit(request, 'admin_pool_fixed_amount.rejected', ctx, {
            action: 'emergency',
            fixed_amount: body.fixed_amount,
            effective_from: body.effective_from,
            panel_actor_ids: body.panel_actor_ids,
            reason: 'AdminDisplayNameMissingError',
          });
          throw new AdminDisplayNameMissingError(actorId);
        }
        panel.push({ actor_id: actorId, actor_display: display });
      }

      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: poolDomain.ApplyEmergencyOverrideResult;
      try {
        result = await poolDomain.applyEmergencyOverride(scopeTx.tx, {
          pariwarId: ctx.pariwarId,
          fixedAmount: body.fixed_amount,
          effectiveFrom,
          documentedReason: body.documented_reason,
          panel,
          attestedByActor: ctx.actorId,
          attestedDisplay: ctx.actorDisplay,
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_pool_fixed_amount.rejected', ctx, {
          action: 'emergency',
          fixed_amount: body.fixed_amount,
          effective_from: body.effective_from,
          panel_actor_ids: body.panel_actor_ids,
          reason: rejectionReason(err),
        });
        return translateFixedAmountError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      const { schedule: entry, attestation } = result;
      // NON-PII audit — the panel roster ids + documented_reason (policy/operational only, D3 — safe).
      audit(request, 'admin_pool_fixed_amount.emergency', ctx, {
        change_type: entry.changeType,
        version: entry.version,
        fixed_amount: entry.fixedAmount,
        effective_from: entry.effectiveFrom.toISOString(),
        panel_actor_ids: panel.map((m) => m.actor_id),
        documented_reason: attestation.documentedReason,
      });
      // Notification seam (post-commit) — IMMEDIATE cadence for an emergency override (v1 inert).
      fireHook(deps, request, entry, 'immediate');
      void reply.status(201);
      return { entry: toEntry(entry, new Map([[attestation.scheduleVersion, attestation]])), emergency_record: toEmergencyRecord(attestation) };
    },
  };
}

/** Fire the member-notification scaffolding seam (post-commit; never throws into the response). */
function fireHook(
  deps: AppDeps,
  request: FastifyRequest,
  entry: ScheduleRow,
  cadence: 'queued' | 'immediate',
): void {
  try {
    deps.poolFixedAmountChangedHook({
      pariwarId: entry.pariwarId,
      version: entry.version,
      fixedAmount: entry.fixedAmount,
      effectiveFrom: entry.effectiveFrom.toISOString(),
      changeType: entry.changeType,
      cadence,
    });
  } catch (err) {
    request.log.error({ err }, 'pool-fixed-amount notification hook failed (non-fatal)');
  }
}
