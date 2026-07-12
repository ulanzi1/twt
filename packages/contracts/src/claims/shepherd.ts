// packages/contracts/src/claims/shepherd.ts
//
// The Story 6.12 member-facing shepherd read DTO — the scope-safe
// `GET /api/v1/member/claims/:claimCaseId/shepherd` response backing the mobile <ShepherdContactCard>
// (AC3). Returns the LIVE shepherd's controlled staff-attribution display + contact SNAPSHOT for a claim
// the member owns, or a typed `not_assigned` state for a claim still pre-`verification_in_progress`.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// MUST NOT import `@twt/domain` (the sibling verifier-console contract states this). The E.164 wire shape
// is re-declared here (the nominee-bank `IFSC_REGEX` re-declaration precedent — one authority per layer,
// never a domain import). Wire keys are snake_case (`display_name` / `role_label` / `contact.phone` /
// `contact.whatsapp`) per the member-claim wire convention + the story's pinned DTO. NON-PII beyond the
// controlled staff-contact snapshot the family is entitled to see (that IS the FR-41 feature).

import { z } from 'zod';

/** Canonical E.164 wire shape (`+<country><subscriber>`) — re-declared (no `@twt/domain` import). */
export const SHEPHERD_CONTACT_E164_REGEX = /^\+[1-9]\d{1,14}$/;

const ShepherdContactChannel = z
  .string()
  .regex(SHEPHERD_CONTACT_E164_REGEX, 'must be canonical E.164 (+<country><subscriber>)')
  .nullable();

/** The shepherd's contact snapshot — tappable tel:/wa.me deep-links on the card (R1). ≥1 present in
 *  practice (the AC2 contactability invariant), but both are typed nullable for the defensive card path. */
export const ShepherdContact = z
  .object({
    phone: ShepherdContactChannel,
    whatsapp: ShepherdContactChannel,
  })
  .strict();
export type ShepherdContact = z.infer<typeof ShepherdContact>;

/**
 * The member shepherd read response — a discriminated union on `status`:
 *   · `assigned`     — the live shepherd's display + role + contact snapshot.
 *   · `not_assigned` — the claim has no live shepherd yet (pre-`verification_in_progress`).
 */
export const MemberShepherdResponse = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('assigned'),
      display_name: z.string().min(1),
      role_label: z.string().min(1),
      contact: ShepherdContact,
    })
    .strict(),
  z
    .object({
      status: z.literal('not_assigned'),
    })
    .strict(),
]);
export type MemberShepherdResponse = z.infer<typeof MemberShepherdResponse>;

// ── Admin manual reassignment (R6) — POST …/admin/claims/:claimCaseId/shepherd/reassign ─────────────
// The `.strict()` request carries ONLY the new shepherd's actor id; the acting admin identity + district
// are server-derived (never client-submitted). Self-assignment (actor === target) is rejected server-side.
export const ShepherdReassignRequest = z
  .object({
    target_shepherd_actor_id: z.string().uuid(),
  })
  .strict();
export type ShepherdReassignRequest = z.infer<typeof ShepherdReassignRequest>;

/** The NON-PII reassignment response — routing coordinates + the authorized display/role (NEVER contact
 *  phone/WhatsApp on this admin surface — AC8; contact stays on the member card). */
export const ShepherdReassignResponse = z
  .object({
    assignment_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    shepherd_actor_id: z.string().uuid(),
    shepherd_display: z.string().min(1),
    role_label: z.string().min(1),
    previous_shepherd_actor_id: z.string().uuid().nullable(),
    assignment_reason: z.enum(['initial', 'reassignment', 'fallback']),
    assigned_at: z.string(),
    claim_state: z.string(),
  })
  .strict();
export type ShepherdReassignResponse = z.infer<typeof ShepherdReassignResponse>;
