// Story 10.21 — off-portal DPDPA data-rights fulfilment contracts (AC2/AC3/AC5/AC-R1/AC-R2).
//
// The wire contracts for the identity-verified administrative process Niyamavali §8.4 requires when a
// member's authenticated access has ended but their statutory rights have not. Wire shape is
// snake_case; every object is `.strict()`.
//
// ⭐ DELIVERY (AC-R1) AND CORRECTION (AC-R2) ARE BUILT — see the AC-R1/AC-R2 sections below.
// Decisions `2026-08-14-109` through `-113` ruled the model (member-direct primary + narrow
// staff-mediated exception, three-part gate, mandated `primary_delivery_not_completed` naming) and it
// shipped. ⭐ AC-R3 (the trustee-authority recipient) is CLOSED, not blocked: `2026-08-14-109` clause 7 RULED Escalation 10: *"NO DPDPA ACTION INHERENTLY REQUIRES
// TRUSTEE PANEL AUTHORITY"* — not access, not portability, not correction, and not erasure of a
// terminated member. ⛔ AC-R3 closed with a recorded disposition and NO code changes, and the exclusion
// of `trustee_panel` is therefore SETTLED, not pending.
// ⛔ Do not grant `member.data_rights` to `trustee_panel`, do not add a routing rule, and do not make
// `routed_to_role` authoritative on the strength of anything in this file.

import { z } from 'zod';

import { MemberLifecycleStateWire } from '../kyc/signup.js';

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
 * ⛔ This BUILDS the artifact; it does not deliver it — delivery is the separate AC-R1
 * `MemberDirectDeliveryRequest`/`StaffMediatedDeliveryRequest` pair below. ⚠ STALE-COMMENT CORRECTION
 * (code-review, this story): this used to say delivery was "blocked on Escalation 1" — the Trustee
 * Panel RULED it (`2026-08-14-109` through `-113`) and it is built. Building was always
 * ruling-INDEPENDENT (the artifact is assembled the same way under either delivery model), which is
 * why it shipped first — that reasoning stands; only the "still blocked" framing was stale.
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
 * The member's currently-active export (`pending`, or `ready` and neither consumed nor past its
 * window), or `null` — a READ, not a build. `null` on the `.strict()` object arm (not an absent
 * field) so the caller cannot mistake "haven't checked yet" for "checked; none exists".
 *
 * ⭐ EXISTS SO THE ADMIN OPERATOR SURFACE SURVIVES A RELOAD (code-review decision, this story). Before
 * this, `builtExportId` lived ONLY in a `useMutation`'s in-memory result — a page reload after a
 * successful build stranded the operator with no way to reach delivery, even though a `ready` export
 * already existed server-side. ⛔ Reads key on `member_id` (AC4), same as every other read on this
 * surface — never on the ticket.
 */
export const ActiveDataRightsExportResponse = z
  .object({
    export_id: z.string().uuid(),
    status: z.string(),
    requested_at: z.string(),
  })
  .strict()
  .nullable();
export type ActiveDataRightsExportResponse = z.infer<typeof ActiveDataRightsExportResponse>;

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
     *  live label when the moderation overlay reads `terminated`. ⚠ Value-aligned with the domain's
     *  `MemberLifecycleState` (was an unconstrained `z.string()`) — in practice always one of AC7's
     *  eight non-`anonymized` `from` states (the handler refuses an already-anonymized member before
     *  this response is built), but `'anonymized'` stays in the wire enum rather than fought out of it
     *  by a cast at the call site: the domain type itself does not statically prove the exclusion. */
    from_state: MemberLifecycleStateWire,
  })
  .strict();
export type OffPortalErasureResponse = z.infer<typeof OffPortalErasureResponse>;

// ── AC-R1 — DELIVERY (Decisions 2026-08-14-109 cl.1, 110, 111, 112, 113) ──────────────────────────
//
// ⛔ A PRIMARY AND A NARROW EXCEPTION — never two co-equal routes, and never presented as a choice.

/** PRIMARY — issue the member-direct, OTP-verified delivery grant. No session is ever issued. */
export const MemberDirectDeliveryRequest = z
  .object({
    export_id: z.string().uuid(),
    member_id: z.string().uuid(),
    helpdesk_ticket_id: z.string().uuid(),
  })
  .strict();
export type MemberDirectDeliveryRequest = z.infer<typeof MemberDirectDeliveryRequest>;

export const MemberDirectDeliveryResponse = z
  .object({
    grant_id: z.string().uuid(),
    channel: z.literal('member_direct'),
    expires_at: z.string(),
  })
  .strict();
export type MemberDirectDeliveryResponse = z.infer<typeof MemberDirectDeliveryResponse>;

/**
 * FALLBACK — the staff-mediated exception. ⛔ THREE-PART GATE (`2026-08-14-113` cl.1); all required.
 *
 * ⚠ Only elements (1) and (3) are caller-supplied. Element (2) —
 * `primary_delivery_not_completed` — is ⛔ NEVER accepted from the caller: the server observes it
 * from the OTP record. A client-suppliable "the primary failed" flag would let the caller assert the
 * very fact the gate exists to check.
 */
export const StaffMediatedDeliveryRequest = z
  .object({
    export_id: z.string().uuid(),
    member_id: z.string().uuid(),
    helpdesk_ticket_id: z.string().uuid(),
    /** Element 1 — the member's OWN explicit request. ⛔ `z.literal(true)`: staff may not initiate or
     *  unilaterally select the fallback, so there is no "false" that still proceeds. */
    member_requested_staff_mediation: z.literal(true),
    /** Element 3 — the staff attestation. Stored Tier-1 and ⛔ WITHHELD from the member export. */
    attestation: z.string().min(1).max(2000),
  })
  .strict();
export type StaffMediatedDeliveryRequest = z.infer<typeof StaffMediatedDeliveryRequest>;

export const StaffMediatedDeliveryResponse = z
  .object({
    grant_id: z.string().uuid(),
    channel: z.literal('staff_mediated'),
    expires_at: z.string(),
    /** ⛔ MANDATED NAME (`2026-08-14-113` cl.2). Echoes WHEN the primary route was observed not to have
     *  completed — ⛔ never a claim about the handset, which this system cannot observe. */
    primary_delivery_not_completed_at: z.string(),
  })
  .strict();
export type StaffMediatedDeliveryResponse = z.infer<typeof StaffMediatedDeliveryResponse>;

/** Redemption of a member-direct grant. Unauthenticated by necessity — the member has no session —
 *  but requires TWO secrets: the unguessable grant id in the path and the OTP in the body. */
export const DeliveryRedeemRequest = z.object({ otp: z.string().min(4).max(10) }).strict();
export type DeliveryRedeemRequest = z.infer<typeof DeliveryRedeemRequest>;

// ── AC-R2 — CORRECTION (Decision 2026-08-14-109 cl.2) ─────────────────────────────────────────────
//
// ⛔ A RECORDED PROCESS, NOT A WRITE PATH. The ruling authorised recording what was asked and what was
// done, on a helpdesk ticket. ⛔ It did NOT authorise a member-profile editor, and nothing here writes
// a member field.

export const CorrectionOutcomeSchema = z.enum(['recorded', 'applied', 'declined']);

export const RecordCorrectionRequest = z
  .object({
    member_id: z.string().uuid(),
    /** ⛔ REQUIRED — the ruling places this process ON the helpdesk substrate. */
    helpdesk_ticket_id: z.string().uuid(),
    /** What the member asked to be corrected (relayed at intake). Stored Tier-1. */
    requested_change: z.string().min(1).max(2000),
    /** What the staff actor actually did. Stored Tier-1. */
    action_taken: z.string().min(1).max(2000),
    outcome: CorrectionOutcomeSchema,
  })
  .strict();
export type RecordCorrectionRequest = z.infer<typeof RecordCorrectionRequest>;

export const RecordCorrectionResponse = z
  .object({
    correction_id: z.string().uuid(),
    outcome: CorrectionOutcomeSchema,
    recorded_by_display: z.string().min(1),
    created_at: z.string(),
  })
  .strict();
export type RecordCorrectionResponse = z.infer<typeof RecordCorrectionResponse>;
