// Persisted-state projector — Story 10.1 (Task 3; AC4). Twin of alert/project.ts.
//
// THE SINGLE LEGITIMATE WRITER to `helpdesk_tickets.current_state`. In ONE transaction it:
//   1. appends the ticket's genesis event to `events_log`,
//   2. replays the stream → the lifecycle state ('open'),
//   3. writes the ticket row incl. the cached `current_state` + `state_event_version`.
// Steps share the transaction so downstream consumers never see a torn view.
//
// ── Why it inserts into events_log directly (not via @twt/events.appendEvent) ──
// `@twt/events` depends on `@twt/domain`; importing it here would create a `domain → events →
// domain` cycle. Domain DEFINES + OWNS `events_log`, so inserting directly is legitimate (the
// alert/project.ts precedent). The `(stream_id, event_version)` unique index is the concurrency backstop.
//
// ── The trigger guard ─────────────────────────────────────────────────────────
// Before writing the ticket row the projector sets `SET LOCAL app.helpdesk_state_writer = 'on'`
// (tx-scoped). The BEFORE INSERT OR UPDATE trigger on `helpdesk_tickets` (migration 0084) rejects
// any current_state write while this guard is not 'on'. `SET LOCAL` needs a raw pg client, so the
// projector takes a `pg.PoolClient` and binds its own scoped Db to it.
//
// ── Transaction contract ──────────────────────────────────────────────────────
// MUST be called inside an active transaction with the pariwar scope already set (the caller opens
// BEGIN + setPariwarScope, then calls this). The projector does NOT open or commit its own transaction.
//
// ── This story emits ONLY the genesis (helpdesk.ticket_created → open) ─────────
// The pick-up/resolve/close/reopen transitions land with their emitting surfaces (10.2/10.4 + the
// auto-close job). This projector exposes only `projectTicketGenesis`; a general transition-append
// projector is a later-story addition (the alert "emit-genesis" precedent).

import { asc, eq } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type {
  ClaimId,
  HelpdeskTicketId,
  MemberId,
  PariwarId,
  PoolId,
  UserId,
} from '../ids/index.js';
import type { ScopeDimension } from '../rbac/scope.js';
import { eventsLog } from '../schema/events_log.js';
import {
  helpdeskTickets,
  type HelpdeskAttachmentRef,
  type HelpdeskCategory,
  type HelpdeskCreatedVia,
  type HelpdeskTicketState,
  type MemberScopeContextSnapshot,
} from '../schema/helpdesk_tickets.js';
import {
  HelpdeskGenesisAlreadyExistsError,
  HelpdeskStreamConcurrencyError,
  HelpdeskTicketPersistError,
  isHelpdeskStreamVersionConflict,
} from './errors.js';
import {
  HELPDESK_EVENT_PAYLOAD_SCHEMAS,
  type HelpdeskEventActor,
  type HelpdeskTicketCreatedPayload,
} from './events.js';
import { replayTicketState } from './state.js';

/** Everything needed to create + route a ticket in one call (the route computes the routing decision
 *  + SLA first, then hands the whole snapshot here). Exactly one of the two subject refs is non-null. */
export interface ProjectTicketGenesisInput {
  ticketId: HelpdeskTicketId;
  pariwarId: PariwarId;
  subjectMemberId: MemberId | null;
  subjectActorId: UserId | null;
  category: HelpdeskCategory;
  subCategory: string | null;
  body: string;
  attachments: HelpdeskAttachmentRef[];
  memberScopeContext: MemberScopeContextSnapshot;
  // The routing decision (AC3).
  routingPolicyVersion: number;
  targetRole: string;
  targetScopeDimension: ScopeDimension;
  targetScopeValue: string | null;
  matchedRuleIndex: number;
  // Materialized SLA + timing.
  assignedAt: Date;
  slaFirstResponseDue: Date;
  slaResolutionDue: Date;
  // Audit anchor (AC5 — the withCompensatingAudit intent id) + attribution.
  auditId: string;
  createdVia: HelpdeskCreatedVia;
  operatorAttribution: string | null;
  /** WHO drives the genesis (the §1.14 audit-shape actor). `member`/`operator`/`staff`/`system`. */
  actor: HelpdeskEventActor;
  /** events_log.actor_id — the acting user/member UUID, or NULL for system (`actor: 'system'` iff
   *  `actorId === null` — see the guard in {@link projectTicketGenesis}). */
  actorId: string | null;
  // Nullable cross-link seams (navigation is Story 10.4).
  claimCaseId: ClaimId | null;
  poolId: PoolId | null;
  // `module_id` / `validity_lookup_id` are deliberately NOT branded — no owning primitive exists yet
  // (Story 12.x partner modules; Story 4.7 MemberStatusPanel), so there is no brand to reuse and
  // minting a speculative one now would be premature (mirrors the `subject_id`/`kyc_transactions
  // .member_id` "polymorphic, no owning entity yet" precedent in ids/index.ts). Brand these on the
  // first PR that actually builds the owning primitive.
  moduleId: string | null;
  validityLookupId: string | null;
}

export interface ProjectTicketGenesisResult {
  eventId: string;
  eventVersion: number;
  state: HelpdeskTicketState;
}

/**
 * Append the genesis `helpdesk.ticket_created` event and project the ticket row (incl.
 * `current_state = 'open'`), atomically, in the caller's transaction. Returns the appended event's
 * id/version + the new state.
 *
 * @throws ZodError                        if the derived genesis payload fails its strict schema.
 * @throws HelpdeskGenesisAlreadyExistsError if the ticket's stream is non-empty before genesis.
 * @throws HelpdeskStreamConcurrencyError   on a `(stream_id, event_version)` race (a duplicate genesis).
 * @throws HelpdeskTicketPersistError       if the ticket-row insert itself fails (e.g. the subject-XOR CHECK).
 */
export async function projectTicketGenesis(
  client: pg.PoolClient,
  input: ProjectTicketGenesisInput,
): Promise<ProjectTicketGenesisResult> {
  const db = bindScopedDb(client);

  // (0) Actor/actorId consistency — `actor: 'system'` carries NO acting user, and every non-system
  // actor MUST carry one; a mismatch would misattribute the audit trail with no error otherwise.
  if ((input.actor === 'system') !== (input.actorId === null)) {
    throw new Error(
      `[projectTicketGenesis] actor/actorId mismatch: actor='${input.actor}', actorId=${input.actorId === null ? 'null' : 'non-null'} — 'system' requires a null actorId, every other actor requires a non-null actorId`,
    );
  }

  // (1) Genesis guard — the stream must be empty (a ticket's first + only event this story appends
  // is the genesis). A non-empty stream means a caller re-used a ticket_id (a bug — ticket_id is a
  // fresh random UUID) or raced; the version-1 unique index below is the durable backstop.
  const existing = await db
    .select({ eventVersion: eventsLog.eventVersion })
    .from(eventsLog)
    .where(eq(eventsLog.streamId, input.ticketId))
    .orderBy(asc(eventsLog.eventVersion));
  if (existing.length > 0) {
    throw new HelpdeskGenesisAlreadyExistsError(input.ticketId, existing.length);
  }

  // (2) Build the genesis payload — the FULL audit-replayable routing snapshot (AC3). The row is
  // written from the SAME input below, so payload + row cannot disagree.
  const payload: HelpdeskTicketCreatedPayload = {
    from_state: null,
    to_state: 'open',
    trigger: `helpdesk.create:${input.createdVia}`,
    actor: input.actor,
    ticket_id: input.ticketId,
    pariwar_id: input.pariwarId,
    category: input.category,
    sub_category: input.subCategory,
    body: input.body,
    attachments: input.attachments,
    member_scope_context: input.memberScopeContext,
    routing_policy_version: input.routingPolicyVersion,
    target_role: input.targetRole,
    target_scope: { dimension: input.targetScopeDimension, value: input.targetScopeValue },
    matched_rule_index: input.matchedRuleIndex,
    sla_first_response_due: input.slaFirstResponseDue.toISOString(),
    sla_resolution_due: input.slaResolutionDue.toISOString(),
    created_via: input.createdVia,
    operator_attribution: input.operatorAttribution,
    subject_member_id: input.subjectMemberId,
    subject_actor_id: input.subjectActorId,
    claim_case_id: input.claimCaseId,
    pool_id: input.poolId,
    module_id: input.moduleId,
    validity_lookup_id: input.validityLookupId,
  };
  // Fail-fast validation (defense-in-depth alongside the JSONB column + the DB CHECK).
  HELPDESK_EVENT_PAYLOAD_SCHEMAS['helpdesk.ticket_created'].parse(payload);

  // (3) Append the genesis event (event_version = 1).
  let inserted;
  try {
    const rows = await db
      .insert(eventsLog)
      .values({
        streamId: input.ticketId,
        eventType: 'helpdesk.ticket_created',
        payload,
        eventVersion: 1,
        actorId: input.actorId,
        pariwarId: input.pariwarId,
      })
      .returning();
    inserted = rows[0];
  } catch (err) {
    if (isHelpdeskStreamVersionConflict(err)) {
      throw new HelpdeskStreamConcurrencyError(input.ticketId, 1);
    }
    throw err;
  }
  if (!inserted) throw new Error('[projectTicketGenesis] event insert returned no row');

  // (4) Replay → the lifecycle state ('open').
  const newState = replayTicketState([inserted]);

  // (5) Write the ticket row under the trigger guard (the state-cache pair is projector-only).
  await client.query("SET LOCAL app.helpdesk_state_writer = 'on'");
  try {
    try {
      await db.insert(helpdeskTickets).values({
        ticketId: input.ticketId,
        pariwarId: input.pariwarId,
        subjectMemberId: input.subjectMemberId,
        subjectActorId: input.subjectActorId,
        category: input.category,
        subcategory: input.subCategory,
        body: input.body,
        attachments: input.attachments,
        currentState: newState,
        stateEventVersion: inserted.eventVersion,
        routedToScopeDimension: input.targetScopeDimension,
        routedToScopeValue: input.targetScopeValue,
        routedToRole: input.targetRole,
        routedToActorId: null,
        routingPolicyVersion: input.routingPolicyVersion,
        memberScopeContext: input.memberScopeContext,
        assignedAt: input.assignedAt,
        slaFirstResponseDue: input.slaFirstResponseDue,
        slaResolutionDue: input.slaResolutionDue,
        auditId: input.auditId,
        createdVia: input.createdVia,
        operatorAttribution: input.operatorAttribution,
        claimCaseId: input.claimCaseId,
        poolId: input.poolId,
        moduleId: input.moduleId,
        validityLookupId: input.validityLookupId,
      });
    } catch (err) {
      throw new HelpdeskTicketPersistError(input.ticketId, err);
    }
  } finally {
    // Reset the guard immediately (defense-in-depth) — it is tx-scoped too, so a rollback/commit
    // clears it regardless. Best-effort: if the insert above aborted the tx, this can itself throw
    // (25P02); swallow so it never masks the real error (the alert/project.ts Story 6.1 finding).
    try {
      await client.query("SET LOCAL app.helpdesk_state_writer = 'off'");
    } catch {
      // transaction already aborted — the guard clears on rollback regardless.
    }
  }

  return { eventId: inserted.eventId, eventVersion: inserted.eventVersion, state: newState };
}
