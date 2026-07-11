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

/**
 * Peer-mesh verification pinged → `verification_in_progress`. Owner: Story 6.6.
 *
 * 6.6 OWNS this event and is its FIRST emitter — there are NO historical events of this
 * type, so ENRICHING the Story 6.1 placeholder payload with the selection outputs is safe
 * + correct (self-describing for audit-replay). Carries the deterministic selection's
 * ordered member ids (1..5) + the metric identity it ran under.
 */
export const ClaimPeerMeshPingedPayloadSchema = z
  .object({
    ...auditShape,
    selected_member_ids: z.array(z.string().uuid()).min(1).max(5),
    metric_id: z.string().min(1),
    metric_version: z.number().int().positive(),
  })
  .strict();

/**
 * Peer-mesh response recorded. ANNOTATION event (NEW in Story 6.6 — NOT in the 6.1
 * vocabulary) — an identity transition (`from_state === to_state === 'verification_in_progress'`;
 * the reducer treats it as identity, it does NOT advance the primary state). Carries the
 * responder + their response. A non-response is an ABSENCE (no event) — never `denied`
 * (AC4). Owner: Story 6.6.
 */
export const ClaimPeerMeshRespondedPayloadSchema = requireIdentityTransition({
  ...auditShape,
  responder_member_id: z.string().uuid(),
  response: z.enum(['confirmed', 'denied', 'unknown']),
});

/**
 * Ground inspection scheduled. ANNOTATION event — both peer-mesh AND ground-inspection
 * signals are required (PRD §4.6 "both, not either"), so this does NOT advance the
 * primary state (`from_state === to_state === 'verification_in_progress'`; the reducer
 * treats it as identity). Owner: Story 6.7.
 *
 * 6.7 OWNS this event and is its FIRST emitter — there are NO historical events of this
 * type, so ENRICHING the Story 6.1 placeholder payload is safe + correct (exactly as 6.6
 * enriched `peer_mesh_pinged`). Carries the ASSIGNMENT identity + non-PII operational
 * metadata ONLY — NO PII (the exact address / family contact / free-text notes live
 * encrypted in `claim_ground_inspections`, never in `events_log`). A reschedule emits this
 * SAME event for the NEW assignment with `supersedes_ground_inspection_id` = the superseded
 * assignment's id (a fresh schedule sets it `null`) — there is NO separate `superseded`
 * event; the new event's back-reference + the row status make the supersession replayable.
 */
export const ClaimGroundInspectionScheduledPayloadSchema = requireIdentityTransition({
  ...auditShape,
  ground_inspection_id: z.string().uuid(),
  // The assignment's jurisdiction — the D6 authorization anchor. Non-PII bounded metadata.
  district: z.string().min(1),
  // The assigned inspector (an actor id, not a name) — D6 threads it into the audit trail.
  inspector_actor_id: z.string().min(1),
  scheduled_at: z.string().datetime(),
  // The #4 reschedule back-reference: which assignment this one replaced (null on a fresh schedule).
  supersedes_ground_inspection_id: z.string().uuid().nullable(),
});

/**
 * Ground inspection completed. ANNOTATION event — the 22nd claim event, NEW in Story 6.7
 * (NOT in the 6.1 or 6.6 vocabulary). A material evidentiary fact, but an identity
 * transition (`from_state === to_state === 'verification_in_progress'`; the reducer treats
 * it as identity, it does NOT advance the primary state — ground inspection gathers during
 * verification, the verifier opens review). Carries the assignment id + optional non-PII
 * completion counts; NO PII. The write path GUARDS emission to `verification_in_progress`
 * (a `completed` event is never appended to a resolved/pre-verification claim — the 6.6
 * `PeerMeshClaimNotInVerificationError` lesson). Owner: Story 6.7.
 */
export const ClaimGroundInspectionCompletedPayloadSchema = requireIdentityTransition({
  ...auditShape,
  ground_inspection_id: z.string().uuid(),
  // Non-PII count surfaced for audit legibility (how many photos backed this completion).
  photo_count: z.number().int().nonnegative().optional(),
});

/**
 * Nominee bank details recorded. ANNOTATION event — the 23rd claim event, NEW in Story 6.8
 * (NOT in the 6.1/6.6/6.7 vocabulary). Claim-time capture of the two disbursement accounts
 * (#1/#2) that Epic 7/9 will pay out; it does NOT advance the claim's primary state (an identity
 * transition; `from_state === to_state`; D2) — collection happens across the pre-adjudication
 * window and can be re-edited. The write path GUARDS emission to the three-tier D3 window: tier-1
 * nominee collection (`intake_converged | documents_pending | verification_in_progress |
 * verifier_review`) or tier-2 authorized-admin correction (`verifier_approved`, reason-required) —
 * `NomineeBankClaimNotCollectableError` otherwise — so an account is never recorded onto a
 * not-yet-converged, post-freeze, or reversed/appeal claim (the 6.6/6.7 write-path-guard lesson).
 * The reducer STAYS total (identity from any state — replay-robustness).
 *
 * PII discipline (D6): the payload carries `account_ranks_present` (always `[1, 2]` in v1 — exactly
 * two accounts, Task 5 RESOLVED) + `ifsc_validated` (a non-PII flag) ONLY. NO account number, NO
 * holder name, NO IFSC ever reaches `events_log`. Owner: Story 6.8.
 */
export const ClaimNomineeBankRecordedPayloadSchema = requireIdentityTransition({
  ...auditShape,
  // Which account ranks were recorded — always [1, 2] in v1 (exactly two accounts). Non-PII.
  account_ranks_present: z.array(z.union([z.literal(1), z.literal(2)])).length(2),
  // Whether every IFSC passed format + branch lookup at claim time (D4). Non-PII flag.
  ifsc_validated: z.boolean(),
  // `true` when this was an authorized-admin CORRECTION in the post-verifier-approval window (D3
  // tier-2), vs an ordinary pre-approval collection. Non-PII forensic flag; the reason itself lives
  // in the audit sink, NEVER here. Absent/`false` on an ordinary collection. Optional (back-compat).
  corrected: z.boolean().optional(),
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

// ── The 23-event vocabulary + the type→schema map (single source) ─────────────
// (Story 6.1 committed the 20 state-advancing events; Story 6.6 added the 21st —
// `claim.peer_mesh_responded`; Story 6.7 added the 22nd — `claim.ground_inspection_completed`;
// Story 6.8 adds the 23rd — `claim.nominee_bank_recorded`, all annotation/identity events — per
// the "owner stories add their annotation events" discipline.)

export const CLAIM_EVENT_TYPES = [
  'claim.intake_initiated',
  'claim.intake_converged',
  'claim.documents_received',
  'claim.peer_mesh_pinged',
  'claim.peer_mesh_responded',
  'claim.ground_inspection_scheduled',
  'claim.ground_inspection_completed',
  'claim.nominee_bank_recorded',
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

/** The dotted `claim.*` event-type literal union (the 22 claim events). */
export type ClaimEventType = (typeof CLAIM_EVENT_TYPES)[number];

/**
 * type → payload-schema map. The ONE place the 23 events bind to their schemas;
 * `EVENT_TYPE_REGISTRY` (packages/events) and the projector both consume it. The
 * `satisfies` keeps it exhaustive — adding a `ClaimEventType` without a schema is a
 * compile error.
 */
export const CLAIM_EVENT_PAYLOAD_SCHEMAS = {
  'claim.intake_initiated': ClaimIntakeInitiatedPayloadSchema,
  'claim.intake_converged': ClaimIntakeConvergedPayloadSchema,
  'claim.documents_received': ClaimDocumentsReceivedPayloadSchema,
  'claim.peer_mesh_pinged': ClaimPeerMeshPingedPayloadSchema,
  'claim.peer_mesh_responded': ClaimPeerMeshRespondedPayloadSchema,
  'claim.ground_inspection_scheduled': ClaimGroundInspectionScheduledPayloadSchema,
  'claim.ground_inspection_completed': ClaimGroundInspectionCompletedPayloadSchema,
  'claim.nominee_bank_recorded': ClaimNomineeBankRecordedPayloadSchema,
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
