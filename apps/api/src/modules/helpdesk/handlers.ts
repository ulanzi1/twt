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

import { audit, canonicalJsonStringify, cycleCalendar, helpdesk, ids } from '@twt/domain';
import type { CreateTicketRequest, HelpdeskTicketDto } from '@twt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError, BadRequestError, ConflictError, UnauthorizedError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';

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
  };
}
