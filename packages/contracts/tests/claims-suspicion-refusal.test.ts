// Story 6.24a (`2026-10-07-292` RF4, RF12, RF14) — the wire changes, pinned: the `closed` appeal-journey status in
// LOCKSTEP with the domain tuple (contracts tests MAY import domain), the `closed` family status and the `claim_closed`
// routing bit on the member's status read (both REQUIRED, `.strict()`), the helpline appeal screen's response, and the
// admin case read's 90-day field.

import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  AdminAppealCaseResponse,
  AppealJourneyStatus,
  DeathCertificateFamilyStatus,
  HelplineAppealClaimsResponse,
  HelplineAppealEligibility,
  MemberDeathCertificateStatusResponse,
} from '../src/claims/index.js';

describe('Story 6.24a — the wire changes', () => {
  it('LOCKSTEP — wire AppealJourneyStatus === domain APPEAL_JOURNEY_STATUSES (incl. `closed`)', () => {
    expect([...AppealJourneyStatus.options].sort()).toEqual([...claim.APPEAL_JOURNEY_STATUSES].sort());
    expect(AppealJourneyStatus.options).toContain('closed');
  });

  it('the family status carries `closed`; the member read REQUIRES `claim_closed` (strict)', () => {
    expect(DeathCertificateFamilyStatus.options).toContain('closed');
    const read = {
      status: 'closed',
      replacement_reason: null,
      replacement_allowed: false,
      upload_allowed: false,
      certificate_token: null,
      claim_live: false,
      reassurance: null,
      closed_no_response: false,
      refile_requires_confirmation: false,
      claim_closed: true,
    };
    expect(MemberDeathCertificateStatusResponse.safeParse(read).success).toBe(true);
    const without: Record<string, unknown> = { ...read };
    delete without['claim_closed'];
    expect(MemberDeathCertificateStatusResponse.safeParse(without).success).toBe(false);
    expect(MemberDeathCertificateStatusResponse.safeParse({ ...read, reason: 'suspicion' }).success).toBe(false);
  });

  it('LOCKSTEP — wire HelplineAppealEligibility === domain HELPLINE_APPEAL_ELIGIBILITY_VALUES', () => {
    expect([...HelplineAppealEligibility.options].sort()).toEqual([...claim.HELPLINE_APPEAL_ELIGIBILITY_VALUES].sort());
  });

  it('the helpline appeal response — a closed eligibility set, a nullable date, ⛔ not an extra field (strict)', () => {
    const row = {
      claim_case_id: '11111111-1111-4111-8111-111111111111',
      claim_state: 'denied',
      created_at: '2026-10-01T00:00:00.000Z',
      eligibility: 'can_appeal',
      appeal_until: '2026-12-30',
    };
    const ok = { member_id: '22222222-2222-4222-8222-222222222222', claims: [row, { ...row, appeal_until: null }] };
    expect(HelplineAppealClaimsResponse.safeParse(ok).success).toBe(true);
    expect(HelplineAppealClaimsResponse.safeParse({ ...ok, claims: [{ ...row, name: 'X' }] }).success).toBe(false);
    expect(HelplineAppealClaimsResponse.safeParse({ ...ok, claims: [{ ...row, eligibility: 'refused' }] }).success).toBe(false);
  });

  it('the admin case read REQUIRES `suspicion_appeal_limit` (nullable)', () => {
    const base = { claim_case_id: '11111111-1111-4111-8111-111111111111', claim_state: 'denied', journey: null, session: null, votes: [], tally: null, sla: null };
    expect(AdminAppealCaseResponse.safeParse({ ...base, suspicion_appeal_limit: null }).success).toBe(true);
    expect(AdminAppealCaseResponse.safeParse({ ...base, suspicion_appeal_limit: { appeal_until: '2026-12-30', passed: false } }).success).toBe(true);
    expect(AdminAppealCaseResponse.safeParse(base).success).toBe(false);
  });
});
