// `helpdesk_tickets` table — Story 10.1 substrate (the FIFTH event-derived-state primitive).
//
// The helpdesk ticket's lifecycle ANCHOR — the twin of Story 3.1 `members` + Story 6.1
// `claims` + Story 7.1 `pools` + Story 8.1 `alerts`. A ticket object whose state is DERIVED
// from its `events_log` stream (stream_id = ticket_id) replayed through the pure reducer in
// `helpdesk/state.ts`. The fifth instance of the same event-derived-state primitive shape.
//
// ── helpdesk_tickets.current_state is a READ-OPTIMIZATION CACHE, not the source of truth ──
// The source of truth for a ticket's lifecycle state is its `events_log` stream replayed
// through the reducer. `current_state` (+ its `state_event_version` anchor) is a projection —
// written ONLY by the projector (`helpdesk/project.ts`) inside the same transaction that
// appends the transition event. Two guards keep it honest (the members/claims/pools/alerts
// posture): the DB trigger (migration 0084) rejects any INSERT/UPDATE to `current_state`
// not issued under the `app.helpdesk_state_writer` guard; the CI gate
// (scripts/helpdesk-state-invariant) static-scans for stray writers.
//
// ── ticket_id = the event-stream stream_id, a PLAIN random UUID (no deriveTicketId) ──────
// UNLIKE `alert_id` (deterministic UUIDv5, 1:1 with a cycle), a ticket has no natural key to
// derive from — so `ticket_id` is a DB-defaulted `gen_random_uuid()`. If a helpline-call
// create ever needs idempotency, it uses a keyed idempotency store, NOT a derived id.
//
// ── The category + lifecycle-state tuples: the pgEnum SOURCE ──────────────────────────────
// These two tuples are the DB `CREATE TYPE` source. The `@twt/contracts/helpdesk` wire enums
// re-declare the SAME tuples (contracts cannot import domain — the RN bundle boundary), and a
// TEST-ONLY sync-guard (packages/contracts/tests/helpdesk.test.ts) asserts they never drift.
//
// Naming discipline (architecture L3663-3677): DB columns snake_case, TS fields camelCase,
// table snake_case-plural; JSONB inner keys snake_case (the clause_versions precedent).

import { sql } from 'drizzle-orm';
import { bigint, check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, HelpdeskTicketId, MemberId, PariwarId, PoolId, UserId } from '../ids/index.js';
import { scopeDimensionEnum } from './role_grants.js';

/**
 * The v1 helpdesk categories (FR-52) — the pgEnum source (`CREATE TYPE helpdesk_category`).
 * Hyphen-snake authoritative. Kept in lockstep with `@twt/contracts/helpdesk`'s
 * `HELPDESK_CATEGORIES` by the sync-guard test.
 */
export const HELPDESK_CATEGORIES = [
  'kyc-trouble',
  'payment-failed',
  'utr-mismatch',
  'claim-status',
  'profile-update',
  'niyamavali-question',
  'partner-module-issue',
  'complaint',
  'other',
] as const;
export const helpdeskCategoryEnum = pgEnum('helpdesk_category', HELPDESK_CATEGORIES);
export type HelpdeskCategory = (typeof HELPDESK_CATEGORIES)[number];

/**
 * The ratified six-state lifecycle (AC4) — the pgEnum source (`CREATE TYPE
 * helpdesk_ticket_state`). The UNION PRD FR-52 + epics 10.1 each structurally need (the
 * ADR-0008 scope-dimension-union precedent; see helpdesk/state.ts). Kept in lockstep with the
 * contract tuple by the sync-guard.
 */
export const HELPDESK_TICKET_STATES = [
  'open',
  'in_progress',
  'awaiting_member',
  'resolved',
  'closed',
  'reopened',
] as const;
export const helpdeskTicketStateEnum = pgEnum('helpdesk_ticket_state', HELPDESK_TICKET_STATES);
export type HelpdeskTicketState = (typeof HELPDESK_TICKET_STATES)[number];

/** How a ticket was created — the member app or a transcribed helpline call (AC1). */
export const HELPDESK_CREATED_VIA_VALUES = ['member_app', 'helpline_call'] as const;
export const helpdeskCreatedViaEnum = pgEnum('helpdesk_created_via', HELPDESK_CREATED_VIA_VALUES);
export type HelpdeskCreatedVia = (typeof HELPDESK_CREATED_VIA_VALUES)[number];

/**
 * The routing-inputs snapshot stored on the ticket (AC1 `member_scope_context` / AC3). JSONB
 * inner keys are snake_case (the clause_versions convention) — which happens to match the
 * `@twt/contracts` `MemberScopeContext` wire shape exactly, so it round-trips with no mapping.
 * The sync-guard asserts the two shapes stay aligned.
 */
export interface MemberScopeContextSnapshot {
  pariwar_id: string;
  state: string | null;
  district: string | null;
  block: string | null;
  subject_member_id: string | null;
}

/**
 * The attachment MIME allowlist + count cap (Story 10.2, AC6) -- the DOMAIN mirror of the
 * `@twt/contracts` `HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES` / `HELPDESK_ATTACHMENT_MAX_COUNT`
 * (contracts is the authoritative source; contracts cannot import domain -- the RN bundle boundary
 * -- so it is re-declared here for the event-payload schema, and the tests/helpdesk.test.ts
 * sync-guard asserts the two never drift, exactly as it does for the category/state tuples).
 */
export const HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export const HELPDESK_ATTACHMENT_MAX_COUNT = 5;
export type HelpdeskAttachmentMimeType = (typeof HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES)[number];

/**
 * One attachment reference (object-store key, never bytes). Mirrors the hardened contract shape:
 * `size_bytes` was ADDED and `content_type` narrowed to the allowlist in Story 10.2 (AC6).
 */
export interface HelpdeskAttachmentRef {
  object_key: string;
  content_type: HelpdeskAttachmentMimeType;
  filename: string;
  size_bytes: number;
}

export const helpdeskTickets = pgTable(
  'helpdesk_tickets',
  {
    // The ticket's canonical id AND its events_log stream_id. Plain DB-defaulted random UUID
    // (no deriveTicketId — a ticket has no natural key). Branded `HelpdeskTicketId`.
    ticketId: uuid('ticket_id').defaultRandom().primaryKey().$type<HelpdeskTicketId>(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded. unFK'd.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Exactly one of these two is non-null (the CHECK below enforces it): a member filed for
    // themselves, or an operator/actor filed on someone's behalf.
    subjectMemberId: uuid('subject_member_id').$type<MemberId>(),
    subjectActorId: uuid('subject_actor_id').$type<UserId>(),

    // The registry category enum + the registry-driven nullable subcategory (AC1/AC2).
    category: helpdeskCategoryEnum('category').notNull(),
    subcategory: text('subcategory'),

    body: text('body').notNull(),
    // Attachment REFERENCES (object keys), never bytes. Defaults to the empty array.
    attachments: jsonb('attachments').notNull().$type<HelpdeskAttachmentRef[]>().default(sql`'[]'::jsonb`),

    // The CACHED lifecycle state — a projection of the event-replay, NOT the source of truth.
    // Written ONLY by the projector (helpdesk/project.ts); guarded by the DB trigger + CI gate.
    currentState: helpdeskTicketStateEnum('current_state').notNull(),
    // The `events_log.event_version` the cached `current_state` was projected from — the
    // staleness/idempotency anchor (the alerts precedent; mode:'number' matters for comparison).
    stateEventVersion: bigint('state_event_version', { mode: 'number' }).notNull(),

    // The routing decision (AC3), stored as an RBAC (dimension, value) + role. `scope_value` is
    // null for a `global`-dimension target. `routing_policy_version` PINS the decision (AC3
    // non-retroactivity — the ticket is never re-routed when a new policy version publishes).
    routedToScopeDimension: scopeDimensionEnum('routed_to_scope_dimension').notNull(),
    routedToScopeValue: text('routed_to_scope_value'),
    routedToRole: text('routed_to_role').notNull(),
    routedToActorId: uuid('routed_to_actor_id').$type<UserId>(),
    routingPolicyVersion: integer('routing_policy_version').notNull(),
    // The routing INPUTS snapshot (AC1/AC3) — makes the routing audit-replayable.
    memberScopeContext: jsonb('member_scope_context').notNull().$type<MemberScopeContextSnapshot>(),

    // The routing-decision instant (== created_at at genesis) + the two SLA due instants (AC1).
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'date' }).notNull(),
    slaFirstResponseDue: timestamp('sla_first_response_due', { withTimezone: true, mode: 'date' }).notNull(),
    slaResolutionDue: timestamp('sla_resolution_due', { withTimezone: true, mode: 'date' }).notNull(),

    // The routing-decision audit anchor (AC5). Threaded from the withCompensatingAudit intent
    // line (the Story 2.4 pre-generate pattern). NOT NULL — every ticket is created + routed
    // under an audit line (unlike pools/claims, whose audit_id is a nullable reference).
    auditId: uuid('audit_id').notNull(),

    createdVia: helpdeskCreatedViaEnum('created_via').notNull(),
    // WHO transcribed a helpline call (NON-PII controlled-staff attribution); null for member_app.
    operatorAttribution: text('operator_attribution'),

    // Cross-link seams (nullable now; the navigation that reads them is Story 10.4).
    claimCaseId: uuid('claim_case_id').$type<ClaimId>(),
    poolId: uuid('pool_id').$type<PoolId>(),
    // `module_id` / `validity_lookup_id` are deliberately NOT branded — no owning primitive exists
    // yet (Story 12.x partner modules; Story 4.7 MemberStatusPanel). Brand on the first PR that
    // builds the owning primitive (the ids/index.ts "branding mandatory on a new ID's first PR"
    // discipline applies to the OWNING id, not to a seam referencing an id that doesn't exist yet).
    moduleId: uuid('module_id'),
    validityLookupId: uuid('validity_lookup_id'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Per-tenant scans / RLS-aware planner hint (pariwar_id leads). Point lookups use the PK.
    index('helpdesk_tickets_pariwar_id_idx').on(t.pariwarId),
    // The Story 10.4 admin queue reads per-(tenant, state) — a composite serves it.
    index('helpdesk_tickets_pariwar_state_idx').on(t.pariwarId, t.currentState),
    // Exactly one subject (AC1) — a member ticket XOR an actor/operator ticket. `num_nonnulls`
    // is the concise, index-friendly XOR (the DB twin of the domain guard).
    check(
      'helpdesk_tickets_subject_xor',
      sql`num_nonnulls(${t.subjectMemberId}, ${t.subjectActorId}) = 1`,
    ),
  ],
);

// Inferred row types for the accessor read/write paths (pools/alerts precedent).
export type HelpdeskTicketRow = typeof helpdeskTickets.$inferSelect;
export type HelpdeskTicketInsert = typeof helpdeskTickets.$inferInsert;
