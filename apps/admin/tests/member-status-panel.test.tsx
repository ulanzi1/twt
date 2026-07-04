// Admin `<MemberStatusPanel>` render tests (Story 4.7, Task 5; AC1 + AC3). Pure render of the shared
// view-model (no router/query context — the panel takes the payload as a prop). Asserts the labelled-
// section structure, the D2 "not yet available" contribution rendering, identity header (admin variant),
// the appeal CTA on failure states, and that i18n keys resolve to English prose (never raw codes).

import type { MemberSearchResultItem, MemberValidityPayloadDto } from '@twt/contracts';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MemberStatusPanel } from '../src/modules/member-status/MemberStatusPanel.js';

function payload(over: Partial<MemberValidityPayloadDto> = {}): MemberValidityPayloadDto {
  return {
    memberId: '11111111-1111-1111-1111-111111111111',
    evaluatedAt: '2026-07-04T00:00:00.000Z',
    ruleRegistryVersion: 'rrv-1',
    isValid: true,
    isActive: true,
    lockInStatus: { daysAtJoin: 90, unlockDate: '2026-01-01T00:00:00.000Z', state: 'unlocked' },
    vyawasthaShulkStatus: {
      paidThrough: '2027-01-01T00:00:00.000Z',
      daysUntilLapse: 180,
      inRenewalGrace: false,
      graceRemainingDays: null,
    },
    contributionHistorySummary: { status: 'producer_unavailable', producer: 'epic-8-9' },
    medicalDisclosureFlags: {
      hasDisclosureOnRecord: false,
      declaredConditionCount: null,
      imaListVersion: null,
      pendingConcealmentFlag: false,
    },
    retirementCoverage: { status: 'clause_unavailable' },
    specialFlags: [],
    applicableNiyamavaliClauses: [],
    provenanceTrace: [],
    validityPayloadHash: 'hash-1',
    ...over,
  };
}

const identity: MemberSearchResultItem = {
  memberId: '11111111-1111-1111-1111-111111111111',
  state: 'active',
  name: 'Asha Devi',
  maskedMobile: '+91·····4210',
  aadhaarMasked: 'XXXX1234',
  verificationStrength: 'aadhaar_kyc',
  nomineeSummary: [],
  contributionSection: { status: 'producer_unavailable', producer: 'epic-8-9' },
  claimSection: { status: 'producer_unavailable', producer: 'epic-6' },
};

describe('<MemberStatusPanel> (admin variant)', () => {
  it('renders the labelled panel + headline + identity header for the admin variant', () => {
    render(<MemberStatusPanel payload={payload()} identity={identity} />);
    expect(screen.getByRole('region', { name: /member status panel/i })).toBeInTheDocument();
    expect(screen.getByTestId('headline-status')).toHaveTextContent('Active');
    // Admin variant shows identity (AC1) — NOT suppressed like the member variant.
    const header = screen.getByTestId('identity-header');
    expect(within(header).getByText('Asha Devi')).toBeInTheDocument();
    expect(within(header).getByText('+91·····4210')).toBeInTheDocument();
  });

  it('renders the contribution section as "not yet available" prose, never an empty grid (D2)', () => {
    render(<MemberStatusPanel payload={payload()} identity={identity} />);
    const section = screen.getByTestId('section-contribution');
    expect(section).toHaveTextContent(/not yet available/i);
  });

  it('shows the concealment special-flags section + appeal CTA when the flag is set', () => {
    render(
      <MemberStatusPanel
        payload={payload({ specialFlags: ['concealment_review_required'] })}
        identity={identity}
      />,
    );
    const flags = screen.getByTestId('section-special-flags');
    expect(flags).toHaveTextContent(/concealment review required/i);
    expect(screen.getByTestId('appeal-cta')).toBeInTheDocument();
    expect(screen.getByTestId('headline-status')).toHaveTextContent(/suspended/i);
  });

  it('hides the appeal CTA for an active member', () => {
    render(<MemberStatusPanel payload={payload()} identity={identity} />);
    expect(screen.queryByTestId('appeal-cta')).not.toBeInTheDocument();
  });

  it('surfaces the lock-in policy clause deep-link when in lock-in', () => {
    render(
      <MemberStatusPanel
        payload={payload({
          isActive: false,
          lockInStatus: { daysAtJoin: 90, unlockDate: '2027-01-01T00:00:00.000Z', state: 'in-lock-in' },
          applicableNiyamavaliClauses: [
            { clauseId: 'niy.lock-in.policy', clauseVersionId: 'cv9', outcome: 'in_lock_in', reasonCode: 'rule.lock_in' },
          ],
        })}
        identity={identity}
      />,
    );
    const lockIn = screen.getByTestId('section-lock-in');
    expect(within(lockIn).getByText(/niy\.lock-in\.policy/)).toBeInTheDocument();
  });
});
