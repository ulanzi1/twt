// Helpdesk ticket transport DTO — Story 10.1 (Task 1; AC1).
//
// The wire shape of a persisted ticket. Naming boundary (Task 1): transport fields are
// snake_case; the domain/schema fields are camelCase (Drizzle maps to snake_case columns).
// `.strict()` throughout. `current_state` is projector-derived (AC4); it is READ on the wire,
// never written by a client.

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import { HelpdeskCategory, HelpdeskSubcategory } from './category.js';
import { HelpdeskGrantScope, MemberScopeContext } from './routing.js';
import { HelpdeskTicketState } from './status.js';

/** How a ticket was created (AC1) — the member app or a helpline call transcribed by an operator. */
export const HELPDESK_CREATED_VIA = ['member_app', 'helpline_call'] as const;
export const HelpdeskCreatedVia = z.enum(HELPDESK_CREATED_VIA);
export type HelpdeskCreatedVia = z.output<typeof HelpdeskCreatedVia>;

/**
 * One attachment reference. A ticket carries object-store REFERENCES, never bytes (the
 * claim-document storage posture) — 10.1 defines the reference shape; the upload transport +
 * signed-URL access are the member/admin surfaces (10.2/10.4). Minimal + forward-compatible.
 */
export const HelpdeskAttachment = z
  .object({
    object_key: z.string().min(1).max(1024),
    content_type: z.string().min(1).max(255),
    filename: z.string().min(1).max(255),
  })
  .strict();
export type HelpdeskAttachment = z.output<typeof HelpdeskAttachment>;

/**
 * The ticket record (AC1). Exactly one of `subject_member_id` / `subject_actor_id` is non-null
 * (the DB CHECK + the domain guard enforce it). `routed_to_*` + `routing_policy_version` +
 * `member_scope_context` are the audit-replayable routing snapshot (AC3). The cross-link refs
 * (`claim_case_id` / `pool_id` / `module_id` / `validity_lookup_id`) are nullable seams whose
 * navigation lands in Story 10.4.
 */
export const HelpdeskTicketDto = z
  .object({
    ticket_id: UuidString,
    pariwar_id: UuidString,
    subject_member_id: UuidString.nullable(),
    subject_actor_id: UuidString.nullable(),
    category: HelpdeskCategory,
    // Spelled `sub_category` (matches the request/routing-rule field) — NOT `subcategory`; a prior
    // mismatch here was a live wire-shape drift (a client filing with `sub_category` got it back
    // spelled differently in the 201 response).
    sub_category: HelpdeskSubcategory.nullable(),
    body: z.string().min(1),
    attachments: z.array(HelpdeskAttachment),
    /** Projector-derived (AC4). Read-only on the wire. */
    current_state: HelpdeskTicketState,
    routed_to_scope: HelpdeskGrantScope,
    routed_to_role: z.string().min(1).max(64),
    routed_to_actor_id: UuidString.nullable(),
    routing_policy_version: z.number().int().positive(),
    member_scope_context: MemberScopeContext,
    assigned_at: Iso8601Datetime,
    sla_first_response_due: Iso8601Datetime,
    sla_resolution_due: Iso8601Datetime,
    audit_id: UuidString,
    created_via: HelpdeskCreatedVia,
    // Server-resolved (never client-supplied — the users.display_name attribution convention,
    // [[project_admin_display_name_attribution]]): the acting operator's display name, snapshotted
    // at create time for a helpline_call ticket; null for member_app.
    operator_attribution: z.string().min(1).max(128).nullable(),
    // Cross-link seams (nullable now; navigation is Story 10.4).
    claim_case_id: UuidString.nullable(),
    pool_id: UuidString.nullable(),
    module_id: UuidString.nullable(),
    validity_lookup_id: UuidString.nullable(),
    created_at: Iso8601Datetime,
    updated_at: Iso8601Datetime,
  })
  .strict()
  .superRefine((v, ctx) => {
    const hasMember = v.subject_member_id !== null;
    const hasActor = v.subject_actor_id !== null;
    if (hasMember === hasActor) {
      const message = 'exactly one of subject_member_id / subject_actor_id must be non-null';
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['subject_member_id'] });
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['subject_actor_id'] });
    }
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
    // Compare as instants (not raw strings) — Iso8601Datetime allows ANY offset, so two
    // differently-offset-but-equal-instant strings would misorder under lexicographic `<`.
    if (new Date(v.sla_resolution_due).getTime() < new Date(v.sla_first_response_due).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sla_resolution_due must not precede sla_first_response_due',
        path: ['sla_resolution_due'],
      });
    }
  });
export type HelpdeskTicketDto = z.output<typeof HelpdeskTicketDto>;
