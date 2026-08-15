// Admin responder-console transport DTOs — Story 10.4 (Task 5; AC1/AC2/AC3/AC5).
//
// The admin responder surface (`/api/v1/p/{pariwarId}/helpdesk/...`) reads a RICHER shape than the
// member surface: it carries the DERIVED SLA presentation (both timers + severity), the cross-link
// presence/refs (nav badges), and the full reply thread + routing snapshot. Pure Zod — NO
// `@twt/domain` import (the RN Metro bundle boundary; the tests/helpdesk.test.ts sync-guard is the
// only place domain tuples are imported, and tests never ship). `.strict()` throughout. The lifecycle
// state + SLA presentation are DERIVED server-side (projector state + the pure sla.ts derivations);
// they are READ on the wire, never client-written.

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import { HELPDESK_ATTACHMENT_MAX_BYTES, HELPDESK_ATTACHMENT_MAX_COUNT, HelpdeskAttachmentContentType } from './attachment.js';
import { HelpdeskCategory, HelpdeskSubcategory } from './category.js';
import { HelpdeskThreadEntry } from './member.js';
import { HelpdeskGrantScope, MemberScopeContext } from './routing.js';
import { HelpdeskTicketState } from './status.js';
import { HelpdeskCreatedVia } from './ticket.js';

/**
 * The derived per-ticket severity band (AC4). `breached` ≻ `due_soon` ≻ `on_track`. Mirror of the
 * domain `HelpdeskTicketSeverity` / `HELPDESK_SEVERITY_ORDER` (helpdesk/sla.ts); the
 * tests/helpdesk.test.ts sync-guard asserts the two tuples never drift.
 */
export const HELPDESK_SEVERITIES = ['breached', 'due_soon', 'on_track'] as const;
export const HelpdeskSeverity = z.enum(HELPDESK_SEVERITIES);
export type HelpdeskSeverity = z.output<typeof HelpdeskSeverity>;

/**
 * One SLA timer's derived status (AC4). `running` reflects the ticket's state (running only while it
 * awaits staff action); `breached` is `running && past-due`; `ms_remaining` is `due - now` (NEGATIVE
 * once past due) — the UI renders a client-side countdown from it.
 */
export const HelpdeskSlaTimer = z
  .object({
    due_at: Iso8601Datetime,
    running: z.boolean(),
    breached: z.boolean(),
    ms_remaining: z.number().int(),
  })
  .strict();
export type HelpdeskSlaTimer = z.output<typeof HelpdeskSlaTimer>;

/**
 * The four nullable cross-link refs (AC5). A non-null ref renders a badge + a navigation affordance
 * (claim → verifier console, reconciliation/pool → reconciliation review, validity → member status;
 * partner-module → a documented seam, badge renders but nav is disabled). No v1 create path populates
 * these, so every v1 ticket carries all-null — the badges light up for free once a producer sets a ref.
 */
export const HelpdeskCrossLinkRefs = z
  .object({
    claim_case_id: UuidString.nullable(),
    pool_id: UuidString.nullable(),
    module_id: UuidString.nullable(),
    validity_lookup_id: UuidString.nullable(),
  })
  .strict();
export type HelpdeskCrossLinkRefs = z.output<typeof HelpdeskCrossLinkRefs>;

/**
 * One row of the admin responder queue (AC1). The ticket's identity + lifecycle state + category +
 * derived subject + `created_via`, PLUS the two derived SLA timers, the overall severity, and the
 * cross-link refs. `subject` is derived server-side from the stored body (the member-app join split;
 * a first-line preview for a helpline-filed ticket). `routed_to_role`/`routed_to_scope` are the RAW
 * routing target — never a named individual (the 10.2 thread rule).
 */
export const HelpdeskQueueItem = z
  .object({
    ticket_id: UuidString,
    category: HelpdeskCategory,
    sub_category: HelpdeskSubcategory.nullable(),
    subject: z.string().min(1),
    current_state: HelpdeskTicketState,
    created_via: HelpdeskCreatedVia,
    routed_to_role: z.string().min(1).max(64),
    routed_to_scope: HelpdeskGrantScope,
    sla_first_response: HelpdeskSlaTimer,
    sla_resolution: HelpdeskSlaTimer,
    severity: HelpdeskSeverity,
    cross_links: HelpdeskCrossLinkRefs,
    created_at: Iso8601Datetime,
    updated_at: Iso8601Datetime,
  })
  .strict();
export type HelpdeskQueueItem = z.output<typeof HelpdeskQueueItem>;

/** The paginated admin queue response (AC1). `next_offset` is the offset to request the next page,
 *  or null when the last page was returned (fewer rows than the page size). */
export const HelpdeskQueueResponse = z
  .object({
    tickets: z.array(HelpdeskQueueItem),
    next_offset: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type HelpdeskQueueResponse = z.output<typeof HelpdeskQueueResponse>;

/** Attachment metadata as the responder sees it (AC1) — filename + type + size, never the object key
 *  (v1 has no admin attachment-download route; parity with the member surface's metadata-only shape). */
export const HelpdeskAdminAttachment = z
  .object({
    filename: z.string().min(1).max(255),
    content_type: HelpdeskAttachmentContentType,
    size_bytes: z.number().int().positive().max(HELPDESK_ATTACHMENT_MAX_BYTES),
  })
  .strict();
export type HelpdeskAdminAttachment = z.output<typeof HelpdeskAdminAttachment>;

/**
 * The admin ticket-detail response (AC1/AC2/AC3/AC5). The queue-item fields PLUS the subject refs,
 * the full body, the attachment metadata, the replay-derived thread (role-labelled authors only —
 * never a named individual), the FILING operator's display name (a helpline_call header; null for
 * member_app), and the routing snapshot. Returned by the detail read AND by every transition route
 * (so the console refreshes the detail after an action).
 */
export const HelpdeskAdminTicketDetailResponse = HelpdeskQueueItem.extend({
  subject_member_id: UuidString.nullable(),
  subject_actor_id: UuidString.nullable(),
  body: z.string().min(1),
  attachments: z.array(HelpdeskAdminAttachment).max(HELPDESK_ATTACHMENT_MAX_COUNT),
  thread: z.array(HelpdeskThreadEntry),
  operator_attribution: z.string().min(1).max(128).nullable(),
  routing_policy_version: z.number().int().positive(),
  assigned_at: Iso8601Datetime,
  member_scope_context: MemberScopeContext,
  /**
   * Story 10.29 (Decision `2026-08-15-120` cl.5) — element 1's instant, so the responder console can
   * explain a refused fallback AT the control instead of after a 409. See the identical field on
   * `HelpdeskTicketDto`.
   * ⚠ This response extends `HelpdeskQueueItem`, ⛔ NOT `HelpdeskTicketDto`, so the field is declared
   * on both deliberately — adding it to the DTO alone would never reach this surface.
   * ⛔ The MEMBER-facing detail response does NOT gain it (`2026-08-15-120` cl.5): the operator surface
   * needs it, the member's own view does not, and widening member-facing DTOs is unearned scope.
   */
  member_staff_mediation_requested_at: Iso8601Datetime.nullable(),
}).strict();
export type HelpdeskAdminTicketDetailResponse = z.output<typeof HelpdeskAdminTicketDetailResponse>;

/**
 * The message-bearing transition request body (AC3) — the staff reply carried by the `/reply`
 * (awaiting_member) and `/resolve` routes. Bounded to match the genesis `body` / the domain
 * message-bearing payload schema (min 1, max 5000). The `/pick-up` route carries NO body.
 */
export const HelpdeskReplyRequest = z.object({ message: z.string().min(1).max(5000) }).strict();
export type HelpdeskReplyRequest = z.output<typeof HelpdeskReplyRequest>;

/** Every transition route (pick-up / reply / resolve) returns the UPDATED admin ticket detail so the
 *  console can re-render the row + the thread from one response (AC2). */
export const HelpdeskTransitionResponse = HelpdeskAdminTicketDetailResponse;
export type HelpdeskTransitionResponse = z.output<typeof HelpdeskTransitionResponse>;
