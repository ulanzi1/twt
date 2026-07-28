// Create-ticket request/response — Story 10.1 (Task 1; AC1/AC5).
//
// The tenant-scoped create-ticket primitive (POST /api/v1/p/:pariwarId/helpdesk/tickets). The
// SERVER derives `member_scope_context` from the subject, snapshots the in-force policy version,
// and routes — so the client sends only the subject + category + body + optional refs, NEVER the
// routing/scope-context/state (those are server-authoritative). `.strict()` throughout.

import { z } from 'zod';

import { UuidString } from '../_common/primitives.js';
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
    attachments: z.array(HelpdeskAttachment).max(10).optional(),
    created_via: HelpdeskCreatedVia,
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
