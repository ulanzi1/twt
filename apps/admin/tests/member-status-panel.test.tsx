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
    // Story 10.17 — the ROSTER predicate (this panel renders COVERAGE and never reads it).
    isAssignable: true,
    lockInStatus: { daysAtJoin: 90, unlockDate: '2026-01-01T00:00:00.000Z', state: 'unlocked' },
    vyawasthaShulkStatus: {
      paidThrough: '2027-01-01T00:00:00.000Z',
      daysUntilLapse: 180,
      inRenewalGrace: false,
      graceRemainingDays: null,
    },
    contributionHistorySummary: { status: 'producer_unavailable', producer: 'story-10-24' },
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
  contributionSection: { status: 'producer_unavailable', producer: 'story-10-24' },
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

  it('renders the contribution GAP as explicit prose, never an empty grid (D2)', () => {
    // Story 10.24 changed this copy: the producer now EXISTS, so the sentinel no longer promises a
    // future epic — reaching it means THIS member's history could not be derived. The invariant under
    // test is unchanged and is the one that matters: an honest gap renders as words, never as blank.
    render(<MemberStatusPanel payload={payload()} identity={identity} />);
    const section = screen.getByTestId('section-contribution');
    expect(section).toHaveTextContent(/could not be derived/i);
    expect(section.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it('renders the PRODUCED contribution facts on the ok arm (Story 10.24 AC5/AC8)', () => {
    // The arm that was unreachable before 10.24. `in_lapse: false` ⇒ the neutral "on record" copy —
    // this panel OBSERVES standing, so a contribution history is never rendered as a verdict.
    render(
      <MemberStatusPanel
        payload={payload({
          contributionHistorySummary: {
            status: 'ok',
            facts: {
              'contribution.total_count': 12,
              'contribution.ever_contributed': true,
              'contribution.months_since_last': 2,
              'contribution.skips_current_year': 0,
              'contribution.in_lapse': false,
              // Story 10.25 — the sixth supplied fact. The `story-10-25` hold entry is GONE from
              // `heldFacts` because that producer shipped; only the 10.26 hold remains.
              'contribution.r7a_restorations_used': 0,
            },
            lapseSince: null,
            heldFacts: [
              { key: 'contribution.personal_event_excuse_claimed', producer: 'story-10-26' },
            ],
            restorationPackage: { status: 'no_consecutive_requirement', clauseId: null },
          },
        })}
        identity={identity}
      />,
    );
    const section = screen.getByTestId('section-contribution');
    expect(section).toHaveTextContent(/on record/i);
    expect(section).not.toHaveTextContent(/could not be derived/i);
  });

  it('renders the LAPSE copy when the produced facts show a missed cycle (Story 10.24)', () => {
    render(
      <MemberStatusPanel
        payload={payload({
          contributionHistorySummary: {
            status: 'ok',
            facts: {
              'contribution.total_count': 11,
              'contribution.ever_contributed': true,
              'contribution.months_since_last': 7,
              'contribution.skips_current_year': 2,
              'contribution.in_lapse': true,
              'contribution.r7a_restorations_used': 1,
            },
            lapseSince: '2026-03-15T00:00:00.000Z',
            heldFacts: [],
            // A member in lapse under R7(C): five consecutive contributions, none taken yet.
            restorationPackage: { status: 'ok', remaining: 5, required: 5 },
          },
        })}
        identity={identity}
      />,
    );
    expect(screen.getByTestId('section-contribution')).toHaveTextContent(/missed a cycle|missed cycle/i);
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
