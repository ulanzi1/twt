// <VerifierConsoleRoute> — the District Admin console's Story 6.18 wiring, MOUNTED (AC2, AC4, AC6, AC8).
//
// ⭐⭐ WHY MOUNT THE ROUTE. Every 6.18 behaviour on this console that is ⛔ NOT inside a pure component
// lives in the route: the AC8 badge on the disclosure toggle, the approve-blocked REASON table (AC4 +
// AC6 — which blocker is named), the name-check ERROR table, which error wins, and the on-demand /
// no-refetch posture of the names read. The component suites cannot see any of it, and before this
// file ⛔ no test did (code review 2026-09-20, bullet "the admin UI halves").
//
// The network is the only thing faked: `api/client.js` is mocked function-by-function, so the real
// hooks, the real QueryClient semantics and the real components all run.

import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NomineeNameCheckResponse, VerifierConsolePacket } from '@twt/contracts';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';

// ⭐ MUTABLE route params (2026-09-23c) — the claim-change test moves `claimCaseId` under a mounted
// route, the one thing a fixed mock could never show.
const routeParams = vi.hoisted(() => ({ claimCaseId: '11111111-1111-4111-8111-111111111111' }));
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ pariwarId: PARIWAR, claimCaseId: routeParams.claimCaseId }),
  useNavigate: () => vi.fn(),
}));

const getSession = vi.fn();
const getVerifierConsole = vi.fn();
const getNomineeNameCheck = vi.fn();
const postNomineeNameCheck = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: () => getSession(),
    getVerifierConsole: (p: string, c: string) => getVerifierConsole(p, c),
    getNomineeNameCheck: (p: string, c: string) => getNomineeNameCheck(p, c),
    postNomineeNameCheck: (p: string, c: string, b: unknown) => postNomineeNameCheck(p, c, b),
  };
});

const { VerifierConsoleRoute, nameCheckErrorMessage } =
  await import('../src/routes/VerifierConsoleRoute.js');
const { ApiError } = await import('../src/api/client.js');
const { verifierConsoleEn: t } = await import('../src/modules/claim-verification/index.js');

type NameStatus = VerifierConsolePacket['nomineeNameCheck'];

// ⭐ Every section the name check does ⛔ not own is in a non-present state: this suite is about the
// 6.18 wiring, and a smaller packet keeps a failure pointing at it.
const packet = (nomineeNameCheck: NameStatus): VerifierConsolePacket =>
  ({
    claimCaseId: CLAIM,
    pariwarId: PARIWAR,
    claimState: 'verifier_review',
    deceasedMemberId: '22222222-2222-4222-8222-222222222222',
    identity: { deceasedName: 'Suresh Patel', deceasedDateOfBirth: '1955-03-01' },
    validity: { status: 'unavailable' },
    concealment: { status: 'not_evaluated', detailVisibility: 'indicator_only' },
    documentReview: { status: 'unavailable' },
    peerMesh: { status: 'unavailable' },
    groundInspection: { status: 'empty' },
    priorVerifierComments: { status: 'not_available_yet' },
    recentPrecedents: { status: 'not_available_yet' },
    shepherd: { status: 'empty' },
    nomineeNameCheck,
  }) as VerifierConsolePacket;

const PASSING: NameStatus = {
  available: true,
  accountsComplete: true,
  currentAndPassing: true,
  differenceReasons: [],
};

const NAMES: NomineeNameCheckResponse = {
  claim_case_id: CLAIM,
  claim_state: 'verifier_review',
  deceased_member_id: '22222222-2222-4222-8222-222222222222',
  accounts: [
    {
      account_rank: 1,
      account_updated_at: '2026-09-20T10:00:00.000Z',
      holder_name: { state: 'readable', value: 'Rani Devi' },
      name_difference_note: null,
    },
    {
      account_rank: 2,
      account_updated_at: '2026-09-20T10:00:01.000Z',
      holder_name: { state: 'readable', value: 'R. Devi' },
      name_difference_note: null,
    },
  ],
  accounts_complete: true,
  declared_nominees: [
    {
      rank: 1,
      split_pct: 100,
      relationship: 'spouse',
      nominee_name: { state: 'readable', value: 'Rani Kumari' },
    },
  ],
  nominee_declaration_token: 'tok-1',
  nominee_declared_at: '2026-01-01T00:00:00.000Z',
  claim_filed_at: '2026-09-01T00:00:00.000Z',
  current_check: null,
  latest_check_is_stale: false,
  correction_return: null,
};

const mount = async (status: NameStatus): Promise<void> => {
  getVerifierConsole.mockResolvedValue({ packet: packet(status) });
  // ⚠ TanStack's OWN defaults (refetchOnWindowFocus: true), ⛔ not the app's cache-disabled client —
  // the refetch-on-focus test is only meaningful if the default would refetch.
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <VerifierConsoleRoute />
    </QueryClientProvider>,
  );
  await screen.findByTestId('name-check-disclosure');
};

beforeEach(() => {
  for (const f of [getSession, getVerifierConsole, getNomineeNameCheck, postNomineeNameCheck])
    f.mockReset();
  getSession.mockResolvedValue({
    userId: '33333333-3333-4333-8333-333333333333',
    nationalGrants: [],
  });
  getNomineeNameCheck.mockResolvedValue(NAMES);
});
afterEach(() => {
  routeParams.claimCaseId = CLAIM;
  focusManager.setFocused(undefined);
});

describe('<VerifierConsoleRoute> — AC8, the highlight on the District Admin’s console', () => {
  it('⭐ shows the reason LABELS on the disclosure toggle — from the console’s own read, with ⛔ no names decrypted', async () => {
    await mount({ ...PASSING, differenceReasons: ['married_name', 'initial'] });
    expect(screen.getByTestId('console-name-difference-flag')).toHaveTextContent(
      `${t.nameCheck.approvedWithDifference}: ${t.nameCheck.reasons.married_name}, ${t.nameCheck.reasons.initial}`,
    );
    expect(getNomineeNameCheck).not.toHaveBeenCalled();
  });

  it('⛔ NO flag when the passing check recorded no difference', async () => {
    await mount(PASSING);
    expect(screen.queryByTestId('console-name-difference-flag')).toBeNull();
  });
});

describe('<VerifierConsoleRoute> — AC4/AC6: approve names the ACTUAL blocker', () => {
  it('⭐ AC6 — two accounts missing ⇒ approve disabled, and the reason says the bank details are NEEDED', async () => {
    await mount({
      available: true,
      accountsComplete: false,
      currentAndPassing: false,
      differenceReasons: [],
    });
    expect(screen.getByTestId('action-approve')).toBeDisabled();
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(
      t.nameCheck.bankDetailsMissing,
    );
  });

  it('⛔ an UNREADABLE status is ⛔ NOT "bank details missing" — it says the status could not be read', async () => {
    // ⚠ The distinction the route's own comment insists on: a transient failure must never send a
    // District Admin to chase a family for documents already on file.
    await mount({
      available: false,
      accountsComplete: false,
      currentAndPassing: false,
      differenceReasons: [],
    });
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(
      t.nameCheck.statusUnavailable,
    );
    expect(screen.getByTestId('approve-blocked-reason')).not.toHaveTextContent(
      t.nameCheck.bankDetailsMissing,
    );
    expect(screen.getByTestId('console-name-check-unavailable')).toBeInTheDocument();
  });

  it('accounts on file but no current passing check ⇒ "record the check"', async () => {
    await mount({
      available: true,
      accountsComplete: true,
      currentAndPassing: false,
      differenceReasons: [],
    });
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(
      t.nameCheck.approveBlocked,
    );
  });

  it('⭐ a recorded does_not_match ⇒ "have it corrected" — ⚠ but ONLY once the names have been opened', async () => {
    // ⚠⚠ PINNED AS IT IS, ⛔ not as one might assume. The console's own packet carries
    // `currentAndPassing`, ⛔ not the verdicts, so the route can tell "sent back" from "never checked"
    // only from the on-demand names read. Before the disclosure is opened, a claim the District Admin
    // themselves sent back reads "record the check". Deliberate: widening the packet to carry the
    // verdict is a contract change this story did not make.
    getNomineeNameCheck.mockResolvedValue({
      ...NAMES,
      current_check: {
        checked_at: '2026-09-20T11:00:00.000Z',
        checked_by_actor_display: 'Kalpana Bharti',
        nominee_declaration_token: 'tok-1',
        passing: false,
        accounts: [
          {
            account_rank: 1,
            account_updated_at: '2026-09-20T10:00:00.000Z',
            verdict: 'does_not_match',
            clerical_reason: null,
          },
          {
            account_rank: 2,
            account_updated_at: '2026-09-20T10:00:01.000Z',
            verdict: 'matches',
            clerical_reason: null,
          },
        ],
      },
    });
    await mount({
      available: true,
      accountsComplete: true,
      currentAndPassing: false,
      differenceReasons: [],
    });
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(
      t.nameCheck.approveBlocked,
    );

    fireEvent.click(screen.getByTestId('name-check-disclosure'));
    await waitFor(() =>
      expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(
        t.nameCheck.approveBlockedSentBack,
      ),
    );
  });

  it('⭐ the positive control — a current passing check leaves approve ENABLED with no reason', async () => {
    await mount(PASSING);
    expect(screen.getByTestId('action-approve')).toBeEnabled();
    expect(screen.queryByTestId('approve-blocked-reason')).toBeNull();
  });
});

describe('<VerifierConsoleRoute> — AC2: the names read is ON DEMAND and does ⛔ not refetch itself', () => {
  it('⛔⛔ no names fetch on load; ONE fetch when the District Admin opens the disclosure', async () => {
    await mount(PASSING);
    expect(getNomineeNameCheck).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('name-check-disclosure'));
    expect(await screen.findByTestId('name-check-account-1')).toHaveTextContent('Rani Devi');
    expect(getNomineeNameCheck).toHaveBeenCalledTimes(1);
  });

  it('⛔⛔ a window FOCUS does ⛔ not re-read the names — each read is an audited Tier-1 decrypt', async () => {
    // `useNomineeNameCheck` sets `refetchOnWindowFocus: false`. Without it, alt-tabbing away and back
    // would decrypt a living nominee's name again and write an audit line saying somebody looked.
    await mount(PASSING);
    fireEvent.click(screen.getByTestId('name-check-disclosure'));
    await screen.findByTestId('name-check-account-1');
    const sessionReads = getSession.mock.calls.length;

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    // ⭐ NON-VACUITY: the focus event really fired — the session query (TanStack defaults) re-read.
    await waitFor(() => expect(getSession.mock.calls.length).toBeGreaterThan(sessionReads));
    expect(getNomineeNameCheck).toHaveBeenCalledTimes(1);
  });
});

describe('<VerifierConsoleRoute> — the name-check error table and which error WINS', () => {
  it('⭐ a stale-token 409 on the WRITE shows "read the names again" — and it wins over nothing else lingering', async () => {
    getNomineeNameCheck.mockResolvedValue(NAMES);
    postNomineeNameCheck.mockRejectedValue(new ApiError(409, 'nominee_name_check.stale', 'stale'));
    await mount({
      available: true,
      accountsComplete: true,
      currentAndPassing: false,
      differenceReasons: [],
    });
    fireEvent.click(screen.getByTestId('name-check-disclosure'));
    await screen.findByTestId('name-check-form');
    fireEvent.change(screen.getByTestId('name-check-verdict-1'), { target: { value: 'matches' } });
    fireEvent.change(screen.getByTestId('name-check-verdict-2'), { target: { value: 'matches' } });
    fireEvent.click(screen.getByTestId('name-check-submit'));
    expect(await screen.findByTestId('name-check-submit-error')).toHaveTextContent(
      t.nameCheck.errorStale,
    );
    // ⛔ And ⛔ never the DECISION table's wording — a check is not a verdict on the claim.
    expect(screen.getByTestId('name-check-submit-error')).not.toHaveTextContent(
      t.decision.submitError,
    );
  });

  it('⛔ the write error is NOT sticky — closing the disclosure clears it, and a reopen does ⛔ not show it over fresh names (2026-09-23b)', async () => {
    getNomineeNameCheck.mockResolvedValue(NAMES);
    postNomineeNameCheck.mockRejectedValue(new ApiError(409, 'nominee_name_check.stale', 'stale'));
    await mount({
      available: true,
      accountsComplete: true,
      currentAndPassing: false,
      differenceReasons: [],
    });
    fireEvent.click(screen.getByTestId('name-check-disclosure'));
    await screen.findByTestId('name-check-form');
    fireEvent.change(screen.getByTestId('name-check-verdict-1'), { target: { value: 'matches' } });
    fireEvent.change(screen.getByTestId('name-check-verdict-2'), { target: { value: 'matches' } });
    fireEvent.click(screen.getByTestId('name-check-submit'));
    // ⭐ NON-VACUITY: the error really was shown first.
    await screen.findByTestId('name-check-submit-error');

    fireEvent.click(screen.getByTestId('name-check-disclosure')); // close
    fireEvent.click(screen.getByTestId('name-check-disclosure')); // reopen
    await screen.findByTestId('name-check-form');
    expect(screen.queryByTestId('name-check-submit-error')).toBeNull();
  });

  it('a FAILED names read renders through the name-check table — a 403 says "no permission"', async () => {
    getNomineeNameCheck.mockRejectedValue(new ApiError(403, 'claim.forbidden', 'nope'));
    await mount(PASSING);
    fireEvent.click(screen.getByTestId('name-check-disclosure'));
    expect(await screen.findByTestId('name-check-error')).toHaveTextContent(
      t.nameCheck.errorForbidden,
    );
  });
});

describe('nameCheckErrorMessage — the table, row by row', () => {
  const cases: [string, number, string][] = [
    ['auth.step_up_required', 403, t.decision.stepUpRequired],
    ['admin.display_name_missing', 409, t.decision.displayNameMissing],
    ['nominee_name_check.stale', 409, t.nameCheck.errorStale],
    ['nominee_name_check.bank_details_required', 409, t.nameCheck.bankDetailsMissing],
    ['nominee_name_check.not_recordable', 409, t.nameCheck.checkNotRecordableHere],
    ['nominee_name_check.invalid', 400, t.nameCheck.errorInvalid],
    ['nominee_name_check.stream_conflict', 409, t.decision.decisionConflict],
    ['claim.forbidden', 403, t.nameCheck.errorForbidden],
    ['internal', 500, t.nameCheck.errorGeneric],
  ];
  it.each(cases)('%s (%i) → its own message', (code, status, expected) => {
    expect(nameCheckErrorMessage(new ApiError(status, code, 'x'))).toBe(expected);
  });

  it('⭐ a CODE beats the status — step-up on a 403 is ⛔ not "no permission"', () => {
    expect(nameCheckErrorMessage(new ApiError(403, 'auth.step_up_required', 'x'))).not.toBe(
      t.nameCheck.errorForbidden,
    );
  });

  it('a non-ApiError (network, a bug) → the generic line, ⛔ never a raw message', () => {
    expect(nameCheckErrorMessage(new Error('socket hang up'))).toBe(t.nameCheck.errorGeneric);
    expect(nameCheckErrorMessage(undefined)).toBe(t.nameCheck.errorGeneric);
  });
});

describe('<VerifierConsoleRoute> — the names are ⛔ never read for a claim nobody chose to look at (code review 2026-09-23c)', () => {
  const CLAIM_2 = '55555555-5555-4555-8555-555555555555';
  const PASS: NameStatus = {
    available: true,
    accountsComplete: true,
    currentAndPassing: true,
    differenceReasons: [],
  };

  it('⛔ a same-route claim change with the disclosure OPEN does ⛔ not fetch the next claim’s names — ⛔ not even once', async () => {
    getVerifierConsole.mockResolvedValue({ packet: packet(PASS) });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // ⚠ A FRESH element each render — re-passing the same element object lets React bail out, and the
    // route would never see the new params.
    const ui = () => (
      <QueryClientProvider client={qc}>
        <VerifierConsoleRoute />
      </QueryClientProvider>
    );
    const { rerender } = render(ui());
    fireEvent.click(await screen.findByTestId('name-check-disclosure'));
    expect(await screen.findByText('Rani Devi')).toBeInTheDocument();
    expect(getNomineeNameCheck).toHaveBeenCalledWith(PARIWAR, CLAIM);

    routeParams.claimCaseId = CLAIM_2;
    rerender(ui());
    // ⭐ The disclosure is CLOSED for the new claim, and its names were ⛔ never requested.
    await waitFor(() =>
      expect(screen.getByTestId('name-check-disclosure')).toHaveAttribute('aria-expanded', 'false'),
    );
    expect(getNomineeNameCheck).not.toHaveBeenCalledWith(PARIWAR, CLAIM_2);
    // …and the previous claim's decrypted names are gone from the cache, ⛔ not merely hidden.
    expect(qc.getQueryData(['nominee-name-check', PARIWAR, CLAIM])).toBeUndefined();
  });

  it('⛔ closing the console disclosure FORGETS the names — a reopen shows ⛔ no cached name while the new read is pending', async () => {
    getNomineeNameCheck.mockReset();
    getNomineeNameCheck
      .mockResolvedValueOnce(NAMES)
      .mockImplementationOnce(() => new Promise(() => {}));
    await mount(PASS);
    const toggle = screen.getByTestId('name-check-disclosure');
    fireEvent.click(toggle);
    expect(await screen.findByText('Rani Devi')).toBeInTheDocument();
    fireEvent.click(toggle); // close
    fireEvent.click(toggle); // reopen
    expect(await screen.findByTestId('name-check-loading')).toBeInTheDocument();
    expect(screen.queryByText('Rani Devi')).toBeNull();
    expect(getNomineeNameCheck).toHaveBeenCalledTimes(2);
  });

  it('⛔ a FAILED refetch shows the error ALONE — ⛔ never the old names beside it', async () => {
    await mount(PASS);
    fireEvent.click(screen.getByTestId('name-check-disclosure'));
    expect(await screen.findByText('Rani Devi')).toBeInTheDocument();
    getNomineeNameCheck.mockRejectedValue(new ApiError(503, 'internal', 'down'));
    // A focus refetch is disabled on this read by design, so force one the way a write's onError does.
    await act(async () => {
      fireEvent.change(await screen.findByTestId('name-check-verdict-1'), {
        target: { value: 'matches' },
      });
      fireEvent.change(screen.getByTestId('name-check-verdict-2'), {
        target: { value: 'matches' },
      });
      postNomineeNameCheck.mockRejectedValueOnce(
        new ApiError(409, 'nominee_name_check.stale', 'stale'),
      );
      fireEvent.click(screen.getByTestId('name-check-submit'));
    });
    // The POST's onError invalidates the names read, and that refetch fails.
    expect(await screen.findByTestId('name-check-error')).toBeInTheDocument();
    expect(screen.queryByText('Rani Devi')).toBeNull();
  });
});
