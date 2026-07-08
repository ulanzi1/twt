// Claim event vocabulary + Zod payload schemas — Story 6.1 (Task 2; AC2/AC4/AC5).
//
// The `claim.*` event types are the claim lifecycle's WRITE vocabulary: every legal
// transition (and the annotation events that don't advance the primary state) is a
// named, dotted `resource.action` event on the claim's `events_log` stream
// (architecture line 3830-3833). These schemas validate the event PAYLOAD;
// `timestamp` + `pariwar_id` + `actor_id` are columns on `events_log` and are NOT
// duplicated here.
//
// ── Why these live in @twt/domain (not @twt/contracts) ────────────────────────
// `@twt/events` depends on @twt/domain; the registry (packages/events/src/registry.ts)
// imports these schemas, and so does the reducer (claim/state.ts). Putting them in
// @twt/contracts would force domain→contracts, reversing the legal import direction
// (contracts→domain). Transport mirrors for apps/api are Story 6.2+/6.3 territory.
//
// ── THE PINNED SEAM CONTRACT (read Dev Notes "Event naming") ──────────────────
// Event names are single-dot `resource.action` snake_case — NOT the epic's
// double-dot form. The already-merged Story 3.1 account-frozen overlay
// (member/overlay.ts) HARD-CODES three of these: `claim.intake_initiated` (freeze;
// payload MUST carry `deceased_member_id`), `claim.settled` + `claim.denied_no_appeal`
// (unfreeze). A double-dot name would silently kill that overlay across Epic 12.
//
// Every transition payload carries the architecture §1.14 audit shape — `from_state`,
// `to_state`, `trigger`, `actor` — plus event-specific fields where load-bearing.
// `.strict()` everywhere: an unknown key is a defect, not silently tolerated.

import { z } from 'zod';

import { CLAIM_INTAKE_CHANNELS, CLAIM_LIFECYCLE_STATES } from '../schema/claims.js';

/**
 * Who caused the transition (architecture §1.14 line 1262-1268). `system` = SIE /
 * scheduler; `operator` = helpline staff; `trustee` = a State/Trustee panelist.
 */
export const claimActorSchema = z.enum(['member', 'operator', 'trustee', 'system']);
export type ClaimEventActor = z.infer<typeof claimActorSchema>;

/** A claim-lifecycle-state literal, derived from the one tuple in schema/claims.ts. */
export const claimLifecycleStateSchema = z.enum(CLAIM_LIFECYCLE_STATES);

/** An intake-channel literal, derived from the one tuple in schema/claims.ts. */
export const claimIntakeChannelSchema = z.enum(CLAIM_INTAKE_CHANNELS);

/**
 * The audit shape every claim.* payload carries. `from_state` is nullable — the
 * initial `intake_initiated` event has no prior state. For annotation events that
 * don't advance the primary state (`ground_inspection_scheduled`, `denied_no_appeal`)
 * `from_state` === `to_state`.
 *
 * NOTE: these are AUDIT metadata. The reducer (claim/state.ts) is the runtime
 * authority for the transition — it derives the next state from the CURRENT state +
 * the event TYPE (and, for the three appeal-review events ONLY, `payload.decision`),
 * never from `to_state` in the payload (so a mislabelled payload can never corrupt
 * replay).
 */
const auditShape = {
  from_state: claimLifecycleStateSchema.nullable(),
  to_state: claimLifecycleStateSchema,
  // Freeform human-readable audit note — NOT a machine-matched enum; callers pass
  // e.g. "verifier_console_approve", "cron:cycle_freeze", "member_app_appeal_submit".
  // Deliberately unconstrained (Story 6.1 review decision 2026-07-08): no bounded
  // trigger vocabulary is specified anywhere in the spec, and constraining it would
  // invent a business rule the ACs never asked for.
  trigger: z.string().min(1),
  actor: claimActorSchema,
};

/** Reject a payload where an annotation event's `to_state` diverges from `from_state`
 * — annotation events (Dev Notes "Transition table") don't advance the primary state,
 * so the two audit fields must match. Applied only to the four annotation-event
 * schemas below (Story 6.1 review finding). */
function requireIdentityTransition<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).strict().refine((data) => data.from_state === data.to_state, {
    message: 'annotation event payload must have from_state === to_state (identity transition)',
    path: ['to_state'],
  });
}

// ── Intake + convergence ──────────────────────────────────────────────────────

/**
 * Claim intake initiated → `intake_pending` (initial). Owner: Story 6.2 (member-app)
 * / 6.3 (helpline) / trustee-initiated.
 *
 * THE PINNED SEAM (AC5): `deceased_member_id` (snake_case, matching
 * member/overlay.ts:97 `payload ->> 'deceased_member_id'`) freezes the deceased
 * member's account. Also carries the originating `intake_channel` + the (nullable)
 * `claimant_actor_id` (trustee-initiated may have none).
 */
export const ClaimIntakeInitiatedPayloadSchema = z
  .object({
    ...auditShape,
    deceased_member_id: z.string().uuid(),
    intake_channel: claimIntakeChannelSchema,
    claimant_actor_id: z.string().uuid().nullable(),
  })
  .strict();

/** ICP dedup picked the canonical claim → `intake_converged`. Owner: Story 6.4. */
export const ClaimIntakeConvergedPayloadSchema = z.object({ ...auditShape }).strict();

/** Death certificate / documents received → `documents_pending`. Owner: Story 6.5. */
export const ClaimDocumentsReceivedPayloadSchema = z.object({ ...auditShape }).strict();

// ── Verification (peer mesh + ground inspection) ──────────────────────────────

/** Peer-mesh verification pinged → `verification_in_progress`. Owner: Story 6.6. */
export const ClaimPeerMeshPingedPayloadSchema = z.object({ ...auditShape }).strict();

/**
 * Ground inspection scheduled. ANNOTATION event — both peer-mesh AND ground-inspection
 * signals are required (PRD §4.6 "both, not either"), so this does NOT advance the
 * primary state (`from_state === to_state === 'verification_in_progress'`; the reducer
 * treats it as identity). Owner: Story 6.7.
 */
export const ClaimGroundInspectionScheduledPayloadSchema = requireIdentityTransition({
  ...auditShape,
});

/** Verifier console opened review → `verifier_review`. Owner: Story 6.10/6.11. */
export const ClaimVerifierReviewingPayloadSchema = z.object({ ...auditShape }).strict();

/** Verifier approved → `verifier_approved`. Owner: Story 6.11. */
export const ClaimVerifierApprovedPayloadSchema = z.object({ ...auditShape }).strict();

/** Verifier denied → `denied`. Owner: Story 6.11. */
export const ClaimVerifierDeniedPayloadSchema = z.object({ ...auditShape }).strict();

// ── State Trustee cycle-freeze ────────────────────────────────────────────────

/** Cycle-freeze window opened for this claim → `state_trustee_freeze`. Owner: 6.13. */
export const ClaimStateTrusteeFrozenPayloadSchema = z.object({ ...auditShape }).strict();

/**
 * Per-claim trustee vote cast DURING an open cycle-freeze → `state_trustee_approved`
 * (approved-in-principle; the freeze is still open + reversible). NOT the same as the
 * bulk-commit `claim.approved`. Owner: Story 6.13.
 */
export const ClaimStateTrusteeApprovedPayloadSchema = z.object({ ...auditShape }).strict();

/** State Trustee denied during freeze → `denied`. Owner: Story 6.13. */
export const ClaimStateTrusteeDeniedPayloadSchema = z.object({ ...auditShape }).strict();

/**
 * Cycle-freeze bulk-approval commit → `approved` (the clean single milestone Epic 7
 * pool-binding + Epic 9 reconciliation key off). A DISTINCT event from
 * `state_trustee_approved`, not a replay roll-up of it. Owner: Story 6.13.
 */
export const ClaimApprovedPayloadSchema = z.object({ ...auditShape }).strict();

// ── Internal appeal (3-stage) ─────────────────────────────────────────────────

/**
 * The appeal-review `decision` disambiguator (Dev Notes "Appeal-review branching").
 * The three `appeal_stageN_reviewed` events each map to MORE THAN ONE target state
 * from the SAME source state via a SINGLE event type — the reducer branches on this
 * field (the ONE place it reads payload content beyond `(state, type)`):
 *   · `advance`  → next appeal stage (NOT legal for stage 3 — Trustee discretion is final);
 *   · `reversed` → `reversed` (the denial is overturned);
 *   · `upheld`   → `denied` (the denial stands).
 */
export const appealReviewDecisionSchema = z.enum(['advance', 'reversed', 'upheld']);
export type AppealReviewDecision = z.infer<typeof appealReviewDecisionSchema>;

/** Stage-3 has NO `advance` (Trustee discretion is final) — only reversed | upheld. */
export const appealFinalDecisionSchema = z.enum(['reversed', 'upheld']);
export type AppealFinalDecision = z.infer<typeof appealFinalDecisionSchema>;

/** Appeal stage 1 initiated (from `denied`) → `appeal_stage_1`. Owner: Story 6.16. */
export const ClaimAppealStage1InitiatedPayloadSchema = z.object({ ...auditShape }).strict();

/**
 * Appeal stage 1 reviewed (reviewer ≠ original). `decision` selects the target:
 * advance → `appeal_stage_2`, reversed → `reversed`, upheld → `denied`. Owner: 6.16.
 */
export const ClaimAppealStage1ReviewedPayloadSchema = z
  .object({ ...auditShape, decision: appealReviewDecisionSchema })
  .strict();

/**
 * Appeal stage 2 initiated (formal-filing ANNOTATION marker — the state was already
 * entered by stage 1's `advance` decision; this does not itself advance the primary
 * state, `from_state === to_state === 'appeal_stage_2'`). Owner: Story 6.16.
 */
export const ClaimAppealStage2InitiatedPayloadSchema = requireIdentityTransition({
  ...auditShape,
});

/**
 * Appeal stage 2 reviewed (State Trustee panel vote). `decision`: advance →
 * `appeal_stage_3`, reversed → `reversed`, upheld → `denied`. Owner: Story 6.16.
 */
export const ClaimAppealStage2ReviewedPayloadSchema = z
  .object({ ...auditShape, decision: appealReviewDecisionSchema })
  .strict();

/**
 * Appeal stage 3 initiated (formal-filing ANNOTATION marker — the state was already
 * entered by stage 2's `advance` decision; this does not itself advance the primary
 * state, `from_state === to_state === 'appeal_stage_3'`). Owner: Story 6.16.
 */
export const ClaimAppealStage3InitiatedPayloadSchema = requireIdentityTransition({
  ...auditShape,
});

/**
 * Appeal stage 3 reviewed (Trustee discretion — final). `decision` is the FINAL set
 * (no `advance`): reversed → `reversed`, upheld → `denied`. The stage-3-specific
 * enum makes an accidental `advance` a Zod rejection. Owner: Story 6.16.
 */
export const ClaimAppealStage3ReviewedPayloadSchema = z
  .object({ ...auditShape, decision: appealFinalDecisionSchema })
  .strict();

// ── Terminal ──────────────────────────────────────────────────────────────────

/**
 * Pool spawn + disbursement complete → `settled` (terminal). Owner: Epic 7/9.
 *
 * PINNED SEAM (AC5): clears the account-frozen overlay (member/overlay.ts UNFREEZE
 * type). MUST carry `deceased_member_id` — the overlay's query matches EVERY
 * overlay-relevant event (freeze AND unfreeze) by `payload ->> 'deceased_member_id'`
 * (member/overlay.ts:97), so a settled event without it would never match and the
 * overlay would never clear. Same snake_case key as the freeze event.
 */
export const ClaimSettledPayloadSchema = z
  .object({ ...auditShape, deceased_member_id: z.string().uuid() })
  .strict();

/**
 * Appeal window closed / exhausted → the claim STAYS `denied` (terminal). ANNOTATION
 * event (`from_state === to_state === 'denied'`; reducer identity) whose SOLE current
 * consumer is the account-frozen overlay UNFREEZE (member/overlay.ts). Do NOT collapse
 * into `claim.verifier_denied`. Owner: Story 6.16.
 *
 * PINNED SEAM (AC5): like `claim.settled`, MUST carry `deceased_member_id` so the
 * overlay's `payload ->> 'deceased_member_id'` query matches it and clears the freeze.
 */
export const ClaimDeniedNoAppealPayloadSchema = requireIdentityTransition({
  ...auditShape,
  deceased_member_id: z.string().uuid(),
});

// ── The 20-event vocabulary + the type→schema map (single source) ─────────────

export const CLAIM_EVENT_TYPES = [
  'claim.intake_initiated',
  'claim.intake_converged',
  'claim.documents_received',
  'claim.peer_mesh_pinged',
  'claim.ground_inspection_scheduled',
  'claim.verifier_reviewing',
  'claim.verifier_approved',
  'claim.verifier_denied',
  'claim.state_trustee_frozen',
  'claim.state_trustee_approved',
  'claim.approved',
  'claim.state_trustee_denied',
  'claim.appeal_stage1_initiated',
  'claim.appeal_stage1_reviewed',
  'claim.appeal_stage2_initiated',
  'claim.appeal_stage2_reviewed',
  'claim.appeal_stage3_initiated',
  'claim.appeal_stage3_reviewed',
  'claim.settled',
  'claim.denied_no_appeal',
] as const;

/** The dotted `claim.*` event-type literal union (the 20 AC2 events). */
export type ClaimEventType = (typeof CLAIM_EVENT_TYPES)[number];

/**
 * type → payload-schema map. The ONE place the 20 events bind to their schemas;
 * `EVENT_TYPE_REGISTRY` (packages/events) and the projector both consume it. The
 * `satisfies` keeps it exhaustive — adding a `ClaimEventType` without a schema is a
 * compile error.
 */
export const CLAIM_EVENT_PAYLOAD_SCHEMAS = {
  'claim.intake_initiated': ClaimIntakeInitiatedPayloadSchema,
  'claim.intake_converged': ClaimIntakeConvergedPayloadSchema,
  'claim.documents_received': ClaimDocumentsReceivedPayloadSchema,
  'claim.peer_mesh_pinged': ClaimPeerMeshPingedPayloadSchema,
  'claim.ground_inspection_scheduled': ClaimGroundInspectionScheduledPayloadSchema,
  'claim.verifier_reviewing': ClaimVerifierReviewingPayloadSchema,
  'claim.verifier_approved': ClaimVerifierApprovedPayloadSchema,
  'claim.verifier_denied': ClaimVerifierDeniedPayloadSchema,
  'claim.state_trustee_frozen': ClaimStateTrusteeFrozenPayloadSchema,
  'claim.state_trustee_approved': ClaimStateTrusteeApprovedPayloadSchema,
  'claim.approved': ClaimApprovedPayloadSchema,
  'claim.state_trustee_denied': ClaimStateTrusteeDeniedPayloadSchema,
  'claim.appeal_stage1_initiated': ClaimAppealStage1InitiatedPayloadSchema,
  'claim.appeal_stage1_reviewed': ClaimAppealStage1ReviewedPayloadSchema,
  'claim.appeal_stage2_initiated': ClaimAppealStage2InitiatedPayloadSchema,
  'claim.appeal_stage2_reviewed': ClaimAppealStage2ReviewedPayloadSchema,
  'claim.appeal_stage3_initiated': ClaimAppealStage3InitiatedPayloadSchema,
  'claim.appeal_stage3_reviewed': ClaimAppealStage3ReviewedPayloadSchema,
  'claim.settled': ClaimSettledPayloadSchema,
  'claim.denied_no_appeal': ClaimDeniedNoAppealPayloadSchema,
} as const satisfies Record<ClaimEventType, z.ZodTypeAny>;
