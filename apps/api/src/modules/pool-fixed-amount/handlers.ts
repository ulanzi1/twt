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
  type PoolFixedAmountEligibleAttestorsResponse,
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
  ForbiddenError,
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
      'An emergency override requires a non-empty attesting trustee panel',
      'pool.fixed_amount_attestation_required',
    );
  }
  if (err instanceof poolDomain.PoolFixedAmountPanelTooSmallError) {
    throw new BadRequestError(
      `An emergency override requires an attesting panel of at least ${String(err.minimum)} distinct trustees`,
      'pool.fixed_amount_panel_too_small',
    );
  }
  if (err instanceof poolDomain.PoolFixedAmountPanelDuplicateActorError) {
    throw new BadRequestError(
      'The attesting panel roster must not list the same actor more than once',
      'pool.fixed_amount_panel_duplicate_actor',
    );
  }
  // Story 10.13 (AC3) — the ELIGIBILITY refusal. 403, not 400: the roster is well-formed and the
  // request is well-shaped; what fails is AUTHORIZATION of a named actor, and conflating that with a
  // shape error would tell the trustee to fix their input when the answer is "that person may not
  // attest". Deliberately does NOT name the actor in the message — the id is in the audit line, and a
  // 403 body is the wrong place to enumerate who does or does not hold a key.
  if (err instanceof poolDomain.PoolFixedAmountPanelMemberUnauthorizedError) {
    throw new ForbiddenError(
      'Every attesting panel member must hold the emergency fixed-amount permission in this Pariwar',
      'pool.fixed_amount_panel_member_unauthorized',
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
        // ⭐ Story 10.13 (AC4) — ONE DB-authoritative instant (§1.11) shared by BOTH reads, sourced
        // here rather than defaulted twice. `resolveEffectiveFixedAmountRow` and
        // `resolveUpcomingFixedAmountChange` partition the schedule at `asOf` (in force at / strictly
        // after), so reading them at two different clock instants could show the SAME entry as both
        // "effective now" and "scheduled", or as neither. ⛔ Never a JS `new Date()`.
        const asOf = await poolDomain.readDbNow(tx.tx);
        // Amount effective NOW (a display read, not the spawn path).
        const effective = await poolDomain.resolveEffectiveFixedAmountRow(tx.tx, ctx.pariwarId, asOf);
        // The next change NOT YET in force. The resolver has existed since Story 7.5 and its only
        // consumer was the MEMBER card — the trustee's own setter never showed it, which is the one
        // literal epic clause ("current + scheduled values") 7.5 left unsatisfied.
        const upcoming = await poolDomain.resolveUpcomingFixedAmountChange(tx.tx, ctx.pariwarId, asOf);
        const schedule = await poolDomain.listFixedAmountSchedule(tx.tx, ctx.pariwarId);
        const attestations = await poolDomain.listEmergencyAttestations(tx.tx, ctx.pariwarId);
        const emergencyByVersion = new Map(attestations.rows.map((a) => [a.scheduleVersion, a]));
        ok = true;
        void reply.status(200);
        return {
          pariwar_id: ctx.pariwarIdStr,
          effective_amount: effective ? effective.fixedAmount : null,
          effective_version: effective ? effective.version : null,
          upcoming: upcoming
            ? {
                version: upcoming.version,
                fixed_amount: upcoming.fixedAmount,
                effective_from: upcoming.effectiveFrom.toISOString(),
                change_type: upcoming.changeType,
              }
            : null,
          schedule: schedule.rows.map((r) => toEntry(r, emergencyByVersion)),
          schedule_has_more: schedule.hasMore,
        };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },

    /**
     * ⭐ GET …/admin/pool-fixed-amount/eligible-attestors — the eligible-attestor directory (10.13 AC2).
     *
     * Gated on the EMERGENCY key at the route. Reads inside a scope tx because the accessor joins the
     * RLS-scoped `role_grants` — a GET opening a transaction is architecturally MANDATORY here, not an
     * inefficiency (RLS is transaction-scoped).
     * ⚠ Convenience, never the boundary: `postEmergency` re-checks every submitted actor regardless.
     */
    async getEligibleAttestors(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<PoolFixedAmountEligibleAttestorsResponse> {
      const ctx = await contextOf(request);
      const tx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      try {
        const attestors = await poolDomain.resolveEligibleFixedAmountAttestors(tx.tx, ctx.pariwarId);
        ok = true;
        void reply.status(200);
        return {
          pariwar_id: ctx.pariwarIdStr,
          attestors: attestors.map((a) => ({ actor_id: a.actorId, display_name: a.displayName })),
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

      // ⭐ Story 10.13 (AC3) — the scope tx is opened FIRST, because the eligibility check reads
      // `role_grants` and RLS is TRANSACTION-scoped. Everything that can refuse this override now runs
      // inside one tx, so a refusal at any stage leaves NO schedule row and NO attestation row.
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: poolDomain.ApplyEmergencyOverrideResult;
      try {
        // ⛔ ELIGIBILITY RUNS BEFORE THE DISPLAY RESOLUTION, AND THE ORDER IS LOAD-BEARING (AC3).
        // An ineligible actor who ALSO has no display name would otherwise report the WRONG error —
        // a 409 AdminDisplayNameMissing instead of the 403 eligibility refusal — and the audit line
        // would record the wrong reason, which is the one artefact anyone reviewing a refused
        // emergency override actually reads.
        //
        // Decision `2026-08-16-123` clause 2 (Q2.1 option (a), key-as-credential): every submitted
        // panel member must hold `pool.fixed_amount_emergency` @ this Pariwar. Evaluated on the SCOPED
        // client, so a cross-tenant holder's grants are invisible and fold to "no grants" ⇒ refused.
        // ⚠ This is the BOUNDARY. The admin picker that offers the eligible attestors is CONVENIENCE
        // and this check stands whether or not the client used it.
        await poolDomain.assertFixedAmountPanelAuthorized(
          scopeTx.client,
          ctx.pariwarId,
          body.panel_actor_ids,
        );

        // Resolve the attesting PANEL member displays FAIL-CLOSED — they are the immutable attestation
        // record's attribution (the 6.11 admin-display discipline), never id-fallback. A missing display
        // blocks the whole override (no row, no attestation) — the same posture as ctx display.
        // ⚠ Reads `deps.pool` (the GLOBAL `users` table) deliberately: display attribution is global
        // identity, and it is the ELIGIBILITY check above — not this one — that supplies the tenant and
        // role predicates this path was missing before Story 10.13.
        const panel: schema.PoolFixedAmountPanelMember[] = [];
        for (const actorId of body.panel_actor_ids) {
          const display = await getDisplayName(deps.pool, actorId);
          if (display === null) throw new AdminDisplayNameMissingError(actorId);
          panel.push({ actor_id: actorId, actor_display: display });
        }

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
        // Rejected attempts are audited too (this file's own posture, item 2). ONE rejection line now
        // covers eligibility, display gaps and domain-validation failures alike — `rejectionReason`
        // carries which, so the audit trail distinguishes "that person may not attest" from "that
        // person has no display name" without a second call site to keep in sync.
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
        // Sourced from the WRITTEN attestation row, not from the request body or a local: the audit
        // line should record the roster that was actually persisted to the immutable record.
        panel_actor_ids: attestation.panel.map((m) => m.actor_id),
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
