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

import { and, asc, eq, sql } from 'drizzle-orm';
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
  HelpdeskGenesisMissingError,
  HelpdeskIllegalTransitionError,
  HelpdeskStreamConcurrencyError,
  HelpdeskTicketPersistError,
  isHelpdeskStreamVersionConflict,
} from './errors.js';
import {
  HELPDESK_EVENT_PAYLOAD_SCHEMAS,
  type HelpdeskEventActor,
  type HelpdeskEventType,
  type HelpdeskTicketCreatedPayload,
} from './events.js';
import { nextTicketState, replayTicketState } from './state.js';

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
  /**
   * Story 10.29 — ELEMENT 1, captured at intake (Decision `2026-08-15-120` cl.1). The instant the
   * MEMBER's request for staff-mediated delivery was recorded, or `null` when they did not ask.
   * ⛔ The CALLER passes the SERVER's clock instant, never a client value — the two intake routes
   * derive it as `request.member_requested_staff_mediated_delivery === true ? createdAt : null`.
   * ⛔ GENESIS-ONLY: there is no transition and no update path (`2026-08-15-120` cl.4).
   */
  memberStaffMediationRequestedAt: Date | null;
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
    member_staff_mediation_requested_at: input.memberStaffMediationRequestedAt?.toISOString() ?? null,
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
        // ⛔ From the SAME input as the payload above — payload and row cannot disagree.
        memberStaffMediationRequestedAt: input.memberStaffMediationRequestedAt,
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

/** A lifecycle-transition event type (the genesis is projected by {@link projectTicketGenesis}, not
 *  this function). */
export type HelpdeskTransitionEventType = Exclude<HelpdeskEventType, 'helpdesk.ticket_created'>;

/** Everything needed to append + re-project ONE lifecycle transition. The projector derives the
 *  `from_state`/`to_state` from the replayed stream itself (never trusting a caller-supplied label). */
export interface ProjectTicketTransitionInput {
  ticketId: HelpdeskTicketId;
  pariwarId: PariwarId;
  /** The transition event type (picked_up / awaiting_member / member_replied / resolved / closed / reopened). */
  eventType: HelpdeskTransitionEventType;
  /** The §1.14 audit `trigger` note (a bounded human-readable reason, e.g. `helpdesk.transition:resolve`). */
  trigger: string;
  /** WHO drives the transition (member / staff / system). */
  actor: HelpdeskEventActor;
  /** events_log.actor_id — the acting user/member UUID, or NULL for system (`actor: 'system'` iff
   *  `actorId === null`, the same consistency guard the genesis enforces). */
  actorId: string | null;
  /** The bounded reply text a message-bearing transition (awaiting_member / member_replied / resolved)
   *  carries; omitted for the message-free transitions (picked_up / closed / reopened). The event's
   *  strict schema validates this pairing (a message-bearing type REQUIRES it; a message-free type
   *  REJECTS it), so a caller that passes the wrong pairing fails fast at the parse below. */
  message?: string;
}

export interface ProjectTicketTransitionResult {
  eventId: string;
  eventVersion: number;
  fromState: HelpdeskTicketState;
  state: HelpdeskTicketState;
}

/**
 * Append a lifecycle transition event and re-project the ticket row's `current_state`, atomically, in
 * the caller's transaction — the sibling of {@link projectTicketGenesis} for every NON-genesis event.
 * In one transaction it:
 *   1. loads the ticket's ordered stream and replays it → the current state,
 *   2. derives the target state from `(current_state, eventType)` via the pure reducer, refusing an
 *      illegal (identity) transition BEFORE any write,
 *   3. appends the transition event at `max(event_version) + 1`,
 *   4. re-projects `current_state` + `state_event_version` under the `app.helpdesk_state_writer` guard.
 *
 * @throws HelpdeskGenesisMissingError     if the ticket stream is empty (no genesis).
 * @throws HelpdeskIllegalTransitionError  if the transition does not apply to the current state (identity).
 * @throws ZodError                        if the built payload fails its strict schema (e.g. a missing/extra `message`).
 * @throws HelpdeskStreamConcurrencyError  on a `(stream_id, event_version)` race (a concurrent append).
 * @throws HelpdeskTicketPersistError      if the ticket-row UPDATE itself fails.
 */
export async function projectTicketTransition(
  client: pg.PoolClient,
  input: ProjectTicketTransitionInput,
): Promise<ProjectTicketTransitionResult> {
  const db = bindScopedDb(client);

  // (0) Actor/actorId consistency — identical guard to the genesis: `system` carries NO acting user,
  // every other actor MUST carry one.
  if ((input.actor === 'system') !== (input.actorId === null)) {
    throw new Error(
      `[projectTicketTransition] actor/actorId mismatch: actor='${input.actor}', actorId=${input.actorId === null ? 'null' : 'non-null'} — 'system' requires a null actorId, every other actor requires a non-null actorId`,
    );
  }

  // (1) Load the ordered stream + replay to the current state. An empty stream = no genesis (impossible).
  const rows = await db
    .select()
    .from(eventsLog)
    .where(eq(eventsLog.streamId, input.ticketId))
    .orderBy(asc(eventsLog.eventVersion));
  if (rows.length === 0) throw new HelpdeskGenesisMissingError(input.ticketId);
  const fromState = replayTicketState(rows);

  // (2) Derive the target state; an identity result is an ILLEGAL transition (the reducer no-ops).
  const toState = nextTicketState(fromState, input.eventType);
  if (toState === fromState) {
    throw new HelpdeskIllegalTransitionError(input.ticketId, fromState, input.eventType);
  }

  const maxVersion = rows[rows.length - 1]!.eventVersion;
  const nextVersion = maxVersion + 1;

  // (3) Build + strict-validate the transition payload (from/to derived here, never caller-labelled).
  const payload = {
    from_state: fromState,
    to_state: toState,
    trigger: input.trigger,
    actor: input.actor,
    ...(input.message !== undefined ? { message: input.message } : {}),
  };
  HELPDESK_EVENT_PAYLOAD_SCHEMAS[input.eventType].parse(payload);

  // (4) Append the transition event at max+1 (the (stream_id, event_version) index is the race backstop).
  let inserted;
  try {
    const insertedRows = await db
      .insert(eventsLog)
      .values({
        streamId: input.ticketId,
        eventType: input.eventType,
        payload,
        eventVersion: nextVersion,
        actorId: input.actorId,
        pariwarId: input.pariwarId,
      })
      .returning();
    inserted = insertedRows[0];
  } catch (err) {
    if (isHelpdeskStreamVersionConflict(err)) {
      throw new HelpdeskStreamConcurrencyError(input.ticketId, nextVersion);
    }
    throw err;
  }
  if (!inserted) throw new Error('[projectTicketTransition] event insert returned no row');

  // (5) Re-project the cached state pair under the trigger guard (the projector-only write). This is
  // the SECOND legitimate writer of current_state (allowlisted in scripts/helpdesk-state-invariant).
  await client.query("SET LOCAL app.helpdesk_state_writer = 'on'");
  try {
    let updatedRows;
    try {
      updatedRows = await db
        .update(helpdeskTickets)
        .set({ currentState: toState, stateEventVersion: nextVersion, updatedAt: sql`now()` })
        .where(and(eq(helpdeskTickets.ticketId, input.ticketId), eq(helpdeskTickets.pariwarId, input.pariwarId)))
        .returning({ ticketId: helpdeskTickets.ticketId });
    } catch (err) {
      throw new HelpdeskTicketPersistError(input.ticketId, err);
    }
    // A 0-row UPDATE (e.g. a mismatched pariwarId) does NOT throw — the compound-predicate WHERE
    // just matches nothing. The event above is already appended by then, so a silent no-op here
    // would leave events_log ahead of the cached current_state with no divergence signal. Not
    // reachable via the current API handlers (they always thread the caller's already-verified
    // pariwarId), but this subsystem's whole point is refusing exactly this class of silent drift.
    if (updatedRows.length !== 1) {
      throw new HelpdeskTicketPersistError(input.ticketId, new Error(`expected to update exactly 1 row, matched ${updatedRows.length}`));
    }
  } finally {
    // Best-effort guard reset (tx-scoped regardless; swallow if the tx already aborted — the
    // alert/project.ts Story 6.1 finding, mirrored in projectTicketGenesis).
    try {
      await client.query("SET LOCAL app.helpdesk_state_writer = 'off'");
    } catch {
      // transaction already aborted — the guard clears on rollback regardless.
    }
  }

  return { eventId: inserted.eventId, eventVersion: inserted.eventVersion, fromState, state: toState };
}
