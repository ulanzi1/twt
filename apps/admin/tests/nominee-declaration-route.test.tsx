// Story 6.20 — the nominee declaration surfaces MOUNTED: the verifier console's history disclosure, the
// Pariwar Admin's queue page and the helpline's raise (code review 2026-09-24b).
//
// ⭐ WHY MOUNT. The D10 reveal's lifetime (A→B→A, close/reopen), which failures refetch a DECRYPTING read,
// the queue page's session handling and outcome banner, and where the helpline raise gets its claim all
// live in routes and hooks — the pure-component suite cannot see any of it. The network is the only thing
// faked: `api/client.js` is mocked function-by-function, so the real hooks and components run.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  NomineeDeclarationSnapshotsResponse,
  NomineeDeclarationTimelineResponse,
  VerifierConsolePacket,
} from '@twt/contracts';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM_A = '11111111-1111-4111-8111-111111111111';
const CLAIM_B = '11111111-1111-4111-8111-222222222222';
const MEMBER = '22222222-2222-4222-8222-222222222222';
const V1 = '00000000-0000-4000-8000-000000000001';

const routeParams = vi.hoisted(() => ({ claimCaseId: '11111111-1111-4111-8111-111111111111' }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ pariwarId: '44444444-4444-4444-8444-444444444444', claimCaseId: routeParams.claimCaseId }),
  useNavigate: () => navigate,
}));

const getSession = vi.fn();
const getVerifierConsole = vi.fn();
const getNomineeDeclarationTimeline = vi.fn();
const getNomineeDeclarationSnapshots = vi.fn();
const getNomineeCorrections = vi.fn();
const postNomineeDetermination = vi.fn();
const getPendingNomineeCorrections = vi.fn();
const getNomineeCorrectionRaisableClaims = vi.fn();
const postNomineeCorrectionRaise = vi.fn();
const postNomineeCorrectionDecision = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: () => getSession(),
    getVerifierConsole: (p: string, c: string) => getVerifierConsole(p, c),
    getNomineeDeclarationTimeline: (p: string, c: string) => getNomineeDeclarationTimeline(p, c),
    getNomineeDeclarationSnapshots: (p: string, c: string) => getNomineeDeclarationSnapshots(p, c),
    getNomineeCorrections: (p: string, c: string) => getNomineeCorrections(p, c),
    postNomineeDetermination: (p: string, c: string, b: unknown) => postNomineeDetermination(p, c, b),
    getPendingNomineeCorrections: (p: string) => getPendingNomineeCorrections(p),
    getNomineeCorrectionRaisableClaims: (p: string, m: string) => getNomineeCorrectionRaisableClaims(p, m),
    postNomineeCorrectionRaise: (p: string, c: string, b: unknown) => postNomineeCorrectionRaise(p, c, b),
    postNomineeCorrectionDecision: (p: string, c: string, id: string, step: string, b: unknown) =>
      postNomineeCorrectionDecision(p, c, id, step, b),
  };
});

const { VerifierConsoleRoute } = await import('../src/routes/VerifierConsoleRoute.js');
const { NomineeCorrectionsRoute } = await import('../src/routes/NomineeCorrectionsRoute.js');
const { HelplineNomineeCorrection } = await import('../src/modules/helpline-claims/HelplineNomineeCorrection.js');
const { ApiError } = await import('../src/api/client.js');

const packet = (claimCaseId: string): VerifierConsolePacket =>
  ({
    claimCaseId,
    pariwarId: PARIWAR,
    claimState: 'verifier_review',
    deceasedMemberId: MEMBER,
    identity: { deceasedName: 'Suresh Patel', deceasedDateOfBirth: '1955-03-01' },
    validity: { status: 'unavailable' },
    concealment: { status: 'not_evaluated', detailVisibility: 'indicator_only' },
    documentReview: { status: 'unavailable' },
    peerMesh: { status: 'unavailable' },
    groundInspection: { status: 'empty' },
    priorVerifierComments: { status: 'not_available_yet' },
    recentPrecedents: { status: 'not_available_yet' },
    shepherd: { status: 'empty' },
    nomineeNameCheck: { available: true, accountsComplete: true, currentAndPassing: true, differenceReasons: [] },
  }) as VerifierConsolePacket;

const timeline = (claimCaseId: string): NomineeDeclarationTimelineResponse => ({
  claim_case_id: claimCaseId,
  claim_state: 'verifier_review',
  deceased_member_id: MEMBER,
  versions: [
    {
      version_id: V1,
      rank: 1,
      version_no: 1,
      kind: 'declared',
      source: 'member',
      relationship: 'spouse',
      split_pct: 100,
      recorded_at: '2026-01-10T06:00:00.000Z',
      effective_at: '2026-01-05T06:00:00.000Z',
      corrects_version_id: null,
    },
  ],
  watermark: { rank1: 1, rank2: null },
  live_determination: null,
  earlier_determinations: [],
  declaration_status: 'undetermined',
  determination_recordable: true,
  viewer: { can_determine: true, can_decide_district: true },
  pending_corrections: { da_pending: 0, pa_pending: 0 },
});

const snapshots = (claimCaseId: string): NomineeDeclarationSnapshotsResponse => ({
  claim_case_id: claimCaseId,
  snapshots: [{ version_id: V1, name: { state: 'readable', value: 'Asha Devi' }, mobile: null, address: null }],
  live_determination: null,
});

let qc: QueryClient;
const ui = (child: ReactElement) => <QueryClientProvider client={qc}>{child}</QueryClientProvider>;
/** Let effects and `onError` handlers run BEFORE a negative call count is read (a refetch a tick late would
 *  otherwise be missed — adversarial review 2026-09-24b). */
const settle = () => new Promise((r) => setTimeout(r, 50));
const SNAPSHOTS_A = ['nominee-declaration-snapshots', PARIWAR, '11111111-1111-4111-8111-111111111111'] as const;
const CORRECTIONS_A = ['nominee-corrections', PARIWAR, '11111111-1111-4111-8111-111111111111'] as const;

beforeEach(() => {
  for (const f of [
    getSession,
    getVerifierConsole,
    getNomineeDeclarationTimeline,
    getNomineeDeclarationSnapshots,
    getNomineeCorrections,
    postNomineeDetermination,
    getPendingNomineeCorrections,
    getNomineeCorrectionRaisableClaims,
    postNomineeCorrectionRaise,
    postNomineeCorrectionDecision,
    navigate,
  ])
    f.mockReset();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  getSession.mockResolvedValue({ userId: '33333333-3333-4333-8333-333333333333', nationalGrants: [] });
  getVerifierConsole.mockImplementation(async (_p: string, c: string) => ({ packet: packet(c) }));
  getNomineeDeclarationTimeline.mockImplementation(async (_p: string, c: string) => timeline(c));
  getNomineeDeclarationSnapshots.mockImplementation(async (_p: string, c: string) => snapshots(c));
  getNomineeCorrections.mockImplementation(async (_p: string, c: string) => ({ claim_case_id: c, corrections: [] }));
});
afterEach(() => {
  routeParams.claimCaseId = CLAIM_A;
});

describe('<VerifierConsoleRoute> — the D10 reveal', () => {
  const openAndReveal = async () => {
    fireEvent.click(await screen.findByTestId('nominee-declaration-disclosure'));
    fireEvent.click(await screen.findByTestId('nominee-show-details'));
    expect(await screen.findByText('Asha Devi')).toBeTruthy();
  };

  it('⭐⭐ A→B→A: returning to A re-decrypts ⛔ NOTHING without a click — the disclosure is closed and the reveal dropped', async () => {
    const { rerender } = render(ui(<VerifierConsoleRoute />));
    await openAndReveal();
    expect(getNomineeDeclarationSnapshots).toHaveBeenCalledTimes(1);
    expect(getNomineeCorrections).toHaveBeenCalledTimes(1);
    // POSITIVE CONTROL — the keys asserted below really held the decrypted data.
    expect(qc.getQueryData(SNAPSHOTS_A)).toBeDefined();
    expect(qc.getQueryData(CORRECTIONS_A)).toBeDefined();

    routeParams.claimCaseId = CLAIM_B;
    rerender(ui(<VerifierConsoleRoute />));
    await waitFor(() => expect(getVerifierConsole).toHaveBeenCalledWith(PARIWAR, CLAIM_B));
    routeParams.claimCaseId = CLAIM_A;
    rerender(ui(<VerifierConsoleRoute />));
    await waitFor(() =>
      expect(screen.getByTestId('nominee-declaration-disclosure').getAttribute('aria-expanded')).toBe('false'),
    );
    await settle();
    // ⛔ Not one more decrypting read — on B (never revealed) or back on A.
    expect(getNomineeDeclarationSnapshots).toHaveBeenCalledTimes(1);
    expect(getNomineeCorrections).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Asha Devi')).toBeNull();
    // …and A's decrypted details are gone from the cache, ⛔ not merely hidden.
    expect(qc.getQueryData(SNAPSHOTS_A)).toBeUndefined();
    expect(qc.getQueryData(CORRECTIONS_A)).toBeUndefined();
  });

  it('⭐ closing the disclosure FORGETS the decrypted details (cache removed), and a reopen shows ⛔ no name until revealed again', async () => {
    render(ui(<VerifierConsoleRoute />));
    await openAndReveal();
    expect(qc.getQueryData(SNAPSHOTS_A)).toBeDefined();
    fireEvent.click(screen.getByTestId('nominee-declaration-disclosure'));
    // ⭐ The CACHE is emptied on close — ⛔ not merely the reveal flag reset.
    expect(qc.getQueryData(SNAPSHOTS_A)).toBeUndefined();
    expect(qc.getQueryData(CORRECTIONS_A)).toBeUndefined();
    fireEvent.click(screen.getByTestId('nominee-declaration-disclosure'));
    await screen.findByTestId('nominee-show-details');
    await settle();
    expect(screen.queryByText('Asha Devi')).toBeNull();
    expect(getNomineeDeclarationSnapshots).toHaveBeenCalledTimes(1);
    expect(getNomineeCorrections).toHaveBeenCalledTimes(1);
  });

  it('⭐ a REFUSED determination (403) triggers ⛔ no decrypting refetch; a STALE one refetches the timeline only', async () => {
    render(ui(<VerifierConsoleRoute />));
    await openAndReveal();
    const fillAndRecord = () => {
      fireEvent.change(screen.getByTestId('nominee-certificate-date'), { target: { value: '2026-05-01' } });
      fireEvent.click(screen.getByTestId(`mark-${V1}-stands`));
      fireEvent.change(screen.getByTestId('nominee-determination-note'), { target: { value: 'Checked.' } });
      fireEvent.click(screen.getByTestId('nominee-determination-submit'));
    };
    const timelineCalls = getNomineeDeclarationTimeline.mock.calls.length;

    postNomineeDetermination.mockRejectedValueOnce(new ApiError(403, 'auth.forbidden', 'no'));
    fillAndRecord();
    expect(await screen.findByTestId('nominee-determination-error')).toBeTruthy();
    await settle();
    // ⛔ Neither decrypting read refetched — the snapshots AND the corrections.
    expect(getNomineeDeclarationSnapshots).toHaveBeenCalledTimes(1);
    expect(getNomineeCorrections).toHaveBeenCalledTimes(1);
    expect(getNomineeDeclarationTimeline).toHaveBeenCalledTimes(timelineCalls);

    postNomineeDetermination.mockRejectedValueOnce(new ApiError(409, 'nominee_determination.stale_watermark', 'moved'));
    fillAndRecord();
    await waitFor(() => expect(getNomineeDeclarationTimeline.mock.calls.length).toBeGreaterThan(timelineCalls));
    await settle();
    expect(getNomineeDeclarationSnapshots).toHaveBeenCalledTimes(1);
    expect(getNomineeCorrections).toHaveBeenCalledTimes(1);
  });
});

describe('<NomineeCorrectionsRoute> — the Pariwar Admin queue', () => {
  it('a session that expires on the queue read goes back to sign-in', async () => {
    getPendingNomineeCorrections.mockRejectedValue(new ApiError(401, 'auth.session_required', 'expired'));
    render(ui(<NomineeCorrectionsRoute />));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
  });
});

describe('<HelplineNomineeCorrection> — the claim comes from the SELECTED member (BigDev 2026-09-24b)', () => {
  it('⛔ no member or no read-back ⇒ no form and ⛔ no claims read', async () => {
    // Both legs: a confirmed read-back with ⛔ no member, and a member with ⛔ no read-back.
    for (const [memberId, identityConfirmed] of [
      [null, true],
      [MEMBER, false],
    ] as const) {
      const { unmount } = render(ui(<HelplineNomineeCorrection pariwarId={PARIWAR} memberId={memberId} identityConfirmed={identityConfirmed} />));
      expect(screen.getByTestId('helpline-nominee-correction-need-member')).toBeTruthy();
      expect(screen.queryByTestId('nominee-correction-raise')).toBeNull();
      unmount();
    }
    await settle();
    expect(getNomineeCorrectionRaisableClaims).not.toHaveBeenCalled();
  });

  it('one live claim ⇒ the raise goes to IT; ⛔ no claim reference is typed anywhere', async () => {
    getNomineeCorrectionRaisableClaims.mockResolvedValue({
      member_id: MEMBER,
      claims: [{ claim_case_id: CLAIM_A, claim_state: 'verifier_review', created_at: '2026-09-01T06:00:00.000Z' }],
    });
    postNomineeCorrectionRaise.mockResolvedValue({ correction_id: '55555555-5555-4555-8555-555555555555', step: 'da_pending' });
    render(ui(<HelplineNomineeCorrection pariwarId={PARIWAR} memberId={MEMBER} identityConfirmed />));
    await screen.findByTestId('nominee-correction-raise');
    expect(screen.queryByTestId('helpline-nominee-correction-claim')).toBeNull();
    fireEvent.change(screen.getByTestId('raise-name'), { target: { value: 'Rani Devi' } });
    fireEvent.change(screen.getByTestId('raise-relationship'), { target: { value: 'spouse' } });
    fireEvent.change(screen.getByTestId('raise-mobile'), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByTestId('raise-note'), { target: { value: 'Married name' } });
    fireEvent.click(screen.getByTestId('raise-submit'));
    await waitFor(() => expect(postNomineeCorrectionRaise).toHaveBeenCalledTimes(1));
    expect(postNomineeCorrectionRaise.mock.calls[0]![1]).toBe(CLAIM_A);
    await waitFor(() => expect(screen.getByTestId('raise-sent').textContent).toMatch(/sent/i));
    expect((screen.getByTestId('raise-name') as HTMLInputElement).value).toBe('');
  });

  it('several live claims ⇒ the operator PICKS first — ⛔ no form to fill (and lose) before the pick', async () => {
    getNomineeCorrectionRaisableClaims.mockResolvedValue({
      member_id: MEMBER,
      claims: [
        { claim_case_id: CLAIM_B, claim_state: 'documents_pending', created_at: '2026-09-02T06:00:00.000Z' },
        { claim_case_id: CLAIM_A, claim_state: 'verifier_review', created_at: '2026-09-01T06:00:00.000Z' },
      ],
    });
    render(ui(<HelplineNomineeCorrection pariwarId={PARIWAR} memberId={MEMBER} identityConfirmed />));
    await screen.findByTestId('helpline-nominee-correction-pick');
    // ⭐ ⛔ No form until the claim is chosen — the pick used to wipe whatever had been typed.
    expect(screen.queryByTestId('nominee-correction-raise')).toBeNull();
    // A state LABEL, ⛔ never the raw code.
    expect(screen.getByTestId('helpline-nominee-correction-pick').textContent).toContain('With the verifier');
    fireEvent.click(screen.getByTestId(`helpline-nominee-correction-claim-${CLAIM_A}`));
    await screen.findByTestId('nominee-correction-raise');
    expect(screen.getByTestId('raise-submit')).not.toBeDisabled();
  });

  it('no live claim ⇒ says so, and offers ⛔ no form', async () => {
    getNomineeCorrectionRaisableClaims.mockResolvedValue({ member_id: MEMBER, claims: [] });
    render(ui(<HelplineNomineeCorrection pariwarId={PARIWAR} memberId={MEMBER} identityConfirmed />));
    expect(await screen.findByTestId('helpline-nominee-correction-no-claim')).toBeTruthy();
    expect(screen.queryByTestId('nominee-correction-raise')).toBeNull();
  });
});

describe('<NomineeCorrectionsRoute> — a refusal is ⛔ never silent (adversarial review 2026-09-24b)', () => {
  it('a decision refused because another admin already decided is ALERTED at page level, though the item has left the queue', async () => {
    const CORR = '55555555-5555-4555-8555-555555555555';
    getPendingNomineeCorrections
      .mockResolvedValueOnce({
        items: [{ correction_id: CORR, claim_case_id: CLAIM_A, rank: 1, raised_via: 'helpline', raised_at: '2026-09-01T06:00:00.000Z' }],
      })
      // After the refusal's refetch the claim has LEFT the queue (the other admin's decision landed).
      .mockResolvedValue({ items: [] });
    getNomineeCorrections.mockResolvedValue({
      claim_case_id: CLAIM_A,
      corrections: [
        {
          correction_id: CORR,
          claim_case_id: CLAIM_A,
          rank: 1,
          target_version_id: V1,
          target: { relationship: 'spouse', name: { state: 'readable', value: 'Asha Devi' }, mobile: null, address: null },
          proposed: { relationship: 'spouse', name: { state: 'readable', value: 'Asha Kumari' }, mobile: { state: 'readable', value: '9876543210' }, address: null },
          raised_via: 'helpline',
          raised_at: '2026-09-01T06:00:00.000Z',
          raise_note: { state: 'readable', value: 'Maiden name' },
          step: 'pa_pending',
          district_admin: { actor_display: 'Anita', decided_at: '2026-09-02T06:00:00.000Z', note: { state: 'readable', value: 'Seen' } },
          pariwar_admin: null,
          declined_at_step: null,
          applied_version_id: null,
        },
      ],
    });
    postNomineeCorrectionDecision.mockRejectedValue(new ApiError(409, 'nominee_correction.step_conflict', 'moved on'));
    render(ui(<NomineeCorrectionsRoute />));
    fireEvent.click(await screen.findByRole('button', { expanded: false }));
    fireEvent.change(await screen.findByTestId(`nominee-correction-note-${CORR}`), { target: { value: 'Checked the passbook.' } });
    fireEvent.click(screen.getByTestId(`nominee-correction-approve-${CORR}`));
    const alert = await screen.findByTestId('nominee-corrections-failed');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toMatch(/already moved on/);
    // The item is gone (it left the queue) — and the refusal is STILL said.
    await waitFor(() => expect(screen.queryByTestId(`nominee-correction-${CORR}`)).toBeNull());
    expect(screen.getByTestId('nominee-corrections-failed')).toBeTruthy();
  });
});
