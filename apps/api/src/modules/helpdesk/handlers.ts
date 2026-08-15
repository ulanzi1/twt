// Helpdesk create-ticket primitive handler — Story 10.1 (Task 6; AC1/AC3/AC5).
//
// THE tenant-scoped create-ticket primitive. In one flow it: resolves member_scope_context from the
// subject, snapshots the in-force routing-policy version, calls the PURE `resolveRoute`, computes the
// calendar-aware SLA due dates, persists the ticket + genesis event + projected state in ONE
// transaction (`projectTicketGenesis` on the request scope tx), and emits the routing-decision audit
// line via `audit.withCompensatingAudit` (AC5 — NOT a bare writeAuditEntry; ADR-0030). The intent
// audit's id is threaded onto the ticket row (the Story 2.4 pre-generate pattern).
//
// ── member_scope_context geo enrichment is a SEAM ──────────────────────────────────────────────────
// This story resolves the context's tenancy + subject id, but leaves the geo fields (state/district/
// block) null — the v1 default policy routes at the `pariwar` dimension throughout, so it needs no geo
// value. A Pariwar that publishes a geo-dimension override enriches the context; that enrichment (a
// member-geo read) lands with the geo-dimension routing consumer (Story 10.4). The resolver already
// honors geo dimensions (unit-tested) — only the context supplier is seamed.

import { createHash, randomUUID } from 'node:crypto';

import { randomUUID as nodeRandomUUID } from 'node:crypto';

import { audit, canonicalJsonStringify, cycleCalendar, helpdesk, ids } from '@twt/domain';
import type {
  CreateTicketRequest,
  HelpdeskAdminTicketDetailResponse,
  HelpdeskCategoryListResponse,
  HelpdeskQueueItem,
  HelpdeskQueueResponse,
  HelpdeskReplyRequest,
  HelpdeskTicketDto,
} from '@twt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError, BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';

/** The admin-queue page-size bounds — MIRROR the domain `listTicketQueueForPariwar` clamp
 *  (TICKET_QUEUE_DEFAULT_LIMIT / TICKET_QUEUE_MAX_LIMIT); kept in lockstep so `next_offset` reflects
 *  the SAME page size the read actually applied. */
const HELPDESK_QUEUE_DEFAULT_LIMIT = 50;
const HELPDESK_QUEUE_MAX_LIMIT = 200;

type HelpdeskRow = NonNullable<Awaited<ReturnType<typeof helpdesk.getTicketById>>>;

/** Map a domain SLA-timer status → the wire DTO. */
function toSlaTimerDto(t: helpdesk.HelpdeskSlaTimer): HelpdeskQueueItem['sla_first_response'] {
  return { due_at: t.dueAt.toISOString(), running: t.running, breached: t.breached, ms_remaining: t.msRemaining };
}

/** Map a persisted ticket row → the admin queue item (row + derived SLA/severity + cross-links). */
function toQueueItem(row: HelpdeskRow, now: Date): HelpdeskQueueItem {
  const sla = helpdesk.deriveSlaStatus(
    { currentState: row.currentState, slaFirstResponseDue: row.slaFirstResponseDue, slaResolutionDue: row.slaResolutionDue },
    now,
  );
  const { subject } = helpdesk.splitMemberTicketSubjectBody(row.body);
  return {
    ticket_id: row.ticketId,
    category: row.category,
    sub_category: row.subcategory,
    subject,
    current_state: row.currentState,
    created_via: row.createdVia,
    routed_to_role: row.routedToRole,
    routed_to_scope: { dimension: row.routedToScopeDimension, value: row.routedToScopeValue },
    sla_first_response: toSlaTimerDto(sla.firstResponse),
    sla_resolution: toSlaTimerDto(sla.resolution),
    severity: sla.severity,
    cross_links: {
      claim_case_id: row.claimCaseId,
      pool_id: row.poolId,
      module_id: row.moduleId,
      validity_lookup_id: row.validityLookupId,
    },
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/** Map a persisted ticket row + its replayed thread → the admin ticket detail. */
function toAdminDetail(
  row: HelpdeskRow,
  thread: ReturnType<typeof helpdesk.replayTicketThread>,
  now: Date,
): HelpdeskAdminTicketDetailResponse {
  const { body } = helpdesk.splitMemberTicketSubjectBody(row.body);
  return {
    ...toQueueItem(row, now),
    subject_member_id: row.subjectMemberId,
    subject_actor_id: row.subjectActorId,
    body,
    attachments: row.attachments.map((a) => ({ filename: a.filename, content_type: a.content_type, size_bytes: a.size_bytes })),
    thread: thread.map((e) => ({ kind: e.kind, author: e.author, body: e.body, occurred_at: e.occurredAt.toISOString() })),
    operator_attribution: row.operatorAttribution,
    routing_policy_version: row.routingPolicyVersion,
    assigned_at: row.assignedAt.toISOString(),
    member_scope_context: row.memberScopeContext,
    // Story 10.29 — element 1's captured instant, so the responder console can explain a refused
    // fallback AT the control rather than after a 409 (Decision `2026-08-15-120` cl.5).
    member_staff_mediation_requested_at: row.memberStaffMediationRequestedAt?.toISOString() ?? null,
  };
}

/** The dotted audit action for a ticket create+route (AC5). */
const HELPDESK_TICKET_CREATED_ACTION = 'helpdesk.ticket_created';

/** Local SHA-256 hex over a canonical string. Local (the pool/names.ts idiom): the sha256Hex helpers in
 *  packages that DEPEND on @twt/domain would cycle if imported. */
function sha256Hex(canonicalInput: string): string {
  return createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
}

/** Map a persisted ticket row → the wire DTO (snake_case). */
function toTicketDto(row: Awaited<ReturnType<typeof helpdesk.getTicketById>>): HelpdeskTicketDto {
  if (!row) throw new Error('[helpdesk.create] ticket row missing after projection');
  return {
    ticket_id: row.ticketId,
    pariwar_id: row.pariwarId,
    subject_member_id: row.subjectMemberId,
    subject_actor_id: row.subjectActorId,
    category: row.category,
    sub_category: row.subcategory,
    body: row.body,
    attachments: row.attachments,
    current_state: row.currentState,
    routed_to_scope: { dimension: row.routedToScopeDimension, value: row.routedToScopeValue },
    routed_to_role: row.routedToRole,
    routed_to_actor_id: row.routedToActorId,
    routing_policy_version: row.routingPolicyVersion,
    member_scope_context: row.memberScopeContext,
    assigned_at: row.assignedAt.toISOString(),
    sla_first_response_due: row.slaFirstResponseDue.toISOString(),
    sla_resolution_due: row.slaResolutionDue.toISOString(),
    audit_id: row.auditId,
    created_via: row.createdVia,
    operator_attribution: row.operatorAttribution,
    claim_case_id: row.claimCaseId,
    pool_id: row.poolId,
    module_id: row.moduleId,
    validity_lookup_id: row.validityLookupId,
    // Story 10.29 — element 1's captured instant (Decision `2026-08-15-120` cl.5). Read-only on the
    // wire; ⛔ there is no update path, so nothing may ever map it in the other direction.
    member_staff_mediation_requested_at: row.memberStaffMediationRequestedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function createHelpdeskHandlers(deps: AppDeps) {
  function context(request: FastifyRequest): { scopeTx: ScopeTx; actorId: string } {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      // Defense-in-depth — requireAdminSession + scope-resolution already guarantee both.
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { scopeTx, actorId };
  }

  return {
    /** POST — create + route a ticket (201). */
    async create(request: FastifyRequest, reply: FastifyReply): Promise<HelpdeskTicketDto> {
      const { scopeTx, actorId } = context(request);
      const body = request.body as CreateTicketRequest;

      // This route is admin/operator-callable ONLY (requireAdminSession) — no member-session caller
      // exists yet (Story 10.2 adds the dedicated member-authenticated route). `created_via:
      // 'member_app'` is kept on the shared CreateTicketRequest schema for THAT future route's
      // forward-compatibility, but accepting it here would misattribute the genesis event/audit line
      // as `actor: 'member'` under the calling admin's own actorId — reject it at this route instead.
      if (body.created_via === 'member_app') {
        throw new BadRequestError(
          "created_via: 'member_app' is not yet supported on this admin-callable route",
          'helpdesk.created_via_not_supported',
        );
      }

      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const ticketId = ids.helpdeskTicketId(randomUUID());
      const createdAt = deps.clock();

      const subjectMemberId = body.subject_member_id ? ids.memberId(body.subject_member_id) : null;
      const subjectActorId = body.subject_actor_id ? ids.userId(body.subject_actor_id) : null;
      const subCategory = body.sub_category ?? null;

      // (1) member_scope_context — tenancy + subject; geo fields seamed (see the header).
      const memberScopeContext = {
        pariwar_id: pariwarId,
        state: null,
        district: null,
        block: null,
        subject_member_id: subjectMemberId,
      };

      // (2) Snapshot the in-force policy version (non-retroactivity, AC3) + resolve the route (PURE).
      const inForce = await helpdesk.routingPolicyVersionInForce(scopeTx.tx, pariwarId, createdAt);
      let decision: ReturnType<typeof helpdesk.resolveRoute>;
      try {
        decision = helpdesk.resolveRoute({ category: body.category, subCategory, memberScopeContext }, inForce.document);
      } catch (err) {
        // A malformed/unresolvable routing policy is a server-side (Pariwar admin) config state, not a
        // client input error — 409, mirroring AdminDisplayNameMissingError's "server-side state is the
        // blocker" posture, rather than an opaque 500.
        if (err instanceof helpdesk.RoutingUnresolvedError || err instanceof helpdesk.RoutingScopeUnresolvedError) {
          throw new ConflictError(err.message, 'helpdesk.routing_policy_misconfigured');
        }
        throw err;
      }

      // (3) Calendar-aware SLA due dates (empty windows → plain N-calendar-day resolution).
      const windows = await cycleCalendar.listHolidayWindowsForTail(scopeTx.tx, pariwarId, createdAt);
      const sla = helpdesk.computeTicketSlaDueDates(createdAt, decision, windows);

      // ── Story 10.29 — ELEMENT 1, CAPTURED AT INTAKE (Decision `2026-08-15-120` cl.1) ─────────────
      // The MEMBER's own request for staff-mediated delivery of their data export, recorded where it
      // is authored. `grantStaffMediatedDelivery` READS this instead of accepting a caller-supplied
      // boolean (`2026-08-15-116` cl.3 — the removal is the point).
      // ⛔ THE SERVER'S CLOCK, never a client value: the wire carries a BOOLEAN and nothing else. A
      // client-settable `..._at` would re-create the defect `2026-08-15-115` cl.3 found — a timestamp
      // for one event wearing another event's field name — with a new author.
      // ⛔ NOT gated on the DPDPA subcategory here: that coupling is PRESENTATIONAL and lives in the
      // client (`2026-08-15-120` cl.2). Enforcing it server-side would put a routing token into a
      // second enforcement site.
      // ⚠ On `helpline_call` this is OPERATOR-TRANSCRIBED (`2026-08-15-120` cl.6) — it does not prove
      // the member spoke, and no copy, comment or audit line here claims that it does.
      const memberStaffMediationRequestedAt =
        body.member_requested_staff_mediated_delivery === true ? createdAt : null;

      // (4) The audit DIGEST — inputs + policy version + outputs (never the raw payload; AC5).
      const requestPayloadHash = sha256Hex(
        canonicalJsonStringify({
          ticket_id: ticketId,
          category: body.category,
          sub_category: subCategory,
          member_scope_context: memberScopeContext,
          routing_policy_version: decision.routingPolicyVersion,
          matched_rule_index: decision.matchedRuleIndex,
          target_role: decision.targetRole,
          target_scope: decision.targetScope,
          sla_first_response_due: sla.slaFirstResponseDue.toISOString(),
          sla_resolution_due: sla.slaResolutionDue.toISOString(),
          // Story 10.29 — element 1's capture is part of the routing-decision record. ⛔ The INSTANT,
          // not the request boolean: the digest must pin what was WRITTEN, and the server's clock is
          // what was written (`2026-08-15-120` cl.1).
          member_staff_mediation_requested_at: memberStaffMediationRequestedAt?.toISOString() ?? null,
        }),
      );

      const actor = body.created_via === 'helpline_call' ? 'operator' : 'member';

      // operator_attribution is server-resolved from the acting operator's session display_name —
      // NEVER client-supplied (the users.display_name attribution convention, Story 6.11,
      // [[project_admin_display_name_attribution]]). Resolves FIRST, before any write (the
      // reconciliation-review ACTOR-DISPLAY precedent): a missing display name fails closed with no
      // event/audit rather than falling back to a blank or client-controlled string.
      let operatorAttribution: string | null = null;
      if (body.created_via === 'helpline_call') {
        operatorAttribution = await getDisplayName(deps.pool, actorId);
        if (operatorAttribution === null) throw new AdminDisplayNameMissingError(actorId);
      }

      // (5) Persist under a compensating audit (ADR-0030): the intent line commits first (giving the
      // auditId threaded onto the ticket row), then the projection runs on the request scope tx.
      const row = await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId,
          actorId,
          actorRole: null,
          action: HELPDESK_TICKET_CREATED_ACTION,
          resourceLocator: `ticket/${ticketId}`,
          requestPayloadHash,
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async ({ auditId }) => {
          try {
            await helpdesk.projectTicketGenesis(scopeTx.client, {
              ticketId,
              pariwarId,
              subjectMemberId,
              subjectActorId,
              category: body.category,
              subCategory,
              body: body.body,
              attachments: body.attachments ?? [],
              memberScopeContext,
              routingPolicyVersion: decision.routingPolicyVersion,
              targetRole: decision.targetRole,
              targetScopeDimension: decision.targetScope.dimension,
              targetScopeValue: decision.targetScope.value,
              matchedRuleIndex: decision.matchedRuleIndex,
              assignedAt: createdAt,
              slaFirstResponseDue: sla.slaFirstResponseDue,
              slaResolutionDue: sla.slaResolutionDue,
              auditId,
              createdVia: body.created_via,
              operatorAttribution,
              actor,
              actorId,
              claimCaseId: body.claim_case_id ? ids.claimId(body.claim_case_id) : null,
              poolId: body.pool_id ? ids.poolId(body.pool_id) : null,
              moduleId: body.module_id ?? null,
              validityLookupId: body.validity_lookup_id ?? null,
              memberStaffMediationRequestedAt,
            });
          } catch (err) {
            // Typed genesis-write conflicts (a stream race, a reused ticket_id, or a persist-layer
            // integrity failure) — 409, so a caller can distinguish "retry-worthy conflict" from an
            // opaque 500. withCompensatingAudit rethrows unmasked, so this still fires the compensating
            // audit line before the caller sees the 409.
            if (
              err instanceof helpdesk.HelpdeskStreamConcurrencyError ||
              err instanceof helpdesk.HelpdeskGenesisAlreadyExistsError ||
              err instanceof helpdesk.HelpdeskTicketPersistError
            ) {
              throw new ConflictError(err.message, 'helpdesk.ticket_create_conflict');
            }
            throw err;
          }
          // Checked INSIDE mutate (not after it returns): a null read here means the compensating
          // audit line fires for a genuine mutate failure, rather than mutate "succeeding" with a null
          // value and the caller crashing afterward with the audit already recorded as settled.
          const row = await helpdesk.getTicketById(scopeTx.tx, pariwarId, ticketId);
          if (!row) throw new Error('[helpdesk.create] ticket row missing after projection');
          return row;
        },
      });

      const dto = toTicketDto(row);
      // Set the status, then RETURN the body — never a manually-chained `.status(N).send(...)` call
      // inside an async handler (that has previously raced this codebase's async onSend hooks into an
      // `ERR_HTTP_HEADERS_SENT` double-send — the exact class of bug that surfaced writing this
      // route's first integration test). Letting Fastify serialize + send the returned value is the
      // established pattern every other 201-returning route in this codebase already follows.
      void reply.status(201);
      return dto;
    },

    /**
     * GET — the in-force routing policy's category set for the operator picker (Story 10.3, AC5).
     * Reuses the domain `categoriesForPariwar` (the SAME read the 10.2 member categories route uses),
     * adapted to the admin session: it runs on the scope-resolved request tx and is gated by the same
     * `helpdesk.create` grant as the create route (a caller who may file may read the category set).
     * Registry-driven — the UI never hardcodes the v1 category list.
     */
    async categories(request: FastifyRequest): Promise<HelpdeskCategoryListResponse> {
      const { scopeTx } = context(request);
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const now = deps.clock();
      const result = await helpdesk.categoriesForPariwar(scopeTx.tx, pariwarId, now);
      return {
        policy_version: result.policyVersion,
        categories: result.categories.map((c) => ({ category: c.category, sub_categories: c.subCategories })),
      };
    },

    // ── Story 10.4 — the responder console (queue + detail + transitions) ─────────────────────────

    /** GET /helpdesk/queue — the paginated responder queue (scope-respecting; derived SLA + severity). */
    async queue(request: FastifyRequest): Promise<HelpdeskQueueResponse> {
      const { scopeTx } = context(request);
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const now = deps.clock();
      const q = request.query as { state?: HelpdeskRow['currentState']; routed_to_role?: string; limit?: number; offset?: number };

      // Clamp the page size IDENTICALLY to the domain read so `next_offset` reflects the applied size.
      const pageSize = Math.max(1, Math.min(q.limit ?? HELPDESK_QUEUE_DEFAULT_LIMIT, HELPDESK_QUEUE_MAX_LIMIT));
      const offset = typeof q.offset === 'number' && Number.isInteger(q.offset) && q.offset > 0 ? q.offset : 0;

      const rows = await helpdesk.listTicketQueueForPariwar(scopeTx.tx, pariwarId, {
        state: q.state,
        routedToRole: q.routed_to_role,
        limit: pageSize,
        offset,
      });
      const tickets = rows.map((r) => toQueueItem(r, now));
      // A full page implies there MAY be more — hand back the next offset; a short page is the last one.
      const nextOffset = tickets.length === pageSize ? offset + pageSize : null;
      return { tickets, next_offset: nextOffset };
    },

    /** GET /helpdesk/tickets/:ticketId — the admin ticket detail (full row + thread + SLA/severity). */
    async detail(request: FastifyRequest): Promise<HelpdeskAdminTicketDetailResponse> {
      const { scopeTx } = context(request);
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const now = deps.clock();
      const ticketId = ids.helpdeskTicketId((request.params as { ticketId: string }).ticketId);

      const row = await helpdesk.getTicketById(scopeTx.tx, pariwarId, ticketId);
      if (!row) throw new NotFoundError('Ticket not found', 'helpdesk.not_found');
      const events = await helpdesk.listTicketEvents(scopeTx.tx, ticketId);
      const thread = helpdesk.replayTicketThread(events);
      return toAdminDetail(row, thread, now);
    },

    /** POST /helpdesk/tickets/:ticketId/pick-up — open/reopened → in_progress (no message). */
    async pickUp(request: FastifyRequest): Promise<HelpdeskAdminTicketDetailResponse> {
      return runTransition(request, 'helpdesk.picked_up', undefined);
    },

    /** POST /helpdesk/tickets/:ticketId/reply — a staff reply asking for info → awaiting_member. */
    async reply(request: FastifyRequest): Promise<HelpdeskAdminTicketDetailResponse> {
      const { message } = request.body as HelpdeskReplyRequest;
      return runTransition(request, 'helpdesk.awaiting_member', message);
    },

    /** POST /helpdesk/tickets/:ticketId/resolve — a staff closing reply → resolved. */
    async resolve(request: FastifyRequest): Promise<HelpdeskAdminTicketDetailResponse> {
      const { message } = request.body as HelpdeskReplyRequest;
      return runTransition(request, 'helpdesk.resolved', message);
    },
  };

  /**
   * The shared transition runner (AC2/AC3): load the ticket (404), guard legality at the handler
   * BEFORE the write (an illegal `(current_state, action)` is a typed 409 — the reducer's total/
   * identity contract must not become a silent 200), then append + re-project via
   * `projectTicketTransition` under a compensating audit line. A message-bearing transition
   * (awaiting_member / resolved) additionally fires the `helpdesk_reply` member notification
   * (best-effort). Returns the updated admin detail.
   */
  async function runTransition(
    request: FastifyRequest,
    eventType: 'helpdesk.picked_up' | 'helpdesk.awaiting_member' | 'helpdesk.resolved',
    message: string | undefined,
  ): Promise<HelpdeskAdminTicketDetailResponse> {
    const { scopeTx, actorId } = context(request);
    const pariwarId = ids.pariwarId(scopeTx.pariwarId);
    const now = deps.clock();
    const ticketIdStr = (request.params as { ticketId: string }).ticketId;
    const ticketId = ids.helpdeskTicketId(ticketIdStr);

    // (1) Load the ticket (tenant-scoped) — 404 if absent.
    const existing = await helpdesk.getTicketById(scopeTx.tx, pariwarId, ticketId);
    if (!existing) throw new NotFoundError('Ticket not found', 'helpdesk.not_found');

    // (2) Guard legality BEFORE the write — an inapplicable transition is a typed 409, never a silent
    // no-op 200 (the reducer is total/identity; the API owns whether a transition SHOULD fire).
    if (helpdesk.nextTicketState(existing.currentState, eventType) === existing.currentState) {
      throw new ConflictError(
        `Cannot apply '${eventType}' to a ticket in state '${existing.currentState}'`,
        'helpdesk.illegal_transition',
      );
    }

    // (3) The audit DIGEST — the transition inputs (never PII/message text; the create-handler idiom).
    const requestPayloadHash = sha256Hex(
      canonicalJsonStringify({
        ticket_id: ticketId,
        event_type: eventType,
        from_state: existing.currentState,
        has_message: message !== undefined,
      }),
    );

    // (4) Append + re-project under a compensating audit line (ADR-0030; the create-handler pattern).
    await audit.withCompensatingAudit(deps.servicePool, {
      auditIntent: {
        pariwarId,
        actorId,
        actorRole: null,
        action: eventType,
        resourceLocator: `ticket/${ticketId}`,
        requestPayloadHash,
        traceId: request.requestContext.traceId ?? null,
      },
      mutate: async () => {
        try {
          await helpdesk.projectTicketTransition(scopeTx.client, {
            ticketId,
            pariwarId,
            eventType,
            trigger: `helpdesk.transition:${eventType}`,
            actor: 'staff',
            actorId,
            ...(message !== undefined ? { message } : {}),
          });
        } catch (err) {
          // Typed transition conflicts (a lost race, or an illegal transition that slipped past the
          // handler guard on a concurrent state change) → 409, distinguishable from an opaque 500.
          if (
            err instanceof helpdesk.HelpdeskIllegalTransitionError ||
            err instanceof helpdesk.HelpdeskStreamConcurrencyError ||
            err instanceof helpdesk.HelpdeskGenesisMissingError
          ) {
            throw new ConflictError(err.message, 'helpdesk.transition_conflict');
          }
          throw err;
        }
        return null;
      },
    });

    // (5) Re-read the updated row + thread for the response.
    const row = await helpdesk.getTicketById(scopeTx.tx, pariwarId, ticketId);
    if (!row) throw new Error('[helpdesk.transition] ticket row missing after transition');
    const events = await helpdesk.listTicketEvents(scopeTx.tx, ticketId);
    const thread = helpdesk.replayTicketThread(events);
    const detail = toAdminDetail(row, thread, now);

    // (6) A staff reply (awaiting_member / resolved) notifies the member (best-effort, log-only v1).
    // pick-up carries no message and never notifies. An actor-only ticket (null subject member) is
    // skipped inside the notifier.
    if (message !== undefined) {
      try {
        await deps.helpdeskReplyNotifier({
          pariwarId: scopeTx.pariwarId,
          ticketId: ticketIdStr,
          subjectMemberId: row.subjectMemberId,
          alertId: nodeRandomUUID(),
          createdByActor: actorId,
          occurredAt: now.toISOString(),
        });
      } catch {
        // Best-effort — a notification failure never fails the committed reply.
      }
    }

    return detail;
  }
}
