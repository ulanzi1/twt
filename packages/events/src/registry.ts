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

import { alert, claim, contribution, member, pool } from '@twt/domain';
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
      'Ground inspection ASSIGNMENT scheduled — annotation event; identity (both signals required, state unchanged); carries ground_inspection_id + district + inspector_actor_id + scheduled_at + supersedes_ground_inspection_id (a reschedule back-reference), NO PII (Story 6.7).',
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
  // a notification when it OBSERVES the alert.published lifecycle event (D6). This story emits
  // only frozen/published/live (the cycle-open path); alert.closed is Story 8.9, alert.settled
  // is Epic 9's exclusive.
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
      'Contribution window closed (live → closed) — the calendar-aware close-of-cycle transition (Story 8.9 owns the emitter; Story 8.1 authors the reducer arm + registers the type). No more contributions accepted.',
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
} as const satisfies Readonly<Record<string, EventTypeRegistryEntry>>;
