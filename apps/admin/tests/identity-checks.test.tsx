// Story 3.13 (AC11, AC14) — the identity-check admin module, with the ROUTER STUBBED (the fraud-investigation surfaces' style):
//
//   · the queue — empty copy; a District / Pariwar Admin's Open; a verifier / helpline operator's list + the press, ⛔ Open;
//   · the detail — the claim-filed-for-the-death banner hides the forms; a not-needed member hides them; "Could not confirm"
//     needs a note before anything is sent; a 409 shows the not-eligible line; a confirmation refreshes the detail;
//   · "Show mobile number" — ONE call per press, the shown lines, the refused line;
//   · the console nav link (DL13 — a page in the router alone has ⛔ way in);
//   · DL12 — the approved words, pinned verbatim.
// The real-browser pass is a GO-LIVE leg (roster Row 57 (c)), ⛔ this file.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../src/api/client.js';
import { renderWithClient } from './_helpers.js';

const navigate = vi.fn();
let params: Record<string, string> = {};
vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => navigate,
  useParams: () => params,
  useRouter: () => ({ invalidate: vi.fn() }),
}));

const getSession = vi.fn();
const getIdentityCheckQueue = vi.fn();
const getIdentityCheckDetail = vi.fn();
const recordIdentityCheck = vi.fn();
const revealIdentityCheckMobile = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: () => getSession(),
    getIdentityCheckQueue: (...a: unknown[]) => getIdentityCheckQueue(...a),
    getIdentityCheckDetail: (...a: unknown[]) => getIdentityCheckDetail(...a),
    recordIdentityCheck: (...a: unknown[]) => recordIdentityCheck(...a),
    revealIdentityCheckMobile: (...a: unknown[]) => revealIdentityCheckMobile(...a),
  };
});

const { IdentityChecksView } = await import('../src/modules/identity-checks/IdentityChecksPage.js');
const { IdentityCheckDetailView } = await import('../src/modules/identity-checks/IdentityCheckDetailPage.js');
const { identityCheckEn: t } = await import('../src/modules/identity-checks/i18n-en.js');
const { verifierConsoleEn } = await import('../src/modules/claim-verification/i18n-en.js');
const { RootLayout } = await import('../src/routes/RootLayout.js');

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const M = '11111111-1111-4111-8111-111111111111';

const entry = {
  member_id: M,
  short_member_id: '11111111',
  signed_up_at: '2026-06-01T05:30:00.000Z',
  state: 'lock-in' as const,
  district: 'Patna',
  latest_outcome: null,
  latest_decided_at: null,
  attempt_count: 0,
};

function detail(over: Record<string, unknown> = {}) {
  return {
    member_id: M,
    short_member_id: '11111111',
    state: 'lock-in',
    signed_up_at: '2026-06-01T05:30:00.000Z',
    kyc_source: 'manual',
    identity: { name: 'Sita Devi', date_of_birth: '1971-03-09', photo: null },
    masked_mobile: '+91·····1234',
    posting: { district: 'Patna', workplace_name: null },
    death_reported: false,
    eligible: true,
    history: [] as unknown[],
    ...over,
  };
}

beforeEach(() => {
  for (const f of [navigate, getSession, getIdentityCheckQueue, getIdentityCheckDetail, recordIdentityCheck, revealIdentityCheckMobile]) f.mockReset();
  params = { pariwarId: PARIWAR };
});

describe('the queue', () => {
  it('⭐ the empty copy (DL12, verbatim)', async () => {
    getIdentityCheckQueue.mockResolvedValue({ entries: [], can_check: true });
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    expect(await screen.findByTestId('identity-checks-empty')).toHaveTextContent('No member is waiting for an identity check.');
    expect(screen.getByRole('heading')).toHaveTextContent('Identity checks');
  });

  it('a District / Pariwar Admin (can_check) opens a row for the detail; ⛔ a name or a mobile on the row', async () => {
    getIdentityCheckQueue.mockResolvedValue({ entries: [entry], can_check: true });
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    const row = await screen.findByTestId(`identity-checks-item-${M}`);
    expect(row).toHaveTextContent('11111111');
    expect(row).toHaveTextContent('Patna');
    expect(screen.queryByTestId(`reveal-mobile-button-${M}`)).toBeNull();
    fireEvent.click(screen.getByTestId(`identity-checks-open-${M}`));
    expect(navigate).toHaveBeenCalledWith({ to: '/p/$pariwarId/identity-checks/$memberId', params: { pariwarId: PARIWAR, memberId: M } });
  });

  it('⭐ a verifier / helpline operator (⛔ can_check) sees the list and the press, ⛔ Open (⛔ the identity or the forms)', async () => {
    getIdentityCheckQueue.mockResolvedValue({ entries: [entry], can_check: false });
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    expect(await screen.findByTestId(`reveal-mobile-button-${M}`)).toHaveTextContent('Show mobile number');
    expect(screen.queryByTestId(`identity-checks-open-${M}`)).toBeNull();
    expect(screen.queryByTestId('identity-check-forms')).toBeNull();
  });

  it('a 403 shows the no-access line', async () => {
    getIdentityCheckQueue.mockRejectedValue(new ApiError(403, 'rbac.forbidden', 'no'));
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    expect(await screen.findByTestId('identity-checks-forbidden')).toHaveTextContent(t.queue.forbidden);
  });
});

describe('the detail', () => {
  it('shows the lead (DL12, verbatim), the typed-in identity and the MASKED mobile; the forms for an awaited check', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    expect(await screen.findByTestId('identity-check-lead')).toHaveTextContent(
      'This member typed in their identity details when they joined. Check them against an original photo ID, shown to you in person or on a video call. Do not copy or keep the document or its number.',
    );
    expect(screen.getByTestId('identity-check-name')).toHaveTextContent('Sita Devi');
    expect(screen.getByTestId('identity-check-masked-mobile')).toHaveTextContent('+91·····1234');
    expect(screen.getByTestId('identity-check-confirm')).toHaveTextContent('Confirm identity');
    expect(screen.getByTestId('identity-check-could-not-confirm')).toHaveTextContent('Could not confirm');
  });

  it('⭐ a claim filed for the death: the banner (DL12, verbatim) and ⛔ the forms, ⛔ the press', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail({ death_reported: true, eligible: false }));
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    expect(await screen.findByTestId('identity-check-death-banner')).toHaveTextContent(
      'The Trust has been told this member has died. Their identity is checked on the claim instead.',
    );
    expect(screen.queryByTestId('identity-check-forms')).toBeNull();
    expect(screen.queryByTestId(`reveal-mobile-button-${M}`)).toBeNull();
  });

  it('a member who needs no check: the not-eligible line and ⛔ the forms', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail({ eligible: false }));
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    expect(await screen.findByTestId('identity-check-not-eligible')).toHaveTextContent('This member does not need an identity check.');
    expect(screen.queryByTestId('identity-check-forms')).toBeNull();
  });

  it('⭐ "Could not confirm" needs a note BEFORE anything is sent', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    fireEvent.change(await screen.findByTestId('not-confirmed-reason'), { target: { value: 'member_not_reached' } });
    fireEvent.click(screen.getByTestId('identity-check-could-not-confirm'));
    expect(await screen.findByTestId('identity-check-note-required')).toHaveTextContent(t.form.noteRequired);
    expect(recordIdentityCheck).not.toHaveBeenCalled();
    // The control: with a note, it IS sent — ⛔ evidence or document for "could not reach the member".
    recordIdentityCheck.mockResolvedValue({ validation_id: M, outcome: 'not_confirmed', superseded_validation_id: null, state: 'lock-in', kyc_completed: false });
    fireEvent.change(screen.getByTestId('not-confirmed-note'), { target: { value: 'Phoned twice, no answer' } });
    fireEvent.click(screen.getByTestId('identity-check-could-not-confirm'));
    await waitFor(() => expect(recordIdentityCheck).toHaveBeenCalledTimes(1));
    expect(recordIdentityCheck.mock.calls[0]!.slice(0, 3)).toEqual([
      PARIWAR,
      M,
      { outcome: 'not_confirmed', not_confirmed_reason: 'member_not_reached', evidence_kind: null, document_kind: null, note: 'Phoned twice, no answer' },
    ]);
    expect(typeof recordIdentityCheck.mock.calls[0]![3]).toBe('string'); // the Idempotency-Key
  });

  it('⭐ a 409 `not_eligible` shows the not-eligible line and hides the forms', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    recordIdentityCheck.mockRejectedValue(new ApiError(409, 'identity_validation.not_eligible', 'no'));
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    fireEvent.change(await screen.findByTestId('confirm-evidence'), { target: { value: 'photo_id_in_person' } });
    fireEvent.change(screen.getByTestId('confirm-document'), { target: { value: 'voter_id' } });
    fireEvent.click(screen.getByTestId('identity-check-confirm'));
    expect(await screen.findByTestId('identity-check-not-eligible')).toHaveTextContent(t.detail.notEligible);
    expect(screen.queryByTestId('identity-check-forms')).toBeNull();
  });

  it('⭐ a successful confirmation REFRESHES the detail (the history shows the approved line)', async () => {
    getIdentityCheckDetail.mockResolvedValueOnce(detail()).mockResolvedValue(
      detail({
        eligible: false,
        history: [
          {
            validation_id: M,
            outcome: 'confirmed',
            evidence_kind: 'photo_id_in_person',
            document_kind: 'voter_id',
            not_confirmed_reason: null,
            decided_by_display: 'Asha',
            decided_at: '2026-11-25T05:30:00.000Z',
            live: true,
            note: null,
          },
        ],
      }),
    );
    recordIdentityCheck.mockResolvedValue({ validation_id: M, outcome: 'confirmed', superseded_validation_id: null, state: 'lock-in', kyc_completed: false });
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    fireEvent.change(await screen.findByTestId('confirm-evidence'), { target: { value: 'photo_id_video_call' } });
    fireEvent.change(screen.getByTestId('confirm-document'), { target: { value: 'passport' } });
    fireEvent.click(screen.getByTestId('identity-check-confirm'));
    expect(await screen.findByTestId(`identity-check-history-${M}`)).toHaveTextContent('Identity confirmed by Asha on 25 Nov 2026.');
    expect(getIdentityCheckDetail).toHaveBeenCalledTimes(2);
    expect(recordIdentityCheck.mock.calls[0]![2]).toEqual({ outcome: 'confirmed', evidence_kind: 'photo_id_video_call', document_kind: 'passport' });
  });

  it('a not-confirmed history line uses the approved reason words', async () => {
    getIdentityCheckDetail.mockResolvedValue(
      detail({
        history: [
          { validation_id: M, outcome: 'not_confirmed', evidence_kind: 'photo_id_in_person', document_kind: null, not_confirmed_reason: 'no_document_shown', decided_by_display: 'Asha', decided_at: '2026-11-25T05:30:00.000Z', live: true, note: 'came without ID' },
        ],
      }),
    );
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    expect(await screen.findByTestId(`identity-check-history-${M}`)).toHaveTextContent('Not confirmed on 25 Nov 2026: No ID was shown.');
    expect(screen.getByTestId('identity-check-live-note')).toHaveTextContent('came without ID');
  });
});

describe('"Show mobile number" (DL6a)', () => {
  it('⭐ ONE call per press; the number, then the two approved lines', async () => {
    getIdentityCheckQueue.mockResolvedValue({ entries: [entry], can_check: false });
    revealIdentityCheckMobile.mockResolvedValue({ mobile: '+919876501234' });
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByTestId(`reveal-mobile-button-${M}`));
    const shown = await screen.findByTestId(`reveal-mobile-shown-${M}`);
    expect(shown).toHaveTextContent('+919876501234');
    expect(shown).toHaveTextContent('Shown to you only to arrange this identity check.');
    expect(shown).toHaveTextContent('This showing is recorded.');
    expect(revealIdentityCheckMobile).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId(`reveal-mobile-button-${M}`));
    await waitFor(() => expect(revealIdentityCheckMobile).toHaveBeenCalledTimes(2));
  });

  it('a refused press shows the approved refused line and ⛔ a number', async () => {
    getIdentityCheckQueue.mockResolvedValue({ entries: [entry], can_check: false });
    revealIdentityCheckMobile.mockRejectedValue(new ApiError(409, 'identity_validation.not_eligible', 'no'));
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByTestId(`reveal-mobile-button-${M}`));
    expect(await screen.findByTestId(`reveal-mobile-refused-${M}`)).toHaveTextContent("This member's number can no longer be shown here.");
    expect(screen.queryByTestId(`reveal-mobile-shown-${M}`)).toBeNull();
    expect(revealIdentityCheckMobile).toHaveBeenCalledTimes(1);
  });
});

describe('the console nav (DL13)', () => {
  it('⭐ inside a Pariwar, the nav links to the identity-check queue', async () => {
    getSession.mockResolvedValue({ userId: M, nationalGrants: [] });
    renderWithClient(<RootLayout />);
    expect(await screen.findByTestId('nav-identity-checks')).toHaveAttribute('href', '/p/$pariwarId/identity-checks');
  });
});

describe('DL12 — the approved words', () => {
  it('the reasons, the two lines and the 6.39 label read exactly as approved', () => {
    expect(t.reasons).toEqual({
      details_do_not_match: 'Details do not match the ID',
      photo_does_not_match: 'Photo does not match',
      no_document_shown: 'No ID was shown',
      member_not_reached: 'Could not reach the member',
    });
    expect(t.history).toEqual({ confirmed: 'Identity confirmed by {name} on {date}.', notConfirmed: 'Not confirmed on {date}: {reason}.' });
    expect(t.reveal).toEqual({
      button: 'Show mobile number',
      purpose: 'Shown to you only to arrange this identity check.',
      recorded: 'This showing is recorded.',
      refused: "This member's number can no longer be shown here.",
    });
    expect(JSON.stringify(verifierConsoleEn)).toContain('"trustee_verified":"Typed in at joining, checked by staff"');
  });
});
