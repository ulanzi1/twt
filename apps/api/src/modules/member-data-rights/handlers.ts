// Story 10.21 — off-portal DPDPA data-rights FULFILMENT handlers (AC3/AC4/AC5/AC7/AC12/AC13).
//
// The identity-verified administrative process Niyamavali §8.4 requires when a member's authenticated
// access has ended but their statutory rights have not. Two routes: BUILD the access/portability
// artifact, and EXECUTE erasure — both on a member with NO session.
//
// ⛔ WHAT IS DELIBERATELY ABSENT, AND WHY IT MUST STAY ABSENT ────────────────────────────────────────
//   · NO download / handover path. Delivering the built artifact is AC-R1, BLOCKED on Escalation 1 —
//     the Trustee Panel has not ruled whether a staff actor may obtain a member's assembled, decrypted
//     Tier-1 export AT ALL. ⛔ Do not add one "behind a flag": a dormant staff-decrypt path is the same
//     capability, merely unlit, and building it would settle a PII-posture question by implementation.
//   · NO correction path. AC-R2, BLOCKED on Escalation 2.
//   · NO trustee-authority routing or grant. AC-R3, BLOCKED on Escalation 10 (Decision
//     `2026-08-14-107`). ⛔ Do not grant `member.data_rights` to `trustee_panel`, do not add a routing
//     rule, and do not make `routed_to_role` authoritative — it is an advisory queue filter that NO
//     authorization path reads.
//
// ── Identity verification (AC2) ────────────────────────────────────────────────────────────────────
// Identity is anchored the Story 6.3 way, UNCHANGED: the operator's own authority plus a verbal
// read-back at intake. This module never re-verifies identity; it verifies AUTHORITY (the permission
// key + a distinct step-up) and PROVENANCE (the originating ticket).
//
// ── Subject scoping (AC4) ──────────────────────────────────────────────────────────────────────────
// ⛔ EVERY read here keys on `member_id`. The `helpdesk_ticket_id` is PROVENANCE ONLY — it records
// WHICH REQUEST caused the act, never WHAT the act may see. A ticket-scoped read would let a ticket id
// widen or narrow the subject, which is precisely the artifact-scoped shape AC4 forbids.

import type {
  OffPortalErasureRequest,
  OffPortalErasureResponse,
  OffPortalExportRequest,
  OffPortalExportResponse,
} from '@twt/contracts';
import {
  audit,
  canonicalJsonStringify,
  dataExport,
  helpdesk,
  idempotency,
  ids,
  member as memberDomain,
} from '@twt/domain';
import { createHash } from 'node:crypto';

import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** Local SHA-256 hex over a canonical string (the helpdesk-handler idiom — a sha256Hex helper in a
 *  package that DEPENDS on @twt/domain would cycle if imported). */
function sha256Hex(canonicalInput: string): string {
  return createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
}

/** Audit actions — the two fulfilment acts, each attributable to a named staff actor. */
const EXPORT_ACTION = 'member_data_rights.export_requested';
const ERASURE_ACTION = 'member_data_rights.rtbf_fulfilled';

/**
 * Lifecycle states in which an off-portal export is refused (AC12), identical to the set the member
 * self-service caller uses. ⛔ Both callers guard: guarding only one leaves the other open, and the
 * older one is the already-reachable path.
 */
const DATA_EXPORT_TERMINAL_STATES: ReadonlySet<string> = new Set(['withdrawn', 'anonymized']);

/**
 * Idempotency-claim TTL. Long enough to cover a slow erasure plus an operator's realistic retry, short
 * enough that a genuinely abandoned claim does not wedge the member forever.
 */
const DATA_RIGHTS_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

export function createMemberDataRightsHandlers(deps: AppDeps) {
  const enc = deps.encryption;
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  /**
   * Read the caller-supplied `Idempotency-Key` header (REQUIRED on every fulfilment route).
   *
   * ⛔ NOT optional, and the reason is asymmetric between the two routes. An off-portal ERASURE is
   * IRREVERSIBLE and operator-initiated: a double-submit, a proxy retry or an impatient second click
   * must not append a second `member.rtbf_anonymized`. The advisory lock (AC13) serializes genuinely
   * concurrent attempts; this de-duplicates SEQUENTIAL retries of the same intent, which the lock
   * cannot see. Both are needed — neither subsumes the other.
   */
  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.trim() === '') {
      throw new BadRequestError(
        'An Idempotency-Key header is required',
        'member_data_rights.idempotency_key_required',
      );
    }
    return key.trim();
  }

  /** Claim the key, or reject a replay/in-flight duplicate. Returns the claim key for settlement. */
  async function claimIdempotency(request: FastifyRequest, scopeName: string, subjectId: string): Promise<string> {
    const supplied = requireIdempotencyKey(request);
    const pariwarIdStr = request.requestContext.pariwarId ?? '';
    const idemKey = `member_data_rights.${scopeName}:${pariwarIdStr}:${subjectId}:${supplied}`;
    const outcome = await idempotencyStore.claim(idemKey, DATA_RIGHTS_IDEMPOTENCY_TTL_SECONDS);
    if (outcome === 'already_claimed') {
      // ⛔ A replay of an IRREVERSIBLE act is refused, not silently re-executed. We deliberately do NOT
      // return a cached success body here: the caller must observe that their retry did not perform a
      // second erasure, and a 409 says that unambiguously.
      throw new ConflictError(
        'A request with this Idempotency-Key has already been accepted',
        'member_data_rights.idempotency_replay',
      );
    }
    return idemKey;
  }

  /** The acting admin's id, or 401. */
  function adminCtx(request: FastifyRequest): { actorId: string; pariwarIdStr: string } {
    const actorId = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!actorId || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { actorId, pariwarIdStr };
  }

  /**
   * Resolve the acting admin's display name, BEFORE any write.
   *
   * ⛔ A MISSING DISPLAY NAME BLOCKS THE ACTION. This module's whole subject is a staff actor
   * exercising a member's statutory rights on their behalf; an unattributable act on that surface is
   * not acceptable. ⛔ Never email-derived, never client-supplied, never a blank fallback
   * ([[project_admin_display_name_attribution]]).
   */
  async function requireAttribution(actorId: string): Promise<string> {
    const name = await getDisplayName(deps.pool, actorId);
    if (name === null) throw new AdminDisplayNameMissingError(actorId);
    return name;
  }

  /**
   * Resolve the originating helpdesk ticket UNDER THE CALLER'S SCOPE, or 404.
   *
   * ⚠ This is what makes the tenancy-blind FK safe in practice: PostgreSQL referential integrity
   * bypasses RLS, so the FK alone would accept a cross-tenant ticket id. Reading it here, inside the
   * scope tx, is the check that refuses one. ⛔ Do not drop this on the grounds that "the FK covers it".
   */
  async function requireTicketInScope(
    scopeTx: Awaited<ReturnType<typeof openScopeTx>>,
    pariwarId: ids.PariwarId,
    ticketId: ids.HelpdeskTicketId,
  ): Promise<void> {
    const row = await helpdesk.getTicketById(scopeTx.tx, pariwarId, ticketId);
    if (!row) throw new NotFoundError('Ticket not found', 'member_data_rights.ticket_not_found');
  }

  return {
    /**
     * POST …/member-data-rights/export — BUILD the access/portability artifact for an off-portal
     * subject (AC5, off-portal-build half).
     *
     * ⛔ BUILDS ONLY. There is no delivery here (AC-R1, Escalation 1). Building is ruling-INDEPENDENT:
     * the artifact is assembled identically under either delivery model, which is why this half ships
     * while delivery does not. The expected end state of this route is therefore a `ready`, UNCONSUMED
     * row holding the complete dossier — which is exactly why AC11's erasure reach is load-bearing.
     */
    async requestExport(request: FastifyRequest): Promise<OffPortalExportResponse> {
      const { actorId, pariwarIdStr } = adminCtx(request);
      const body = request.body as OffPortalExportRequest;
      const traceId = request.requestContext.traceId;
      const now = deps.clock();

      const memberId = ids.memberId(body.member_id);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const ticketId = ids.helpdeskTicketId(body.helpdesk_ticket_id);

      // Attribution resolves FIRST, before any write — a missing name must fail closed with no row
      // and no audit, not after a partial mutation.
      await requireAttribution(actorId);
      await claimIdempotency(request, 'export', body.member_id);

      // The audit DIGEST — inputs only, NEVER the raw payload. ⛔ The originating ticket id rides the
      // digest so the audit line records WHICH REQUEST caused the build.
      const requestPayloadHash = sha256Hex(
        canonicalJsonStringify({
          member_id: body.member_id,
          helpdesk_ticket_id: body.helpdesk_ticket_id,
          requested_via: 'off_portal_admin',
        }),
      );

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      let toEnqueue: string | null = null;
      let response: OffPortalExportResponse;
      try {
        await requireTicketInScope(scopeTx, pariwarId, ticketId);

        // ⛔ AC4 — subject reads key on member_id, never on the ticket.
        const exists = await memberDomain.memberExists(scopeTx.tx, pariwarId, memberId);
        if (!exists) {
          throw new NotFoundError('Member not found', 'member_data_rights.member_not_found');
        }

        // ── AC12 — the terminal guard, on THIS caller as well as the member one ──────────────────
        // ⛔ Without it, this route could create a fresh dossier row for a member AC11 has just
        // erased — re-opening the very artifact class AC11 exists to close. The blast radius is
        // bounded (the rebuild contains sentinels, not live PII), which is exactly why it would
        // survive review unnoticed.
        const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, now);
        if (DATA_EXPORT_TERMINAL_STATES.has(state)) {
          throw new ConflictError(
            'Data export is not available for a closed membership',
            'data_export.member_terminal',
          );
        }

        // ⛔ `withCompensatingAudit` (ADR-0030), NOT a bare `writeAuditEntry`: the intent line commits
        // FIRST, so a mutation that then fails leaves a recorded intent plus a compensating
        // rolled-back line — rather than an act with no audit trail at all. This is a staff actor
        // touching a member's statutory rights; a silent failure here must still be attributable.
        const row = await audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: pariwarIdStr,
            actorId,
            actorRole: null,
            action: EXPORT_ACTION,
            resourceLocator: `member/${body.member_id}`,
            requestPayloadHash,
            traceId: traceId ?? null,
          },
          mutate: async () =>
            dataExport.insertDataExport(scopeTx.tx, {
              memberId,
              pariwarId,
              requestedAt: now,
              requestedVia: 'off_portal_admin',
              requestedByActorId: actorId,
              helpdeskTicketId: ticketId,
            }),
        });
        toEnqueue = row.exportId;
        response = {
          export_id: row.exportId,
          status: 'pending',
          requested_at: now.toISOString(),
          requested_via: 'off_portal_admin',
        };
        ok = true;
      } catch (err) {
        // ⚠ The `data_exports_one_pending_per_member` PARTIAL UNIQUE index makes a collision genuinely
        // REACHABLE here: the member may already have a pending SELF-SERVICE export.
        // ⛔ The rule is stated, not improvised: refuse with a typed 409 naming the collision.
        // ⛔ Do NOT reuse the member's row — it carries `requested_via: 'member_portal'` and reusing it
        //    would MISATTRIBUTE the request in every audit query that filters on that column.
        // ⛔ Do NOT cancel it — a member's in-flight request is not the operator's to discard.
        // ⚠ 23505 rides `err.cause.code` as well as `err.code`; a direct-only check misses the wrapped
        //    case (the same defect that made the RTBF handler's catch inert).
        if (isUniqueViolation(err)) {
          throw new ConflictError(
            'This member already has an export in progress; wait for it to complete or expire',
            'member_data_rights.export_already_pending',
          );
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // Enqueue AFTER commit so the worker sees the committed `pending` row (the shipped member-path
      // exemplar). On enqueue failure, compensate so no `pending` row orphans — an orphaned pending row
      // would also block every later request via the partial unique index.
      if (toEnqueue !== null) {
        const exportIdToEnqueue = toEnqueue;
        try {
          await deps.dataExportQueue.enqueueBuild({
            requestId: traceId,
            pariwarId: pariwarIdStr,
            actorId,
            traceId,
            payload: { exportId: exportIdToEnqueue },
          });
        } catch {
          try {
            const stx = await openScopeTx(deps, pariwarIdStr);
            let cOk = false;
            try {
              await dataExport.markExportFailed(stx.tx, ids.dataExportId(exportIdToEnqueue), memberId, 'enqueue_failed');
              cOk = true;
            } finally {
              await closeScopeTx(stx, cOk);
            }
          } catch {
            // Correlated failure (queue down AND DB under pressure). Swallow so the retryable error
            // below is ALWAYS what the caller sees.
          }
          throw new ServiceUnavailableError(
            'Export could not be queued; please retry',
            'member_data_rights.enqueue_failed',
          );
        }
      }

      return response!;
    },

    /**
     * POST …/member-data-rights/erasure — EXECUTE erasure for an off-portal subject (AC7).
     *
     * ⛔ IRREVERSIBLE AND OPERATOR-INITIATED. Serialized by a transaction-scoped advisory lock (AC13)
     * and de-duplicated by an `Idempotency-Key` header at the route, so neither a double-submit nor a
     * genuine race can append a second `member.rtbf_anonymized`.
     */
    async fulfilErasure(request: FastifyRequest): Promise<OffPortalErasureResponse> {
      const { actorId, pariwarIdStr } = adminCtx(request);
      const body = request.body as OffPortalErasureRequest;
      const anonymizedAt = deps.clock();

      const memberId = ids.memberId(body.member_id);
      const pariwarId = ids.pariwarId(pariwarIdStr);

      // ⛔ REQUIRED HERE, and it CANNOT be enforced by the event schema. The payload field is
      // `.optional()` so the member self-service path (a four-field payload, parsed before insert)
      // keeps working — which means an off-portal erasure omitting the ticket id would validate
      // cleanly and become INDISTINGUISHABLE from a member self-service one on replay, destroying the
      // exact provenance the field was added to create. The contract requires it and this fails closed.
      if (!body.helpdesk_ticket_id) {
        throw new BadRequestError(
          'An originating helpdesk ticket is required for an off-portal erasure',
          'member_data_rights.ticket_required',
        );
      }
      const ticketId = ids.helpdeskTicketId(body.helpdesk_ticket_id);

      await requireAttribution(actorId);
      await claimIdempotency(request, 'erasure', body.member_id);

      const requestPayloadHash = sha256Hex(
        canonicalJsonStringify({
          member_id: body.member_id,
          helpdesk_ticket_id: body.helpdesk_ticket_id,
        }),
      );

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      let fromState: string;
      try {
        await requireTicketInScope(scopeTx, pariwarId, ticketId);

        const exists = await memberDomain.memberExists(scopeTx.tx, pariwarId, memberId);
        if (!exists) {
          throw new NotFoundError('Member not found', 'member_data_rights.member_not_found');
        }

        // ── AC13 — serialize BEFORE the legality read ────────────────────────────────────────────
        // ⛔ `_xact_` (transaction-scoped), never `pg_advisory_lock`: a session-scoped lock on a POOLED
        // client without a manual unlock leaks for the connection's life. The key is namespaced
        // (`member.rtbf:`) — a bare hashtext(member_id) collides with the device-binding lock.
        // ⛔ The SAME lock is taken by the member self-service caller. A lock on one path only is not
        // serialization.
        await scopeTx.client.query('SELECT pg_advisory_xact_lock($1)', [
          memberDomain.rtbfAdvisoryLockKey(pariwarIdStr, body.member_id).toString(),
        ]);

        const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, anonymizedAt);
        // ⛔ The SHARED predicate — legal from `withdrawn`, OR when the moderation overlay reads
        // `terminated`. Do not re-inline a local check: 10.21 relocated legality out of the reducer
        // into the callers precisely so it lives in exactly one place.
        const legality = await memberDomain.resolveRtbfLegality(scopeTx.tx, memberId, state);
        if (legality.kind === 'already_anonymized') {
          throw new ConflictError('Member has already been anonymized', 'rtbf.already_anonymized');
        }
        if (legality.kind === 'illegal') {
          throw new ConflictError(
            'Erasure requires a withdrawn membership or a terminated member',
            'rtbf.invalid_state',
          );
        }
        fromState = legality.fromState;

        // ⛔ `withCompensatingAudit` (ADR-0030) around the IRREVERSIBLE act, not a bare
        // `writeAuditEntry` after it. An erasure that partially applies and then throws must still
        // leave an intent line plus a compensating rolled-back line.
        await audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: pariwarIdStr,
            actorId,
            actorRole: null,
            action: ERASURE_ACTION,
            resourceLocator: `member/${body.member_id}`,
            requestPayloadHash,
            traceId: request.requestContext.traceId ?? null,
          },
          mutate: async () => {
        // Field-level scrub of every Tier-1 PII column — AND, since Story 10.21, the member's
        // `data_exports` dossier (AC11), in this same transaction.
        await memberDomain.anonymizeMember(scopeTx.tx, enc, { memberId, pariwarId });

        await memberDomain.projectMemberState(scopeTx.client, {
          memberId,
          pariwarId,
          eventType: 'member.rtbf_anonymized',
          payload: {
            // The REAL replayed state — an off-portal erasure is legal from any live label.
            from_state: legality.fromState,
            to_state: 'anonymized',
            // ⛔ PINNED, and ⛔ DO NOT COPY THE MEMBER EXEMPLAR. `rtbf/handlers.ts` hardcodes
            // `actor: 'member'` / `trigger: 'rtbf_request'`; copied here that writes a FALSE ACTOR
            // ATTRIBUTION on a staff-executed act. `memberActorSchema` is
            // `z.enum(['member','system','trustee'])` — there is no finer staff label, so 'trustee' is
            // the only admissible value (the in-family precedent is `moderation/write.ts`).
            // ⚠ 'trustee' here is a COARSE staff label. It does NOT assert that the Trustee Panel
            // acted — who holds Trustee authority over a statutory right is Escalation 10, unanswered.
            actor: 'trustee',
            // The member family's dotted namespace for staff-initiated acts.
            trigger: 'member_data_rights.rtbf_fulfilled',
            // ⭐ Provenance rides the EVENT, not only the audit row, so a replay of `events_log`
            // distinguishes an operator-executed erasure from a member self-service one. Audit-only
            // provenance would break the two-authority rule (event = timeline authority, row =
            // metadata authority) — and AC7 makes this event MORE ambiguous, not less, by legalising
            // it from eight `from` states instead of one.
            helpdesk_ticket_id: body.helpdesk_ticket_id,
          },
          actorId,
        });
          },
        });
        ok = true;
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new ConflictError('Member has already been anonymized', 'rtbf.already_anonymized');
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      return {
        state: 'anonymized',
        anonymized_at: anonymizedAt.toISOString(),
        from_state: fromState!,
      };
    },
  };
}

/** A Postgres unique-violation on EITHER the direct code or `err.cause.code` — the domain convention.
 *  ⛔ A direct-only check misses every error the domain wraps, which is how the member RTBF handler's
 *  own 23505 branch sat inert. */
function isUniqueViolation(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  const direct = (err as { code?: unknown }).code;
  const cause = (err as { cause?: { code?: unknown } }).cause?.code;
  return direct === '23505' || cause === '23505';
}
