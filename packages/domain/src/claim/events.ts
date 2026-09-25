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

// ⚠ VALUE imports (Story 6.21a) — the review table's schema module is the AUTHORITY on the verdict and
// reason vocabulary. ⛔ No cycle: it imports only `ids/` (types), `encryption/column.js` and two leaf schema
// modules.
import {
  DEATH_CERTIFICATE_REJECTION_REASONS,
  DEATH_CERTIFICATE_REVIEW_VERDICTS,
} from '../schema/claim_death_certificate_reviews.js';
import { SHEPHERD_ASSIGNMENT_REASONS } from '../schema/claim_shepherd_assignments.js';
import { CLAIM_INTAKE_CHANNELS, CLAIM_LIFECYCLE_STATES } from '../schema/claims.js';
// ⚠ VALUE imports (the claim-time consent-type tuples), ⛔ not types — `schema/consent_records.ts`
// is the AUTHORITY on which consent types the 6.9 capture step collects, and re-spelling them here
// is exactly how the two drifted apart (see those constants' own doc-blocks).
// ⛔ No cycle: `schema/consent_records.ts` imports only `ids/` + `schema/audit_log_entries.ts`.
import {
  CLAIM_TIME_CONSENT_TYPES,
  CLAIM_TIME_PUBLICATION_CONSENT_TYPES,
} from '../schema/consent_records.js';
// ⚠ VALUE imports for the SAME REASON — `claim/nominee-name-check.ts` is the AUTHORITY on the
// nominee name-check vocabulary (Story 6.18), and this payload schema had re-spelled both tuples.
// ⛔ No cycle: that module imports `db.js` and `ids/` as TYPES ONLY, plus leaf schema modules,
// `pagination.js`, `claim/errors.js` and (Story 6.20) `claim/nominee-effective.js` — which itself imports
// only `node:crypto`, `drizzle-orm` and the import-free `cycle-calendar/holiday-resolver.js` — none of
// which reaches back here ([[project_type_only_import_cycle_trap]] — checked, not assumed).
import {
  NOMINEE_NAME_CHECK_VERDICTS,
  NOMINEE_NAME_CLERICAL_REASONS,
} from './nominee-name-check.js';

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
  // Story 6.17 — the assignment's BLOCK-level jurisdiction when it carries one, and the anchor the
  // permission gate actually resolved against for that row. Non-PII bounded metadata, same class as
  // `district`. ⚠ `.nullish()` rather than `.nullable()` ON PURPOSE: this shape also validates the
  // events appended BEFORE Story 6.17, which carry no `block` key at all. The payload is `.strict()`,
  // so an absent key must be legal or every historical event would fail replay.
  // ⛔ Never backfilled onto a historical event ([[feedback_record_unattested_no_backfill]]) — an
  // event is correct under the policy in force when it was written.
  block: z.string().min(1).nullish(),
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

/**
 * The District Admin recorded the nominee NAME CHECK. ANNOTATION event — the 32nd claim event, NEW
 * in Story 6.18 (AC3), on the ruling `2026-09-19-226` cl.3/cl.5. An IDENTITY transition
 * (`from_state === to_state`): the check is a RECORDED JUDGEMENT placed on the claim's immutable
 * evidentiary timeline, ⛔ NOT an adjudication — it approves nothing, denies nothing and moves no
 * lifecycle state. The gates in AC4 READ it; ⛔ nothing here acts on it.
 *
 * ⭐ THE ONE NEW EVENT THIS STORY MINTS. The Pariwar Admin's return-to-District-Admin loop (AC11)
 * deliberately mints ⛔ NONE — it is a metadata-only decision row on the shipped `routeToR9` shape.
 * So the vocabulary moves by ONE, ⛔ not three.
 *
 * ⛔⛔ PII discipline (Trap 4, AC9): the payload carries the account ranks, their staleness tokens,
 * the verdict and the clerical reason — all NON-PII. ⛔ NO holder name, ⛔ NO nominee name, ⛔ NO
 * HASH of either, and ⛔ NO filer note ever reaches `events_log`. A hash is named explicitly because
 * it is the plausible "compromise" that would defeat the rule: a name hash is a stable identifier
 * for a living person and a confirmation oracle for any guessed name.
 *
 * ⚠ The verdict vocabulary carries ⛔ no `other` and ⛔ no transliteration reason — `-226` cl.6
 * sends a non-clerical difference BACK for correction, and `2026-09-20-227` cl.9 rules the script
 * problem is solved at capture. Owner: Story 6.18.
 */
export const ClaimNomineeNameCheckedPayloadSchema = requireIdentityTransition({
  ...auditShape,
  // ⭐ WHO LOOKED — the acting District Admin's display name, SNAPSHOT at the moment of the check
  // (code review 2026-09-20, D3 = option A). It is ⛔ not resolved at read time: a renamed or removed
  // staff member would otherwise rewrite history, and [[project_admin_display_name_attribution]]
  // fixes the convention — controlled staff data, ⛔ never email-derived, snapshot at action time.
  //
  // ⚠ IT IS ⛔ NOT OPTIONAL, and that is the point. The whole design rests on *a NAMED HUMAN read
  // the two names*; before this field existed the reader fell back to `''` and no check was ever
  // attributed to anyone — the console showed a bare `—`. A caller that cannot resolve a display
  // name must FAIL rather than record an anonymous judgement.
  //
  // ⚠ IS THIS PII? It is STAFF identity, which this codebase treats as controlled-but-recordable
  // (the same field rides `claim.verifier_*` and the trustee decisions). Trap 4 bans the MEMBER's
  // and the NOMINEE's names — both living data subjects of a Tier-1 field. ⛔ Neither appears here.
  checked_by_actor_display: z.string().min(1),
  // The declaration the District Admin looked at — the `(rank, created_at)` set of the deceased
  // member's `member_nominees` rows, as an opaque token. A re-declaration changes it, which is what
  // makes a check STALE. Non-PII: it carries ranks and timestamps, never a name.
  nominee_declaration_token: z.string().min(1),
  // One entry per live account, both ranks. `account_updated_at` is the per-account staleness token
  // (`claim_nominee_bank_accounts.updated_at`, which the delete-then-insert writer moves on every
  // edit). Non-PII throughout.
  //
  // ⭐ THE TWO VOCABULARIES ARE DERIVED, ⛔ NEVER RE-SPELLED — the `consent_types_granted` lesson
  // directly above, applied before it could bite: these were inline `z.enum([...])` literals, a
  // FIFTH hand-maintained copy of the clerical-reason tuple. A typo here 500s the event append on
  // the only path that matters.
  accounts: z
    .array(
      z
        .object({
          account_rank: z.union([z.literal(1), z.literal(2)]),
          account_updated_at: z.string().min(1),
          verdict: z.enum(NOMINEE_NAME_CHECK_VERDICTS),
          clerical_reason: z.enum(NOMINEE_NAME_CLERICAL_REASONS).nullable(),
        })
        .strict()
        // ⛔⛔ THE COHERENCE RULE, MIRRORED FROM THE BOUNDARY INTO THE EVENT (code review
        // 2026-09-20). `-226` cl.5 — *"District Admin cannot proceed unless reason for name mismatch
        // is selected"* — is the one control this story calls load-bearing, and it lived ONLY in the
        // HTTP zod schema. A JSONB payload has no CHECK constraint to carry it, so an incoherent
        // verdict/reason pair recorded by any future non-route caller would have been accepted and
        // then read back forever as a valid judgement. Defence in depth, deliberately duplicated.
        .superRefine((account, ctx) => {
          if (account.verdict === 'clerical_difference' && account.clerical_reason === null) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['clerical_reason'],
              message: 'a clerical_reason is required when the verdict is clerical_difference',
            });
          }
          if (account.verdict !== 'clerical_difference' && account.clerical_reason !== null) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['clerical_reason'],
              message: 'a clerical_reason is only permitted when the verdict is clerical_difference',
            });
          }
        }),
    )
    .length(2)
    // ⛔ BOTH RANKS, ⛔ NEVER THE SAME ONE TWICE. `[rank 1, rank 1]` satisfies `.length(2)` and then
    // fell out downstream as a staleness 409 ("check again"), which tells the District Admin to
    // re-do a check that was never well-formed.
    .refine((accounts) => new Set(accounts.map((a) => a.account_rank)).size === accounts.length, {
      message: 'account_rank must be distinct across the two entries',
    }),
});

/**
 * Claim-time DPDPA consent recorded. ANNOTATION event — the 24th claim event, NEW in Story 6.9
 * (NOT in the 6.1/6.6/6.7/6.8 vocabulary). Claim-time capture of the granular DPDPA consents
 * (the trust-processing consent + the two public-transparency opt-ins) via the Story 2.7
 * consent-registry primitive; it does NOT advance the claim's primary state (an identity
 * transition; `from_state === to_state`; D6) — consent capture happens across the pre-adjudication
 * intake window. The reducer STAYS total (identity from any state — replay-robustness); the
 * WRITE-PATH guards emission to the pre-adjudication window (the 6.8 lesson), and emits this event
 * ONLY when ≥1 grant row was written (`consent_types_granted` is ALWAYS non-empty — "consent
 * recorded" never means "nothing was granted"; keeps the D3a legal-posture flip a pure guard change).
 *
 * PII discipline (AC2): the payload carries ONLY the non-PII granted-type flags —
 * `consent_types_granted` (the granted subset). NO checkbox text, NO locale, NO subject identity
 * beyond the ambient `claim_case_id` (the stream id). Owner: Story 6.9.
 */
export const ClaimDpdpaConsentRecordedPayloadSchema = requireIdentityTransition({
  ...auditShape,
  // The granted subset — always non-empty (the event is emitted only when ≥1 grant row is written).
  // Non-PII type flags ONLY (no checkbox text, no subject id).
  // ⭐ DERIVED, ⛔ NEVER RE-SPELLED. This was an inline `z.enum([...])` — a FIFTH hand-maintained
  // copy of the claim-time subset with no lockstep test — and Story 11b.1's new consent type was
  // silently left out of it. The request parsed, the consent row was written, and the event append
  // then 500'd, ⛔ only on the path where a family actually ticked the box.
  consent_types_granted: z.array(z.enum(CLAIM_TIME_CONSENT_TYPES)).min(1),
});

/**
 * Claim-time DPDPA consent revoked. ANNOTATION event (code review addition, Story 6.9) — mirrors
 * `claim.dpdpa_consent_recorded` so the claim's evidentiary timeline stays symmetric: "consent was
 * captured at claim-time" (D6's own rationale) should be explainable against a later revoke too, not
 * just against an audit-sink line. Identity transition (`from_state === to_state`) — revocation does
 * NOT advance claim state (AC3/D7; Epic 11b performs the actual publication takedown). Emitted once
 * per revoke call, for the single publication type revoked in that call.
 *
 * PII discipline: the payload carries ONLY the non-PII `consent_type` revoked. NO revocation reason
 * (that lives in `consent_records.revocation_reason` + the audit sink only), NO subject identity
 * beyond the ambient `claim_case_id`. Owner: Story 6.9 code review.
 */
export const ClaimDpdpaConsentRevokedPayloadSchema = requireIdentityTransition({
  ...auditShape,
  // ⭐ DERIVED, ⛔ never re-spelled — the same defect as `consent_types_granted` above, one field
  // apart. A revocation of the new publication consent would have 500'd identically.
  consent_type: z.enum(CLAIM_TIME_PUBLICATION_CONSENT_TYPES),
});

/** Verifier console opened review → `verifier_review`. Owner: Story 6.10/6.11. */
export const ClaimVerifierReviewingPayloadSchema = z.object({ ...auditShape }).strict();

/** Verifier approved → `verifier_approved`. Owner: Story 6.11. */
export const ClaimVerifierApprovedPayloadSchema = z.object({ ...auditShape }).strict();

/** Verifier denied → `denied`. Owner: Story 6.11. */
export const ClaimVerifierDeniedPayloadSchema = z.object({ ...auditShape }).strict();

/**
 * Verifier escalated the claim to the State Trustee. ANNOTATION event — the 26th claim event, NEW in
 * Story 6.11 (D-D). An identity transition (`from_state === to_state`; the reducer has NO `escalated`
 * state and gains none) — escalation is a ROUTING/reassignment concern, NOT a lifecycle-state change or
 * queue mutation (the actionable State-level queue stays 6.12/6.13). Emitted with its OWN state-window
 * guard (`{verification_in_progress, verifier_review}`) in the write path — and it MUST NOT auto-emit
 * `verifier_reviewing` (escalating is not "entering review"; contrast the approve/deny path). `auditShape`
 * only — the reason-code + rationale live in the claim_verifier_decisions row, NEVER here (AC0/D-G).
 */
export const ClaimVerifierEscalatedPayloadSchema = requireIdentityTransition({ ...auditShape });

/**
 * Verifier revised a prior SAME-outcome decision (reason-code/rationale correction). ANNOTATION event
 * — the 27th claim event, NEW in Story 6.11 (D-E). A DEDICATED identity annotation
 * (`from_state === to_state`), NOT a re-emit of `verifier_approved`/`denied` (claim state is unchanged;
 * cross-outcome reversal stays Story 6.16). Its sole job is to keep the claim's evidentiary timeline
 * explainable ("the decision was revised") alongside the supersession linkage on the decision rows.
 * `auditShape` only — the corrected reason-code + rationale live in the new claim_verifier_decisions
 * row, NEVER here (AC0/D-G).
 */
export const ClaimVerifierDecisionRevisedPayloadSchema = requireIdentityTransition({ ...auditShape });

/**
 * Verifier recorded (or revised) a concealment-linkage assessment on the claim. ANNOTATION event — the
 * 30th claim event, NEW in Story 6.15 (D-E). A DEDICATED identity annotation (`from_state === to_state`;
 * the reducer has NO concealment state and gains none) — the assessment is a review ANNOTATION, NOT an
 * adjudication: it emits no approval/denial and changes no lifecycle state (the State Trustee, Story 6.13,
 * alone decides the claim — D-B). Its sole job is to place the assessment on the claim's IMMUTABLE
 * evidentiary timeline (`events_log`, evidence layer 2 — distinct from the assessment TABLE, the
 * authoritative current/read model, and the audit sink, the admin-action record; none collapsed — D-E).
 * `auditShape` only — the tri-state `kind` + the optional Tier-1 note live in `claim_concealment_assessments`,
 * NEVER here (the note is PII; the kind is deliberately kept out of `events_log` — the row is the source).
 */
export const ClaimConcealmentAssessedPayloadSchema = requireIdentityTransition({ ...auditShape });

/**
 * Human shepherd assigned to the claim. ANNOTATION event — the 28th claim event, NEW in Story 6.12. An
 * IDENTITY transition (`from_state === to_state`; the reducer has NO shepherd state and gains none) —
 * shepherd assignment is a ROUTING/attribution concern (a named human for the family), NOT a
 * lifecycle-state change or adjudication power (being the shepherd grants no `claim.approve`, AC6). It is
 * the assignment half of the actionable State-level queue the escalation comment names 6.12/6.13 for. A
 * REASSIGNMENT (fallback OR admin-initiated) re-emits this SAME event for the NEW shepherd with
 * `previous_shepherd_actor_id` set + `supersedes_assignment_id` = the superseded assignment's id (a fresh
 * `initial` assignment sets both `null`) — there is NO separate `shepherd_reassigned` event; the new
 * event's back-reference + the row supersession make the reassignment replayable (the
 * `ground_inspection_scheduled` reschedule precedent).
 *
 * PII discipline (AC8): the payload carries NON-PII routing COORDINATES ONLY — actor ids + reason +
 * district. NEVER the shepherd's name / phone / WhatsApp (those live only in claim_shepherd_assignments +
 * the authorized member card read). Owner: Story 6.12.
 */
export const ClaimShepherdAssignedPayloadSchema = requireIdentityTransition({
  ...auditShape,
  // The assigned District Admin (users.id — an actor id, not a name). Non-PII join key.
  shepherd_actor_id: z.string().uuid(),
  // The shepherd this assignment replaced (null on a fresh `initial` assignment; set on reassignment/fallback).
  previous_shepherd_actor_id: z.string().uuid().nullable(),
  // Why: initial (auto) | reassignment (admin-initiated, R6) | fallback (AR-61, AC4). Non-PII.
  assignment_reason: z.enum(SHEPHERD_ASSIGNMENT_REASONS),
  // The AC5 back-reference: which assignment row this one superseded (null on the first assignment). REQUIRED
  // in the schema (nullable) so the reassignment linkage actually rides the timeline (RATIFIED correction).
  supersedes_assignment_id: z.string().uuid().nullable(),
  // The assignment's jurisdiction — the deceased's server-derived posting district. Non-PII bounded metadata.
  district: z.string().min(1),
});

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

// ── R9 special-case panel voting ──────────────────────────────────────────────

/**
 * R9 special-case panel outcome finalized (Story 6.14, D-A — the 29th claim event). This is a
 * LIFECYCLE-ADVANCING event, NOT an annotation: it is the sole outcome of the R9 voting panel, and the
 * reducer branches on `payload.outcome` (the contained `payload.decision` precedent the three appeal-review
 * events set) — `approved` → `state_trustee_approved`, `denied` → `denied`, from any of the six
 * `TRUSTEE_ROUTABLE_STATES` a 6.13 `routeToR9` could have parked the claim in (so it is NOT
 * `requireIdentityTransition` — `from_state !== to_state` for a fresh routable state, and IS identity when
 * an already-`state_trustee_approved` claim is re-approved). An `approved` R9 claim then rejoins the
 * ORDINARY 6.13 cycle-freeze commit (`state_trustee_approved → claim.approved`, the single step-up-gated
 * milestone Epic 7 keys off) — 6.14 emits NO `claim.approved`.
 *
 * PII discipline (AC0/AC10): carries the NON-PII tally + rule snapshot ONLY — NO human display name, NO
 * per-voter identity, NO deceased/nominee PII. `clause_id` + `clause_version_id` + `voting_requirement` are
 * the rule provenance; `approve_count`/`deny_count` are the panel tally. Every R5 display name + voter
 * identity lives in the metadata rows (`claim_r9_voting_sessions` / `claim_r9_votes`), NEVER in this event.
 */
export const ClaimR9OutcomePayloadSchema = z
  .object({
    ...auditShape,
    // The finalized panel outcome — the reducer's branch key (approved → state_trustee_approved; denied → denied).
    outcome: z.enum(['approved', 'denied']),
    // The applicable R9 sub-clause id (a `route_r9_voting` clause) — non-PII rule provenance.
    clause_id: z.string().min(1),
    // The registry-snapshotted rule version the panel voted under (Story 2.3 clause_versions) — non-PII.
    clause_version_id: z.string().uuid(),
    // The DATA-derived requirement the outcome was computed against (v1 seed resolves all three R9 clauses to majority).
    voting_requirement: z.enum(['majority', 'supermajority', 'unanimous']),
    // The panel tally (non-PII counts) — the denominator is the panel size, an absent/deny panelist counts against approval.
    approve_count: z.number().int().nonnegative(),
    deny_count: z.number().int().nonnegative(),
  })
  .strict();

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

/**
 * The bounded, NON-PII public disposition tag the reversing reviewer selects (Story 6.16, D-A). Value-mirrors
 * the `claim_appeal_decisions.disposition_category` enum + `APPEAL_DISPOSITION_CATEGORIES` (appeal.ts) — the
 * ONE authority is the pgEnum tuple; this z.enum is the same list for the event payload. NEVER the Tier-1
 * rationale text or an individual reviewer's name (the D-A reconciliation of PRD §4.6's public-accountability
 * ask). Declared inline (NOT imported from appeal.ts) to avoid an events.ts → appeal.ts import edge; a lockstep
 * test pins it against the pgEnum tuple.
 */
export const appealDispositionCategorySchema = z.enum([
  'new_evidence_presented',
  'procedural_correction',
  'reconsideration_on_merits',
]);
// NOTE: the inferred TS type lives in appeal.ts (`AppealDispositionCategory`, from the pgEnum tuple) — the
// ONE authority. Not re-exported here to avoid a duplicate-export collision through the claim barrel.

/**
 * Appeal reversal → the Sahyog Vivran PUBLISH HOOK (Story 6.16, D-A — the 31st claim event). Written in the
 * SAME scope-tx as the `claim.appeal_stageN_reviewed { decision: 'reversed' }` transition, ONCE, when the
 * claim has already reached `reversed` — a `requireIdentityTransition` (`from_state === to_state ===
 * 'reversed'`), reducer IDENTITY. It changes NO lifecycle state and does NOT unfreeze the deceased member's
 * account (deliberately ABSENT from member/overlay.ts ACCOUNT_UNFREEZE_EVENT_TYPES — a reversed claim
 * re-enters approval, so the freeze persists until `settled`/`denied_no_appeal`).
 *
 * It is the ONE clean subscription point Epic 11b consumes (epics.md:3831-3834 names it by this exact type):
 * the `claim_case_id` (the event stream id) identifies the claim for the publish queue; `reversed_at_stage`
 * (1|2|3) + `disposition_category` (a bounded NON-PII tag — NEVER rationale text or a reviewer identity) drive
 * the "Reversed by appeal" narrative. The `appeal_stageN_reviewed(reversed)` event is the DECISION (carries
 * reviewer attribution + Tier-1 rationale in the metadata row, never public); THIS is the PUBLISH SIGNAL.
 */
export const ClaimReversedPayloadSchema = requireIdentityTransition({
  ...auditShape,
  reversed_at_stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  disposition_category: appealDispositionCategorySchema,
});

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

// ── Story 6.20 — the nominee declaration history (two IDENTITY annotations) ───────────────────

/**
 * The District Admin recorded (or re-recorded) the NOMINEE DETERMINATION — which declaration versions
 * STAND for this claim against the death-certificate date (`2026-09-20-235` Y; D4). The 33rd claim
 * event. An IDENTITY annotation (the 6.15 / 6.18 shape): the row in `nominee_determinations` and this
 * event are written in ONE transaction, and the reducer is a no-op.
 *
 * ⛔ PII discipline: ids and COUNTS only — ⛔ no certificate date, ⛔ no name, ⛔ no hash of either. The
 * Tier-1 date and note live encrypted in the row.
 * ⛔ It is ⛔ not a verdict: "discarded" versions do not deny anything (invariant 1). The refusal on
 * suspicion (`-239`) is a SEPARATE human act through the shipped verifier denial.
 */
export const ClaimNomineeDeterminationRecordedPayloadSchema = requireIdentityTransition({
  ...auditShape,
  determination_id: z.string().uuid(),
  supersedes_determination_id: z.string().uuid().nullable(),
  stands_count: z.number().int().nonnegative(),
  discarded_count: z.number().int().nonnegative(),
});

/**
 * The nominee-declaration LOCK this claim created is RELEASED, on an investigation finding the member
 * INNOCENT (`2026-09-21-238` cl.1 — the release route, option B; AC2). The 34th claim event. An IDENTITY
 * annotation: the finding row and this event are written in ONE transaction; ⛔ no lifecycle state
 * (AC10), the claim stays wherever it is.
 * ⚠ ⛔ NO PRODUCTION CALLER until row `6-22` (the fraud register) supplies the finding
 * (`2026-09-21-241` §6). ⛔ No PII: the finding's id only.
 */
export const ClaimNomineeLockReleasedPayloadSchema = requireIdentityTransition({
  ...auditShape,
  finding_id: z.string().uuid(),
});

// ── Story 6.21a — the death certificate's clear-date rule (ONE identity annotation) ───────────────

/**
 * The District Admin ACCEPTED or REJECTED the claim's current death certificate (`2026-09-20-235` Y,
 * `2026-09-20-236` BB; D1, D5). The 35th claim event. An IDENTITY annotation (the 6.15 / 6.18 / 6.20
 * shape): the row in `claim_death_certificate_reviews` and this event are written in ONE transaction, and
 * the reducer is a no-op.
 *
 * ⛔ A rejection is ⛔ NOT a denial and moves ⛔ no state (invariant 2): the family is asked for another
 * certificate and the claim WAITS at the approval gate.
 * ⛔ PII discipline: ids, the verdict and the reason CODE only — ⛔ no date, ⛔ no note (T10). The Tier-1
 * accepted date and the note live encrypted in the row.
 */
export const ClaimDeathCertificateReviewedPayloadSchema = requireIdentityTransition({
  ...auditShape,
  review_id: z.string().uuid(),
  upload_id: z.string().uuid(),
  verdict: z.enum(DEATH_CERTIFICATE_REVIEW_VERDICTS),
  rejection_reason: z.enum(DEATH_CERTIFICATE_REJECTION_REASONS).nullable(),
  supersedes_review_id: z.string().uuid().nullable(),
});

// ── The 35-event vocabulary + the type→schema map (single source) ─────────────
// (Story 6.1 committed the 20 state-advancing events; Story 6.6 added the 21st —
// `claim.peer_mesh_responded`; Story 6.7 added the 22nd — `claim.ground_inspection_completed`;
// Story 6.8 added the 23rd — `claim.nominee_bank_recorded`; Story 6.9 added the 24th —
// `claim.dpdpa_consent_recorded`; the Story 6.9 code review added the 25th —
// `claim.dpdpa_consent_revoked`; Story 6.11 added the 26th + 27th — `claim.verifier_escalated`
// (D-D) and `claim.verifier_decision_revised` (D-E); Story 6.12 adds the 28th —
// `claim.shepherd_assigned` (the shepherd routing/attribution annotation) — all annotation/identity
// events, per the "owner stories add their annotation events" discipline. Story 6.14 adds the 29th —
// `claim.r9_outcome` (D-A), a LIFECYCLE-ADVANCING event (NOT an annotation) whose reducer branches on
// `payload.outcome` from the six TRUSTEE_ROUTABLE_STATES → state_trustee_approved / denied. Story 6.15
// adds the 30th — `claim.concealment_assessed` (D-E), an IDENTITY annotation whose reducer is a no-op.
// Story 6.16 adds the 31st — `claim.reversed` (D-A), the Sahyog Vivran PUBLISH HOOK: an IDENTITY annotation
// appended in the SAME tx as an `appeal_stageN_reviewed(reversed)` transition, valid ONLY at `reversed`, the
// SOLE subscription point Epic 11b consumes. It carries `reversed_at_stage` + a NON-PII `disposition_category`
// tag; it changes no state and does NOT unfreeze the account. Story 6.18 adds the 32nd —
// `claim.nominee_name_checked` (AC3), an IDENTITY annotation recording the District Admin's per-account
// verdict on the nominee name (`2026-09-19-226` cl.3/cl.5). The AC4 approval gates READ it; the reducer
// is a no-op and nothing acts on a mismatch. ⭐ It is the ONLY event this story mints — the Pariwar
// Admin's return loop is a metadata-only decision row on the `routeToR9` shape and adds NONE.
// Story 6.20 adds the 33rd and 34th — `claim.nominee_determination_recorded` (D4) and
// `claim.nominee_lock_released` (AC2's release route), both IDENTITY annotations with a no-op reducer:
// the determination is a RECORD the approval gates read (AC5), and the release is an OUTCOME the
// nominee lock reads (AC2). ⛔ Neither is a lifecycle state (AC10); ⛔ neither carries PII.
// Story 6.21a adds the 35th — `claim.death_certificate_reviewed` (D5), an IDENTITY annotation with a no-op
// reducer recording the District Admin's accept / reject verdict on the current death certificate. The
// approval gates read the review ROW, ⛔ not the event; a rejection is ⛔ not a denial (invariant 2).)

export const CLAIM_EVENT_TYPES = [
  'claim.intake_initiated',
  'claim.intake_converged',
  'claim.documents_received',
  'claim.peer_mesh_pinged',
  'claim.peer_mesh_responded',
  'claim.ground_inspection_scheduled',
  'claim.ground_inspection_completed',
  'claim.nominee_bank_recorded',
  'claim.nominee_name_checked',
  'claim.nominee_determination_recorded',
  'claim.nominee_lock_released',
  'claim.death_certificate_reviewed',
  'claim.dpdpa_consent_recorded',
  'claim.dpdpa_consent_revoked',
  'claim.verifier_reviewing',
  'claim.verifier_approved',
  'claim.verifier_denied',
  'claim.verifier_escalated',
  'claim.verifier_decision_revised',
  'claim.concealment_assessed',
  'claim.shepherd_assigned',
  'claim.state_trustee_frozen',
  'claim.state_trustee_approved',
  'claim.approved',
  'claim.state_trustee_denied',
  'claim.r9_outcome',
  'claim.appeal_stage1_initiated',
  'claim.appeal_stage1_reviewed',
  'claim.appeal_stage2_initiated',
  'claim.appeal_stage2_reviewed',
  'claim.appeal_stage3_initiated',
  'claim.appeal_stage3_reviewed',
  'claim.reversed',
  'claim.settled',
  'claim.denied_no_appeal',
] as const;

/** The dotted `claim.*` event-type literal union (the 35 claim events). */
export type ClaimEventType = (typeof CLAIM_EVENT_TYPES)[number];

/**
 * type → payload-schema map. The ONE place the 35 events bind to their schemas;
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
  'claim.nominee_name_checked': ClaimNomineeNameCheckedPayloadSchema,
  'claim.nominee_determination_recorded': ClaimNomineeDeterminationRecordedPayloadSchema,
  'claim.nominee_lock_released': ClaimNomineeLockReleasedPayloadSchema,
  'claim.death_certificate_reviewed': ClaimDeathCertificateReviewedPayloadSchema,
  'claim.dpdpa_consent_recorded': ClaimDpdpaConsentRecordedPayloadSchema,
  'claim.dpdpa_consent_revoked': ClaimDpdpaConsentRevokedPayloadSchema,
  'claim.verifier_reviewing': ClaimVerifierReviewingPayloadSchema,
  'claim.verifier_approved': ClaimVerifierApprovedPayloadSchema,
  'claim.verifier_denied': ClaimVerifierDeniedPayloadSchema,
  'claim.verifier_escalated': ClaimVerifierEscalatedPayloadSchema,
  'claim.verifier_decision_revised': ClaimVerifierDecisionRevisedPayloadSchema,
  'claim.concealment_assessed': ClaimConcealmentAssessedPayloadSchema,
  'claim.shepherd_assigned': ClaimShepherdAssignedPayloadSchema,
  'claim.state_trustee_frozen': ClaimStateTrusteeFrozenPayloadSchema,
  'claim.state_trustee_approved': ClaimStateTrusteeApprovedPayloadSchema,
  'claim.approved': ClaimApprovedPayloadSchema,
  'claim.state_trustee_denied': ClaimStateTrusteeDeniedPayloadSchema,
  'claim.r9_outcome': ClaimR9OutcomePayloadSchema,
  'claim.appeal_stage1_initiated': ClaimAppealStage1InitiatedPayloadSchema,
  'claim.appeal_stage1_reviewed': ClaimAppealStage1ReviewedPayloadSchema,
  'claim.appeal_stage2_initiated': ClaimAppealStage2InitiatedPayloadSchema,
  'claim.appeal_stage2_reviewed': ClaimAppealStage2ReviewedPayloadSchema,
  'claim.appeal_stage3_initiated': ClaimAppealStage3InitiatedPayloadSchema,
  'claim.appeal_stage3_reviewed': ClaimAppealStage3ReviewedPayloadSchema,
  'claim.reversed': ClaimReversedPayloadSchema,
  'claim.settled': ClaimSettledPayloadSchema,
  'claim.denied_no_appeal': ClaimDeniedNoAppealPayloadSchema,
} as const satisfies Record<ClaimEventType, z.ZodTypeAny>;
