// Story 6.39 (Task 3.1; DL10) — the membership check's vocabularies are DOMAIN-OWNED and MIRRORED in contracts; this
// pins each pair in lockstep (the 6.38 DL6 pattern — `claims-intake-refusal.test.ts`).

import { claim, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  FEE_PAID_AFTER_DEATH_NOT_SHOWN_CODE_SUFFIX,
  MEMBERSHIP_CHECK_FEE_OUTCOMES,
  MEMBERSHIP_CHECK_IDENTITY_OUTCOMES,
  MEMBERSHIP_CHECK_IDENTITY_REASONS,
  MEMBERSHIP_CHECK_KYC_ROUTES,
  MEMBERSHIP_CHECK_REQUIRED_CODE_SUFFIX,
  MEMBERSHIP_CHECK_WAIT_REASONS,
  MembershipCheckGateStatus,
  MembershipCheckPreviewResponse,
  MembershipCheckRequest,
  isMembershipCheckWaitReason,
  MemberAppealStatusResponse,
  MemberDeathCertificateStatusResponse,
} from '../src/index.js';

const REVIEW = '6b1f0b7e-2c56-4b55-9d0b-3a0a2b1c4d5e';

describe('Story 6.39 — the membership check vocabulary', () => {
  it('each contracts tuple equals the domain tuple, in order', () => {
    expect([...MEMBERSHIP_CHECK_FEE_OUTCOMES]).toEqual([...schema.MEMBERSHIP_CHECK_FEE_OUTCOMES]);
    expect([...MEMBERSHIP_CHECK_IDENTITY_OUTCOMES]).toEqual([...schema.MEMBERSHIP_CHECK_IDENTITY_OUTCOMES]);
    expect([...MEMBERSHIP_CHECK_IDENTITY_REASONS]).toEqual([...schema.MEMBERSHIP_CHECK_IDENTITY_REASONS]);
    expect([...MEMBERSHIP_CHECK_WAIT_REASONS]).toEqual([...claim.MEMBERSHIP_CHECK_WAIT_REASONS]);
    expect([...MEMBERSHIP_CHECK_KYC_ROUTES]).toEqual([...claim.MEMBERSHIP_CHECK_KYC_ROUTES]);
  });

  it('the wait-reason precedence is the gate\'s (DL5): not_checked → stale → fee_after_death → identity_not_confirmed', () => {
    expect([...MEMBERSHIP_CHECK_WAIT_REASONS]).toEqual(['not_checked', 'stale', 'fee_after_death', 'identity_not_confirmed']);
  });

  it('the two code suffixes — each approval route prefixes its own (TR13)', () => {
    expect(MEMBERSHIP_CHECK_REQUIRED_CODE_SUFFIX).toBe('.membership_check_required');
    expect(FEE_PAID_AFTER_DEATH_NOT_SHOWN_CODE_SUFFIX).toBe('.fee_paid_after_death_not_shown');
  });

  it('the guard admits the four reasons and nothing else', () => {
    for (const r of MEMBERSHIP_CHECK_WAIT_REASONS) expect(isMembershipCheckWaitReason(r)).toBe(true);
    for (const r of ['passed', 'same_day', '', null, undefined, 3]) expect(isMembershipCheckWaitReason(r)).toBe(false);
  });
});

describe('Story 6.39 — MembershipCheckRequest (⛔ a client supplies ⛔ date)', () => {
  it('accepts each identity outcome, with and without a reason / note (the WRITER owns coherence)', () => {
    expect(MembershipCheckRequest.safeParse({ expected_live_review_id: REVIEW, identity_outcome: 'not_required' }).success).toBe(true);
    expect(MembershipCheckRequest.safeParse({ expected_live_review_id: REVIEW, identity_outcome: 'confirmed', note: 'seen' }).success).toBe(true);
    expect(
      MembershipCheckRequest.safeParse({
        expected_live_review_id: REVIEW,
        identity_outcome: 'not_confirmed',
        identity_reason: 'name_differs',
        note: 'the certificate names another person',
      }).success,
    ).toBe(true);
    // Loose by design: the writer refuses this one with an audited `membership_check.invalid_outcome`.
    expect(MembershipCheckRequest.safeParse({ expected_live_review_id: REVIEW, identity_outcome: 'not_confirmed' }).success).toBe(true);
  });

  it.each(['fee_outcome', 'date_of_death', 'fee_paid_on', 'paid_at', 'fee_receipt_id'])(
    '⛔ refuses a client-supplied `%s` (.strict()) — the server computes the comparison (N3)',
    (key) => {
      const parsed = MembershipCheckRequest.safeParse({ expected_live_review_id: REVIEW, identity_outcome: 'confirmed', [key]: '2026-01-01' });
      expect(parsed.success).toBe(false);
    },
  );

  it('refuses an unknown outcome, an unknown reason, a non-uuid token and a missing token', () => {
    expect(MembershipCheckRequest.safeParse({ expected_live_review_id: REVIEW, identity_outcome: 'maybe' }).success).toBe(false);
    expect(MembershipCheckRequest.safeParse({ expected_live_review_id: REVIEW, identity_outcome: 'not_confirmed', identity_reason: 'because' }).success).toBe(false);
    expect(MembershipCheckRequest.safeParse({ expected_live_review_id: 'x', identity_outcome: 'confirmed' }).success).toBe(false);
    expect(MembershipCheckRequest.safeParse({ identity_outcome: 'confirmed' }).success).toBe(false);
  });
});

describe('Story 6.39 — the preview and the console section', () => {
  const preview = {
    claim_case_id: REVIEW,
    window_open: true,
    expected_live_review_id: REVIEW,
    date_of_death: '2026-03-10',
    fee_paid_on: '2026-03-10',
    fee_receipt_found: true,
    fee_outcome: 'same_day',
    identity_required: true,
    kyc_route: 'typed_in_unchecked',
    latest_posting_district: null,
    live_check: null,
    gate: { passed: false, reason: 'not_checked' },
  };

  it('parses a full preview, and one with no accepted certificate and no receipt', () => {
    expect(MembershipCheckPreviewResponse.safeParse(preview).success).toBe(true);
    expect(
      MembershipCheckPreviewResponse.safeParse({
        ...preview,
        expected_live_review_id: null,
        date_of_death: null,
        fee_paid_on: null,
        fee_receipt_found: false,
        fee_outcome: null,
      }).success,
    ).toBe(true);
  });

  it('⛔ the preview carries ⛔ name, ⛔ date of birth and ⛔ note (.strict())', () => {
    for (const key of ['name', 'date_of_birth', 'note']) {
      expect(MembershipCheckPreviewResponse.safeParse({ ...preview, [key]: 'x' }).success, key).toBe(false);
    }
  });

  it('the console section', () => {
    expect(
      MembershipCheckGateStatus.safeParse({ available: true, passed: false, reason: 'fee_after_death', viewer: { canCheckMembership: true } }).success,
    ).toBe(true);
    expect(MembershipCheckGateStatus.safeParse({ available: true, passed: true, reason: null, viewer: {} }).success).toBe(false);
  });
});

// ── Story 6.39 Task 8 — what the family is told (`2026-11-21-473` Q3 B, Q4 B; `-474` items 4–5) ─────────────────────
describe('Story 6.39 — the two member-read fields the Panel\'s ruling adds', () => {
  const appeal = {
    claim_case_id: '00000000-0000-4000-8000-000000000001',
    claim_state: 'denied',
    can_initiate: true,
    appeal_status: null,
    current_stage: null,
    appeal_exhausted: false,
    closed_no_response: false,
    refusal_reason: 'not_a_member_when_died',
  };
  it('AC16 — `refusal_reason` is REQUIRED, nullable, and ONE closed value — ⛔ the reason code', () => {
    expect(MemberAppealStatusResponse.safeParse(appeal).success).toBe(true);
    expect(MemberAppealStatusResponse.safeParse({ ...appeal, refusal_reason: null }).success).toBe(true);
    for (const leak of ['fee_paid_after_death', 'post_death_nominee_change', 'other']) {
      expect(MemberAppealStatusResponse.safeParse({ ...appeal, refusal_reason: leak }).success, leak).toBe(false);
    }
    const without: Record<string, unknown> = { ...appeal };
    delete without['refusal_reason'];
    expect(MemberAppealStatusResponse.safeParse(without).success).toBe(false);
  });

  it('AC17 — `identity_check_waiting` is a REQUIRED boolean — ⛔ the gate\'s reason', () => {
    const read = {
      status: 'accepted',
      replacement_reason: null,
      replacement_allowed: false,
      upload_allowed: false,
      certificate_token: null,
      claim_live: true,
      reassurance: null,
      closed_no_response: false,
      refile_requires_confirmation: false,
      claim_closed: false,
      identity_check_waiting: true,
    };
    expect(MemberDeathCertificateStatusResponse.safeParse(read).success).toBe(true);
    expect(MemberDeathCertificateStatusResponse.safeParse({ ...read, identity_check_waiting: 'identity_not_confirmed' }).success).toBe(false);
    const without: Record<string, unknown> = { ...read };
    delete without['identity_check_waiting'];
    expect(MemberDeathCertificateStatusResponse.safeParse(without).success).toBe(false);
  });
});
