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

import { member } from '@twt/domain';
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
} as const satisfies Readonly<Record<string, EventTypeRegistryEntry>>;
