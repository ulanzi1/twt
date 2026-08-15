// Member-facing helpdesk transport DTOs -- Story 10.2 (Task 1; AC1/AC2/AC3/AC5).
//
// The member app's helpdesk surface reads/writes a DELIBERATELY NARROWER shape than the full
// `HelpdeskTicketDto` (10.1): a member never sees another party's audit anchor, matched-rule index,
// or the internal cross-link refs. These DTOs expose only what a member's own inbox + detail screen
// render -- status, routing target (role/scope, never a NAMED individual -- AC2 /
// [[project_admin_display_name_attribution]]), SLA due instants, attachment metadata, and the
// replay-derived read-only thread. `.strict()` throughout.
//
// -- Story 10.3 EXCEPTION: the FILING operator's name IS surfaced -------------------------------
// 10.2 hard-coded "a member never sees ... operator identity" here. Story 10.3 AC3 DELIBERATELY
// NARROWS that for ONE field: an operator-filed (`helpline_call`) ticket surfaces the FILING
// operator's display name via `operator_attribution` on the detail response, so the member app can
// render the "We filed this for you -- Operator [Name]" header (the caller consented to the operator
// filing on their behalf -- that transparency is the whole point of the call-to-ticket surface). This
// is NOT a leak: `operator_attribution` is the operator's CONTROLLED staff `display_name`, snapshotted
// server-side at create time ([[project_admin_display_name_attribution]]). The distinction preserved:
// the FILING operator's name is surfaced (they acted FOR the member); the RESPONDER/routing target is
// STILL role/scope-only, never a named individual (the 10.2 `routed_to_role` rule stands). `created_via`
// rides the list item so the inbox can badge helpline-filed tickets; `null`/`member_app` for self-filed.
//
// -- "subject" without a schema column (no migration -- ratified) -------------------------------
// The 10.1 substrate has ONLY `body` (no `subject` column) and 10.2 adds no migration. The member
// form still collects a short subject + a longer body (AC1); the create route stores them joined
// (subject, a blank line, then body) and the reads split them back. Because a member only ever sees
// their OWN member_app-created tickets (all joined by this route), the split is EXACT for every
// ticket these DTOs carry. See `splitMemberTicketSubjectBody` in @twt/domain.

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import { HELPDESK_ATTACHMENT_MAX_BYTES, HELPDESK_ATTACHMENT_MAX_COUNT, HelpdeskAttachmentContentType } from './attachment.js';
import { HelpdeskCategory, HelpdeskSubcategory } from './category.js';
import { HelpdeskGrantScope } from './routing.js';
import { HelpdeskTicketState } from './status.js';
import { HelpdeskCreatedVia } from './ticket.js';

/** The subject bound the member form + the create route enforce (kept well under the 5000-char
 *  body cap so `subject + "\n\n" + body` always fits the persisted `body` column). */
export const HELPDESK_MEMBER_SUBJECT_MAX = 150;
/** The body bound the member form enforces (leaves headroom for the joined subject + delimiter). */
export const HELPDESK_MEMBER_BODY_MAX = 4800;

/**
 * The member create-ticket request -- the NON-FILE fields of the single-shot multipart create
 * (AC1). Files ride the multipart body as `attachment` parts (validated + stored server-side, so
 * this JSON-ish field set carries NO attachment refs -- the server mints them). The server FORCES
 * `subject_member_id`/`created_via`/`subject_actor_id` -- none are client-supplied.
 *
 * The Turnstile token is NOT a field here -- it rides the `x-turnstile-token` HEADER instead (a
 * review-hardening fix), so the server can verify it before touching the multipart body at all
 * (no file buffering for a caller that never passes the bot-gate). See `requireTurnstileToken` in
 * `apps/api/src/modules/helpdesk/member-handlers.ts`.
 *
 * `subject` COLLAPSES any embedded newline run to a single space (never throws): the create route
 * joins `subject + "\n\n" + body` into the single stored `body` column and splits on the FIRST
 * blank line on read (`joinMemberTicketSubjectBody`/`splitMemberTicketSubjectBody` in
 * `@twt/domain`), so a subject that itself contained a blank line would corrupt that round-trip.
 * Collapsing here (not rejecting) keeps the form forgiving of pasted multi-line text.
 */
export const MemberCreateTicketRequest = z
  .object({
    category: HelpdeskCategory,
    sub_category: HelpdeskSubcategory.nullable().optional(),
    subject: z
      .string()
      .min(1)
      .max(HELPDESK_MEMBER_SUBJECT_MAX)
      .transform((s) => s.replace(/\s*\n+\s*/g, ' ').trim())
      .pipe(z.string().min(1, 'Subject is required')),
    body: z.string().min(1).max(HELPDESK_MEMBER_BODY_MAX),
    /**
     * Story 10.29 — ELEMENT 1 of the ratified three-part gate on staff-mediated data-export delivery
     * (`2026-08-14-113` cl.1): the MEMBER asked staff to hand over their export because they cannot
     * receive the code themselves. Captured HERE, at intake, because that is where the member's own
     * request is authored (Decision `2026-08-15-116` cl.3 option (c); shape per `2026-08-15-120` cl.1).
     *
     * ⛔ A BOOLEAN ON THE WIRE — the SERVER stamps the instant onto
     * `helpdesk_tickets.member_staff_mediation_requested_at`. A client-supplied `..._at` would
     * re-create the very defect this replaces (`2026-08-15-115` cl.3).
     *
     * ⛔ ACCEPTED ON ANY TICKET, and deliberately NOT coupled to the DPDPA subcategory in this schema:
     * the client offers the control only under that subcategory (`2026-08-15-120` cl.2), but enforcing
     * "subcategory ⇒ field" here would put a ROUTING token into a SECOND enforcement site and make the
     * intake schema depend on it — the exact coupling Story 10.21's AC2 spent its design avoiding.
     *
     * ⭐ THIS IS THE ROUTE ON WHICH AUTHORSHIP IS GENUINE (`2026-08-15-120` cl.6): the member is the
     * authenticated actor, so the request is theirs in fact and not by transcription — unlike the
     * `helpline_call` path, where the same field is operator-transcribed. ⚠ The story's AC2 requires
     * BOTH routes to capture it, so the asymmetry is stated rather than resolved by pretending.
     */
    member_requested_staff_mediated_delivery: z.boolean().optional(),
  })
  .strict();
export type MemberCreateTicketRequest = z.output<typeof MemberCreateTicketRequest>;

/**
 * Attachment metadata as a member sees it (AC3/AC6). Deliberately OMITS `object_key` -- the member
 * requests a signed URL by the attachment's array INDEX (`GET .../attachments/:index/url`), so the
 * opaque storage key never crosses the wire.
 */
export const MemberTicketAttachment = z
  .object({
    filename: z.string().min(1).max(255),
    content_type: HelpdeskAttachmentContentType,
    size_bytes: z.number().int().positive().max(HELPDESK_ATTACHMENT_MAX_BYTES),
  })
  .strict();
export type MemberTicketAttachment = z.output<typeof MemberTicketAttachment>;

/**
 * One entry in a ticket's read-only reply thread (AC3). Produced by replaying the ticket's
 * `helpdesk.*` event stream (see @twt/domain `replayTicketThread`). `kind` distinguishes the
 * opening message from later member/staff replies; `author` is a ROLE label only -- never a named
 * individual (AC2). 10.2 emits only the `opening` entry (from the genesis); the same reader
 * surfaces future member/staff reply entries with ZERO change (10.4), proven now against a seeded
 * reply event (AC3 forward-compatibility).
 */
export const HelpdeskThreadEntryKind = z.enum(['opening', 'member_reply', 'staff_reply']);
export type HelpdeskThreadEntryKind = z.output<typeof HelpdeskThreadEntryKind>;

export const HelpdeskThreadEntryAuthor = z.enum(['member', 'staff']);
export type HelpdeskThreadEntryAuthor = z.output<typeof HelpdeskThreadEntryAuthor>;

export const HelpdeskThreadEntry = z
  .object({
    kind: HelpdeskThreadEntryKind,
    author: HelpdeskThreadEntryAuthor,
    body: z.string().min(1),
    occurred_at: Iso8601Datetime,
  })
  .strict();
export type HelpdeskThreadEntry = z.output<typeof HelpdeskThreadEntry>;

/**
 * A member inbox row (AC3). Newest-first; the `subject` is the derived first line of the stored
 * body. `routed_to_role` + `routed_to_scope` are the RAW routing target -- the UI resolves the
 * member-friendly copy from the `helpdesk` i18n namespace (AC2/AC4: role/scope description, never a
 * named individual). SLA due instants are ISO -- the UI renders a client-side relative countdown.
 */
export const MemberTicketListItem = z
  .object({
    ticket_id: UuidString,
    category: HelpdeskCategory,
    sub_category: HelpdeskSubcategory.nullable(),
    subject: z.string().min(1),
    current_state: HelpdeskTicketState,
    routed_to_role: z.string().min(1).max(64),
    routed_to_scope: HelpdeskGrantScope,
    sla_first_response_due: Iso8601Datetime,
    sla_resolution_due: Iso8601Datetime,
    attachment_count: z.number().int().nonnegative(),
    // Story 10.3 (AC3) — how the ticket was created. `helpline_call` lets the inbox badge an
    // operator-filed ticket; `member_app` for a self-filed one. The FILING channel, not a leak.
    created_via: HelpdeskCreatedVia,
    created_at: Iso8601Datetime,
    updated_at: Iso8601Datetime,
  })
  .strict();
export type MemberTicketListItem = z.output<typeof MemberTicketListItem>;

/** The member inbox response (AC3). */
export const MemberTicketListResponse = z.object({ tickets: z.array(MemberTicketListItem) }).strict();
export type MemberTicketListResponse = z.output<typeof MemberTicketListResponse>;

/**
 * The member ticket-detail response (AC3). The list-item fields PLUS the full body, the attachment
 * metadata list, and the replay-derived read-only thread.
 */
export const MemberTicketDetailResponse = MemberTicketListItem.extend({
  body: z.string().min(1),
  // Capped consistently with HelpdeskTicketDto.attachments (Task 1) -- the persisted row this DTO
  // is derived from is already capped, so this is a wire-shape consistency fix, not a new limit.
  attachments: z.array(MemberTicketAttachment).max(HELPDESK_ATTACHMENT_MAX_COUNT),
  thread: z.array(HelpdeskThreadEntry),
  // Story 10.3 (AC3) -- the FILING operator's display name for a `helpline_call` ticket (drives the
  // "We filed this for you -- Operator [Name]" header); `null` for a self-filed `member_app` ticket.
  // Server-resolved, never client-supplied (snapshotted at create time). The `128` bound MATCHES
  // `HelpdeskTicketDto.operator_attribution` (ticket.ts) -- the same underlying value; do not widen it.
  operator_attribution: z.string().min(1).max(128).nullable(),
}).strict();
export type MemberTicketDetailResponse = z.output<typeof MemberTicketDetailResponse>;

/** One category (+ its registry-defined subcategories) in the in-force policy (AC5). */
export const HelpdeskCategoryListItem = z
  .object({
    category: HelpdeskCategory,
    /** Distinct non-null sub_category tokens the in-force policy recognizes for this category.
     *  Empty for the v1 default policy (all its rules are `sub_category: null` catch-alls). */
    sub_categories: z.array(HelpdeskSubcategory),
  })
  .strict();
export type HelpdeskCategoryListItem = z.output<typeof HelpdeskCategoryListItem>;

/**
 * The member category-picker response (AC5). Returns RAW category keys (labels are resolved
 * client-side from the `helpdesk` i18n namespace) + the in-force policy version (provenance).
 */
export const HelpdeskCategoryListResponse = z
  .object({
    policy_version: z.number().int().positive(),
    categories: z.array(HelpdeskCategoryListItem),
  })
  .strict();
export type HelpdeskCategoryListResponse = z.output<typeof HelpdeskCategoryListResponse>;

/** The signed-URL mint response for one of the member's OWN attachments (AC6). Short-lived. */
export const HelpdeskAttachmentUrlResponse = z
  .object({
    url: z.string().min(1),
    expires_at: Iso8601Datetime,
  })
  .strict();
export type HelpdeskAttachmentUrlResponse = z.output<typeof HelpdeskAttachmentUrlResponse>;
