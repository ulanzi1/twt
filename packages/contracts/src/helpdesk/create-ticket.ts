// Create-ticket request/response — Story 10.1 (Task 1; AC1/AC5).
//
// The tenant-scoped create-ticket primitive (POST /api/v1/p/:pariwarId/helpdesk/tickets). The
// SERVER derives `member_scope_context` from the subject, snapshots the in-force policy version,
// and routes — so the client sends only the subject + category + body + optional refs, NEVER the
// routing/scope-context/state (those are server-authoritative). `.strict()` throughout.

import { z } from 'zod';

import { UuidString } from '../_common/primitives.js';
import { HELPDESK_ATTACHMENT_MAX_COUNT } from './attachment.js';
import { HelpdeskCategory, HelpdeskSubcategory } from './category.js';
import { HelpdeskAttachment, HelpdeskCreatedVia, HelpdeskTicketDto } from './ticket.js';

/**
 * Create-ticket request. Exactly one of `subject_member_id` / `subject_actor_id` MUST be present
 * (a member files for themselves; an operator files a call-in on a member's or an actor's behalf).
 * `subject_actor_id` is only legal when `created_via` is `helpline_call` — a member can only ever
 * file for themselves, never on an actor's behalf. Cross-link refs are optional seams.
 *
 * NOTE: `operator_attribution` (who transcribed a helpline call) is NOT part of this request — it
 * is server-resolved from the authenticated operator's session `display_name` at write time (the
 * `users.display_name` attribution convention, [[project_admin_display_name_attribution]]), never
 * client-supplied free text. It appears only on the response (`HelpdeskTicketDto`).
 */
export const CreateTicketRequest = z
  .object({
    subject_member_id: UuidString.optional(),
    subject_actor_id: UuidString.optional(),
    category: HelpdeskCategory,
    sub_category: HelpdeskSubcategory.nullable().optional(),
    body: z.string().min(1).max(5000),
    attachments: z.array(HelpdeskAttachment).max(HELPDESK_ATTACHMENT_MAX_COUNT).optional(),
    created_via: HelpdeskCreatedVia,
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
     * ⚠ THE LIMIT, STATED PLAINLY (`2026-08-15-120` cl.6): on `created_via: 'helpline_call'` this is
     * OPERATOR-TRANSCRIBED at intake — the same posture as `body` and `operator_attribution`. Over the
     * deleted caller-supplied `z.literal(true)` boolean it buys a separate act at a separate
     * instant, an immutable genesis record, and the delivery caller's total inability to manufacture
     * element 1 — ⛔ but it does NOT prove the member spoke, and nothing may claim it does. The
     * member-app path (Story 10.2) is where the authorship is genuine.
     */
    member_requested_staff_mediated_delivery: z.boolean().optional(),
    claim_case_id: UuidString.optional(),
    pool_id: UuidString.optional(),
    module_id: UuidString.optional(),
    validity_lookup_id: UuidString.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const hasMember = v.subject_member_id !== undefined;
    const hasActor = v.subject_actor_id !== undefined;
    if (hasMember === hasActor) {
      const message = 'exactly one of subject_member_id / subject_actor_id must be present';
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['subject_member_id'] });
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['subject_actor_id'] });
    }
    // A member can only ever file for themselves — subject_actor_id is an operator-only concept.
    if (v.created_via === 'member_app' && hasActor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'subject_actor_id is only valid when created_via is helpline_call',
        path: ['subject_actor_id'],
      });
    }
  });
export type CreateTicketRequest = z.output<typeof CreateTicketRequest>;

/** Create-ticket response — the persisted, routed ticket (201). */
export const CreateTicketResponse = HelpdeskTicketDto;
export type CreateTicketResponse = z.output<typeof CreateTicketResponse>;
