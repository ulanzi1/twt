// Story 6.21a — the District Admin's death-certificate review on the console (Task 8; AC1, AC5; D10).
//
// ⭐ The load-bearing ones:
//   · invariant 1 — the accept form's date starts EMPTY, with the OCR reading BESIDE it and labelled as a
//     machine reading; the form refuses — in words — until the District Admin typed a date and a note;
//   · the status is WORDS (⛔ never colour alone), and accept / reject have DISTINCT accessible names;
//   · the control mounts ONLY for `viewer.canReview` (a verifier sees none), and "Request a better document"
//     opens the REJECT form;
//   · approve stays disabled until the certificate is ACCEPTED, and names the certificate reason;
//   · the HISTORY is on demand, and is FORGOTTEN on close and on a claim change (⛔ not merely hidden).
// The network is the only thing faked (`api/client.js`, function by function).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DeathCertificateHistoryResponse, VerifierConsolePacket, VerifierReviewItem } from '@twt/contracts';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const CLAIM_2 = '11111111-1111-4111-8111-222222222222';
const TOKEN = '00000000-0000-4000-8000-0000000000ab';
const LIVE = '00000000-0000-4000-8000-0000000000ac';

const routeParams = vi.hoisted(() => ({ claimCaseId: '11111111-1111-4111-8111-111111111111' }));
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ pariwarId: PARIWAR, claimCaseId: routeParams.claimCaseId }),
  useNavigate: () => vi.fn(),
}));

const getSession = vi.fn();
const getVerifierConsole = vi.fn();
const getDeathCertificateHistory = vi.fn();
const postDeathCertificateReview = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: () => getSession(),
    getVerifierConsole: (p: string, c: string) => getVerifierConsole(p, c),
    getDeathCertificateHistory: (p: string, c: string) => getDeathCertificateHistory(p, c),
    postDeathCertificateReview: (p: string, c: string, b: unknown) => postDeathCertificateReview(p, c, b),
  };
});

const { VerifierConsoleRoute } = await import('../src/routes/VerifierConsoleRoute.js');
const { DeathCertificateReviewControl, DeathCertificateReviewStatus, verifierConsoleEn } = await import(
  '../src/modules/claim-verification/index.js'
);
const { ApiError } = await import('../src/api/client.js');
const { deathCertificateReviewErrorMessage, trusteeDeathCertificateAcceptanceRequiredMessage } = await import(
  '../src/modules/claim-verification/nominee-errors.js'
);
const t = verifierConsoleEn.deathCertificate;

type Review = NonNullable<VerifierReviewItem['review']>;

const review = (over: Partial<Review> = {}): Review => ({
  status: 'not_reviewed',
  rejectionReason: null,
  decidedByDisplay: null,
  decidedAt: null,
  liveReviewId: null,
  certificateToken: TOKEN,
  determinationStale: false,
  viewer: { canReview: true },
  ...over,
});

const certificateItem = (r: Review | undefined): VerifierReviewItem => ({
  documentType: 'death_certificate',
  parityOutcome: 'match',
  verifierReviewRequired: false,
  ocrConfidence: 0.9,
  parityFlags: {},
  extracted: { deceasedName: null, dateOfBirth: null, dateOfDeath: '2026-04-30', issuingAuthority: null, certificateNumber: null },
  memberRecord: null,
  preview: { signedUrl: 'https://example.test/cert', contentType: 'image/png' },
  ...(r ? { review: r } : {}),
});

const packet = (items: VerifierReviewItem[] | null): VerifierConsolePacket =>
  ({
    claimCaseId: CLAIM,
    pariwarId: PARIWAR,
    claimState: 'verifier_review',
    deceasedMemberId: '22222222-2222-4222-8222-222222222222',
    identity: { deceasedName: 'Suresh Patel', deceasedDateOfBirth: '1955-03-01' },
    validity: { status: 'unavailable' },
    concealment: { status: 'not_evaluated', detailVisibility: 'indicator_only' },
    documentReview: items ? { status: 'present', reviews: items } : { status: 'empty' },
    peerMesh: { status: 'unavailable' },
    groundInspection: { status: 'empty' },
    priorVerifierComments: { status: 'not_available_yet' },
    recentPrecedents: { status: 'not_available_yet' },
    shepherd: { status: 'empty' },
    nomineeNameCheck: { available: true, accountsComplete: true, currentAndPassing: true, differenceReasons: [] },
  }) as VerifierConsolePacket;

const HISTORY: DeathCertificateHistoryResponse = {
  claim_case_id: CLAIM,
  truncated: false,
  uploads: [
    {
      upload_id: TOKEN,
      channel: 'helpline',
      uploaded_at: '2026-09-20T06:00:00.000Z',
      current: true,
      preview: { signed_url: 'https://example.test/cert', content_type: 'image/png' },
      reviews: [
        {
          review_id: LIVE,
          verdict: 'rejected',
          rejection_reason: 'date_of_death_unclear',
          accepted_date: null,
          note: { state: 'readable', value: 'ZZ-NOTE-the ink is smudged' },
          decided_by_display: 'Anita (District Admin)',
          decided_at: '2026-09-21T06:00:00.000Z',
          superseded_at: null,
          superseded_reason: null,
        },
      ],
    },
  ],
};

let qc: QueryClient;
const ui = () => (
  <QueryClientProvider client={qc}>
    <VerifierConsoleRoute />
  </QueryClientProvider>
);
const mount = async (items: VerifierReviewItem[] | null) => {
  getVerifierConsole.mockResolvedValue({ packet: packet(items) });
  const utils = render(ui());
  await screen.findByTestId('name-check-disclosure');
  return utils;
};

beforeEach(() => {
  for (const f of [getSession, getVerifierConsole, getDeathCertificateHistory, postDeathCertificateReview]) f.mockReset();
  getSession.mockResolvedValue({ userId: '33333333-3333-4333-8333-333333333333', nationalGrants: [] });
  getDeathCertificateHistory.mockResolvedValue(HISTORY);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});
afterEach(() => {
  cleanup();
  routeParams.claimCaseId = CLAIM;
});

describe('<DeathCertificateReviewControl> — invariant 1 and the refusals in words', () => {
  const setup = (mode: 'accept' | 'reject' | null) => {
    const onSubmit = vi.fn(async () => true);
    const onModeChange = vi.fn();
    render(
      <DeathCertificateReviewControl review={review()} ocrDateOfDeath="2026-04-30" mode={mode} onModeChange={onModeChange} onSubmit={onSubmit} />,
    );
    return { onSubmit, onModeChange };
  };

  it('⭐ the accept date starts EMPTY, with the OCR reading BESIDE it, labelled as a machine reading', () => {
    setup('accept');
    expect((screen.getByTestId('death-certificate-date') as HTMLInputElement).value).toBe('');
    expect(screen.getByTestId('death-certificate-ocr').textContent).toBe(`${t.ocrLabel}: 2026-04-30`);
  });

  it('⭐ an incomplete accept is REFUSED IN WORDS and submits nothing; typed date + note submits exactly those', async () => {
    const { onSubmit } = setup('accept');
    fireEvent.click(screen.getByTestId('death-certificate-submit'));
    expect(screen.getByTestId('death-certificate-incomplete').getAttribute('role')).toBe('alert');
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('death-certificate-date'), { target: { value: '2026-04-29' } });
    fireEvent.change(screen.getByTestId('death-certificate-note'), { target: { value: ' Clear stamp. ' } });
    fireEvent.click(screen.getByTestId('death-certificate-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ verdict: 'accepted', accepted_date: '2026-04-29', note: 'Clear stamp.' }));
  });

  it('⭐ the reject form offers EXACTLY the three reasons, and needs one and a note', async () => {
    const { onSubmit } = setup('reject');
    expect(screen.getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual([
      'no_date_of_death',
      'date_of_death_unclear',
      'date_of_death_in_future',
    ]);
    fireEvent.change(screen.getByTestId('death-certificate-note'), { target: { value: 'Smudged.' } });
    fireEvent.click(screen.getByTestId('death-certificate-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('death-certificate-reason-date_of_death_in_future'));
    fireEvent.click(screen.getByTestId('death-certificate-submit'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ verdict: 'rejected', rejection_reason: 'date_of_death_in_future', note: 'Smudged.' }),
    );
  });

  it('⭐ accessibility — accept and reject have DISTINCT accessible names; the status is WORDS, ⛔ never colour alone', () => {
    setup(null);
    expect(screen.getByRole('button', { name: t.accept })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.reject })).toBeTruthy();
    cleanup();
    render(<DeathCertificateReviewStatus review={review({ status: 'rejected', rejectionReason: 'no_date_of_death', decidedByDisplay: 'Anita' })} />);
    const status = screen.getByTestId('death-certificate-review-status').textContent ?? '';
    expect(status).toContain(t.status.rejected);
    expect(status).toContain(t.reasons.no_date_of_death);
    expect(status).toContain('Anita');
  });

  it('⭐ family 13(d) — the reasons are their OWN group named by the question, and the note is DESCRIBED by its help', () => {
    setup('reject');
    // The group NAMED by the question is exactly the NESTED fieldset — ⛔ not the outer "Reject" form.
    const group = screen.getByRole('group', { name: t.reasonLegend });
    expect(group).toBe(screen.getByTestId('death-certificate-reasons'));
    expect(group).not.toBe(screen.getByTestId('death-certificate-reject-form'));
    expect(group.querySelectorAll('input[type="radio"]')).toHaveLength(3);
    const help = screen.getByTestId('death-certificate-note').getAttribute('aria-describedby');
    expect(help && document.getElementById(help)?.textContent).toBe(t.noteHelp);
  });

  it('a legacy certificate with ⛔ no upload record cannot be reviewed — and says so', () => {
    render(
      <DeathCertificateReviewControl review={review({ certificateToken: null })} ocrDateOfDeath={null} mode={null} onModeChange={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByTestId('death-certificate-no-token').textContent).toBe(t.noToken);
    expect(screen.queryByTestId('death-certificate-accept')).toBeNull();
  });

  it('the error tables word each refusal (review) and the trustee gate, ⛔ never a raw code', () => {
    expect(deathCertificateReviewErrorMessage(new ApiError(409, 'death_certificate_review.accept_future_date', 'x'))).toBe(
      t.refused.accept_future_date,
    );
    expect(deathCertificateReviewErrorMessage(new ApiError(403, 'auth.forbidden', 'x'))).toBe(t.forbidden);
    expect(
      trusteeDeathCertificateAcceptanceRequiredMessage(
        new ApiError(409, 'cycle_freeze.death_certificate_acceptance_required', 'x', { reason: 'rejected' }),
      ),
    ).toBe(t.trusteeApprovalGate.rejected);
  });
});

describe('<VerifierConsoleRoute> — the certificate section (D10, AC5)', () => {
  it('⭐ the control mounts for `viewer.canReview`; a VERIFIER sees the status and the history but ⛔ NO control', async () => {
    await mount([certificateItem(review())]);
    expect(screen.getByTestId('death-certificate-review-control')).toBeTruthy();
    cleanup();
    await mount([certificateItem(review({ viewer: { canReview: false } }))]);
    expect(screen.getByTestId('death-certificate-review-status')).toBeTruthy();
    expect(screen.queryByTestId('death-certificate-review-control')).toBeNull();
    expect(screen.getByTestId('death-certificate-history-disclosure')).toBeTruthy();
    // …and ⛔ no "Request a better document" either.
    expect(screen.queryByTestId('document-request-better')).toBeNull();
  });

  it('⭐ "Request a better document" opens the REJECT form (a reviewer only) — and MOVES FOCUS into it (family 13(d): announced, ⛔ not silently opened below)', async () => {
    await mount([certificateItem(review())]);
    fireEvent.click(screen.getByTestId('document-request-better'));
    const form = await screen.findByTestId('death-certificate-reject-form');
    await waitFor(() => expect(document.activeElement).toBe(form));
    expect(screen.queryByTestId('document-mark-illegible')).toBeNull();
  });

  it('⭐ D7 — approve is DISABLED until the certificate is accepted, and names the certificate reason', async () => {
    await mount([certificateItem(review({ status: 'rejected', rejectionReason: 'no_date_of_death' }))]);
    expect(screen.getByTestId('action-approve')).toBeDisabled();
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(t.approveBlocked.rejected!);
    cleanup();
    await mount(null);
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(t.approveBlocked.no_certificate!);
    cleanup();
    await mount([certificateItem(review({ status: 'accepted', liveReviewId: LIVE }))]);
    expect(screen.getByTestId('action-approve')).not.toBeDisabled();
  });

  it('⭐ code review 2026-09-26 — an UNAVAILABLE document section is ⛔ never "none was sent"; a LEGACY row (`missing`) is ⛔ never "review it"', async () => {
    getVerifierConsole.mockResolvedValue({ packet: { ...packet(null), documentReview: { status: 'unavailable' } } });
    render(ui());
    await screen.findByTestId('name-check-disclosure');
    expect(screen.getByTestId('action-approve')).toBeDisabled();
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(t.approveBlocked.unavailable!);
    cleanup();
    await mount([certificateItem(review({ status: 'missing', certificateToken: null }))]);
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(t.approveBlocked.no_certificate!);
    expect(screen.getByTestId('death-certificate-review-status')).toHaveTextContent(t.status.missing!);
  });

  it('⭐ adversarial review 2026-09-26 — the District Admin\'s OWN Accept toggle opens the form but ⛔ does not steal focus', async () => {
    await mount([certificateItem(review())]);
    const toggle = screen.getByTestId('death-certificate-accept');
    toggle.focus();
    fireEvent.click(toggle);
    await screen.findByTestId('death-certificate-accept-form');
    expect(document.activeElement).toBe(toggle);
  });

  it('⭐ `2026-09-26-246` §2 — an ERASED date or note in the history says so, ⛔ never "could not be read"', async () => {
    const erased: DeathCertificateHistoryResponse = {
      ...HISTORY,
      uploads: [
        {
          ...HISTORY.uploads[0]!,
          reviews: [{ ...HISTORY.uploads[0]!.reviews[0]!, verdict: 'accepted', rejection_reason: null, accepted_date: { state: 'anonymized' }, note: { state: 'anonymized' } }],
        },
      ],
    };
    getDeathCertificateHistory.mockResolvedValue(erased);
    await mount([certificateItem(review())]);
    fireEvent.click(screen.getByTestId('death-certificate-history-disclosure'));
    const item = await screen.findByTestId('death-certificate-history-review');
    expect(item.textContent).toContain(t.history.anonymized);
    expect(item.textContent).not.toContain(t.history.unreadable);
  });

  it('⭐ the HISTORY says when older certificates were left out (`truncated`) — ⛔ never reads as complete', async () => {
    getDeathCertificateHistory.mockResolvedValue({ ...HISTORY, truncated: true });
    await mount([certificateItem(review())]);
    fireEvent.click(screen.getByTestId('death-certificate-history-disclosure'));
    expect(await screen.findByTestId('death-certificate-history-truncated')).toHaveTextContent(t.history.truncated!);
  });

  it('⭐ D7 review fix — approve stays DISABLED on an ACCEPTED certificate whose review is stale relative to the live determination', async () => {
    await mount([certificateItem(review({ status: 'accepted', liveReviewId: LIVE, determinationStale: true }))]);
    expect(screen.getByTestId('action-approve')).toBeDisabled();
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(t.approveBlocked.determination_stale!);
  });

  it('⭐ a submitted review sends the token + the live id the District Admin saw', async () => {
    postDeathCertificateReview.mockResolvedValue({
      claim_case_id: CLAIM,
      review_id: LIVE,
      verdict: 'accepted',
      superseded_review_id: null,
      supersession_reason: null,
      event_version: 9,
    });
    await mount([certificateItem(review({ liveReviewId: LIVE }))]);
    fireEvent.click(screen.getByTestId('death-certificate-accept'));
    fireEvent.change(screen.getByTestId('death-certificate-date'), { target: { value: '2026-04-29' } });
    fireEvent.change(screen.getByTestId('death-certificate-note'), { target: { value: 'Clear.' } });
    fireEvent.click(screen.getByTestId('death-certificate-submit'));
    await waitFor(() =>
      expect(postDeathCertificateReview).toHaveBeenCalledWith(PARIWAR, CLAIM, {
        verdict: 'accepted',
        certificate_token: TOKEN,
        accepted_date: '2026-04-29',
        note: 'Clear.',
        expected_live_review_id: LIVE,
      }),
    );
  });

  it('⭐ the HISTORY is on demand, renders the decrypted note, and is FORGOTTEN on close (⛔ not merely hidden)', async () => {
    await mount([certificateItem(review())]);
    expect(getDeathCertificateHistory).not.toHaveBeenCalled();
    const toggle = screen.getByTestId('death-certificate-history-disclosure');
    fireEvent.click(toggle);
    expect(await screen.findByText(/ZZ-NOTE-the ink is smudged/)).toBeTruthy();
    expect(getDeathCertificateHistory).toHaveBeenCalledTimes(1);
    fireEvent.click(toggle); // close
    expect(qc.getQueryData(['death-certificate-history', PARIWAR, CLAIM])).toBeUndefined();
  });

  it('⭐ a same-route CLAIM CHANGE forgets the previous claim’s history and does ⛔ not fetch the next one’s', async () => {
    const { rerender } = await mount([certificateItem(review())]);
    fireEvent.click(screen.getByTestId('death-certificate-history-disclosure'));
    expect(await screen.findByText(/ZZ-NOTE-the ink is smudged/)).toBeTruthy();
    routeParams.claimCaseId = CLAIM_2;
    rerender(ui());
    await waitFor(() =>
      expect(screen.getByTestId('death-certificate-history-disclosure')).toHaveAttribute('aria-expanded', 'false'),
    );
    expect(getDeathCertificateHistory).not.toHaveBeenCalledWith(PARIWAR, CLAIM_2);
    expect(qc.getQueryData(['death-certificate-history', PARIWAR, CLAIM])).toBeUndefined();
  });
});
