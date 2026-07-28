// Helpdesk event vocabulary + Zod payload schemas — Story 10.1 (Task 3; AC4/AC5).
//
// The `helpdesk.*` event types are the ticket lifecycle's WRITE vocabulary: every legal
// transition is a named, dotted `resource.action` event on the ticket's `events_log` stream
// (stream_id = ticket_id). These schemas validate the event PAYLOAD; `occurred_at` +
// `pariwar_id` + `actor_id` are columns on `events_log` and are NOT duplicated here.
//
// ── Why these live in @twt/domain (not @twt/contracts) ────────────────────────
// `@twt/events` depends on @twt/domain; the registry (packages/events/src/registry.ts) imports
// these schemas, and so does the projector (helpdesk/project.ts). Putting them in @twt/contracts
// would reverse the legal import direction (contracts→domain). Same rationale as alert/events.ts.
//
// ── Event-name delimiter: single-dot snake_case (the merged-registry convention) ──
// `helpdesk.ticket_created` / `helpdesk.picked_up` / … — the same `resource.action` snake_case
// convention alert.*/pool.*/member.*/claim.* follow (contrast the epic prose's occasional hyphens).
//
// ── This story registers ONLY the genesis; transition shapes are AUTHORED, not registered ──
// The complete reducer authors all arms (state.ts); this story emits + registers only
// `helpdesk.ticket_created`. The transition payload shapes below exist for the 10.2/10.4 emitters +
// the auto-close job to import; they register with their emitting surface (the alert/pool precedent).
// `.strict()` everywhere: an unknown key is a defect.

import { z } from 'zod';

import { SCOPE_DIMENSIONS } from '../rbac/scope.js';
import {
  HELPDESK_CATEGORIES,
  HELPDESK_CREATED_VIA_VALUES,
  HELPDESK_TICKET_STATES,
} from '../schema/helpdesk_tickets.js';

/**
 * Who caused the ticket transition (the architecture §1.14 audit shape). A `member` files/replies/
 * reopens; an `operator` (helpline) files a call-in; `staff` (an assignee/admin) picks up/resolves;
 * `system` is the auto-close job.
 */
export const helpdeskActorSchema = z.enum(['member', 'operator', 'staff', 'system']);
export type HelpdeskEventActor = z.infer<typeof helpdeskActorSchema>;

/** A ticket-lifecycle-state literal, derived from the one tuple in schema/helpdesk_tickets.ts. */
export const helpdeskTicketStateSchema = z.enum(HELPDESK_TICKET_STATES);
export const helpdeskCategorySchema = z.enum(HELPDESK_CATEGORIES);
export const helpdeskCreatedViaSchema = z.enum(HELPDESK_CREATED_VIA_VALUES);
export const helpdeskScopeDimensionSchema = z.enum(SCOPE_DIMENSIONS);

/**
 * The audit shape every helpdesk.* payload carries (§1.14). `from_state` is nullable — the genesis
 * carries `null` (no prior state). The reducer (state.ts) is the runtime authority — it derives the
 * next state from the CURRENT state + the event TYPE, never from `to_state` (a mislabelled payload
 * can never corrupt replay).
 */
const auditShape = {
  from_state: helpdeskTicketStateSchema.nullable(),
  to_state: helpdeskTicketStateSchema,
  // Freeform human-readable audit note (the alert/pool trigger-field decision) — deliberately
  // unconstrained; no bounded trigger vocabulary is specified for helpdesk.
  trigger: z.string().min(1),
  actor: helpdeskActorSchema,
};

/** The routing INPUTS snapshot embedded in the genesis (mirrors the ticket's member_scope_context). */
export const MemberScopeContextPayloadSchema = z
  .object({
    pariwar_id: z.string().uuid(),
    state: z.string().min(1).nullable(),
    district: z.string().min(1).nullable(),
    block: z.string().min(1).nullable(),
    subject_member_id: z.string().uuid().nullable(),
  })
  .strict();

/** The resolved target scope `(dimension, value)` embedded in the genesis. */
export const TargetScopePayloadSchema = z
  .object({
    dimension: helpdeskScopeDimensionSchema,
    value: z.string().min(1).nullable(),
  })
  .strict();

/** One attachment reference embedded in the genesis (object key, never bytes). */
export const HelpdeskAttachmentPayloadSchema = z
  .object({
    object_key: z.string().min(1).max(1024),
    content_type: z.string().min(1).max(255),
    filename: z.string().min(1).max(255),
  })
  .strict();

/**
 * `helpdesk.ticket_created` → `open` (the genesis event: (none) → open). Owner: Story 10.1 (the
 * create-ticket route). The FIRST event of the ticket's stream. Carries the FULL routing snapshot
 * (AC3 audit-replayable): category/subcategory, the member-scope context, the routing-policy
 * version in force at creation, the resolved target role + scope, the two SLA due instants (ISO),
 * created_via + operator attribution, the subject, attachments, and the nullable cross-link refs.
 */
export const HelpdeskTicketCreatedPayloadSchema = z
  .object({
    ...auditShape,
    ticket_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    category: helpdeskCategorySchema,
    sub_category: z.string().min(1).max(64).nullable(),
    body: z.string().min(1).max(5000),
    attachments: z.array(HelpdeskAttachmentPayloadSchema).max(10),
    member_scope_context: MemberScopeContextPayloadSchema,
    routing_policy_version: z.number().int().positive(),
    target_role: z.string().min(1).max(64),
    target_scope: TargetScopePayloadSchema,
    matched_rule_index: z.number().int().nonnegative(),
    sla_first_response_due: z.string().datetime({ offset: true }),
    sla_resolution_due: z.string().datetime({ offset: true }),
    created_via: helpdeskCreatedViaSchema,
    operator_attribution: z.string().min(1).max(128).nullable(),
    // Exactly one of the two subject refs is non-null (the DB CHECK + the domain guard enforce it).
    subject_member_id: z.string().uuid().nullable(),
    subject_actor_id: z.string().uuid().nullable(),
    // Nullable cross-link seams (navigation is Story 10.4).
    claim_case_id: z.string().uuid().nullable(),
    pool_id: z.string().uuid().nullable(),
    module_id: z.string().uuid().nullable(),
    validity_lookup_id: z.string().uuid().nullable(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const hasMember = v.subject_member_id !== null;
    const hasActor = v.subject_actor_id !== null;
    if (hasMember === hasActor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'exactly one of subject_member_id / subject_actor_id must be non-null',
        path: ['subject_member_id'],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'exactly one of subject_member_id / subject_actor_id must be non-null',
        path: ['subject_actor_id'],
      });
    }

    // The top-level pariwar_id and the nested member_scope_context.pariwar_id must agree — a caller
    // bug populating a mismatched nested value would otherwise silently route against the wrong
    // tenant value while the ticket row itself stays correctly scoped under the real pariwar_id.
    if (v.member_scope_context.pariwar_id !== v.pariwar_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'member_scope_context.pariwar_id must equal the top-level pariwar_id',
        path: ['member_scope_context', 'pariwar_id'],
      });
    }

    // created_via/operator_attribution consistency (mirrors the contract-layer check in
    // @twt/contracts/helpdesk/create-ticket.ts — repeated here since this schema also validates
    // events built outside that route, e.g. by a future migration/backfill tool).
    if (v.created_via === 'helpline_call' && v.operator_attribution === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'operator_attribution is required when created_via is helpline_call',
        path: ['operator_attribution'],
      });
    }
    if (v.created_via === 'member_app' && v.operator_attribution !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'operator_attribution must be null when created_via is member_app',
        path: ['operator_attribution'],
      });
    }
  });
export type HelpdeskTicketCreatedPayload = z.infer<typeof HelpdeskTicketCreatedPayloadSchema>;

// ── Transition payload shapes (AUTHORED, not registered by this story) ─────────
// Each transition carries only the audit shape (no load-bearing extra fields in v1). The emitting
// surface (10.2/10.4 + the auto-close job) registers its own type in packages/events/src/registry.ts.

/** `helpdesk.picked_up` → `in_progress` (assignee picks up). Owner: Story 10.4. */
export const HelpdeskPickedUpPayloadSchema = z.object({ ...auditShape }).strict();
/** `helpdesk.awaiting_member` → `awaiting_member` (needs member input; resolution SLA pauses). Owner: 10.4. */
export const HelpdeskAwaitingMemberPayloadSchema = z.object({ ...auditShape }).strict();
/** `helpdesk.member_replied` → `in_progress` (member replied). Owner: Story 10.2. */
export const HelpdeskMemberRepliedPayloadSchema = z.object({ ...auditShape }).strict();
/** `helpdesk.resolved` → `resolved` (assignee resolves). Owner: Story 10.4. */
export const HelpdeskResolvedPayloadSchema = z.object({ ...auditShape }).strict();
/** `helpdesk.closed` → `closed` (auto, 7 days no reply). Owner: the auto-close job. */
export const HelpdeskClosedPayloadSchema = z.object({ ...auditShape }).strict();
/** `helpdesk.reopened` → `reopened` (member reopens within 30 days post-close). Owner: Story 10.2. */
export const HelpdeskReopenedPayloadSchema = z.object({ ...auditShape }).strict();

// ── The event-type vocabulary + the type→schema map (single source) ────────────

export const HELPDESK_EVENT_TYPES = [
  'helpdesk.ticket_created',
  'helpdesk.picked_up',
  'helpdesk.awaiting_member',
  'helpdesk.member_replied',
  'helpdesk.resolved',
  'helpdesk.closed',
  'helpdesk.reopened',
] as const;

/** The dotted `helpdesk.*` event-type literal union (genesis + 6 transitions). */
export type HelpdeskEventType = (typeof HELPDESK_EVENT_TYPES)[number];

/**
 * type → payload-schema map. The ONE place the events bind to their schemas; the projector consumes
 * it. `satisfies` keeps it exhaustive — adding a `HelpdeskEventType` without a schema is a compile
 * error. NOTE: `packages/events` registers ONLY `helpdesk.ticket_created` this story (the transition
 * types register with their emitting surface); this map is complete for the reducer/projector's use.
 */
export const HELPDESK_EVENT_PAYLOAD_SCHEMAS = {
  'helpdesk.ticket_created': HelpdeskTicketCreatedPayloadSchema,
  'helpdesk.picked_up': HelpdeskPickedUpPayloadSchema,
  'helpdesk.awaiting_member': HelpdeskAwaitingMemberPayloadSchema,
  'helpdesk.member_replied': HelpdeskMemberRepliedPayloadSchema,
  'helpdesk.resolved': HelpdeskResolvedPayloadSchema,
  'helpdesk.closed': HelpdeskClosedPayloadSchema,
  'helpdesk.reopened': HelpdeskReopenedPayloadSchema,
} as const satisfies Record<HelpdeskEventType, z.ZodTypeAny>;
