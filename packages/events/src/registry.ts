// EVENT_TYPE_REGISTRY — Story 1.3 substrate; Story 3.1 lands the member.* family.
//
// Enumerates all event types known to the system per architecture
// §Complete project directory structure line 4418 + FM-PS-10. Substantive
// event-type enumeration is per-Story landed:
//   - Story 3.1   member.*       (signup_initiated, kyc_completed, lock_in_*, …) ← THIS
//   - Story 6.x   claim.*        (filed, verified, approved, settled)
//   - Story 7.x   pool.*         (spawned, frozen, …)
//   - Story 8.x   alert.*        (created, dispatched, …)
//   - Story 9.x   contribution.* (matched, confirmed, …)
//   - Story 1.10  audit.*        (audit-log entries are NOT general events —
//                                 architecture §1.5 puts them in a separate
//                                 audit_log_entries table; Story 1.10 decides
//                                 whether some audit lines additionally
//                                 surface as events_log entries)
//
// Story 1.3 commits the registry SHAPE (a typed map of event-type → schema);
// downstream Stories add entries. The member.* payload Zod schemas live in
// @twt/domain (packages/domain/src/member/events.ts) — @twt/events depends on
// @twt/domain, so importing them here is the legal direction (domain must NOT
// import contracts/events). Each record key equals its `type` string.

import { alert, claim, contribution, helpdesk, member, pool, reconciliation } from '@twt/domain';
import type { z } from 'zod';

export interface EventTypeRegistryEntry {
  readonly type: string;
  readonly description: string;
  readonly schema?: z.ZodTypeAny;
}

export const EVENT_TYPE_REGISTRY = {
  'member.signup_initiated': {
    type: 'member.signup_initiated',
    description: 'Member signup flow initiated; initial state → pending-kyc (FR-1).',
    schema: member.SignupInitiatedPayloadSchema,
  },
  'member.kyc_completed': {
    type: 'member.kyc_completed',
    description:
      'KYC completed (DigiLocker-verified, or trustee-approved manual KYC): pending-kyc → pending-fee, or pending-valid → active (FR-1/FR-2).',
    schema: member.KycCompletedPayloadSchema,
  },
  'member.kyc_manual_fallback': {
    type: 'member.kyc_manual_fallback',
    description: 'KYC manual fallback recorded (unverified): pending-kyc → pending-fee (FR-2).',
    schema: member.KycManualFallbackPayloadSchema,
  },
  'member.nominees_declared': {
    type: 'member.nominees_declared',
    description: 'Nominees declared (Story 3.4) — non-transition marker; state unchanged.',
    schema: member.NomineesDeclaredPayloadSchema,
  },
  'member.medical_disclosed': {
    type: 'member.medical_disclosed',
    description: 'Medical disclosure recorded (Story 3.5) — non-transition marker; state unchanged.',
    schema: member.MedicalDisclosedPayloadSchema,
  },
  'member.vyawastha_shulk_paid': {
    type: 'member.vyawastha_shulk_paid',
    description:
      'Vyawastha Shulk (fee) paid — UPI Intent + UTR confirmed: pending-fee → lock-in, or renewal from grace/lapsed → active with no re-lock-in (FR-1/FR-1A/FR-3).',
    schema: member.VyawasthaShulkPaidPayloadSchema,
  },
  'member.lock_in_entered': {
    type: 'member.lock_in_entered',
    description: 'Lock-in clock-start marker (state already lock-in via fee payment) — non-transition.',
    schema: member.LockInEnteredPayloadSchema,
  },
  'member.lock_in_expired': {
    type: 'member.lock_in_expired',
    description:
      'Lock-in clock expired (SIE-fired): lock-in → active when kyc_verified, else → pending-valid (FR-2/FR-3).',
    schema: member.LockInExpiredPayloadSchema,
  },
  'member.valid_through_reached': {
    type: 'member.valid_through_reached',
    description: 'valid_through date reached — renewal-reminder anchor; non-transition marker.',
    schema: member.ValidThroughReachedPayloadSchema,
  },
  'member.grace_entered': {
    type: 'member.grace_entered',
    description: 'valid_through + 1 day reached → active-in-grace (FR-1A).',
    schema: member.GraceEnteredPayloadSchema,
  },
  'member.grace_expired': {
    type: 'member.grace_expired',
    description: '90-day grace elapsed unpaid → lapsed-unpaid (FR-1A).',
    schema: member.GraceExpiredPayloadSchema,
  },
  'member.withdrawal_requested': {
    type: 'member.withdrawal_requested',
    description: 'Voluntary withdrawal initiated — non-transition marker (state changes on completion).',
    schema: member.WithdrawalRequestedPayloadSchema,
  },
  'member.withdrawal_completed': {
    type: 'member.withdrawal_completed',
    description: 'Voluntary withdrawal completed: active / active-in-grace / lapsed-unpaid → withdrawn (FR-6).',
    schema: member.WithdrawalCompletedPayloadSchema,
  },
  'member.rtbf_anonymized': {
    type: 'member.rtbf_anonymized',
    description: 'RTBF anonymization (Story 3.12): withdrawn → anonymized (terminal, FR-96).',
    schema: member.RtbfAnonymizedPayloadSchema,
  },
  'member.address_updated': {
    type: 'member.address_updated',
    description:
      'Address changed via the Life Events panel (Story 3.9) — non-transition marker; NON-PII presence marker only (address bytes live Tier-1 in member_addresses).',
    schema: member.AddressUpdatedPayloadSchema,
  },
  'member.posting_updated': {
    type: 'member.posting_updated',
    description:
      'Posting / transfer-in-out changed via the Life Events panel (Story 3.9) — non-transition marker; carries non-PII district + optional pariwar_ref + is_retirement (Epic 4 Story 4.5 retirement anchor).',
    schema: member.PostingUpdatedPayloadSchema,
  },
  // ── Story 10.26 — the personal-event ASSERTION ────────────────────────────────────
  // ⚠ `member.*` ON PURPOSE, and this file is one of the four roots Story 8.10's `no-ingest-path`
  // fence source-scans for a fourth `contribution.*` literal. The event supplies a `contribution.*`
  // FACT but is not a `contribution.*` EVENT — the producer maps the boolean anchor onto the dotted
  // fact key in `@twt/validity-service`, which the fence does not scan and must not need to.
  'member.personal_event_asserted': {
    type: 'member.personal_event_asserted',
    description:
      'Member asserts a personal event affected a contribution (Story 10.26, FR-9/R7(G)) — non-transition marker on the member stream. Records only; grants NO exemption and carries no consequence (ratified Niyamavali §3.1). Bounded `kind` enum, NO free text (Tier-1 PII discipline).',
    schema: member.PersonalEventAssertedPayloadSchema,
  },
  // ── Story 10.10 — member.moderation.* (the moderation OVERLAY, not the lifecycle) ──
  // Three-segment dotted names, legal by the cycle.spawn.started precedent below. They live on the
  // MEMBER's own stream (stream_id = member_id) and move a SECOND, orthogonal state machine
  // (moderation/status.ts) — `members.state` is NEVER touched and all three fold through
  // memberStateMachine as IDENTITY (Decision 1). The payload carries the bounded reason CODE only:
  // the mandatory free-text rationale is Tier-1 encrypted in `member_moderation_actions` and MUST
  // NEVER reach this plaintext-JSONB payload (R1).
  'member.moderation.suspended': {
    type: 'member.moderation.suspended',
    description:
      'Member suspended by a member.moderate holder (Story 10.10, FR-56) — moderation OVERLAY none → suspended; lifecycle-identity. Carries the registry reason_code only (no rationale, no name).',
    schema: member.moderation.ModerationSuspendedPayloadSchema,
  },
  'member.moderation.terminated': {
    type: 'member.moderation.terminated',
    description:
      'Member terminated (Story 10.10, FR-56 → FR-6) — moderation OVERLAY suspended → terminated, NEVER from none (Decision 2); lifecycle-identity. The 12-month rejoin lock instant lives on member_moderation_actions, not here.',
    schema: member.moderation.ModerationTerminatedPayloadSchema,
  },
  'member.moderation.restored': {
    type: 'member.moderation.restored',
    description:
      'Member restored (Story 10.10, FR-56) — moderation OVERLAY suspended|terminated → none; lifecycle-identity. Clears the rejoin lock by making the CURRENT overlay status unmoderated.',
    schema: member.moderation.ModerationRestoredPayloadSchema,
  },
  'member.moderation.ground-appended': {
    type: 'member.moderation.ground-appended',
    description:
      'A SUPPORTING ground appended to an existing moderation action (Story 10.20, WS-E) — a later finding ATTACHES to the decision, it never rewrites it. ACTION-LESS: no moderation status moves, so the payload carries NO overlay from/to pair (claiming one would be a false statement about the member\'s standing) and it is deliberately absent from MODERATION_ACTION_EVENT_TYPES. Lifecycle-identity. Carries the bounded registry code + the superseded ground id ONLY — the optional Tier-1 note and the evidence references live on member_moderation_grounds and MUST NEVER reach this plaintext-JSONB payload (R1). `is_primary` is absent because appends are supporting-only by construction: the primary ground is written in the action\'s own transaction and already rides that action\'s own event.',
    schema: member.moderation.ModerationGroundAppendedPayloadSchema,
  },
  // ── Story 10.23 — member.restoration_discipline.* (the SECOND governance overlay) ──
  // Lives on the MEMBER's own stream (stream_id = member_id) and moves an independent, event-derived
  // status machine (restoration-discipline/status.ts) — `members.state` is NEVER touched and it folds
  // through memberStateMachine as IDENTITY. ⚠ AUTOMATIC (`actor: 'system'`): unlike the moderation
  // family above, no trustee decides. §3.1 applies, and the CLAUSE ID is the reason — so the payload
  // carries no reason code, no actor and no PII of any kind (D5), and there is no Tier-1 sibling
  // table column anywhere in the instrument.
  // ⚠ There is deliberately NO `…expired` event: expiry is DERIVED at read from `expires_at` (AC4).
  'member.restoration_discipline.imposed': {
    type: 'member.restoration_discipline.imposed',
    description:
      'Restoration lock-in imposed by the §3.1 R7 ladder (Story 10.23, FR-8) — restoration-discipline OVERLAY; lifecycle-identity; AUTOMATIC (actor: system), not a trustee act. Pins BOTH the R7 clause version that supplied lock_in_months and the niy.restoration-discipline.policy version that supplied the counting + concurrency conventions, so a later re-tune never moves an existing member. Expiry is derived from expires_at — there is no expiry event.',
    schema: member.restorationDiscipline.RestorationDisciplineImposedPayloadSchema,
  },
  // ── Story 6.1 — claim.* lifecycle vocabulary (the claim-case state machine) ──
  // Payload schemas live in @twt/domain (packages/domain/src/claim/events.ts). Names
  // are single-dot snake_case — PINNED by the merged Story 3.1 account-frozen overlay
  // (claim.intake_initiated / claim.settled / claim.denied_no_appeal); see that file.
  'claim.intake_initiated': {
    type: 'claim.intake_initiated',
    description:
      'Claim intake initiated → intake_pending (initial); payload carries deceased_member_id (freezes the member account — Story 3.1 overlay seam) + intake_channel (FR-37).',
    schema: claim.ClaimIntakeInitiatedPayloadSchema,
  },
  'claim.intake_converged': {
    type: 'claim.intake_converged',
    description: 'ICP dedup picked the canonical claim → intake_converged (Story 6.4).',
    schema: claim.ClaimIntakeConvergedPayloadSchema,
  },
  'claim.documents_received': {
    type: 'claim.documents_received',
    description: 'Death certificate / documents received → documents_pending (Story 6.5).',
    schema: claim.ClaimDocumentsReceivedPayloadSchema,
  },
  'claim.peer_mesh_pinged': {
    type: 'claim.peer_mesh_pinged',
    description:
      'Peer-mesh verification pinged → verification_in_progress; payload carries the deterministic selection (selected_member_ids + metric_id/version) (Story 6.6).',
    schema: claim.ClaimPeerMeshPingedPayloadSchema,
  },
  'claim.peer_mesh_responded': {
    type: 'claim.peer_mesh_responded',
    description:
      'Peer-mesh response recorded — annotation event; identity transition (state unchanged); carries responder_member_id + response (Story 6.6).',
    schema: claim.ClaimPeerMeshRespondedPayloadSchema,
  },
  'claim.ground_inspection_scheduled': {
    type: 'claim.ground_inspection_scheduled',
    description:
      'Ground inspection ASSIGNMENT scheduled — annotation event; identity (both signals required, state unchanged); carries ground_inspection_id + district + block (Story 6.17 — nullish: the block-level authorization anchor when the assignment carries one, absent on events written before 6.17) + inspector_actor_id + scheduled_at + supersedes_ground_inspection_id (a reschedule back-reference), NO PII (Story 6.7).',
    schema: claim.ClaimGroundInspectionScheduledPayloadSchema,
  },
  'claim.ground_inspection_completed': {
    type: 'claim.ground_inspection_completed',
    description:
      'Ground inspection completed — annotation event (the 22nd claim event); identity transition (state unchanged); carries ground_inspection_id + optional photo_count, NO PII; write-guarded to verification_in_progress (Story 6.7).',
    schema: claim.ClaimGroundInspectionCompletedPayloadSchema,
  },
  'claim.nominee_bank_recorded': {
    type: 'claim.nominee_bank_recorded',
    description:
      'Claim-time nominee bank details recorded — annotation event (the 23rd claim event); identity transition (state unchanged, D2); carries account_ranks_present ([1,2] in v1) + ifsc_validated, NO PII; write-guarded to the pre-adjudication collectable window (Story 6.8).',
    schema: claim.ClaimNomineeBankRecordedPayloadSchema,
  },
  'claim.dpdpa_consent_recorded': {
    type: 'claim.dpdpa_consent_recorded',
    description:
      'Claim-time DPDPA consent recorded — annotation event (the 24th claim event); identity transition (state unchanged, D6); carries consent_types_granted (the granted subset, always non-empty), NO PII; emitted only when ≥1 grant row was written, write-guarded to the pre-adjudication window (Story 6.9).',
    schema: claim.ClaimDpdpaConsentRecordedPayloadSchema,
  },
  'claim.dpdpa_consent_revoked': {
    type: 'claim.dpdpa_consent_revoked',
    description:
      'Claim-time DPDPA consent revoked — annotation event (the 25th claim event, Story 6.9 code review); identity transition (state unchanged); carries the single consent_type revoked, NO PII, NO revocation reason; allowed at any claim state (AC3).',
    schema: claim.ClaimDpdpaConsentRevokedPayloadSchema,
  },
  'claim.verifier_reviewing': {
    type: 'claim.verifier_reviewing',
    description: 'Verifier console opened review → verifier_review (Story 6.10/6.11).',
    schema: claim.ClaimVerifierReviewingPayloadSchema,
  },
  'claim.verifier_approved': {
    type: 'claim.verifier_approved',
    description: 'Verifier approved → verifier_approved (Story 6.11).',
    schema: claim.ClaimVerifierApprovedPayloadSchema,
  },
  'claim.verifier_denied': {
    type: 'claim.verifier_denied',
    description: 'Verifier denied → denied (Story 6.11).',
    schema: claim.ClaimVerifierDeniedPayloadSchema,
  },
  'claim.verifier_escalated': {
    type: 'claim.verifier_escalated',
    description:
      'Verifier escalated to State Trustee — identity annotation, no lifecycle state (Story 6.11, D-D).',
    schema: claim.ClaimVerifierEscalatedPayloadSchema,
  },
  'claim.verifier_decision_revised': {
    type: 'claim.verifier_decision_revised',
    description:
      'Verifier revised a prior same-outcome decision — identity annotation, not a verdict re-emit (Story 6.11, D-E).',
    schema: claim.ClaimVerifierDecisionRevisedPayloadSchema,
  },
  'claim.shepherd_assigned': {
    type: 'claim.shepherd_assigned',
    description:
      'Human shepherd (District Admin) assigned to the claim — identity annotation, no lifecycle state (the 28th claim event); carries shepherd_actor_id + previous_shepherd_actor_id + assignment_reason + supersedes_assignment_id + district (a reassignment back-reference), NO PII name/phone/WhatsApp; grants no claim.approve (Story 6.12).',
    schema: claim.ClaimShepherdAssignedPayloadSchema,
  },
  'claim.concealment_assessed': {
    type: 'claim.concealment_assessed',
    description:
      'Verifier recorded/revised a concealment-linkage assessment — identity annotation, no lifecycle state (the 30th claim event); flags/routes but NEVER denies (the State Trustee alone decides, Story 6.13/D-B). auditShape only — the tri-state kind + optional Tier-1 note live in claim_concealment_assessments, NEVER in the event (Story 6.15, D-E).',
    schema: claim.ClaimConcealmentAssessedPayloadSchema,
  },
  'claim.state_trustee_frozen': {
    type: 'claim.state_trustee_frozen',
    description: 'Cycle-freeze window opened for this claim → state_trustee_freeze (Story 6.13).',
    schema: claim.ClaimStateTrusteeFrozenPayloadSchema,
  },
  'claim.state_trustee_approved': {
    type: 'claim.state_trustee_approved',
    description:
      'Per-claim trustee vote during open freeze → state_trustee_approved (approved-in-principle, reversible; Story 6.13).',
    schema: claim.ClaimStateTrusteeApprovedPayloadSchema,
  },
  'claim.approved': {
    type: 'claim.approved',
    description:
      'Cycle-freeze bulk-approval commit → approved (the milestone Epic 7 pool-binding + Epic 9 reconciliation key off; Story 6.13).',
    schema: claim.ClaimApprovedPayloadSchema,
  },
  'claim.state_trustee_denied': {
    type: 'claim.state_trustee_denied',
    description: 'State Trustee denied during freeze → denied (Story 6.13).',
    schema: claim.ClaimStateTrusteeDeniedPayloadSchema,
  },
  'claim.r9_outcome': {
    type: 'claim.r9_outcome',
    description:
      'R9 special-case panel outcome finalized → state_trustee_approved (approved) / denied (denied); carries the non-PII tally + rule snapshot only (Story 6.14).',
    schema: claim.ClaimR9OutcomePayloadSchema,
  },
  'claim.appeal_stage1_initiated': {
    type: 'claim.appeal_stage1_initiated',
    description: 'Appeal stage 1 initiated (from denied) → appeal_stage_1 (Story 6.16).',
    schema: claim.ClaimAppealStage1InitiatedPayloadSchema,
  },
  'claim.appeal_stage1_reviewed': {
    type: 'claim.appeal_stage1_reviewed',
    description:
      'Appeal stage 1 reviewed; payload.decision advance → appeal_stage_2, reversed → reversed, upheld → denied (Story 6.16).',
    schema: claim.ClaimAppealStage1ReviewedPayloadSchema,
  },
  'claim.appeal_stage2_initiated': {
    type: 'claim.appeal_stage2_initiated',
    description: 'Appeal stage 2 initiated → appeal_stage_2 (Story 6.16).',
    schema: claim.ClaimAppealStage2InitiatedPayloadSchema,
  },
  'claim.appeal_stage2_reviewed': {
    type: 'claim.appeal_stage2_reviewed',
    description:
      'Appeal stage 2 reviewed (State Trustee panel); payload.decision advance → appeal_stage_3, reversed → reversed, upheld → denied (Story 6.16).',
    schema: claim.ClaimAppealStage2ReviewedPayloadSchema,
  },
  'claim.appeal_stage3_initiated': {
    type: 'claim.appeal_stage3_initiated',
    description: 'Appeal stage 3 initiated → appeal_stage_3 (Story 6.16).',
    schema: claim.ClaimAppealStage3InitiatedPayloadSchema,
  },
  'claim.appeal_stage3_reviewed': {
    type: 'claim.appeal_stage3_reviewed',
    description:
      'Appeal stage 3 reviewed (Trustee discretion, final); payload.decision reversed → reversed, upheld → denied (no advance; Story 6.16).',
    schema: claim.ClaimAppealStage3ReviewedPayloadSchema,
  },
  'claim.reversed': {
    type: 'claim.reversed',
    description:
      'Appeal reversal → the Sahyog Vivran publish hook (Story 6.16, D-A — the 31st claim event). Identity annotation appended in the same tx as an appeal_stageN_reviewed(reversed) transition; the SOLE subscription point Epic 11b routes to the Sahyog Vivran publication queue. Carries reversed_at_stage + a NON-PII disposition_category tag; changes no state, does NOT unfreeze the account.',
    schema: claim.ClaimReversedPayloadSchema,
  },
  'claim.settled': {
    type: 'claim.settled',
    description:
      'Pool spawn + disbursement complete → settled (terminal); clears the account-frozen overlay (Epic 7/9).',
    schema: claim.ClaimSettledPayloadSchema,
  },
  'claim.denied_no_appeal': {
    type: 'claim.denied_no_appeal',
    description:
      'Appeal window closed/exhausted — claim stays denied (terminal); annotation event that clears the account-frozen overlay (Story 6.16).',
    schema: claim.ClaimDeniedNoAppealPayloadSchema,
  },
  // ── Story 7.1 — pool.* lifecycle vocabulary (the pool-object state machine) ──
  // Payload schemas live in @twt/domain (packages/domain/src/pool/events.ts). Names are
  // single-dot snake_case — the merged-registry convention (contrast the epic AC's
  // hyphen/double-dot forms; the `opened_for_contributions` reconciliation is recorded in
  // pool/events.ts "PINNED SEAM" + the Story 7.1 Dev Agent Record).
  'pool.spawned': {
    type: 'pool.spawned',
    description:
      'Pool spawned → spawned (initial; the creation event of the pool stream); payload carries the spawn-snapshot identity (support_category, benefit_mechanism, fixed_amount, pool_index, cycle_id, pool_canonical_identifier) (Story 7.1; emitted by the Story 7.3 spawn saga).',
    schema: pool.PoolSpawnedPayloadSchema,
  },
  'pool.opened_for_contributions': {
    type: 'pool.opened_for_contributions',
    description:
      'Pool opened for contributions → live (the contribution-window scheduler; the delimiter-reconciled name of the epic AC\'s pool.opened-for-contributions) (Story 7.1).',
    schema: pool.PoolOpenedForContributionsPayloadSchema,
  },
  'pool.closed': {
    type: 'pool.closed',
    description: 'Pool contribution window closed → closed (Story 7.1).',
    schema: pool.PoolClosedPayloadSchema,
  },
  'pool.settled': {
    type: 'pool.settled',
    description:
      'Pool disbursed to the deceased\'s nominee accounts → settled (terminal; Epic 7/9 disbursement + reconciliation) (Story 7.1).',
    schema: pool.PoolSettledPayloadSchema,
  },
  // ── Story 7.3 — cycle.* vocabulary (the pool spawn saga's CYCLE-stream events) ──
  // Payload schemas live in @twt/domain (packages/domain/src/pool/cycle-events.ts) — they
  // are appended on the CYCLE stream (stream_id = cycle_id = cycle_freeze_commits.commit_id;
  // there is no `cycles` table). `cycle.frozen` is the single atomic commit-point event the
  // saga emits exactly once (Epic 8 consumes it for the cycle-open trigger);
  // `cycle.spawn.aborted` is a RETRYABLE diagnostic breadcrumb, never a terminal spawn-lock.
  'cycle.spawn.started': {
    type: 'cycle.spawn.started',
    description:
      'The pool-spawn parent job began a fresh plan for this cycle (Story 7.3) — the durable "parent-job-started" audit element AC4 requires; emitted EXACTLY ONCE, in the same tx as the plan, never on the idempotent-replay path.',
    schema: pool.CycleSpawnStartedPayloadSchema,
  },
  'cycle.frozen': {
    type: 'cycle.frozen',
    description:
      'Cycle fully spawned → the atomic commit-point event, emitted EXACTLY ONCE when the last child pool commits (Story 7.3); payload carries pool_count N + pool_ids + pool_canonical_identifiers + the trustee attestation. The event Epic 8 keys the cycle-open trigger off.',
    schema: pool.CycleFrozenPayloadSchema,
  },
  'cycle.spawn.aborted': {
    type: 'cycle.spawn.aborted',
    description:
      'A single pool-spawn attempt failed → a RETRYABLE audit/diagnostic breadcrumb, NOT terminal (Story 7.3); a cycle stream may carry multiple aborted events followed by a successful cycle.frozen. Carries a NON-PII reason string. Never a spawn-lock.',
    schema: pool.CycleSpawnAbortedPayloadSchema,
  },
  // ── Story 8.1 — alert.* vocabulary (the alert lifecycle's own events_log stream) ──
  // Payload schemas live in @twt/domain (packages/domain/src/alert/events.ts) — appended on
  // the ALERT stream (stream_id = alert_id = deriveAlertId(cycle_id); one alert per cycle).
  // These are DOMAIN LIFECYCLE events (the state-machine transitions), NOT the Story 5.1
  // AlertCategory notification payloads (contracts/src/alerts/alert.ts) — Story 8.8 dispatches
  // a notification when it OBSERVES the alert.published lifecycle event (D6). Story 8.1 emitted
  // only frozen/published/live (the cycle-open path); alert.closed's emitter is Story 8.14,
  // alert.settled is Epic 9's exclusive and remains UNEMITTED.
  //
  // ⚠ An owner named here is an ASSERTION NOTHING VERIFIES. `alert.closed` sat in this registry
  // attributed to Story 8.9 for four stories with no emitter anywhere in the repository: 8.1
  // assigned it forward, 8.9's scope table assumed it had already shipped, and five consumers were
  // built on a fact no code could produce. Before trusting an attribution in this file, confirm a
  // producer actually exists (Story 8.14 — recorded there as a process finding).
  'alert.frozen': {
    type: 'alert.frozen',
    description:
      'Cycle-freeze consumed → the alert genesis event (draft → frozen), emitted once when the cycle-open trigger consumes cycle.frozen (Story 8.1); payload copies cycle_id + pariwar_id + pool_count + pool_ids + the trustee attestation from cycle.frozen. First event of the alert stream (stream_id = alert_id).',
    schema: alert.AlertFrozenPayloadSchema,
  },
  'alert.published': {
    type: 'alert.published',
    description:
      'Alert member-visible (frozen → published) (Story 8.1). Carries the AR-18 time_critical signal (true when a cycle_open_sms_bridge degraded-mode declaration is active, AC4). Story 8.8 subscribes to THIS lifecycle event to perform the cycle-open notification fan-out (the FR-23 nudge seam) — it is NOT itself a notification payload.',
    schema: alert.AlertPublishedPayloadSchema,
  },
  'alert.live': {
    type: 'alert.live',
    description:
      'Contribution window open (published → live) (Story 8.1) — the ratified extension of the epic AC (D10); nothing else in Epic 8 fires alert.live, and Story 8.2\'s My Pool card reads a live alert.',
    schema: alert.AlertLivePayloadSchema,
  },
  'alert.closed': {
    type: 'alert.closed',
    description:
      'Contribution window closed (live → closed) at FR-22\'s hard Day-15 boundary. Story 8.1 authored the reducer arm + registered the type; Story 8.14 built the EMITTER (@twt/domain alert.closeCycleAlert, driven by the apps/jobs close-of-cycle sweep — the PRIMARY producer, since a time boundary has nothing to hook post-commit). No more contributions accepted. Story 8.9 governs the post-close RECONCILIATION TAIL only; it does not move this boundary.',
    schema: alert.AlertClosedPayloadSchema,
  },
  'alert.settled': {
    type: 'alert.settled',
    description:
      'Reconciliation complete + disbursed → terminal (closed → settled) — the yellow → green flip (Epic 9 owns the emitter EXCLUSIVELY; Story 8.1 authors the reducer arm + registers the type).',
    schema: alert.AlertSettledPayloadSchema,
  },
  // ── Story 8.4 — contribution.* WRITE vocabulary (the FIRST contribution.* event) ──
  // Payload schema lives in @twt/domain (packages/domain/src/contribution/events.ts) — appended on the
  // ALERT stream (stream_id = alert_id; the alert is 1:1 with the cycle). This is the YELLOW pill: a
  // member's self-attested payment CLAIM, carrying attestation_only:true. It is NOT the Epic-9
  // `contribution.confirmed` (green) flip — green is Epic 9's exclusive producer and is deliberately
  // NOT registered here (the header's "Story 9.x contribution.*" reservation is now the CONFIRMATION
  // side only; 8.4 owns the attestation side).
  'contribution.utr-attested': {
    type: 'contribution.utr-attested',
    description:
      'Member self-attested a UPI payment UTR (the yellow pill) — a member CLAIM only, NOT reconciliation-confirmed (Story 8.4). On the alert stream (stream_id = alert_id); payload carries poolId + memberId + the deterministic tr + the raw utr (Epic 9 primary-matches it) + attestation_only:true (the load-bearing yellow-not-green guard). Idempotent per (member, alert) via the derived tr. NOT the Epic-9 contribution.confirmed flip.',
    schema: contribution.ContributionUtrAttestedPayloadSchema,
  },
  // ── Story 9.3 — reconciliation.* vocabulary (the FIRST two; the bank-statement upload transport) ──
  // Payload schemas live in @twt/domain (packages/domain/src/reconciliation/events.ts) — appended on the
  // POOL stream (stream_id = pool_id, the same stream pool.opened_for_contributions lands on, so the
  // engagement read mirrors resolvePoolOpenAt). A NEW namespace, deliberately NOT contribution.* — a
  // contribution.statement-uploaded would be a fourth contribution.* type and trip Story 8.10's
  // exactly-three-types fence (Decision D6). statement-uploaded is BOTH the audit provenance / metadata
  // row (Decision D2 — object key + counts, never the entries) AND the engagement heartbeat the
  // nominee-console staff-takeover clock resets on.
  'reconciliation.statement-uploaded': {
    type: 'reconciliation.statement-uploaded',
    description:
      'A raw bank statement landed (nominee/staff upload → stored blob) (Story 9.3). Carries poolId + claimCaseId + bankCode + the object key + parsed?/parserVersion + row counts (NOT the entries — Decision D2; the 9.4 matcher re-reads the blob). Serves as the metadata row + audit provenance + the engagement heartbeat (resolveLastEngagedAt resets the staff-takeover day-N clock off its occurred_at).',
    schema: reconciliation.ReconciliationStatementUploadedPayloadSchema,
  },
  'reconciliation.manual_transcription_requested': {
    type: 'reconciliation.manual_transcription_requested',
    description:
      'The "Hum aapke liye padh lenge" fallback (Story 9.3, AC2/AC3): a staff-mediated manual-entry request (24–48h SLA) raised on an unparseable upload or an explicit nominee ask. Carries poolId + claimCaseId + bankCode? + the stored object key? + reason + slaHours + the attribution role — a RESERVED SEAM shaped for the Story 9.8 review queue / Epic-10 helpdesk (no queue render in 9.3, the 9.1 takeover-flag discipline).',
    schema: reconciliation.ReconciliationManualTranscriptionRequestedPayloadSchema,
  },
  // ── Story 9.4 — the reconciliation matcher's verdict + reversal vocabulary ──────────────────────────
  // `contribution.confirmed` (green) + `contribution.reconciliation-mismatch` (red) are the matcher's
  // producers, appended on the ALERT stream (Decision D2). They register their @twt/domain payload schemas
  // HERE directly — the schemas ship STANDALONE (not in CONTRIBUTION_EVENT_PAYLOAD_SCHEMAS), so the Story
  // 8.10 no-ingest fence + 8.4 write-map fence stay green verbatim (AC7). `reconciliation.confirmation-
  // reversed` is the ONLY un-confirm path (Decision D1 — off the contribution.* fence); 9.4 registers it +
  // proves the matcher never emits it, Story 9.8 is the producer.
  'contribution.confirmed': {
    type: 'contribution.confirmed',
    description:
      'The GREEN reconciliation verdict (Story 9.4) — the matcher confirmed a member UTR attestation against an uploaded bank-statement entry. On the ALERT stream (stream_id = alert_id, Decision D2); camelCase payload poolId + memberId (the load-bearing Story 8.3 forward-contract keys) + alertId + utr + confirmedAt + matchProvenance. The sole authority the green pill / contributor list / Yogdaan Bahi green arm read. Monotonic: once fired, only a trustee-attested reconciliation.confirmation-reversed can un-confirm.',
    schema: contribution.ContributionConfirmedPayloadSchema,
  },
  'contribution.reconciliation-mismatch': {
    type: 'contribution.reconciliation-mismatch',
    description:
      'The RED reconciliation verdict (Story 9.4, Decision D5) — a member UTR attestation failed to reconcile (no in-window statement entry / wrong pool / amount mismatch). On the ALERT stream (Decision D2); payload poolId + memberId + alertId + utr + reason-code + the offending bankStatementEntryId (null for no_statement_entry) + detectedAt + matcherRun. Populates the pre-built red passbook arm; Story 9.7/9.8 build the member-facing recovery surface + review queue on top.',
    schema: contribution.ContributionReconciliationMismatchPayloadSchema,
  },
  'reconciliation.confirmation-reversed': {
    type: 'reconciliation.confirmation-reversed',
    description:
      'The compensating REVERSAL event (Story 9.4 registers; Story 9.8 produces) — the ONLY un-confirm path for a prior contribution.confirmed (the monotonic-confirmation invariant, AC5). In the reconciliation.* namespace DELIBERATELY (NOT contribution.*), to stay off the Story 8.10 exactly-three-contribution.*-types fence (Decision D1, the 9.3 D6 precedent). Payload poolId + memberId + alertId + reversedConfirmedEventId + reasonCode + attestedByActorIds (≥1 State-Trustee attestation) + reversedAt. The matcher NEVER emits it (proven structurally in 9.4).',
    schema: reconciliation.ReconciliationConfirmationReversedPayloadSchema,
  },
  // ── Story 9.7 (Decision D2) — the member self-verify screenshot-upload evidence event ────────────────
  // Appended on the ALERT stream (co-located with the mismatch verdict it responds to). A NEW
  // reconciliation.* type (the 9.3 D6 precedent), so Story 8.10's exactly-three-contribution.*-types fence
  // stays green verbatim. PURE EVIDENCE INTAKE (AC4): it records a blob key + the mismatch reference and
  // feeds the Story 9.8 review queue — it NEVER auto-confirms, remaps, un-confirms, or re-runs the matcher.
  'reconciliation.self-verify-screenshot-uploaded': {
    type: 'reconciliation.self-verify-screenshot-uploaded',
    description:
      'A member uploaded a payment screenshot from the Story 9.7 <SelfVerifySurface> recovery path. On the ALERT stream (Decision D2); payload poolId + memberId + alertId + objectKey + mismatchReason (nullable — a "Trouble with UTR?" fallback has no live mismatch) + contentType + uploadedAt. PURE EVIDENCE INTAKE (AC4): the Story 9.8 review-queue input; it changes no reconciliation outcome (no auto-confirm, no remap, no matcher re-run). The member stays red/mismatch until the 9.4 matcher or the 9.8 trustee confirms.',
    schema: reconciliation.ReconciliationSelfVerifyScreenshotUploadedPayloadSchema,
  },
  // ── Story 9.8 (Decision D1) — the trustee REJECT verdict ─────────────────────────────────────────────
  // The human-triage reject outcome, appended on the ALERT stream (Decision D2). A NEW reconciliation.*
  // type DELIBERATELY (NOT contribution.invalid): a fourth contribution.* type would trip Story 8.10's
  // exactly-three-types fence (the 9.3 D6 / 9.7 D2 precedent). `invalid` is the outcome word, not an event
  // type. Serves as the case-CLOSED marker for the 9.8 open-vs-resolved queue read + the member-notify
  // trigger; changes no derivation arm (the member stays red — red already conveys mismatch/invalid).
  'reconciliation.contribution-rejected': {
    type: 'reconciliation.contribution-rejected',
    description:
      'The trustee REJECT verdict (Story 9.8) — a reviewer determined an open reconciliation case is invalid and could not be confirmed. On the ALERT stream (Decision D2); payload poolId + memberId + alertId + reasonCode (a bounded reject-family machine token) + attestedByActorIds (≥1 trustee attestation) + rejectedAt. The case-closed marker for the review queue + the FR-50 member-notify trigger. Member stays red (no new derivation arm). NOT contribution.invalid — off Story 8.10\'s contribution.* fence (Decision D1).',
    schema: reconciliation.ReconciliationContributionRejectedPayloadSchema,
  },
  // ── Story 10.1 — helpdesk.* vocabulary (the FIFTH event-derived-state primitive's own stream) ──
  // Payload schema lives in @twt/domain (packages/domain/src/helpdesk/events.ts) — appended on the
  // TICKET stream (stream_id = ticket_id; a plain random UUID, no deriveTicketId). This story emits +
  // registers ONLY the genesis `helpdesk.ticket_created` (→ open); the pick-up/awaiting/resolve/close/
  // reopen transition types register with their emitting surface (Story 10.2/10.4 + the auto-close job),
  // exactly the alert.* "author-all-arms, emit-genesis" precedent.
  'helpdesk.ticket_created': {
    type: 'helpdesk.ticket_created',
    description:
      'A helpdesk ticket was created + routed → the ticket genesis event ((none) → open), emitted once by the Story 10.1 create-ticket route (stream_id = ticket_id). Carries the FULL audit-replayable routing snapshot: category/sub_category, the member_scope_context, the routing_policy_version in force at creation, the resolved target_role + target_scope, matched_rule_index, the two SLA due instants, created_via + operator_attribution, the subject (exactly one of member/actor), attachments, and the nullable cross-link refs.',
    schema: helpdesk.HelpdeskTicketCreatedPayloadSchema,
  },
  // ── Story 10.4 — the four helpdesk lifecycle TRANSITION types (the responder round-trip) ──
  // Story 10.1 authored the complete 6-state reducer + all transition payload shapes but registered
  // ONLY the genesis. Story 10.4 wires the emitting surfaces (the admin responder console + the member
  // reply-append route) via `projectTicketTransition`, so it registers the four types those surfaces
  // emit. `helpdesk.closed` (the 7-day auto-close sweep) + `helpdesk.reopened` (a member reopen) remain
  // AUTHORED-but-UNREGISTERED — documented seams owned by their future emitting surfaces (the alert.*
  // "author-all-arms, register-with-the-emitter" precedent).
  'helpdesk.picked_up': {
    type: 'helpdesk.picked_up',
    description:
      'A responder picked up a ticket → in_progress (open/reopened → in_progress), emitted by the Story 10.4 admin pick-up route via projectTicketTransition (stream_id = ticket_id). Message-free lifecycle transition (auditShape only).',
    schema: helpdesk.HelpdeskPickedUpPayloadSchema,
  },
  'helpdesk.awaiting_member': {
    type: 'helpdesk.awaiting_member',
    description:
      'A responder replied asking the member for info → awaiting_member (open/in_progress → awaiting_member; the resolution SLA pauses), emitted by the Story 10.4 admin reply route. Carries the staff `message` (the reply round-trip; replayTicketThread surfaces it) — the first message-bearing helpdesk transition.',
    schema: helpdesk.HelpdeskAwaitingMemberPayloadSchema,
  },
  'helpdesk.member_replied': {
    type: 'helpdesk.member_replied',
    description:
      'The member replied from their app → in_progress (awaiting_member → in_progress; the ticket returns to the responder queue), emitted by the Story 10.4 member reply-append route. Carries the member `message`.',
    schema: helpdesk.HelpdeskMemberRepliedPayloadSchema,
  },
  'helpdesk.resolved': {
    type: 'helpdesk.resolved',
    description:
      'A responder resolved a ticket → resolved (in_progress/awaiting_member → resolved), emitted by the Story 10.4 admin resolve route. Carries the staff closing `message` (fires the helpdesk_reply member notification).',
    schema: helpdesk.HelpdeskResolvedPayloadSchema,
  },
} as const satisfies Readonly<Record<string, EventTypeRegistryEntry>>;
