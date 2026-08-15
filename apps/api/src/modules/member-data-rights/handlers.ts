// Story 10.21 — off-portal DPDPA data-rights FULFILMENT handlers
// (AC3/AC4/AC5/AC7/AC12/AC13/AC-R1/AC-R2).
//
// The identity-verified administrative process Niyamavali §8.4 requires when a member's authenticated
// access has ended but their statutory rights have not. Routes: BUILD the access/portability artifact,
// DELIVER it (member-direct primary + narrow staff-mediated exception), RECORD a correction, and
// EXECUTE erasure — all on a member with NO session.
//
// ⭐ DELIVERY (AC-R1) AND CORRECTION (AC-R2) ARE BUILT — see `grantMemberDirectDelivery`,
// `grantStaffMediatedDelivery`, `redeemDelivery` and `recordCorrection` below. Decisions
// `2026-08-14-109` through `-113` ruled the model.
//
// ⛔ WHAT IS DELIBERATELY STILL ABSENT, AND WHY IT MUST STAY ABSENT ────────────────────────────────
//   · NO trustee-authority routing or grant — ⭐ by RULING, not pending one. `2026-08-14-109` clause 7
//     ruled Escalation 10 (raised by `2026-08-14-107`): NO DPDPA action inherently requires Trustee
//     Panel authority, so AC-R3 closed with a recorded disposition and NO code changes. ⛔ Do not grant
//     `member.data_rights` to `trustee_panel`, do not add a routing rule, and do not make
//     `routed_to_role` authoritative — it is an advisory queue filter that NO authorization path reads.
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
  ActiveDataRightsExportResponse,
  MemberDirectDeliveryRequest,
  MemberDirectDeliveryResponse,
  OffPortalErasureRequest,
  OffPortalErasureResponse,
  OffPortalExportRequest,
  OffPortalExportResponse,
  RecordCorrectionRequest,
  RecordCorrectionResponse,
  StaffMediatedDeliveryRequest,
  StaffMediatedDeliveryResponse,
} from '@twt/contracts';
import {
  audit,
  canonicalJsonStringify,
  dataExport,
  encryption,
  helpdesk,
  idempotency,
  ids,
  member as memberDomain,
  memberDataRights,
} from '@twt/domain';
import { createHash } from 'node:crypto';

import type { FastifyReply, FastifyRequest } from 'fastify';

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
import * as memberAuthRepo from '../auth/member/member-auth.repo.js';
import * as otpService from '../auth/member/member-otp.service.js';
import { decryptExportArtifact } from '../data-export/data-export-crypto.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** Local SHA-256 hex over a canonical string (the helpdesk-handler idiom — a sha256Hex helper in a
 *  package that DEPENDS on @twt/domain would cycle if imported). */
function sha256Hex(canonicalInput: string): string {
  return createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
}

/** Encrypt free text as a Tier-1 envelope for a member-related column. ⛔ Free text about a member
 *  NEVER rides an event payload (R1 / `.strict()`); it lives Tier-1-encrypted at rest. */
async function encTier1(
  plaintext: string,
  pariwarId: string,
  fieldClass: string,
  enc: { kms: Parameters<typeof encryption.encryptTier1>[2]; kekRef: Parameters<typeof encryption.encryptTier1>[3] },
): Promise<string> {
  const ct = await encryption.encryptTier1(
    new TextEncoder().encode(plaintext),
    { pariwarId, fieldClass },
    enc.kms,
    enc.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}

/** Audit actions — the two fulfilment acts, each attributable to a named staff actor. */
const EXPORT_ACTION = 'member_data_rights.export_requested';
const ERASURE_ACTION = 'member_data_rights.rtbf_fulfilled';
/** ⛔ MANDATED naming reaches the AUDIT ACTION too (`2026-08-14-113` cl.2), not just the column. */
const DELIVERY_MEMBER_DIRECT_ACTION = 'member_data_rights.delivery_member_direct_granted';
const DELIVERY_STAFF_MEDIATED_ACTION = 'member_data_rights.delivery_staff_mediated_granted';
const CORRECTION_ACTION = 'member_data_rights.correction_recorded';

/**
 * ⛔ THE GRANT'S TTL IS THE OTP'S TTL — they are ONE lifetime (Decision `2026-08-15-117` clause 5).
 *
 * ⚠ It was originally a standalone 24h while the OTP lived 60 min, and the mismatch closed BOTH routes
 * for the 23 hours in between: element 2 went true at OTP expiry, but `expireStaleGrantForExport` keys
 * on the GRANT's expiry, so the still-live member-direct grant collided with the pending-uniqueness
 * index and the staff-mediated route returned a 409 whose text — "a delivery grant is already live" —
 * was true and useless, the live grant being unredeemable. Re-issuing member-direct hit the same index.
 * ⛔ A grant outliving the code that redeems it is not a longer window; it is a dead row holding a slot.
 * ⚠ Considered and NOT taken: a resend route re-minting an OTP against a live grant — the better
 * product answer, but unplanned scope on an unauthenticated surface needing its own rate-limit and
 * abuse analysis. Recorded in `2026-08-15-117` clause 5 rather than improvised here.
 */
const deliveryGrantTtlMs = (deps: AppDeps): number => deps.config.dataExportDeliveryOtpTtlMs;

/** Tier-1 field-class contexts for the two AC-R1/AC-R2 surfaces (mirrors migration 0104). */
const FIELD_CLASS_ATTESTATION = 'data_rights_attestation';
const FIELD_CLASS_CORRECTION = 'data_rights_correction';

/** The OTP pool reserved for the member-direct delivery grant (migration 0104). */
const DATA_EXPORT_DELIVERY_OTP_INTENT = 'data_export_delivery' as const;
/** The audit `action_context` threaded through the OTP delivery seam. */
const DELIVERY_OTP_ACTION_CONTEXT = 'member_data_rights.delivery';

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

  /**
   * Release a claim whose work did NOT happen.
   *
   * ⛔ WITHOUT THIS, A FAILED REQUEST BURNED ITS KEY FOR 24 HOURS. `claimIdempotency`'s doc promised
   * "returns the claim key for settlement" and every call site discarded it, so a request that failed
   * before doing anything — a ticket-scope 404, a terminal-state 409, a transient DB error, a dropped
   * connection — answered the caller's honest retry with 409 `idempotency_replay`: "already been
   * accepted", for an act that never occurred. ⛔ On the ERASURE route that told an operator an
   * irreversible act had happened when it had not. The admin UI mints a fresh UUID per click and so
   * papered over it; any correct client retrying with the same key (which is what an `Idempotency-Key`
   * contract MEANS) hit it every time.
   *
   * ⚠ BEST-EFFORT BY DESIGN: a failure to release must never replace the caller's real error with a
   * bookkeeping one. The claim's TTL remains the backstop.
   */
  async function releaseIdempotency(idemKey: string): Promise<void> {
    try {
      await idempotencyStore.release(idemKey);
    } catch {
      // Swallowed deliberately — see above. The TTL still expires the claim.
    }
  }

  /**
   * `openScopeTx`, releasing the idempotency claim if the connection itself cannot be acquired.
   * ⛔ Exists so the claim/release pairing has NO uncovered path: pool exhaustion before the tx opens
   * is the one failure that the `finally`-based release below cannot see.
   */
  async function openScopeTxClaimed(pariwarIdStr: string, idemKey: string) {
    try {
      return await openScopeTx(deps, pariwarIdStr);
    } catch (err) {
      await releaseIdempotency(idemKey);
      throw err;
    }
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
   * Resolve the originating helpdesk ticket UNDER THE CALLER'S SCOPE, or 404. ⭐ RETURNS THE ROW.
   *
   * ⚠ This is what makes the tenancy-blind FK safe in practice: PostgreSQL referential integrity
   * bypasses RLS, so the FK alone would accept a cross-tenant ticket id. Reading it here, inside the
   * scope tx, is the check that refuses one. ⛔ Do not drop this on the grounds that "the FK covers it".
   *
   * ⭐ Story 10.29 — it already loaded the row and threw it away; it now returns it, because
   * `grantStaffMediatedDelivery` must read the ticket's `member_staff_mediation_requested_at`
   * (element 1, captured at intake — `2026-08-15-120` cl.1). ⛔ Do NOT add a second `getTicketById`
   * call for that: a re-read inside the same scope tx would be a second round trip AND a second place
   * the scope check could drift away from the read it is supposed to guard.
   */
  async function requireTicketInScope(
    scopeTx: Awaited<ReturnType<typeof openScopeTx>>,
    pariwarId: ids.PariwarId,
    ticketId: ids.HelpdeskTicketId,
  ): Promise<NonNullable<Awaited<ReturnType<typeof helpdesk.getTicketById>>>> {
    const row = await helpdesk.getTicketById(scopeTx.tx, pariwarId, ticketId);
    if (!row) throw new NotFoundError('Ticket not found', 'member_data_rights.ticket_not_found');
    return row;
  }

  return {
    /**
     * POST …/member-data-rights/export — BUILD the access/portability artifact for an off-portal
     * subject (AC5, off-portal-build half).
     *
     * ⛔ BUILDS ONLY. Delivery is the separate `grantMemberDirectDelivery`/`grantStaffMediatedDelivery`
     * routes below. ⚠ STALE-COMMENT CORRECTION (code-review, this story): this used to say delivery
     * was "blocked on Escalation 1" — the Trustee Panel ruled it and it is built (see those handlers).
     * Building was always ruling-INDEPENDENT (the artifact is assembled identically under either
     * delivery model), which is why this half shipped first. The expected end state of this route is
     * therefore a `ready`, UNCONSUMED row holding the complete dossier — which is exactly why AC11's
     * erasure reach is load-bearing.
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
      const idemKey = await claimIdempotency(request, 'export', body.member_id);

      // The audit DIGEST — inputs only, NEVER the raw payload. ⛔ The originating ticket id rides the
      // digest so the audit line records WHICH REQUEST caused the build.
      const requestPayloadHash = sha256Hex(
        canonicalJsonStringify({
          member_id: body.member_id,
          helpdesk_ticket_id: body.helpdesk_ticket_id,
          requested_via: 'off_portal_admin',
        }),
      );

      const scopeTx = await openScopeTxClaimed(pariwarIdStr, idemKey);
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

        // ── ⛔ REUSE AN EXISTING OFF-PORTAL EXPORT (round-2 code review) ─────────────────────────
        // `data_exports_one_pending_per_member` is predicated on `status = 'pending'`, so a `ready`,
        // unconsumed export does NOT collide — this route would assemble a SECOND complete Tier-1
        // dossier for the same member, and `findActiveExport` being newest-first, the operator's
        // `builtExportId` would then point at the new `pending` row while the older `ready` dossier
        // lingered under its own TTL. The member self-service caller has always reused; this one did not.
        // ⛔ ONLY an `off_portal_admin` row is reusable. A `member_portal` row is NOT: reusing it would
        // misattribute the request in every audit query filtering on `requested_via` — the reason the
        // catch below refuses rather than reuses.
        const reusable = await dataExport.findActiveExport(scopeTx.tx, memberId, now);
        if (reusable && reusable.requestedVia === 'off_portal_admin') {
          ok = true;
          return {
            export_id: reusable.exportId,
            status: reusable.status,
            requested_at: reusable.requestedAt.toISOString(),
            requested_via: 'off_portal_admin',
          };
        }

        // ⛔ `withCompensatingAudit` (ADR-0030), NOT a bare `writeAuditEntry`: the intent line commits
        // FIRST, so a mutation that then THROWS leaves a recorded intent plus a compensating
        // rolled-back line — rather than an act with no audit trail at all. This is a staff actor
        // touching a member's statutory rights; a silent failure here must still be attributable.        //
        // ⚠ THE BOUND OF THAT GUARANTEE, STATED HONESTLY (round-2 code review). The audit runs on
        // `deps.servicePool` — its OWN connection — and settles the moment `mutate` RETURNS, but
        // `mutate` only issues statements inside the still-open `scopeTx` that `closeScopeTx` commits
        // afterwards. So the compensation covers a THROW INSIDE `mutate` and nothing else: if the
        // COMMIT itself fails, the trail records a completed act with no compensating line and no row.
        // ⛔ Do not read this wrapper as covering partial application generally — it does not.
        // The ordering is a property of the shared helper and its call convention, not of this surface;
        // closing it means changing that contract across every consumer, and it is recorded as deferred
        // work rather than patched here alone.
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
        // ⛔ The work did not happen — do not hold the caller's key against a retry.
        if (!ok) await releaseIdempotency(idemKey);
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
          // ⛔ The tx committed (`ok` was true), so the `finally` above did NOT release — but the
          // export was just marked `enqueue_failed` and the caller is being told to retry. Holding
          // their key would make that retry impossible for 24 hours.
          await releaseIdempotency(idemKey);
          throw new ServiceUnavailableError(
            'Export could not be queued; please retry',
            'member_data_rights.enqueue_failed',
          );
        }
      }

      return response!;
    },

    /**
     * GET …/member-data-rights/export/active — the member's currently-active export, or `null`
     * (code-review addition, this story).
     *
     * ⭐ EXISTS SO THE OPERATOR SURFACE SURVIVES A RELOAD. Before this, the admin UI's "which export
     * did I just build" state lived ONLY in a `useMutation`'s in-memory result — a reload after a
     * successful build stranded the operator with no way to reach delivery even though a `ready`
     * export already existed. ⛔ Reads key on `member_id` (AC4), never the ticket.
     */
    async getActiveExport(request: FastifyRequest): Promise<ActiveDataRightsExportResponse> {
      const { pariwarIdStr } = adminCtx(request);
      const query = request.query as { member_id: string };
      const memberId = ids.memberId(query.member_id);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const exists = await memberDomain.memberExists(scopeTx.tx, pariwarId, memberId);
        if (!exists) throw new NotFoundError('Member not found', 'member_data_rights.member_not_found');
        const row = await dataExport.findActiveExport(scopeTx.tx, memberId, now);
        ok = true;
        if (!row) return null;
        // ⛔ OFF-PORTAL EXPORTS ONLY (Decision `2026-08-15-117` clause 7). `findActiveExport` is shared
        // with the member self-service path and is deliberately unfiltered there; the filter belongs to
        // THIS consumer. Without it the operator surface would hand back a member's own portal-built
        // export id, which both delivery buttons would then happily accept.
        if (row.requestedVia !== 'off_portal_admin') return null;
        return { export_id: row.exportId, status: row.status, requested_at: row.requestedAt.toISOString() };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST …/member-data-rights/delivery/member-direct — the PRIMARY delivery route (AC-R1).
     *
     * ⭐ RULED MEMBER-DIRECT (`2026-08-14-109` cl.1). Issues a one-time, OTP-verified grant to the
     * member's REGISTERED MOBILE. The member proves possession of the number on record and redeems it
     * at the unauthenticated redemption route — ⛔ **no session is ever issued**, which is the whole
     * point: statutory rights survive termination, authenticated access does not.
     */
    async grantMemberDirectDelivery(request: FastifyRequest): Promise<MemberDirectDeliveryResponse> {
      const { actorId, pariwarIdStr } = adminCtx(request);
      const body = request.body as MemberDirectDeliveryRequest;
      const now = deps.clock();
      const memberId = ids.memberId(body.member_id);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const ticketId = ids.helpdeskTicketId(body.helpdesk_ticket_id);

      await requireAttribution(actorId);
      const idemKey = await claimIdempotency(request, 'delivery_member_direct', body.member_id);

      const requestPayloadHash = sha256Hex(
        canonicalJsonStringify({ member_id: body.member_id, export_id: body.export_id, channel: 'member_direct' }),
      );

      const scopeTx = await openScopeTxClaimed(pariwarIdStr, idemKey);
      let ok = false;
      let grantedMemberId: string | null = null;
      // Set inside the tx by the no-mobile precondition below; read by the post-commit OTP block.
      let mobileBlindIndexForDelivery: string | null = null;
      let response: MemberDirectDeliveryResponse;
      try {
        // ── Serialize against a concurrent erasure BEFORE any read (code-review addition) ─────────
        // ⛔ The SAME lock `fulfilErasure` (AC13) takes. Without it, a delivery grant could be created
        // in the window between an erasure's legality read and its commit — issuing a grant for an
        // export whose artifact is about to be zeroed (AC11), or racing the export's own terminal
        // state. A lock on one path only is not serialization.
        await scopeTx.client.query('SELECT pg_advisory_xact_lock($1)', [
          memberDomain.rtbfAdvisoryLockKey(pariwarIdStr, body.member_id).toString(),
        ]);

        await requireTicketInScope(scopeTx, pariwarId, ticketId);
        const exportRow = await dataExport.getExportForMember(
          scopeTx.tx,
          ids.dataExportId(body.export_id),
          memberId,
        );
        // ⛔ 404, not 403 — an export that is not this member's is indistinguishable from one that does
        // not exist, so the route is not an existence oracle.
        const notFoundExport = new NotFoundError('Export not found', 'member_data_rights.export_not_found');
        if (!exportRow) throw notFoundExport;
        // ── ⛔ OFF-PORTAL EXPORTS ONLY (Decision `2026-08-15-117` clause 7) ──────────────────────
        // Nothing here previously checked `requested_via`, so an ACTIVE member's own self-service
        // portal export — a `ready`, decryptable Tier-1 dossier they requested for themselves — could
        // be surfaced to an operator and routed to them. ⛔ A member's portal export is theirs.
        // ⚠ 404, not 403, matching the guard above: the route must not confirm that an export exists.
        // ⚠ Deliberately NOT a member-lifecycle gate: FR-95/FR-96 do not limit statutory rights to
        // terminated members, so gating on lifecycle would deny an active member who genuinely cannot
        // use the portal — the exact population this story exists to serve.
        if (exportRow.requestedVia !== 'off_portal_admin') throw notFoundExport;
        // ⛔ CODE-REVIEW ADDITION — a grant must not be issuable against an export that is not yet
        // built (`pending`), or is already `expired`/`consumed`/`failed`: there is nothing (or nothing
        // current) for the member to redeem, and issuing a grant anyway would silently promise a
        // download that can never succeed.
        if (exportRow.status !== 'ready') {
          throw new ConflictError(
            'This export is not ready for delivery',
            'member_data_rights.export_not_ready',
          );
        }

        // ── ⛔ NO MOBILE ON FILE ⇒ REFUSE, BEFORE ANY ROW EXISTS ──────────────────────────────────
        //
        // ⭐ THIS IS A CORRUPT-DATA BACKSTOP, NOT A SERVED CASE (Decision `2026-08-15-119`).
        // A persisted member with no mobile is UNREACHABLE under the creation invariant: `members` rows
        // have one production writer (`member/project.ts`), the only FIRST event is
        // `member.signup_initiated` from one emitter (`auth/member/signup.handlers.ts`), and that
        // handler writes `member_identities` in the SAME scope-tx — where `member_id` is PRIMARY KEY and
        // both mobile columns are NOT NULL (`0019_polite_penance.sql`). Identity rows are never deleted,
        // and RTBF sentinels `mobile_ciphertext` while RETAINING `mobile_blind_index` (AC4). The member
        // itself provably exists here, via `data_exports_member_id_members_member_id_fk`.
        // ⇒ A null blind index at this point means a `members` row with no identity row: an invariant
        // violation, not a member the DPDPA leaves unserved.
        //
        // ⛔ KEPT ANYWAY, and the reason is the failure mode it replaces: the route previously created
        // the grant, skipped OTP minting, and returned **200 with a `grant_id` and an `expires_at`** —
        // reporting success for a delivery that never happened. Corrupt data must fail CLOSED and
        // LOUDLY, not mint a grant nobody can redeem.
        // ⚠ This was briefly recorded as an open statutory gap (Escalation 12, `2026-08-15-118`).
        // That escalation is WITHDRAWN: the premise was never traced, and the state was reachable only
        // in a test that deleted the identity row by hand. ⛔ Do not re-raise it without first showing a
        // production path that persists a member without a mobile.
        const mobileBlindIndex = await memberAuthRepo.getMemberMobileBlindIndex(
          deps.servicePool,
          body.member_id,
        );
        if (!mobileBlindIndex) {
          throw new ConflictError(
            'This member has no registered mobile on file, so a delivery code cannot be sent',
            'member_data_rights.no_mobile_on_file',
          );
        }
        mobileBlindIndexForDelivery = mobileBlindIndex;

        // ⭐ LAZY-EXPIRE-ON-READ (code-review addition). A stale `pending` grant on this export — one
        // whose `expires_at` has passed with nobody having redeemed it — must not permanently block a
        // fresh grant via migration 0104's `one_pending_per_export` partial unique index. See
        // `expireStaleGrantForExport`'s own header for the full rationale.
        await dataExport.expireStaleGrantForExport(scopeTx.tx, ids.dataExportId(body.export_id), now);

        const grant = await audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: pariwarIdStr,
            actorId,
            actorRole: null,
            action: DELIVERY_MEMBER_DIRECT_ACTION,
            resourceLocator: `member/${body.member_id}`,
            requestPayloadHash,
            traceId: request.requestContext.traceId ?? null,
          },
          mutate: async () =>
            dataExport.insertMemberDirectGrant(scopeTx.tx, {
              exportId: ids.dataExportId(body.export_id),
              memberId,
              pariwarId,
              helpdeskTicketId: ticketId,
              grantedByActorId: actorId,
              expiresAt: new Date(now.getTime() + deliveryGrantTtlMs(deps)),
            }),
        });

        response = {
          grant_id: grant.grantId,
          channel: 'member_direct',
          expires_at: grant.expiresAt.toISOString(),
        };
        grantedMemberId = body.member_id;
        ok = true;
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new ConflictError(
            'A delivery grant is already live for this export',
            'member_data_rights.delivery_grant_already_live',
          );
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
        // ⛔ The work did not happen — do not hold the caller's key against a retry.
        if (!ok) await releaseIdempotency(idemKey);
      }

      // ── Issue + deliver the OTP AFTER the grant commits ─────────────────────────────────────────
      // ⚠ TWO DIFFERENT "INTENT" CONCEPTS, deliberately not conflated:
      //   · the OTP POOL intent is `data_export_delivery` — a DISTINCT pool, so a delivery OTP and a
      //     step-up OTP never burn each other via `invalidateLiveOtps`;
      //   · the DELIVERY-SEAM intent is `step_up`, which selects the mobile-RESOLUTION path (the
      //     adapter decrypts the member's Tier-1 mobile from memberId + pariwarId). ⛔ Widening the
      //     seam's own union would mean a new DLT template and channels work this story does not own.
      // ⛔ Delivery failure does NOT roll back the grant: the grant is what the member redeems, and a
      // transient SMS failure must not destroy their route. The operator can re-issue.
      if (grantedMemberId !== null && mobileBlindIndexForDelivery !== null) {
        try {
          const { code } = await otpService.requestOtp(
            deps,
            DATA_EXPORT_DELIVERY_OTP_INTENT,
            mobileBlindIndexForDelivery,
            { memberId: grantedMemberId, actionContext: DELIVERY_OTP_ACTION_CONTEXT },
          );
          try {
            await deps.stepUpDelivery.deliver({
              code,
              actorId: grantedMemberId,
              actionContext: DELIVERY_OTP_ACTION_CONTEXT,
              intent: 'step_up',
              pariwarId: pariwarIdStr,
            });
          } catch (err) {
            // ⚠ Recorded, not thrown. An undelivered OTP is exactly the circumstance that later makes
            // `primary_delivery_not_completed` true and opens the narrow fallback — so a delivery
            // failure is a NORMAL, expected step on this path, not an error to surface as a 5xx.
            deps.stepUpDelivery.onPrimaryDeliveryFailure?.(
              { code, actorId: grantedMemberId, actionContext: DELIVERY_OTP_ACTION_CONTEXT, intent: 'step_up', pariwarId: pariwarIdStr },
              err,
            );
          }
        } catch (err) {
          // ⛔ CODE-REVIEW ADDITION — `requestOtp` itself (OTP MINTING, not delivery) can throw, and it
          // runs AFTER the grant already committed above. Uncaught, that would surface as an opaque 500
          // on a route the caller otherwise experienced as succeeding. Recorded via the same
          // observability seam as a delivery failure, not thrown — the grant is the artifact that
          // matters, and the operator can retry.
          // ⛔ The "no mobile on file" arm that used to live here is GONE: it is a PRECONDITION now,
          // checked before the grant is created, so this block cannot be reached without one.
          deps.stepUpDelivery.onPrimaryDeliveryFailure?.(
            { code: '', actorId: grantedMemberId, actionContext: DELIVERY_OTP_ACTION_CONTEXT, intent: 'step_up', pariwarId: pariwarIdStr },
            err,
          );
        }
      }

      return response!;
    },

    /**
     * POST /api/v1/member-data-rights/delivery/:grantId/redeem — the MEMBER redeems (AC-R1, primary).
     *
     * ⛔ UNAUTHENTICATED BY NECESSITY — the subject is a terminated member with no session, and issuing
     * one is exactly what Niyamavali §8.4 forecloses. It is NOT an open surface: redemption requires
     * TWO secrets — the unguessable `grantId` in the path AND the OTP delivered to the registered
     * mobile — and every failure returns the SAME 404, so the route is not an existence oracle.
     */
    async redeemDelivery(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<Buffer | { error: unknown }> {
      const { grantId } = request.params as { grantId: string };
      const body = request.body as { otp: string };
      const now = deps.clock();

      // ⛔ The grant lookup runs on the SERVICE pool: an unauthenticated caller has no tenant scope, so
      // there is no scope tx to read under. The tenant comes FROM the grant, and every subsequent read
      // is scoped to it.
      const grant = await dataExport.findLiveGrantUnscoped(deps.servicePool, grantId, now);
      const notFound = new NotFoundError('Grant not found', 'member_data_rights.grant_not_found');
      if (!grant) throw notFound;
      // ⛔ Only the PRIMARY route is redeemable by the member. A staff-mediated grant is handed over
      // through the administrative process, not pulled down here.
      if (grant.channel !== 'member_direct') throw notFound;

      const blindIndex = await memberAuthRepo.getMemberMobileBlindIndex(deps.servicePool, grant.memberId);
      if (!blindIndex) throw notFound;

      const scopeTx = await openScopeTx(deps, grant.pariwarId);
      let ok = false;
      try {
        // ── Serialize against a concurrent erasure (round-2 code review) ─────────────────────────
        // ⛔ THE SAME LOCK the two grant paths and `fulfilErasure` (AC13) take. This was the third path
        // touching the same artifact and it was the one left unserialized — and by the grant paths' own
        // stated standard, "a lock on one path only is not serialization". Under READ COMMITTED a
        // redemption whose snapshot predates an erasure's commit would read the pre-erasure
        // `artifact_ciphertext` and stream the member's full dossier AFTER the erasure committed —
        // the artifact AC11 exists to guarantee is gone.
        await scopeTx.client.query('SELECT pg_advisory_xact_lock($1)', [
          memberDomain.rtbfAdvisoryLockKey(grant.pariwarId, grant.memberId).toString(),
        ]);

        // ── ⛔ ORDERING IS THE FIX HERE, AND IT IS DELIBERATE (round-2 code review) ───────────────
        // Everything that can FAIL runs BEFORE anything is BURNED. Previously `verifyOtp` — which is
        // atomic-burn-on-match and runs on `deps.pool`, OUTSIDE this transaction — fired first, so any
        // later failure (a lost `consumeGrant` race, a null artifact, a KMS blip on decrypt) rolled the
        // grant back to `pending` while the member's ONE-TIME OTP stayed irrecoverably spent. The member
        // was left holding a live grant they could never redeem, given an indistinguishable 404, and —
        // before the TTL alignment above — unable to be re-issued a code for up to 24 hours.
        //
        // ⚠ THE TRADE-OFF, STATED RATHER THAN HIDDEN: the artifact is now decrypted BEFORE the OTP is
        // checked, so a caller who holds the `grantId` but not the code can cause a KMS decrypt. That is
        // accepted because the `grantId` is itself an unguessable secret, the route is rate-limited, and
        // the plaintext NEVER leaves this process unless verification then succeeds. ⛔ Stranding a
        // member's statutory route is the larger harm, and it was the reachable one.
        const exportRow = await dataExport.getExportForMember(
          scopeTx.tx,
          grant.exportId,
          grant.memberId,
        );
        if (!exportRow?.artifactCiphertext) throw notFound;
        const zip = await decryptExportArtifact(exportRow.artifactCiphertext, grant.pariwarId, enc);

        const verified = await otpService.verifyOtp(
          deps,
          DATA_EXPORT_DELIVERY_OTP_INTENT,
          blindIndex,
          body.otp,
          { expectedMemberId: grant.memberId },
        );
        // ⛔ Same 404 on a wrong code as on an unknown grant — a distinct error would let a caller
        // confirm that a grant id exists.
        if (!verified.ok) throw notFound;

        // ⛔ ONE-TIME, and the guarantee lives in this conditional UPDATE — not in a read-then-write.
        // A concurrent redemption loses here and gets the same 404. ⚠ If it loses, the OTP above IS
        // already burned — which is correct: the winning redemption delivered the dossier, so there is
        // nothing left for this caller to redeem.
        const burned = await dataExport.consumeGrant(scopeTx.tx, grantId, now);
        if (!burned) throw notFound;

        ok = true;
        void reply.header('content-type', 'application/zip');
        void reply.header('content-disposition', 'attachment; filename="my-data-export.zip"');
        return zip;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST …/member-data-rights/delivery/staff-mediated — the NARROW EXCEPTION (AC-R1).
     *
     * ⛔ THE THREE-PART GATE (`2026-08-14-113` cl.1). All three required; none substitutes:
     *   (1) the member's OWN explicit request — ⭐ READ from the originating ticket's
     *       `member_staff_mediation_requested_at`, captured at INTAKE (Story 10.29). ⛔ NOT a field on
     *       this request, and ⛔ not to be re-added as one. It shipped as a caller-supplied
     *       `z.literal(true)` hardcoded by its only caller — a type with no `false`, so element 1 was
     *       unfalsifiable, staff-authored, and gated nothing (`2026-08-15-115`). `2026-08-15-116` cl.3
     *       ruled option (c) and named THE REMOVAL: a read added *beside* the boolean would have left
     *       the element-1/element-3 collapse exactly where it was, with one more field.
     *   (2) `primary_delivery_not_completed` — ⛔ SERVER-OBSERVED, never caller-supplied;
     *   (3) the staff attestation — Tier-1, and WITHHELD from the member export.
     * Migration 0104 additionally enforces all three as a DB CHECK, because this gates the one path on
     * which a staff actor obtains a member's assembled, DECRYPTED Tier-1 export. ⛔ The app-layer read
     * below FEEDS that CHECK — it does not replace it, and the CHECK must not be relaxed because the
     * app now refuses earlier: it exists so a caller-side bug cannot create an ungated row.
     */
    async grantStaffMediatedDelivery(request: FastifyRequest): Promise<StaffMediatedDeliveryResponse> {
      const { actorId, pariwarIdStr } = adminCtx(request);
      const body = request.body as StaffMediatedDeliveryRequest;
      const now = deps.clock();
      const memberId = ids.memberId(body.member_id);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const ticketId = ids.helpdeskTicketId(body.helpdesk_ticket_id);

      await requireAttribution(actorId);
      const idemKey = await claimIdempotency(request, 'delivery_staff_mediated', body.member_id);

      // ⚠ The digest is computed BEFORE the scope tx opens, so it cannot name element 1's instant —
      // that is read from the ticket inside the tx. `helpdesk_ticket_id` is what pins element 1 here:
      // the instant is a property OF that ticket, and the ticket id is the caller-supplied part.
      // ⛔ The deleted element-1 boolean is GONE from this digest with the field itself; a digest over
      // a caller-hardcoded constant `true` recorded nothing about the request in the first place.
      const requestPayloadHash = sha256Hex(
        canonicalJsonStringify({
          member_id: body.member_id,
          export_id: body.export_id,
          channel: 'staff_mediated',
          helpdesk_ticket_id: body.helpdesk_ticket_id,
        }),
      );

      const scopeTx = await openScopeTxClaimed(pariwarIdStr, idemKey);
      let ok = false;
      let response: StaffMediatedDeliveryResponse;
      try {
        // ── Serialize against a concurrent erasure BEFORE any read (code-review addition) ─────────
        // ⛔ The SAME lock `fulfilErasure` (AC13) and `grantMemberDirectDelivery` take — see the
        // sibling comment there. A staff-mediated grant obtains the DECRYPTED artifact for hand-over;
        // it must not race an erasure that is about to zero it (AC11).
        await scopeTx.client.query('SELECT pg_advisory_xact_lock($1)', [
          memberDomain.rtbfAdvisoryLockKey(pariwarIdStr, body.member_id).toString(),
        ]);

        const ticketRow = await requireTicketInScope(scopeTx, pariwarId, ticketId);

        // ── ELEMENT 1 — READ FROM THE TICKET, WHERE THE MEMBER AUTHORED IT ─────────────────────────
        // ⭐ THE WHOLE POINT OF STORY 10.29 (`2026-08-15-116` cl.3, option (c); `2026-08-15-120` cl.1).
        // What this replaced was a caller-supplied `z.literal(true)` on the request body, hardcoded by
        // its only caller. Three things were independently fatal: it was UNFALSIFIABLE (the type had no
        // `false`, so there was no state of the world in which element 1 was absent); its AUTHOR was
        // the caller rather than the member (`2026-08-14-111` cl.3 warned of exactly this collapse in
        // advance); and its TIMESTAMP was the staff action's (`2026-08-15-115` cl.3).
        // ⛔ THE CALLER CAN NO LONGER MANUFACTURE ELEMENT 1 AT ALL. The only way to produce it is to
        // file a ticket, and this route cannot file one.
        // ⚠ On a `helpline_call` ticket the value is OPERATOR-TRANSCRIBED at intake (`2026-08-15-120`
        // cl.6). ⛔ That does NOT prove the member spoke, and nothing here claims it does — what it
        // buys is a separate act at a separate instant, on a ticket this route cannot create, recorded
        // immutably at genesis.
        // ⛔ CODE-REVIEW ADDITION — the ticket must be THIS member's own ticket.
        // `requireTicketInScope` scopes by (pariwar, ticket id) only — tenant scope, per its own
        // docstring — and does not confirm `ticketRow.subjectMemberId` matches `body.member_id`.
        // Element 1 is READ FROM the ticket, so an unchecked mismatch would let any ticket in the
        // pariwar that carries a captured request satisfy the gate for a DIFFERENT member's export —
        // exactly the "ticket id widens the subject" shape the module header's AC4 doctrine forbids.
        // Folded into the SAME 409 refusal as "not captured": from this member's perspective, a ticket
        // that is not theirs records nothing about them.
        const memberRequestRecordedAt =
          ticketRow.subjectMemberId === memberId ? ticketRow.memberStaffMediationRequestedAt : null;
        if (memberRequestRecordedAt === null) {
          // ⛔ 409, matching element 2's sibling refusal (`2026-08-15-120` cl.3): the request is
          // well-formed and a SERVER-OBSERVED precondition is unmet. ⛔ Not 404 — the ticket-scoping
          // 404 above exists so the route does not confirm a ticket's existence, and that reasoning
          // does not transfer here: this caller has already been shown the ticket, so a 404 would make
          // a legitimately-refused fallback unexplainable to the operator. ⛔ Not 400 — nothing about
          // the caller's payload is wrong.
          // ⛔ THROWN BEFORE ANY WRITE: no grant row is created, and the `finally` below releases the
          // caller's idempotency key so a legitimate retry — after the member files a ticket that DOES
          // record the request — is not locked out.
          throw new ConflictError(
            'This ticket does not record the member asking for staff-mediated delivery; the request must be captured when the ticket is filed',
            'member_data_rights.member_request_not_captured',
          );
        }

        const exportRow = await dataExport.getExportForMember(
          scopeTx.tx,
          ids.dataExportId(body.export_id),
          memberId,
        );
        const notFoundExport = new NotFoundError('Export not found', 'member_data_rights.export_not_found');
        if (!exportRow) throw notFoundExport;
        // ── ⛔ OFF-PORTAL EXPORTS ONLY (Decision `2026-08-15-117` clause 7) ──────────────────────
        // Nothing here previously checked `requested_via`, so an ACTIVE member's own self-service
        // portal export — a `ready`, decryptable Tier-1 dossier they requested for themselves — could
        // be surfaced to an operator and routed to them. ⛔ A member's portal export is theirs.
        // ⚠ 404, not 403, matching the guard above: the route must not confirm that an export exists.
        // ⚠ Deliberately NOT a member-lifecycle gate: FR-95/FR-96 do not limit statutory rights to
        // terminated members, so gating on lifecycle would deny an active member who genuinely cannot
        // use the portal — the exact population this story exists to serve.
        if (exportRow.requestedVia !== 'off_portal_admin') throw notFoundExport;
        // ⛔ CODE-REVIEW ADDITION — see the identical guard in `grantMemberDirectDelivery`: a grant
        // must not be issuable against an export that is not `ready`.
        if (exportRow.status !== 'ready') {
          throw new ConflictError(
            'This export is not ready for delivery',
            'member_data_rights.export_not_ready',
          );
        }

        // ── ELEMENT 2 — SERVER-OBSERVED, and it FAILS CLOSED ────────────────────────────────────────
        // ⛔ Deliberately NOT taken from the request body. A caller-suppliable "the primary failed"
        // flag would let the actor assert the very fact this gate exists to check.
        // ⚠ It records that THE PRIMARY ROUTE DID NOT COMPLETE — ⛔ never that the member lost the
        // handset, which this system cannot observe (no DLR seam, no mobile-change history).
        // ⛔ SCOPED TO THIS EXPORT (Decision `2026-08-15-117` cl.3, restoring `2026-08-14-113` cl.3's
        // own words — "an OTP was issued FOR THE MEMBER-DIRECT DELIVERY GRANT"). Passing the export is
        // what stops (a) an operator manufacturing element 2 by issuing a member-direct grant on any
        // member and waiting out the OTP TTL, and (b) one stale OTP satisfying the gate forever, on
        // every later export, with no primary attempt on THAT export at all.
        const primaryNotCompletedAt = await dataExport.primaryDeliveryNotCompletedAt(
          scopeTx.tx,
          memberId,
          ids.dataExportId(body.export_id),
          now,
        );
        if (primaryNotCompletedAt === null) {
          throw new ConflictError(
            'The member-direct delivery route has not been attempted and left incomplete; staff-mediated delivery is not available yet',
            'member_data_rights.primary_delivery_not_completed_required',
          );
        }

        // ⭐ LAZY-EXPIRE-ON-READ (code-review addition) — see `grantMemberDirectDelivery`'s identical
        // call for the full rationale. Without it, the stale `pending` member-direct grant that made
        // element 2 true above would ALSO still be occupying `one_pending_per_export`, and this insert
        // would collide with a misleading "already live" 409 — on exactly the sequence this fallback
        // exists to serve.
        await dataExport.expireStaleGrantForExport(scopeTx.tx, ids.dataExportId(body.export_id), now);

        // Element 3 — Tier-1 at rest. ⛔ Never an event payload, never an audit context field.
        const attestationCiphertext = await encTier1(
          body.attestation,
          pariwarIdStr,
          FIELD_CLASS_ATTESTATION,
          enc,
        );

        const grant = await audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: pariwarIdStr,
            actorId,
            actorRole: null,
            action: DELIVERY_STAFF_MEDIATED_ACTION,
            resourceLocator: `member/${body.member_id}`,
            requestPayloadHash,
            traceId: request.requestContext.traceId ?? null,
          },
          mutate: async () =>
            dataExport.insertStaffMediatedGrant(scopeTx.tx, {
              exportId: ids.dataExportId(body.export_id),
              memberId,
              pariwarId,
              helpdeskTicketId: ticketId,
              grantedByActorId: actorId,
              expiresAt: new Date(now.getTime() + deliveryGrantTtlMs(deps)),
              // ── ELEMENT 1 — THE MEMBER'S INSTANT, NOT THE OPERATOR'S ────────────────────────────
              // ⛔ NEVER `now`. `now` is the instant STAFF submit this route — a timestamp for the
              // staff action wearing the member's field name, which is precisely the defect
              // `2026-08-15-115` cl.3 found and `2026-08-15-120` cl.1 corrects. This is the instant the
              // member's request was recorded at TICKET INTAKE, copied verbatim from the ticket.
              // ⭐ Because the ticket necessarily predates this call, this value is strictly earlier
              // than the grant's own `created_at` — which is what makes the two distinguishable to
              // every later reader of the column.
              memberRequestRecordedAt,
              primaryDeliveryNotCompletedAt: primaryNotCompletedAt,
              attestationCiphertext,
            }),
        });

        response = {
          grant_id: grant.grantId,
          channel: 'staff_mediated',
          expires_at: grant.expiresAt.toISOString(),
          primary_delivery_not_completed_at: primaryNotCompletedAt.toISOString(),
        };
        ok = true;
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new ConflictError(
            'A delivery grant is already live for this export',
            'member_data_rights.delivery_grant_already_live',
          );
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
        // ⛔ The work did not happen — do not hold the caller's key against a retry.
        if (!ok) await releaseIdempotency(idemKey);
      }
      return response!;
    },

    /**
     * POST …/member-data-rights/correction — the RECORDED correction process (AC-R2).
     *
     * ⭐ RULED (`2026-08-14-109` cl.2): three mechanized rights PLUS a recorded, staff-executed
     * correction process on a helpdesk ticket discharge the release gate.
     * ⛔ THIS RECORDS; IT DOES NOT WRITE. No member profile field is touched here, and none may be —
     * a general member-profile editor was expressly not authorised.
     */
    async recordCorrection(request: FastifyRequest): Promise<RecordCorrectionResponse> {
      const { actorId, pariwarIdStr } = adminCtx(request);
      const body = request.body as RecordCorrectionRequest;
      const memberId = ids.memberId(body.member_id);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const ticketId = ids.helpdeskTicketId(body.helpdesk_ticket_id);

      const recordedByDisplay = await requireAttribution(actorId);
      const idemKey = await claimIdempotency(request, 'correction', body.member_id);

      const requestPayloadHash = sha256Hex(
        canonicalJsonStringify({
          member_id: body.member_id,
          helpdesk_ticket_id: body.helpdesk_ticket_id,
          outcome: body.outcome,
        }),
      );

      const scopeTx = await openScopeTxClaimed(pariwarIdStr, idemKey);
      let ok = false;
      let response: RecordCorrectionResponse;
      try {
        await requireTicketInScope(scopeTx, pariwarId, ticketId);
        const exists = await memberDomain.memberExists(scopeTx.tx, pariwarId, memberId);
        if (!exists) {
          throw new NotFoundError('Member not found', 'member_data_rights.member_not_found');
        }

        // Both Tier-1: what the member asked (relayed) and what staff did. ⛔ Never an event payload.
        const [requestedChangeCiphertext, actionTakenCiphertext] = await Promise.all([
          encTier1(body.requested_change, pariwarIdStr, FIELD_CLASS_CORRECTION, enc),
          encTier1(body.action_taken, pariwarIdStr, FIELD_CLASS_CORRECTION, enc),
        ]);

        const row = await audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: pariwarIdStr,
            actorId,
            actorRole: null,
            action: CORRECTION_ACTION,
            resourceLocator: `member/${body.member_id}`,
            requestPayloadHash,
            traceId: request.requestContext.traceId ?? null,
          },
          mutate: async () =>
            memberDataRights.recordCorrection(scopeTx.tx, {
              memberId,
              pariwarId,
              helpdeskTicketId: ticketId,
              requestedChangeCiphertext,
              actionTakenCiphertext,
              outcome: body.outcome,
              recordedByActorId: actorId,
              recordedByDisplay,
            }),
        });

        response = {
          correction_id: row.correctionId,
          outcome: row.outcome,
          recorded_by_display: row.recordedByDisplay,
          created_at: row.createdAt.toISOString(),
        };
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
        // ⛔ The work did not happen — do not hold the caller's key against a retry.
        if (!ok) await releaseIdempotency(idemKey);
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
      const idemKey = await claimIdempotency(request, 'erasure', body.member_id);

      const requestPayloadHash = sha256Hex(
        canonicalJsonStringify({
          member_id: body.member_id,
          helpdesk_ticket_id: body.helpdesk_ticket_id,
        }),
      );

      const scopeTx = await openScopeTxClaimed(pariwarIdStr, idemKey);
      let ok = false;
      // ⚠ CODE-REVIEW FIX — was `string`, which widened `legality.fromState`'s precise
      // `MemberLifecycleState` into an unconstrained wire string on
      // `OffPortalErasureResponse.from_state`.
      let fromState: memberDomain.MemberLifecycleState;
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
        // `writeAuditEntry` after it. An erasure whose `mutate` THROWS must still leave an intent line
        // plus a compensating rolled-back line.        //
        // ⚠ THE BOUND OF THAT GUARANTEE, STATED HONESTLY (round-2 code review). The audit runs on
        // `deps.servicePool` — its OWN connection — and settles the moment `mutate` RETURNS, but
        // `mutate` only issues statements inside the still-open `scopeTx` that `closeScopeTx` commits
        // afterwards. So the compensation covers a THROW INSIDE `mutate` and nothing else: if the
        // COMMIT itself fails, the trail records a completed act with no compensating line and no row.
        // ⛔ Do not read this wrapper as covering partial application generally — it does not.
        // The ordering is a property of the shared helper and its call convention, not of this surface;
        // closing it means changing that contract across every consumer, and it is recorded as deferred
        // work rather than patched here alone.
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
            // acted — and per `2026-08-14-109` cl.7 no DPDPA action requires Panel authority at all.
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
        // ⛔ The work did not happen — do not hold the caller's key against a retry.
        if (!ok) await releaseIdempotency(idemKey);
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
