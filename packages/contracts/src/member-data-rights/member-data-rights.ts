// Story 10.21 — off-portal DPDPA data-rights fulfilment contracts (AC2/AC3/AC5).
//
// The wire contracts for the identity-verified administrative process Niyamavali §8.4 requires when a
// member's authenticated access has ended but their statutory rights have not. Wire shape is
// snake_case; every object is `.strict()`.
//
// ⛔ NOTHING HERE SERVES DELIVERY OR CORRECTION. Handing the built artifact to anyone (AC-R1) and the
// correction right (AC-R2) are BLOCKED on Escalations 1 and 2, and the trustee-authority recipient
// (AC-R3) on Escalation 10 — all three RAISED AND UNANSWERED. ⛔ Do not add a download/handover DTO
// here "so it is ready": a dormant staff-decrypt contract is the same capability, merely unlit.

import { z } from 'zod';

/**
 * ⭐ THE SUBCATEGORY TOKEN — declared ONCE, here, and imported everywhere else.
 *
 * A DPDPA request is filed through the EXISTING Story 10.1 create route as `category: 'other'` with
 * this subcategory. ⛔ No new helpdesk category is minted, and `DEFAULT_ROUTING_POLICY` stays
 * byte-identical — a newly-minted category is absent from every per-Pariwar override authored before
 * today and would SILENTLY mis-route to that Pariwar's generic `other` desk under the wrong SLA, with
 * no error anywhere (the resolver falls through to the mandatory `other` catch-all).
 *
 * ⚠ IT LIVES IN ONE MODULE BECAUSE THE FAILURE IS SILENT. `HelpdeskSubcategory` is
 * `z.string().min(1).max(64)` with NO allow-list, and the `other` catch-all matches ANYTHING — so a
 * TYPO routes just as cleanly to the same desk and nothing anywhere complains. The convention has no
 * natural failure signal, which is why a source-scan test asserts this literal appears in exactly one
 * module. ⛔ Never re-declare it; import this symbol.
 */
export const DPDPA_DATA_RIGHTS_SUBCATEGORY = 'dpdpa-data-rights';

/**
 * ⭐ THE STEP-UP CONTEXT — declared ONCE, here, and shared by the route and the OTP-request caller.
 *
 * ⚠ THERE IS NO STEP-UP CONTEXT REGISTRY TO REGISTER THIS IN. `requireStepUp(deps, actionContext:
 * string)` compares a BARE STRING by equality, and the contract is `z.string().min(1).max(128)` with no
 * allow-list. ⛔ Do not go hunting for a registry to add a label to — there isn't one. The distinctness
 * this context provides comes from string inequality, which holds but is UNGUARDED.
 *
 * ⚠ THAT is why this is a shared constant rather than a literal at each site. A typo in the ROUTE fails
 * closed (tolerable). A typo in the OTP-REQUEST path yields an elevation that can NEVER satisfy the
 * gate — a permanently broken action with no error pointing at the cause. Both sides import this symbol.
 *
 * It lives in `@twt/contracts` because `apps/admin` (the OTP-request caller) cannot import `apps/api`.
 */
export const DATA_RIGHTS_STEP_UP_CONTEXT = 'member_data_rights';

/**
 * Enqueue an off-portal export BUILD for a member with no session (AC5, off-portal-build half).
 *
 * ⛔ This BUILDS the artifact; it does not deliver it. Delivery is AC-R1, blocked on Escalation 1 —
 * the Trustee Panel has not ruled whether a staff actor may obtain a member's assembled, decrypted
 * Tier-1 export at all. Building is ruling-INDEPENDENT: the artifact is assembled the same way under
 * either delivery model, which is why this half may land now.
 */
export const OffPortalExportRequest = z
  .object({
    /** The subject member. ⛔ Every fulfilment read keys on THIS, never on the ticket (AC4). */
    member_id: z.string().uuid(),
    /**
     * The originating helpdesk ticket. PROVENANCE ONLY — it records WHICH REQUEST caused the build,
     * never WHAT the build may see. ⛔ Do not resolve subject scope through it.
     */
    helpdesk_ticket_id: z.string().uuid(),
  })
  .strict();
export type OffPortalExportRequest = z.infer<typeof OffPortalExportRequest>;

export const OffPortalExportResponse = z
  .object({
    export_id: z.string().uuid(),
    status: z.string(),
    requested_at: z.string(),
    /** Always `'off_portal_admin'` on this route — echoed so the caller can see what was recorded. */
    requested_via: z.literal('off_portal_admin'),
  })
  .strict();
export type OffPortalExportResponse = z.infer<typeof OffPortalExportResponse>;

/**
 * Execute an off-portal ERASURE for a member with no session (AC7).
 *
 * ⛔ IRREVERSIBLE AND OPERATOR-INITIATED. The route additionally requires an `Idempotency-Key` header,
 * so a double-submit or a retried request cannot append a second `member.rtbf_anonymized`.
 */
export const OffPortalErasureRequest = z
  .object({
    member_id: z.string().uuid(),
    /**
     * ⛔ REQUIRED HERE even though the EVENT payload schema makes it optional. The payload must stay
     * optional so the member self-service path (a four-field payload, parsed before insert) keeps
     * working — which means the schema CANNOT enforce provenance, and an off-portal erasure omitting
     * the id would validate cleanly and become indistinguishable from a member self-service one.
     * The guarantee therefore lives HERE and in the handler, which fails closed without it.
     */
    helpdesk_ticket_id: z.string().uuid(),
  })
  .strict();
export type OffPortalErasureRequest = z.infer<typeof OffPortalErasureRequest>;

export const OffPortalErasureResponse = z
  .object({
    /** Terminal by construction. */
    state: z.literal('anonymized'),
    anonymized_at: z.string(),
    /** The REAL replayed `from_state`, not a hardcoded 'withdrawn' — an erasure is now legal from any
     *  live label when the moderation overlay reads `terminated`. */
    from_state: z.string(),
  })
  .strict();
export type OffPortalErasureResponse = z.infer<typeof OffPortalErasureResponse>;
