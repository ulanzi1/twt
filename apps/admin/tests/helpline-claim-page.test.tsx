// `<HelplineClaimPage>` container tests — Story 6.3 code-review follow-up.
//
// The container had zero test coverage before this review pass (Blind Hunter finding): all the
// orchestration state lived here untested. Covers the review fixes:
//   · reselecting a different member from the disambiguation list resets the identity/nominee
//     confirmation gate (was: state carried over, bypassing AC2's hard gate);
//   · confirming identity read-back / escalating fires the new operator-event audit call
//     (was: both were pure local state with zero audit trail — AC4);
//   · the relationship select has no default — submit stays disabled until the operator
//     explicitly chooses one (was: silently defaulted to 'spouse').
//
// The api client module is mocked (mirrors niyamavali-page.test.tsx); the real hooks + Query
// cache are exercised via `renderWithClient`.

import type { MemberSearchResultItem } from '@twt/contracts';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import * as api from '../src/api/client.js';
import { HelplineClaimPage } from '../src/modules/helpline-claims/HelplineClaimPage.js';
import { renderWithClient } from './_helpers.js';

const MEMBER_A: MemberSearchResultItem = {
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

const MEMBER_B: MemberSearchResultItem = {
  ...MEMBER_A,
  memberId: '22222222-2222-2222-2222-222222222222',
  name: 'Bina Kaur',
  maskedMobile: '+91·····8899',
};

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    searchMembers: vi.fn(async () => ({ results: [MEMBER_A, MEMBER_B] })),
    initiateHelplineClaim: vi.fn(async () => ({
      claimCaseId: '33333333-3333-3333-3333-333333333333',
      state: 'intake_pending',
      created: true,
    })),
    recordHelplineOperatorEvent: vi.fn(async () => ({ recorded: true })),
  };
});

async function searchAndGetBothResults(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.selectOptions(screen.getByLabelText('Search by'), 'pariwar');
  await user.click(screen.getByTestId('member-search-submit'));
  await screen.findByTestId(`member-row-${MEMBER_A.memberId}`);
  await screen.findByTestId(`member-row-${MEMBER_B.memberId}`);
}

describe('<HelplineClaimPage> — selection-reset safety gate (Review Finding)', () => {
  it('does NOT carry an identity confirmation over when the operator switches to a different member', async () => {
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await searchAndGetBothResults(user);

    // Two matches — nothing auto-selected. Pick member A, confirm identity.
    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));
    expect(screen.getByTestId('readback-confirm-identity')).toBeChecked();

    // Switch to member B WITHOUT a new search — the confirmation must NOT carry over.
    await user.click(screen.getByTestId(`member-row-${MEMBER_B.memberId}`));
    expect(screen.getByTestId('readback-confirm-identity')).not.toBeChecked();
    expect(screen.getByTestId('helpline-submit-intake')).toBeDisabled();
  });

  it('resets a pending step-up panel and the result banner when switching members', async () => {
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await searchAndGetBothResults(user);

    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));
    await user.selectOptions(screen.getByTestId('helpline-relationship'), 'spouse');
    await user.click(screen.getByTestId('helpline-submit-intake'));
    await screen.findByTestId('helpline-intake-result');

    // Switching to a different member after a completed filing must clear the stale result.
    await user.click(screen.getByTestId(`member-row-${MEMBER_B.memberId}`));
    expect(screen.queryByTestId('helpline-intake-result')).not.toBeInTheDocument();
  });
});

describe('<HelplineClaimPage> — operator-event audit wiring (Review Finding, AC4)', () => {
  it('records a readback_confirmed audit line when identity is confirmed', async () => {
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await searchAndGetBothResults(user);

    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));

    await waitFor(() =>
      expect(api.recordHelplineOperatorEvent).toHaveBeenCalledWith(
        '99999999-9999-9999-9999-999999999999',
        expect.objectContaining({ deceasedMemberId: MEMBER_A.memberId, event: 'readback_confirmed' }),
      ),
    );
  });

  it('records an escalated audit line when the operator escalates', async () => {
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await searchAndGetBothResults(user);

    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('helpline-escalate'));

    await waitFor(() =>
      expect(api.recordHelplineOperatorEvent).toHaveBeenCalledWith(
        '99999999-9999-9999-9999-999999999999',
        expect.objectContaining({ deceasedMemberId: MEMBER_A.memberId, event: 'escalated' }),
      ),
    );
    expect(screen.getByTestId('helpline-escalated-note')).toBeInTheDocument();
  });

  it('does NOT block submit on the operator-event call — intake still fires (best-effort audit)', async () => {
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await searchAndGetBothResults(user);

    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));
    await user.selectOptions(screen.getByTestId('helpline-relationship'), 'spouse');
    await user.click(screen.getByTestId('helpline-submit-intake'));

    await waitFor(() =>
      expect(api.initiateHelplineClaim).toHaveBeenCalledWith(
        '99999999-9999-9999-9999-999999999999',
        expect.objectContaining({ identityReadBackConfirmed: true, relationship: 'spouse' }),
      ),
    );
  });
});

describe('<HelplineClaimPage> — explicit relationship choice (Review Finding)', () => {
  it('keeps submit disabled until the operator explicitly picks a relationship', async () => {
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await searchAndGetBothResults(user);

    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));
    // Identity confirmed but relationship never touched — must still be disabled.
    expect(screen.getByTestId('helpline-submit-intake')).toBeDisabled();

    await user.selectOptions(screen.getByTestId('helpline-relationship'), 'child');
    expect(screen.getByTestId('helpline-submit-intake')).toBeEnabled();
  });
});
