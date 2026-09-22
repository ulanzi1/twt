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
  contributionSection: { status: 'producer_unavailable', producer: 'story-10-24' },
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
    // Story 6.18 — the bank surface. Defaults are the happy path; the step-up tests below
    // override `recordHelplineNomineeBank` per-case with `mockRejectedValueOnce`.
    recordHelplineNomineeBank: vi.fn(async () => ({ recorded: true, accounts: 2 })),
    getNomineeBankStatusHelpline: vi.fn(async () => ({ accounts: [], correctionNeeded: false })),
    getNomineeNameCheck: vi.fn(async () => ({ accounts: [], nomineeNames: [] })),
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

// ── Story 6.18 (code review 2026-09-22) — THE BANK SAVE'S STEP-UP PATH ─────────────────────
//
// ⚠⚠ THE DEFECT THIS PINS WAS TWO BUGS THAT HID EACH OTHER, and either alone would have left the
// operator stuck. `POST …/nominee-bank` sits behind the SAME `stepUp` preHandler as the intake:
//   (1) ⛔ only the INTAKE's `onError` ever set `stepUpRequired`, so a 403 on the bank save fell
//       through to the card's generic error line as a RAW MESSAGE; and
//   (2) the shell rendered the panel on `stepUpRequired && result === null` — and the bank save is
//       reachable ⛔ ONLY once a result exists ⇒ the panel was STRUCTURALLY unreachable for it.
// ⚠ ⛔ Not a rare path: `STEP_UP_ELEVATED_MS` is 5 minutes, and typing two account numbers, two
// IFSCs and a difference note on a bereavement call takes longer than that more often than not.
describe('<HelplineClaimPage> — the bank save can ask for a step-up (Story 6.18)', () => {
  const PARIWAR = '99999999-9999-9999-9999-999999999999';

  /** File a claim so the bank card is reachable at all — the state the defect lived in. */
  async function fileAClaim(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    renderWithClient(<HelplineClaimPage pariwarId={PARIWAR} />);
    await searchAndGetBothResults(user);
    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));
    await user.selectOptions(screen.getByTestId('helpline-relationship'), 'spouse');
    await user.click(screen.getByTestId('helpline-submit-intake'));
    await screen.findByTestId('helpline-intake-result');
  }

  /** Fill both accounts with data that passes EVERY client-side guard, so `onSubmit` is reached.
   *  ⚠ Without this the card short-circuits in its own validator and the mutation is ⛔ never
   *  called — a test that clicked submit on an empty form would prove ⛔ nothing about the 403. */
  async function fillBothAccounts(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.type(await screen.findByTestId('helpline-bank-holder-1'), 'Asha Devi');
    await user.type(screen.getByTestId('helpline-bank-number-1'), '123456789012');
    await user.type(screen.getByTestId('helpline-bank-ifsc-1'), 'SBIN0001234');
    await user.type(screen.getByTestId('helpline-bank-holder-2'), 'Asha Devi');
    // ⭐ A DIFFERENT number — the card refuses the same one twice, by design.
    await user.type(screen.getByTestId('helpline-bank-number-2'), '987654321098');
    await user.type(screen.getByTestId('helpline-bank-ifsc-2'), 'HDFC0004321');
  }

  it('⭐⭐ surfaces the STEP-UP PANEL when the bank save 403s — ⛔ not a raw error string', async () => {
    const user = userEvent.setup();
    vi.mocked(api.recordHelplineNomineeBank).mockRejectedValueOnce(
      new api.ApiError(403, 'auth.step_up_required', 'step up required'),
    );
    await fileAClaim(user);

    // ⛔ NON-VACUITY: the panel is absent before the bank save asks for it, so its appearance
    // below is caused by THIS 403 and ⛔ not by the intake or by the initial render.
    expect(screen.queryByTestId('helpline-stepup')).not.toBeInTheDocument();

    await fillBothAccounts(user);
    await user.click(screen.getByTestId('helpline-bank-submit'));

    // ⭐ THE FIX, BOTH HALVES: the page recognised the code, and the shell is willing to render the
    // panel although `result !== null`.
    expect(
      await screen.findByTestId('helpline-stepup'),
      'the bank save 403 left the operator with no way to elevate',
    ).toBeInTheDocument();
    // ⭐ And the raw message is ⛔ NOT also shown — a step-up is a signal, ⛔ never a hard error.
    expect(screen.queryByText('step up required')).not.toBeInTheDocument();
  });

  it('⭐ a NON-step-up bank failure still shows its message, and ⛔ no panel', async () => {
    // ⚠ THE OTHER SIDE OF THE SAME BRANCH. Suppressing the error line for `auth.step_up_required`
    // must ⛔ not suppress it for anything else — a silent failure on a bank write would be worse
    // than the defect being fixed.
    const user = userEvent.setup();
    vi.mocked(api.recordHelplineNomineeBank).mockRejectedValueOnce(
      new api.ApiError(409, 'claim.not_collectable', 'this claim can no longer be edited'),
    );
    await fileAClaim(user);

    await fillBothAccounts(user);
    await user.click(screen.getByTestId('helpline-bank-submit'));

    expect(await screen.findByText('this claim can no longer be edited')).toBeInTheDocument();
    expect(screen.queryByTestId('helpline-stepup')).not.toBeInTheDocument();
  });

  it('⭐ a 403 with a DIFFERENT code still shows its message, and ⛔ no panel — isolates CODE from STATUS', async () => {
    // ⚠ ADDED 2026-09-22 (code review). The two tests above always vary HTTP status AND error code
    // together (403+`step_up_required`, 409+`not_collectable`), so neither proves WHICH ONE the
    // panel is actually gated on — an implementation that showed the panel for any bare 403,
    // whatever the code, would pass both. This isolates the variable: a 403 that is NOT the
    // step-up signal.
    const user = userEvent.setup();
    vi.mocked(api.recordHelplineNomineeBank).mockRejectedValueOnce(
      new api.ApiError(403, 'claim.forbidden', 'you do not have access to this claim'),
    );
    await fileAClaim(user);

    await fillBothAccounts(user);
    await user.click(screen.getByTestId('helpline-bank-submit'));

    expect(await screen.findByText('you do not have access to this claim')).toBeInTheDocument();
    expect(
      screen.queryByTestId('helpline-stepup'),
      'a 403 with a non-step-up code wrongly showed the step-up panel',
    ).not.toBeInTheDocument();
  });
});
