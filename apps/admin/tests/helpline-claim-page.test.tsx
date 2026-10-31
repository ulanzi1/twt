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

import { CLAIM_INTAKE_REFUSAL_REASONS, type MemberSearchResultItem } from '@twt/contracts';
import { act, screen, waitFor } from '@testing-library/react';
import { focusManager } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import * as api from '../src/api/client.js';
import { HelplineClaimPage } from '../src/modules/helpline-claims/HelplineClaimPage.js';
import { resolveEn } from '../src/modules/helpline-claims/i18n-en.js';
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
    // The step-up round trip — only the lock/unlock tests (code review 2026-09-23) drive it.
    requestStepUp: vi.fn(async () => ({})),
    verifyStepUp: vi.fn(async () => ({})),
    getHelplinePeerRequests: vi.fn(async () => ({ items: [] })),
    saveHelplinePeerAnswer: vi.fn(async () => ({ answers: [] })),
  };
});

async function searchAndGetBothResults(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.selectOptions(screen.getByLabelText('Search by'), 'pariwar');
  await user.click(screen.getByTestId('member-search-submit'));
  await screen.findByTestId(`member-row-${MEMBER_A.memberId}`);
  await screen.findByTestId(`member-row-${MEMBER_B.memberId}`);
}

describe('<HelplineClaimPage> — selection-reset safety gate (Review Finding)', () => {
  it('keeps the caller and identity confirmation while peer answers are queued', async () => {
    const answers = [{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'now' }];
    const request = { pingId: '44444444-4444-4444-4444-444444444444', memberName: 'A member', answers, submitted: false, questionnaire: {
      versionId: 'v2', pages: [{ questions: [{ key: 'has_died', kind: 'single' as const, words: { en: 'Has the member died?', hi: '' }, options: ['died', 'not_died'].map(code => ({ code, words: { en: code, hi: '' }, exclusive: false })), optional: false, showIf: null }] }], closingNote: { en: 'Note', hi: '' }, thankYou: { en: 'Thanks', hi: '' },
    } };
    vi.mocked(api.getHelplinePeerRequests).mockResolvedValue({ items: [request] });
    let finish!: (value: { answers: typeof answers }) => void;
    vi.mocked(api.saveHelplinePeerAnswer).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const user = userEvent.setup();
    try {
      renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
      await searchAndGetBothResults(user);
      await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
      await user.click(screen.getByTestId('readback-confirm-identity'));
      await user.click(await screen.findByRole('radio', { name: 'not_died' }));
      await user.click(screen.getByTestId(`member-row-${MEMBER_B.memberId}`));
      expect(screen.getByText(/Please finish saving this caller/)).toHaveAttribute('role', 'alert');
      expect(screen.getByTestId('readback-confirm-identity')).toBeChecked();
      await user.click(screen.getByTestId('readback-confirm-identity'));
      expect(screen.getByTestId('readback-confirm-identity')).toBeChecked();
      await act(async () => finish({ answers: [{ ...answers[0]!, value: { codes: ['not_died'] } }] }));
      await waitFor(() => expect(screen.queryByText(/Please finish saving this caller/)).not.toBeInTheDocument());
      await user.click(screen.getByTestId(`member-row-${MEMBER_B.memberId}`));
      expect(screen.getByTestId('readback-confirm-identity')).not.toBeChecked();
    } finally { vi.mocked(api.getHelplinePeerRequests).mockResolvedValue({ items: [] }); }
    // ~1 s alone; ~5.6 s under `ci:local`'s `test (unit)` concurrency (the admin userEvent-driven RTL class
    // `scripts/ci-local.sh` already names) — the file's heaviest flow (search, select, confirm, a queued answer, two caller
    // changes). An explicit budget for THIS test only, ⛔ a global testTimeout (6.27a second-pass review, CI run 2026-10-13).
  }, 15_000);
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

  it('Story 6.28 (OP10) — a filing CLOSED at once (the death is paid on another claim) shows ONE staff line — ⛔ created / route / bank step', async () => {
    vi.mocked(api.initiateHelplineClaim).mockResolvedValueOnce({
      claimCaseId: '55555555-5555-5555-5555-555555555555', state: 'closed', created: true,
    } as never);
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await searchAndGetBothResults(user);
    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));
    await user.selectOptions(screen.getByTestId('helpline-relationship'), 'spouse');
    await user.click(screen.getByTestId('helpline-submit-intake'));
    expect(await screen.findByTestId('helpline-intake-result-closed')).toHaveTextContent('Closed — another claim for this death goes ahead.');
    expect(screen.queryByTestId('helpline-intake-result')).not.toBeInTheDocument();
    expect(screen.queryByTestId('helpline-route-for-verification')).not.toBeInTheDocument();
    expect(screen.queryByTestId('helpline-bank-required')).not.toBeInTheDocument();
  });

  it('⭐ code review round 2 — switching member or searching while an intake is IN FLIGHT is ignored: the filing\'s result is not lost', async () => {
    // `resetDownstreamState` calls `intake.reset()` (Story 6.38 DL9), which DETACHES the in-flight mutation — its per-call
    // `onSuccess` never runs. The claim is minted and the account frozen on the server; without this guard the console would
    // show nothing and the operator would have no case id to give the caller.
    let finish!: (value: Awaited<ReturnType<typeof api.initiateHelplineClaim>>) => void;
    vi.mocked(api.initiateHelplineClaim).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    // Rounds 4–5: the live region is in the page from the FIRST render, empty, and stays the SAME node through the hold and its
    // clearing — a region inserted (or re-inserted) already filled is often ⛔ announced.
    const region = screen.getByTestId('helpline-change-held');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toBeEmptyDOMElement();
    await searchAndGetBothResults(user);
    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));
    await user.selectOptions(screen.getByTestId('helpline-relationship'), 'spouse');
    await user.click(screen.getByTestId('helpline-submit-intake'));
    await waitFor(() => expect(api.initiateHelplineClaim).toHaveBeenCalled());
    expect(screen.getByTestId('helpline-change-held')).toBe(region);
    expect(region).toBeEmptyDOMElement();

    // In flight: choosing the OTHER member, or searching again, is ignored — the caller (A) and the confirmation stay.
    vi.mocked(api.searchMembers).mockClear();
    await user.click(screen.getByTestId(`member-row-${MEMBER_B.memberId}`));
    await user.click(screen.getByTestId('member-search-submit'));
    expect(screen.getByTestId('readback-confirm-identity')).toBeChecked();
    expect(api.searchMembers).not.toHaveBeenCalled();
    // …and the hold is SAID (round 3): a polite status line, ⛔ a click that does nothing and says nothing.
    const held = screen.getByTestId('helpline-change-held');
    expect(held).toBe(region); // the text changed IN PLACE — ⛔ a remount
    expect(held).toHaveTextContent('The claim is still being filed for this caller');

    await act(async () => finish({ claimCaseId: '66666666-6666-6666-6666-666666666666', state: 'intake_pending', created: true } as never));
    expect(await screen.findByTestId('helpline-intake-result')).toBeInTheDocument();
    expect(screen.getByTestId('helpline-change-held')).toBe(region); // cleared once the filing settled — the SAME region stays
    expect(region).toBeEmptyDOMElement();

    // And once it has settled the operator is free to change caller again (the guard is for the in-flight window only).
    await user.click(screen.getByTestId(`member-row-${MEMBER_B.memberId}`));
    expect(screen.queryByTestId('helpline-intake-result')).not.toBeInTheDocument();
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

  // ─── code review 2026-09-23: bullet 974's two changes were CLOSED on typecheck alone ─────────

  it('⭐ while a step-up is owed ONLY Save is blocked — the inputs stay editable — and verify unblocks it', async () => {
    const user = userEvent.setup();
    vi.mocked(api.recordHelplineNomineeBank).mockRejectedValueOnce(
      new api.ApiError(403, 'auth.step_up_required', 'step up required'),
    );
    await fileAClaim(user);
    await fillBothAccounts(user);
    // ⛔ NON-VACUITY: Save is enabled before the 403.
    expect(screen.getByTestId('helpline-bank-submit')).toBeEnabled();
    await user.click(screen.getByTestId('helpline-bank-submit'));
    await screen.findByTestId('helpline-stepup');

    // A second Save cannot race the elevation…
    await waitFor(() => expect(screen.getByTestId('helpline-bank-submit')).toBeDisabled());
    // …but the operator can still fix a typo while the OTP arrives.
    expect(screen.getByTestId('helpline-bank-holder-1')).toBeEnabled();
    expect(screen.getByTestId('helpline-bank-number-2')).toBeEnabled();

    await user.click(screen.getByTestId('helpline-stepup-request'));
    await user.type(await screen.findByTestId('helpline-stepup-otp'), '123456');
    await user.click(screen.getByTestId('helpline-stepup-verify'));

    await waitFor(() => expect(screen.queryByTestId('helpline-stepup')).not.toBeInTheDocument());
    expect(screen.getByTestId('helpline-bank-submit'), 'Save stayed blocked after elevation').toBeEnabled();
  });

  it('⛔ a STALE bank-save 403 from claim A does NOT raise the step-up panel on claim B', async () => {
    const user = userEvent.setup();
    let rejectA!: (err: unknown) => void;
    vi.mocked(api.recordHelplineNomineeBank).mockImplementationOnce(
      () => new Promise((_resolve, reject) => { rejectA = reject; }),
    );
    await fileAClaim(user);
    await fillBothAccounts(user);
    await user.click(screen.getByTestId('helpline-bank-submit'));
    await waitFor(() => expect(api.recordHelplineNomineeBank).toHaveBeenCalled());

    // The operator moves on to a DIFFERENT claim while A's save is still in flight.
    vi.mocked(api.initiateHelplineClaim).mockResolvedValueOnce({
      claimCaseId: '44444444-4444-4444-4444-444444444444',
      state: 'intake_pending',
      created: true,
    } as Awaited<ReturnType<typeof api.initiateHelplineClaim>>);
    await user.click(screen.getByTestId(`member-row-${MEMBER_B.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));
    await user.selectOptions(screen.getByTestId('helpline-relationship'), 'spouse');
    await user.click(screen.getByTestId('helpline-submit-intake'));
    await screen.findByTestId('helpline-intake-result');

    // A's request now settles — with the step-up signal that belonged to A.
    rejectA(new api.ApiError(403, 'auth.step_up_required', 'step up required'));
    // Let the rejection propagate through the mutation and the page's catch.
    await new Promise((r) => setTimeout(r, 50));

    expect(
      screen.queryByTestId('helpline-stepup'),
      "claim A's stale 403 raised the step-up panel on claim B",
    ).not.toBeInTheDocument();
  });
});

describe('<HelplineClaimPage> — an unresolved bank-status read is ⛔ NOT "nothing on file" (code review 2026-09-23b)', () => {
  async function fileClaimForA(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await searchAndGetBothResults(user);
    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));
    await user.selectOptions(screen.getByTestId('helpline-relationship'), 'spouse');
    await user.click(screen.getByTestId('helpline-submit-intake'));
    await screen.findByTestId('helpline-intake-result');
  }

  it('⛔ a FAILED status read shows an alert — ⛔ no first-entry form, ⛔ no "needs both accounts" hint', async () => {
    // ⚠ The defect: `bankRecorded` read `false` on an error, so the card offered the first-entry
    // form with no correction-reason field for a claim that may already hold two accounts.
    vi.mocked(api.getNomineeBankStatusHelpline).mockRejectedValueOnce(new Error('503'));
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await fileClaimForA(user);

    const alert = await screen.findByTestId('helpline-bank-status-error');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(screen.queryByTestId('helpline-bank-submit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('helpline-bank-required')).not.toBeInTheDocument();
  });

  it('⭐ while the status read is in flight the card says so — and the form arrives once it resolves', async () => {
    let resolve!: (v: { accounts: never[]; correctionNeeded: boolean }) => void;
    vi.mocked(api.getNomineeBankStatusHelpline).mockImplementationOnce(
      () => new Promise((r) => (resolve = r as typeof resolve)) as never,
    );
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await fileClaimForA(user);

    expect(await screen.findByTestId('helpline-bank-status-loading')).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('helpline-bank-required')).not.toBeInTheDocument();
    resolve({ accounts: [], correctionNeeded: false });
    // ⭐ NON-VACUITY: the empty-accounts answer, once KNOWN, does show the hint.
    expect(await screen.findByTestId('helpline-bank-required')).toBeInTheDocument();
    expect(screen.queryByTestId('helpline-bank-status-loading')).not.toBeInTheDocument();
  });
});

describe('<HelplineClaimPage> — a failed REFRESH keeps the card and what was typed (code review 2026-09-23c)', () => {
  async function fileClaimForA(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await searchAndGetBothResults(user);
    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));
    await user.selectOptions(screen.getByTestId('helpline-relationship'), 'spouse');
    await user.click(screen.getByTestId('helpline-submit-intake'));
    await screen.findByTestId('helpline-intake-result');
  }

  it('⛔ a window-focus refetch that FAILS does NOT unmount the card — the typed holder name survives, with a Retry beside it', async () => {
    // ⚠ The defect: known was `isSuccess`, which a failed REFETCH flips to false while `data` stays —
    // so the card was swapped for an error line and every typed account number was lost.
    vi.mocked(api.getNomineeBankStatusHelpline)
      .mockResolvedValueOnce({ accounts: [], correctionNeeded: false } as never)
      .mockRejectedValueOnce(new Error('503'));
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await fileClaimForA(user);
    const holder = await screen.findByTestId('helpline-bank-holder-1');
    await user.type(holder, 'Rani Devi');

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    expect(await screen.findByTestId('helpline-bank-status-refresh-error')).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId('helpline-bank-holder-1')).toHaveValue('Rani Devi');
    expect(screen.queryByTestId('helpline-bank-status-error')).not.toBeInTheDocument();
    act(() => focusManager.setFocused(undefined));
  });

  it('⭐ a FIRST read that fails offers Retry — ⛔ never "Reload" — and Retry reads the status again', async () => {
    vi.mocked(api.getNomineeBankStatusHelpline)
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValueOnce({ accounts: [], correctionNeeded: false } as never);
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await fileClaimForA(user);
    const alert = await screen.findByTestId('helpline-bank-status-error');
    expect(alert.textContent?.toLowerCase()).not.toContain('reload');
    await user.click(screen.getByTestId('helpline-bank-status-retry'));
    expect(await screen.findByTestId('helpline-bank-holder-1')).toBeInTheDocument();
  });
});

// ── Story 6.38 (AC9, DL9; `2026-10-30-423` reading 3, `2026-10-31-424` Q3 B) — the operator is told WHY the claim door refused ─
describe('<HelplineClaimPage> — the claim door refusal (Story 6.38)', () => {
  const TELL = "If the details are right, tell the caller: the person was not a member of the Trust when they died, so a claim cannot be filed.";

  async function submitFor(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await searchAndGetBothResults(user);
    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));
    await user.selectOptions(screen.getByTestId('helpline-relationship'), 'spouse');
    await user.click(screen.getByTestId('helpline-submit-intake'));
  }

  const REASON_LINES: ReadonlyArray<readonly [string, string]> = [
    ['not_joined', 'This person signed up but never finished joining — their identity check was not done. A claim cannot be filed. Read back to the caller the member ID or mobile number you searched with, to check it.'],
    ['left', 'This member had left the Trust. A claim cannot be filed. Read back to the caller the member ID or mobile number you searched with, to check it.'],
    ['removed', 'This member had been removed from the Trust. A claim cannot be filed. Read back to the caller the member ID or mobile number you searched with, to check it.'],
    ['erased', "This member's record was erased at their request. A claim cannot be filed. Read back to the caller the member ID or mobile number you searched with, to check it."],
    ['not_paid', 'This person gave their details but never paid the joining fee. A claim cannot be filed. Read back to the caller the member ID or mobile number you searched with, to check it.'],
  ];

  it('⭐ the exact-line cases below cover EXACTLY the contracts tuple, and every reason in it has an operator line', () => {
    // The cases are written out so each line is asserted verbatim — which is why they can drift from the tuple. A sixth reason
    // added to `CLAIM_INTAKE_REFUSAL_REASONS` with no admin line would render as a raw key (`resolveEn` returns the KEY when
    // it is missing) on the operator's console; it fails HERE instead.
    expect(REASON_LINES.map(([reason]) => reason).sort()).toEqual([...CLAIM_INTAKE_REFUSAL_REASONS].sort());
    for (const reason of CLAIM_INTAKE_REFUSAL_REASONS) {
      const key = `helpline.intake.refused.${reason}`;
      expect(resolveEn(key), key).not.toBe(key);
    }
  });

  it.each(REASON_LINES)('a 409 claim.intake_refused (%s) shows that reason\'s EXACT line + the general line to tell the caller, in the ONE alert', async (reason, line) => {
    vi.mocked(api.initiateHelplineClaim).mockRejectedValueOnce(
      new api.ApiError(409, 'claim.intake_refused', 'A claim cannot be filed for this member', { reason }),
    );
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await submitFor(user);
    // ⚠ The page holds several alert regions; the intake's is the ONE whose text is the line (exact — `resolveEn` returns
    // the KEY when a key is missing, so "something rendered" proves nothing).
    const alert = await screen.findByText(`${line} ${TELL}`);
    expect(alert).toHaveAttribute('role', 'alert');
    expect(document.body.textContent).not.toContain('claim.intake_refused');
    expect(document.body.textContent).not.toContain('helpline.intake.refused');
    expect(screen.queryByTestId('helpline-intake-result')).not.toBeInTheDocument();
  });

  it.each([
    ['an UNKNOWN reason', new api.ApiError(409, 'claim.intake_refused', 'A claim cannot be filed for this member', { reason: 'suspended' })],
    ['⛔ details', new api.ApiError(409, 'claim.intake_refused', 'A claim cannot be filed for this member')],
    ['another code', new api.ApiError(409, 'claim.something_else', 'Something else went wrong')],
  ])('%s falls back to today\'s server message (⛔ a raw code, ⛔ an unmapped key)', async (_l, err) => {
    vi.mocked(api.initiateHelplineClaim).mockRejectedValueOnce(err);
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await submitFor(user);
    const alert = await screen.findByText(err.message);
    expect(alert).toHaveAttribute('role', 'alert');
    expect(document.body.textContent).not.toContain('helpline.intake.refused');
    expect(document.body.textContent).not.toContain('tell the caller');
  });

  it('after a refusal for member A, selecting member B or searching again shows ⛔ refusal line', async () => {
    vi.mocked(api.initiateHelplineClaim).mockRejectedValueOnce(
      new api.ApiError(409, 'claim.intake_refused', 'A claim cannot be filed for this member', { reason: 'left' }),
    );
    const user = userEvent.setup();
    renderWithClient(<HelplineClaimPage pariwarId="99999999-9999-9999-9999-999999999999" />);
    await submitFor(user);
    expect(await screen.findByText(/had left the Trust/)).toHaveAttribute('role', 'alert');
    await user.click(screen.getByTestId(`member-row-${MEMBER_B.memberId}`));
    expect(screen.queryByText(/had left the Trust/)).not.toBeInTheDocument();

    vi.mocked(api.initiateHelplineClaim).mockRejectedValueOnce(
      new api.ApiError(409, 'claim.intake_refused', 'A claim cannot be filed for this member', { reason: 'removed' }),
    );
    await user.click(screen.getByTestId(`member-row-${MEMBER_A.memberId}`));
    await user.click(screen.getByTestId('readback-confirm-identity'));
    await user.selectOptions(screen.getByTestId('helpline-relationship'), 'spouse');
    await user.click(screen.getByTestId('helpline-submit-intake'));
    expect(await screen.findByText(/had been removed/)).toHaveAttribute('role', 'alert');
    await user.click(screen.getByTestId('member-search-submit'));
    await waitFor(() => expect(screen.queryByText(/had been removed/)).not.toBeInTheDocument());
  });
});
