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
const postLateWarningReason = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: () => getSession(),
    getVerifierConsole: (p: string, c: string) => getVerifierConsole(p, c),
    getNomineeNameCheck: (p: string, c: string) => getNomineeNameCheck(p, c),
    postNomineeNameCheck: (p: string, c: string, b: unknown) => postNomineeNameCheck(p, c, b),
    postLateWarningReason: (p: string, c: string, b: unknown) => postLateWarningReason(p, c, b),
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
    // Story 6.21a (D7) — an ACCEPTED death certificate, so the approve gate reaches the NAME CHECK this suite
    // is about (the certificate is named first when it is not accepted — `death-certificate-review.test.tsx`).
    documentReview: {
      status: 'present',
      reviews: [
        {
          documentType: 'death_certificate',
          parityOutcome: 'match',
          verifierReviewRequired: false,
          ocrConfidence: 0.9,
          parityFlags: {},
          extracted: { deceasedName: null, dateOfBirth: null, dateOfDeath: null, issuingAuthority: null, certificateNumber: null },
          memberRecord: null,
          preview: { signedUrl: '', contentType: 'application/pdf' },
          review: {
            status: 'accepted',
            rejectionReason: null,
            registerCheck: 'matches',
            decidedByDisplay: 'Anita (District Admin)',
            decidedAt: '2026-09-25T06:00:00.000Z',
            liveReviewId: '00000000-0000-4000-8000-0000000000ac',
            certificateToken: '00000000-0000-4000-8000-0000000000ab',
            determinationStale: false,
            viewer: { canReview: false },
          },
        },
      ],
    },
    peerMesh: { status: 'unavailable' },
    groundInspection: { status: 'empty' },
    priorVerifierComments: { status: 'not_available_yet' },
    recentPrecedents: { status: 'not_available_yet' },
    shepherd: { status: 'empty' },
    nomineeNameCheck,
    // Story 6.23a (NW8) — the nominee-change warnings section (⛔ no warning by default).
    // Story 6.26a (GI9) — the ground-inspection gate section (complete by default).
    groundInspectionGate: { available: true, complete: true, waitReason: null },
    approvalWarnings: {
      available: true,
      kinds: [],
      postDeath: 'evaluated',
      uncoveredSinceApproval: 0,
      reviseBlocked: null,
      viewerCanRecordLateReason: false,
      lateKeysUncoveredForViewer: 0,
      reasonOptions: [
        {
          code: 'warnings_reviewed',
          reasonId: null,
          label: 'Warnings reviewed — approved despite them',
          whenToUse: 'Use when you have read every warning shown and still approve. Your note must say why.',
          addedByDisplay: null,
          addedAt: null,
          replacesLabel: null,
        },
      ],
    },
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
  declaration_status: 'effective',
  nominee_declaration_token: 'tok-1',
  nominee_declared_at: '2026-01-01T00:00:00.000Z',
  claim_filed_at: '2026-09-01T00:00:00.000Z',
  current_check: null,
  latest_check_is_stale: false,
  correction_return: null,
  approval_name_highlight: null,
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
  for (const f of [getSession, getVerifierConsole, getNomineeNameCheck, postNomineeNameCheck, postLateWarningReason])
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

// ── Story 6.23a (NW8, NW14; AC5, AC7) — the warnings section, MOUNTED ─────────────────────────────────────────
describe('<VerifierConsoleRoute> — Story 6.23a, the nominee-change warnings', () => {
  const mountWith = async (approvalWarnings: Partial<VerifierConsolePacket['approvalWarnings']>, claimState = 'verifier_review') => {
    const base = packet(PASSING);
    getVerifierConsole.mockResolvedValue({ packet: { ...base, claimState, approvalWarnings: { ...base.approvalWarnings, ...approvalWarnings } } });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <VerifierConsoleRoute />
      </QueryClientProvider>,
    );
    await screen.findByTestId('name-check-disclosure');
  };

  it('⭐ `available: false` disables Approve with its OWN words — ⛔ never "no warnings" on an unknown', async () => {
    await mountWith({ available: false });
    expect(screen.getByTestId('action-approve')).toBeDisabled();
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(t.approvalWarnings.unavailable);
  });

  it('⭐ the late-reason panel mounts on `viewerCanRecordLateReason` ALONE — even with `uncoveredSinceApproval` 0 (`-279` A1)', async () => {
    await mountWith({ viewerCanRecordLateReason: true, uncoveredSinceApproval: 0, lateKeysUncoveredForViewer: 1 }, 'verifier_approved');
    expect(screen.getByTestId('late-warning-reason-panel')).toBeInTheDocument();
    expect(screen.getByTestId('late-warning-reason-own-cannot-clear')).toHaveTextContent(t.approvalWarnings.late.ownCannotClear);
  });

  it('⛔ no panel when the server says the viewer cannot record (even with uncovered warnings)', async () => {
    await mountWith({ viewerCanRecordLateReason: false, uncoveredSinceApproval: 2 }, 'verifier_approved');
    expect(screen.queryByTestId('late-warning-reason-panel')).toBeNull();
  });

  const OTHER_CLAIM = '99999999-9999-4999-8999-999999999999';

  const offeredPacket = () => {
    const base = packet(PASSING);
    return { ...base, claimState: 'verifier_approved', approvalWarnings: { ...base.approvalWarnings, kinds: ['post_death_version' as const], viewerCanRecordLateReason: true, uncoveredSinceApproval: 1, lateKeysUncoveredForViewer: 1 } };
  };

  /** Mount on CLAIM with the panel offered, then record a late reason; the REFETCHED packet says it is answered. */
  const recordLateReason = async (): Promise<{ qc: QueryClient; ui: () => React.ReactElement; rerender: (ui: React.ReactElement) => void }> => {
    const offered = offeredPacket();
    const answered = { ...offered, approvalWarnings: { ...offered.approvalWarnings, viewerCanRecordLateReason: false, uncoveredSinceApproval: 0, lateKeysUncoveredForViewer: 0 } };
    getVerifierConsole.mockResolvedValueOnce({ packet: offered }).mockResolvedValue({ packet: answered });
    postLateWarningReason.mockResolvedValue({ claim_case_id: CLAIM, covered_key_count: 1, kinds: ['post_death_version'] });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const ui = () => (
      <QueryClientProvider client={qc}>
        <VerifierConsoleRoute />
      </QueryClientProvider>
    );
    const { rerender } = render(ui());
    fireEvent.click(await screen.findByTestId('late-warning-reason-radio-warnings_reviewed'));
    fireEvent.change(screen.getByTestId('late-warning-reason-note'), { target: { value: 'The date moved.' } });
    fireEvent.click(screen.getByTestId('late-warning-reason-submit'));
    return { qc, ui, rerender };
  };

  it('⭐ code review round 3 — after its OWN success (a REAL refetch flips `viewerCanRecordLateReason` to false) the panel STAYS, showing the outcome ALONE — ⛔ no form that would 409, ⛔ no contradictory count', async () => {
    await recordLateReason();
    await waitFor(() => expect(screen.getByTestId('late-warning-reason-recorded')).toHaveTextContent(t.approvalWarnings.late.recorded));
    await waitFor(() => expect(getVerifierConsole).toHaveBeenCalledTimes(2));
    expect(postLateWarningReason).toHaveBeenCalledWith(PARIWAR, CLAIM, { warning_reason_code: 'warnings_reviewed', note: 'The date moved.' });
    await waitFor(() => expect(screen.queryByTestId('late-warning-reason-submit')).toBeNull());
    expect(screen.getByTestId('late-warning-reason-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('late-warning-reason-count')).toBeNull();
    expect(screen.queryByTestId('late-warning-reason-own-cannot-clear')).toBeNull();
    // Code review round 4 — the focused Submit left with the form; focus is moved to the panel's heading, ⛔ never `<body>`.
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: t.approvalWarnings.late.heading }));
  });

  it('⭐ code review round 4 — the claim-switch guard, OBSERVED: with the next claim\'s packet already CACHED the panel ⛔ never mounts for it, not even for one commit', async () => {
    // Round 3's version switched to an UNCACHED claim — the loading branch rendered, so the panel never could and the test
    // was green with the guard removed. ⭐ Pre-seeding the next claim makes the first commit after the switch a real one.
    const { qc, ui, rerender } = await recordLateReason();
    await waitFor(() => expect(screen.getByTestId('late-warning-reason-recorded')).toHaveTextContent(t.approvalWarnings.late.recorded));
    const other = { ...offeredPacket(), claimCaseId: OTHER_CLAIM };
    qc.setQueryData(['verifier-console', PARIWAR, OTHER_CLAIM], {
      packet: { ...other, approvalWarnings: { ...other.approvalWarnings, viewerCanRecordLateReason: false, uncoveredSinceApproval: 0, lateKeysUncoveredForViewer: 0 } },
    });
    // Every node ADDED from here on — a commit the reset effect later undoes still shows up in this record.
    const added: Element[] = [];
    const observer = new MutationObserver((records) => {
      for (const r of records) for (const n of r.addedNodes) if (n instanceof Element) added.push(n);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    routeParams.claimCaseId = OTHER_CLAIM;
    rerender(ui());
    await waitFor(() => expect(screen.getByTestId('name-check-disclosure')).toBeInTheDocument());
    for (const r of observer.takeRecords()) for (const n of r.addedNodes) if (n instanceof Element) added.push(n);
    observer.disconnect();
    const panelMounted = added.some((n) => n.matches('[data-testid="late-warning-reason-panel"]') || n.querySelector('[data-testid="late-warning-reason-panel"]') !== null);
    expect(panelMounted).toBe(false);
    expect(screen.queryByTestId('late-warning-reason-panel')).toBeNull();
  });

  it('code review round 4 — a 409 on the late reason REFETCHES the console, so a form that would 409 again is ⛔ not left on screen', async () => {
    const offered = offeredPacket();
    const answered = { ...offered, approvalWarnings: { ...offered.approvalWarnings, viewerCanRecordLateReason: false } };
    getVerifierConsole.mockResolvedValueOnce({ packet: offered }).mockResolvedValue({ packet: answered });
    postLateWarningReason.mockRejectedValue(new ApiError(409, 'verifier_decision.late_warning_reason.nothing_uncovered', 'x'));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <VerifierConsoleRoute />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByTestId('late-warning-reason-radio-warnings_reviewed'));
    fireEvent.change(screen.getByTestId('late-warning-reason-note'), { target: { value: 'n' } });
    fireEvent.click(screen.getByTestId('late-warning-reason-submit'));
    expect(await screen.findByTestId('late-warning-reason-server-error')).toHaveTextContent(t.approvalWarnings.errors.lateNothingUncovered);
    await waitFor(() => expect(getVerifierConsole).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByTestId('late-warning-reason-submit')).toBeNull());
  });

  it('code review round 3 — a CLAIM SWITCH drops the previous claim\'s outcome: ⛔ no panel on a claim where nothing was recorded', async () => {
    const { ui, rerender } = await recordLateReason();
    await waitFor(() => expect(screen.getByTestId('late-warning-reason-recorded')).toHaveTextContent(t.approvalWarnings.late.recorded));
    routeParams.claimCaseId = OTHER_CLAIM;
    rerender(ui());
    await waitFor(() => expect(getVerifierConsole).toHaveBeenCalledWith(PARIWAR, OTHER_CLAIM));
    await screen.findByTestId('name-check-disclosure');
    expect(screen.queryByTestId('late-warning-reason-panel')).toBeNull();
  });

  it('code review round 3 — a late-reason failure reads in the PANEL\'s words, ⛔ never "The decision could not be submitted"', async () => {
    const base = packet(PASSING);
    getVerifierConsole.mockResolvedValue({
      packet: { ...base, claimState: 'verifier_approved', approvalWarnings: { ...base.approvalWarnings, viewerCanRecordLateReason: true, uncoveredSinceApproval: 1, lateKeysUncoveredForViewer: 1 } },
    });
    postLateWarningReason.mockRejectedValue(new ApiError(500, 'internal', 'x'));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <VerifierConsoleRoute />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByTestId('late-warning-reason-radio-warnings_reviewed'));
    fireEvent.change(screen.getByTestId('late-warning-reason-note'), { target: { value: 'n' } });
    fireEvent.click(screen.getByTestId('late-warning-reason-submit'));
    expect(await screen.findByTestId('late-warning-reason-server-error')).toHaveTextContent(t.approvalWarnings.late.submitError);
    expect(screen.getByTestId('late-warning-reason-server-error')).not.toHaveTextContent(t.decision.submitError);
  });
});

// ── Story 6.26a (GI9, GI11; AC9, AC10) — the ground-inspection WAIT, MOUNTED ─────────────────────────────────────
describe('<VerifierConsoleRoute> — Story 6.26a, why the approval waits for the ground inspection', () => {
  const mountGate = async (groundInspectionGate: VerifierConsolePacket['groundInspectionGate']) => {
    getVerifierConsole.mockResolvedValue({ packet: { ...packet(PASSING), groundInspectionGate } });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <VerifierConsoleRoute />
      </QueryClientProvider>,
    );
    await screen.findByTestId('name-check-disclosure');
  };

  for (const reason of ['no_completed_inspection', 'certificate_check_required'] as const) {
    it(`⭐ \`${reason}\` — Approve DISABLED with its own words (⛔ Deny), and the section says why`, async () => {
      await mountGate({ available: true, complete: false, waitReason: reason });
      expect(screen.getByTestId('action-approve')).toBeDisabled();
      expect(screen.getByTestId('action-deny')).toBeEnabled();
      expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(t.groundInspectionGate.approveBlocked[reason]!);
      expect(screen.getByTestId('ground-inspection-gate')).toHaveTextContent(t.groundInspectionGate.approveBlocked[reason]!);
      expect(t.groundInspectionGate.approveBlocked[reason]).toMatch(/not refused/);
    });
  }

  it('⭐ `available: false` — Approve disabled with "could not be checked" words, ⛔ never "complete"', async () => {
    await mountGate({ available: false, complete: false, waitReason: null });
    expect(screen.getByTestId('action-approve')).toBeDisabled();
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(t.groundInspectionGate.approveBlocked.unavailable!);
    expect(screen.getByTestId('ground-inspection-gate')).not.toHaveTextContent(t.groundInspectionGate.complete);
  });

  it('the positive control — complete ⇒ Approve ENABLED, and the section says it is complete', async () => {
    await mountGate({ available: true, complete: true, waitReason: null });
    expect(screen.getByTestId('action-approve')).toBeEnabled();
    expect(screen.getByTestId('ground-inspection-gate')).toHaveTextContent(t.groundInspectionGate.complete);
  });

  it('GI11 — the decision\'s 409 `verifier_decision.ground_inspection_required` is worded by its reason (⛔ "try again")', async () => {
    const { decisionErrorMessage } = await import('../src/routes/VerifierConsoleRoute.js');
    for (const reason of ['no_completed_inspection', 'certificate_check_required'] as const) {
      const err = new ApiError(409, 'verifier_decision.ground_inspection_required', 'server words', { reason });
      expect(decisionErrorMessage(err)).toBe(t.groundInspectionGate.approveBlocked[reason]);
    }
  });
});

