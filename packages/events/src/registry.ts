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

import { claim, member } from '@twt/domain';
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
} as const satisfies Readonly<Record<string, EventTypeRegistryEntry>>;
