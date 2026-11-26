// Story 3.13 (AC11, AC14) — the identity-check admin module, with the ROUTER STUBBED (the fraud-investigation surfaces' style):
//
//   · the queue — empty copy; a District / Pariwar Admin's Open; a verifier / helpline operator's list + the press, ⛔ Open;
//   · the detail — the claim-filed-for-the-death banner hides the forms; a not-needed member hides them; "Could not confirm"
//     needs a note before anything is sent; a 409 shows the not-eligible line; a confirmation refreshes the detail;
//   · "Show mobile number" — ONE call per press, the shown lines, the refused line;
//   · the console nav link (DL13 — a page in the router alone has ⛔ way in);
//   · DL12 — the approved words, pinned verbatim.
// Code review 2026-11-26 (`-504`) adds: the queue's PAGING (P4); the sign-in `next` of both pages (P5); the number's lifetime — 60 s,
// a hidden tab, ⛔ the mutation cache — and its live region (P9); the refusal / failure lines, the saved lines, the invalidation
// after a 409, the required selects with `aria-invalid` + focus (P10); the member's state (P14); the nav `Link` stub that now
// renders its params (P18).
// Round 2 (an adversarial review of the above) adds: the pager that stays mounted (keepPreviousData), steps back from a later page
// that empties and survives an error; the number's mutation reset and its always-mounted live region; the detail that keeps its
// data when a refetch fails, hides everything the moment a confirmation is saved, drops the marks of selects that unmount, moves
// focus to an always-mounted saved line, forgets a stale refusal and one member's page state; no raw state name; no Mobile row
// without a masked number.
// The real-browser pass is a GO-LIVE leg (roster Row 57 (c)), ⛔ this file.

import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../src/api/client.js';
import { createQueryClient } from '../src/api/hooks.js';
import { renderWithClient } from './_helpers.js';

const navigate = vi.fn();
let params: Record<string, string> = {};
vi.mock('@tanstack/react-router', () => ({
  // ⭐ The stub renders the route's PARAMS into the href (P18) — a wrong or missing param shows up in the link, ⛔ passes.
  Link: (p: { children: ReactNode; to: string; params?: Record<string, string>; 'data-testid'?: string }) => (
    <a href={p.to.replace(/\$(\w+)/g, (m, k: string) => p.params?.[k] ?? m)} data-testid={p['data-testid']}>
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

const { IdentityChecksRoute, IdentityChecksView } = await import('../src/modules/identity-checks/IdentityChecksPage.js');
const { IdentityCheckDetailRoute, IdentityCheckDetailView } = await import('../src/modules/identity-checks/IdentityCheckDetailPage.js');
const { identityCheckEn: t } = await import('../src/modules/identity-checks/i18n-en.js');
const { identityCheckDetailKey, identityCheckQueueKey, useIdentityCheckDetail, useRevealIdentityCheckMobile } = await import(
  '../src/modules/identity-checks/hooks.js'
);
const { RevealMobile } = await import('../src/modules/identity-checks/RevealMobile.js');
const { allowedNextReturn } = await import('../src/routes/login-next.js');
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
    getIdentityCheckQueue.mockResolvedValue({ entries: [], can_check: true, has_more: false });
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    expect(await screen.findByTestId('identity-checks-empty')).toHaveTextContent('No member is waiting for an identity check.');
    expect(screen.getByRole('heading')).toHaveTextContent('Identity checks');
  });

  it('a District / Pariwar Admin (can_check) opens a row for the detail; ⛔ a name or a mobile on the row', async () => {
    getIdentityCheckQueue.mockResolvedValue({ entries: [entry], can_check: true, has_more: false });
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    const row = await screen.findByTestId(`identity-checks-item-${M}`);
    expect(row).toHaveTextContent('11111111');
    expect(row).toHaveTextContent('Patna');
    expect(screen.queryByTestId(`reveal-mobile-button-${M}`)).toBeNull();
    fireEvent.click(screen.getByTestId(`identity-checks-open-${M}`));
    expect(navigate).toHaveBeenCalledWith({ to: '/p/$pariwarId/identity-checks/$memberId', params: { pariwarId: PARIWAR, memberId: M } });
  });

  it('⭐ a verifier / helpline operator (⛔ can_check) sees the list and the press, ⛔ Open (⛔ the identity or the forms)', async () => {
    getIdentityCheckQueue.mockResolvedValue({ entries: [entry], can_check: false, has_more: false });
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
    getIdentityCheckDetail.mockResolvedValue(detail({ death_reported: true, eligible: false, identity: null, masked_mobile: null }));
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    expect(await screen.findByTestId('identity-check-death-banner')).toHaveTextContent(
      'The Trust has been told this member has died. Their identity is checked on the claim instead.',
    );
    expect(screen.queryByTestId('identity-check-forms')).toBeNull();
    expect(screen.queryByTestId(`reveal-mobile-button-${M}`)).toBeNull();
  });

  it('a member who needs no check: the not-eligible line and ⛔ the forms', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail({ eligible: false, identity: null, masked_mobile: null }));
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

  it('⭐ a 409 `not_eligible` shows the not-eligible line and hides the forms (and the re-read agrees)', async () => {
    getIdentityCheckDetail.mockResolvedValueOnce(detail()).mockResolvedValue(detail({ eligible: false, identity: null, masked_mobile: null }));
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
        identity: null,
        masked_mobile: null,
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
    getIdentityCheckQueue.mockResolvedValue({ entries: [entry], can_check: false, has_more: false });
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
    getIdentityCheckQueue.mockResolvedValue({ entries: [entry], can_check: false, has_more: false });
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
    // ⭐ The REAL param, rendered by the stub — `/p/$pariwarId/…` (a param that never arrived) or another id would fail here.
    expect(await screen.findByTestId('nav-identity-checks')).toHaveAttribute('href', `/p/${PARIWAR}/identity-checks`);
  });
});

describe('DL12 — the approved words', () => {
  it('⭐ code review D3 (`-504` item 6): the three added lines read exactly as BigDev approved them, and the paging words are the console\'s own', async () => {
    expect(t.reveal.couldNotShow).toBe('The number could not be shown. Try again.');
    expect(t.form.savedConfirmed).toBe('Identity confirmed.');
    expect(t.form.savedNotConfirmed).toBe('Saved.');
    // The paging words are the console's own (the banners list) — ⛔ a second wording for the same two buttons.
    const { resolveEn } = await import('../src/modules/banners/i18n-en.js');
    expect(t.queue.previous).toBe(resolveEn('banner.page.prev'));
    expect(t.queue.next).toBe(resolveEn('banner.page.next'));
    expect([t.queue.previous, t.queue.next]).toEqual(['Previous', 'Next']);
  });

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
      couldNotShow: 'The number could not be shown. Try again.',
    });
    expect(JSON.stringify(verifierConsoleEn)).toContain('"trustee_verified":"Typed in at joining, checked by staff"');
  });
});

// ── Code review 2026-11-26 (`-504`) ─────────────────────────────────────────────────────────────────────────────────

const MOBILE = '+919876501234';
const PRESS = (id: string) => `reveal-mobile-button-${id}`;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('⭐ P4 — the queue is PAGED: the request carries the offset, "Next" only while `has_more`', () => {
  const entryB = { ...entry, member_id: '22222222-2222-4222-8222-222222222222', short_member_id: '22222222' };
  const pages = (offset: number) =>
    Promise.resolve(
      offset === 0
        ? { entries: [entry], can_check: true, has_more: true }
        : offset === 50
          ? { entries: [entryB], can_check: true, has_more: false }
          : { entries: [], can_check: true, has_more: false },
    );

  it('Next asks for offset 50, Previous asks for offset 0; each edge button is disabled where there is nothing to go to', async () => {
    getIdentityCheckQueue.mockImplementation((_pariwar: string, offset: number) => pages(offset));
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    await screen.findByTestId(`identity-checks-item-${M}`);
    expect(getIdentityCheckQueue).toHaveBeenLastCalledWith(PARIWAR, 0);
    expect(screen.getByTestId('identity-checks-page-prev')).toHaveTextContent('Previous');
    expect(screen.getByTestId('identity-checks-page-next')).toHaveTextContent('Next');
    expect(screen.getByTestId('identity-checks-page-prev')).toBeDisabled();
    expect(screen.getByTestId('identity-checks-page-next')).toBeEnabled();

    fireEvent.click(screen.getByTestId('identity-checks-page-next'));
    await screen.findByTestId(`identity-checks-item-${entryB.member_id}`);
    expect(screen.queryByTestId(`identity-checks-item-${M}`)).toBeNull();
    expect(getIdentityCheckQueue).toHaveBeenLastCalledWith(PARIWAR, 50);
    expect(screen.getByTestId('identity-checks-page-prev')).toBeEnabled();
    expect(screen.getByTestId('identity-checks-page-next')).toBeDisabled(); // has_more is false here

    fireEvent.click(screen.getByTestId('identity-checks-page-prev'));
    await screen.findByTestId(`identity-checks-item-${M}`);
    expect(getIdentityCheckQueue.mock.calls.map((c) => c[1])).toEqual([0, 50, 0]);
  });

  it('no page controls when there is nothing to page (an empty first page, a 403)', async () => {
    getIdentityCheckQueue.mockResolvedValue({ entries: [], can_check: true, has_more: false });
    const first = renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    await screen.findByTestId('identity-checks-empty');
    expect(screen.queryByTestId('identity-checks-page-prev')).toBeNull();
    first.unmount();
    getIdentityCheckQueue.mockRejectedValue(new ApiError(403, 'rbac.forbidden', 'no'));
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    await screen.findByTestId('identity-checks-forbidden');
    expect(screen.queryByTestId('identity-checks-page-next')).toBeNull();
  });

  it('⭐ the REAL client sends `limit=50&offset=<n>` (⛔ the old hard-coded `limit=200` with no offset)', async () => {
    const real = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
    const fetchSpy = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ entries: [], can_check: true, has_more: false }), { status: 200 })));
    vi.stubGlobal('fetch', fetchSpy);
    try {
      await real.getIdentityCheckQueue(PARIWAR);
      await real.getIdentityCheckQueue(PARIWAR, 50);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(real.IDENTITY_CHECK_QUEUE_PAGE_SIZE).toBe(50);
    expect(fetchSpy.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      `/api/v1/p/${PARIWAR}/admin/members/identity-checks?limit=50&offset=0`,
      `/api/v1/p/${PARIWAR}/admin/members/identity-checks?limit=50&offset=50`,
    ]);
  });
});

describe('⭐ P5 — a signed-out admin is sent to sign-in WITH the page\'s own path, and that path is one the allowlist follows', () => {
  const P = '2b7c0a4e-5d1f-4e8a-9c3b-1f2e3d4c5b6a';
  const MEMBER = 'a1b2c3d4-1111-4222-8333-444455556666';

  it('the queue: a session error ⇒ /login?next=<its path> (a re-cased id lower-cased)', async () => {
    getSession.mockRejectedValue(new ApiError(401, 'auth.unauthenticated', 'no'));
    params = { pariwarId: P.toUpperCase() };
    renderWithClient(<IdentityChecksRoute />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login', search: { next: `/p/${P}/identity-checks` } }));
    const { next } = navigate.mock.calls.at(-1)![0].search as { next: string };
    expect(allowedNextReturn(next)).toEqual({ to: '/p/$pariwarId/identity-checks', pariwarId: P });
  });

  it('a member\'s identity check: a session error ⇒ /login?next=<its path>, the member id too', async () => {
    getSession.mockRejectedValue(new ApiError(401, 'auth.unauthenticated', 'no'));
    params = { pariwarId: P.toUpperCase(), memberId: MEMBER.toUpperCase() };
    renderWithClient(<IdentityCheckDetailRoute />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login', search: { next: `/p/${P}/identity-checks/${MEMBER}` } }));
    const { next } = navigate.mock.calls.at(-1)![0].search as { next: string };
    expect(allowedNextReturn(next)).toEqual({ to: '/p/$pariwarId/identity-checks/$memberId', pariwarId: P, memberId: MEMBER });
  });

  it('a 401 on the queue, and on the detail read, send the admin to sign-in the same way', async () => {
    getIdentityCheckQueue.mockRejectedValue(new ApiError(401, 'auth.unauthenticated', 'no'));
    const queue = renderWithClient(<IdentityChecksView pariwarId={P} />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login', search: { next: `/p/${P}/identity-checks` } }));
    queue.unmount();
    getIdentityCheckDetail.mockRejectedValue(new ApiError(401, 'auth.unauthenticated', 'no'));
    renderWithClient(<IdentityCheckDetailView pariwarId={P} memberId={MEMBER} />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login', search: { next: `/p/${P}/identity-checks/${MEMBER}` } }));
  });
});

describe('⭐ P9 — the revealed number: its lifetime and its live region', () => {
  afterEach(() => {
    vi.useRealTimers();
    // Put back the document's own `visibilityState` (the prototype getter) if a test shadowed it.
    delete (document as unknown as Record<string, unknown>)['visibilityState'];
    vi.restoreAllMocks();
  });
  const setVisibility = (v: 'visible' | 'hidden'): void => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
  };
  const showWithRealTimers = async () => {
    revealIdentityCheckMobile.mockResolvedValue({ mobile: MOBILE });
    const view = renderWithClient(<RevealMobile pariwarId={PARIWAR} memberId={M} />);
    fireEvent.click(screen.getByTestId(PRESS(M)));
    const shown = await screen.findByTestId(`reveal-mobile-shown-${M}`);
    return { view, shown };
  };

  it('⭐ the live region (`role="status"`) is ALWAYS mounted — empty until a press — and the number block is rendered INTO it (a region inserted already populated is often ignored)', async () => {
    revealIdentityCheckMobile.mockResolvedValue({ mobile: MOBILE });
    renderWithClient(<RevealMobile pariwarId={PARIWAR} memberId={M} />);
    const region = screen.getByTestId(`reveal-mobile-live-${M}`);
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toBeEmptyDOMElement();
    fireEvent.click(screen.getByTestId(PRESS(M)));
    const shown = await screen.findByTestId(`reveal-mobile-shown-${M}`);
    expect(screen.getByTestId(`reveal-mobile-live-${M}`)).toBe(region); // the SAME node, filled — not a new one
    expect(region).toContainElement(shown);
    expect(region).toHaveTextContent(MOBILE);
  });

  it('⭐ the number clears after 60 seconds — and a NEW press (a new audited showing) restarts the minute', async () => {
    vi.useFakeTimers();
    revealIdentityCheckMobile.mockResolvedValue({ mobile: MOBILE });
    renderWithClient(<RevealMobile pariwarId={PARIWAR} memberId={M} />);
    const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
    const press = async () => {
      fireEvent.click(screen.getByTestId(PRESS(M)));
      await advance(10);
    };
    await press();
    expect(screen.getByTestId(`reveal-mobile-shown-${M}`)).toHaveTextContent(MOBILE);
    await advance(59_000);
    expect(screen.queryByTestId(`reveal-mobile-shown-${M}`)).not.toBeNull(); // not yet — 59 s in

    await press(); // the second showing: its own minute starts here
    await advance(59_000);
    expect(screen.queryByTestId(`reveal-mobile-shown-${M}`)).not.toBeNull(); // 118 s after the first press, 59 s after the second
    await advance(2_000);
    expect(screen.queryByTestId(`reveal-mobile-shown-${M}`)).toBeNull();
    expect(screen.queryByText(MOBILE)).toBeNull();
    expect(revealIdentityCheckMobile).toHaveBeenCalledTimes(2);
  });

  it('⭐ the number clears the moment the document is hidden (a visible one keeps it)', async () => {
    await showWithRealTimers();
    setVisibility('visible');
    expect(screen.queryByTestId(`reveal-mobile-shown-${M}`)).not.toBeNull();
    setVisibility('hidden');
    expect(screen.queryByTestId(`reveal-mobile-shown-${M}`)).toBeNull();
    expect(screen.queryByText(MOBILE)).toBeNull();
  });

  it('the timer and the listener go away with the component (⛔ one that outlives it)', async () => {
    vi.useFakeTimers();
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    revealIdentityCheckMobile.mockResolvedValue({ mobile: MOBILE });
    const view = renderWithClient(<RevealMobile pariwarId={PARIWAR} memberId={M} />);
    fireEvent.click(screen.getByTestId(PRESS(M)));
    await act(async () => void (await vi.advanceTimersByTimeAsync(10)));
    expect(screen.queryByTestId(`reveal-mobile-shown-${M}`)).not.toBeNull();
    const listener = add.mock.calls.find((c) => c[0] === 'visibilitychange')?.[1];
    expect(listener).toBeDefined();
    view.unmount();
    expect(remove).toHaveBeenCalledWith('visibilitychange', listener);
    await act(async () => void (await vi.advanceTimersByTimeAsync(10))); // the mutation's own housekeeping timer
    expect(vi.getTimerCount()).toBe(0); // ⛔ a 60-second timer left running
  });
});

describe('⭐ P9 — the hooks keep ⛔ the number and ⛔ the decrypted identity in a cache, and ⛔ re-read the identity on their own', () => {
  // The LIBRARY's own defaults (gcTime 5 min, retry 3, refetch on reconnect) — ⛔ `createQueryClient`'s test-friendly gcTime 0,
  // which would hide a missing option.
  const wrapperFor = (client: QueryClient) => {
    const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return Wrapper;
  };

  it('the reveal mutation leaves the mutation cache once its component is gone (`gcTime: 0`)', async () => {
    const client = new QueryClient();
    revealIdentityCheckMobile.mockResolvedValue({ mobile: MOBILE });
    const { result, unmount } = renderHook(() => useRevealIdentityCheckMobile(PARIWAR, M), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(client.getMutationCache().getAll()).toHaveLength(1); // while the component is there
    unmount();
    await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0));
  });

  it('the detail read is ONE fetch: ⛔ a reconnect refetch, ⛔ a focus refetch; and the decrypted identity leaves the cache on unmount', async () => {
    const client = new QueryClient();
    getIdentityCheckDetail.mockResolvedValue(detail());
    const { result, unmount } = renderHook(() => useIdentityCheckDetail(PARIWAR, M), { wrapper: wrapperFor(client) });
    try {
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await act(async () => {
        onlineManager.setOnline(false);
        onlineManager.setOnline(true); // a reconnect is not a new view
        focusManager.setFocused(false);
        focusManager.setFocused(true); // ⛔ nor is a window focus
        await sleep(30);
      });
      expect(getIdentityCheckDetail).toHaveBeenCalledTimes(1);
      expect(client.getQueryCache().find({ queryKey: identityCheckDetailKey(PARIWAR, M) })).toBeDefined(); // while the page is there
      unmount();
      await waitFor(() => expect(client.getQueryCache().find({ queryKey: identityCheckDetailKey(PARIWAR, M) })).toBeUndefined());
    } finally {
      onlineManager.setOnline(true);
      focusManager.setFocused(undefined);
    }
  });

  it('a refused or failed detail read (503) is ⛔ retried — every fetch decrypts the identity again, for no gain', async () => {
    const client = new QueryClient(); // the library default would retry three times, a second apart
    getIdentityCheckDetail.mockRejectedValue(new ApiError(503, 'identity_validation.audit_unavailable', 'no'));
    const { result } = renderHook(() => useIdentityCheckDetail(PARIWAR, M), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    await sleep(30);
    expect(getIdentityCheckDetail).toHaveBeenCalledTimes(1);
  });
});

describe('⭐ P10 — the number press: only the server\'s own refusal says "can no longer be shown"', () => {
  const failures: Array<[string, () => unknown]> = [
    ['401 (the session ended)', () => new ApiError(401, 'auth.unauthenticated', 'no')],
    ['429 (rate limited)', () => new ApiError(429, 'rate_limited', 'no')],
    ['500', () => new ApiError(500, 'http.500', 'no')],
    ['503 (the audit line could not be written)', () => new ApiError(503, 'identity_validation.audit_unavailable', 'no')],
    ['a 409 that is not `identity_validation.*`', () => new ApiError(409, 'idempotency.in_progress', 'no')],
    ['a network failure', () => new TypeError('Failed to fetch')],
  ];

  it.each(failures)('%s ⇒ the approved could-not-show line (an alert), ⛔ the refused line, ⛔ a number, and the press stays available', async (_name, make) => {
    getIdentityCheckQueue.mockResolvedValue({ entries: [entry], can_check: false, has_more: false });
    revealIdentityCheckMobile.mockRejectedValue(make());
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByTestId(PRESS(M)));
    const line = await screen.findByTestId(`reveal-mobile-could-not-show-${M}`);
    expect(line).toHaveTextContent('The number could not be shown. Try again.');
    expect(line).toHaveAttribute('role', 'alert');
    expect(screen.queryByTestId(`reveal-mobile-refused-${M}`)).toBeNull();
    expect(screen.queryByTestId(`reveal-mobile-shown-${M}`)).toBeNull();
    expect(screen.getByTestId(PRESS(M))).toBeEnabled();
  });

  it.each(['identity_validation.not_eligible', 'identity_validation.death_reported'])('a 409 `%s` ⇒ the refused line, ⛔ the could-not-show line', async (code) => {
    getIdentityCheckQueue.mockResolvedValue({ entries: [entry], can_check: false, has_more: false });
    revealIdentityCheckMobile.mockRejectedValue(new ApiError(409, code, 'no'));
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByTestId(PRESS(M)));
    expect(await screen.findByTestId(`reveal-mobile-refused-${M}`)).toHaveTextContent("This member's number can no longer be shown here.");
    expect(screen.queryByTestId(`reveal-mobile-could-not-show-${M}`)).toBeNull();
  });

  it('a press that follows a failure works, and the failure line is gone', async () => {
    getIdentityCheckQueue.mockResolvedValue({ entries: [entry], can_check: false, has_more: false });
    revealIdentityCheckMobile.mockRejectedValueOnce(new ApiError(500, 'http.500', 'no')).mockResolvedValue({ mobile: MOBILE });
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByTestId(PRESS(M)));
    await screen.findByTestId(`reveal-mobile-could-not-show-${M}`);
    fireEvent.click(screen.getByTestId(PRESS(M)));
    expect(await screen.findByTestId(`reveal-mobile-shown-${M}`)).toHaveTextContent(MOBILE);
    expect(screen.queryByTestId(`reveal-mobile-could-not-show-${M}`)).toBeNull();
  });
});

describe('⭐ P10 — saving: the page says it was saved; a refusal refreshes the page; the forms insist on their choices', () => {
  const chooseConfirm = async () => {
    fireEvent.change(await screen.findByTestId('confirm-evidence'), { target: { value: 'photo_id_in_person' } });
    fireEvent.change(screen.getByTestId('confirm-document'), { target: { value: 'voter_id' } });
  };
  const confirmedDetail = () =>
    detail({
      eligible: false,
      identity: null,
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
    });

  it('⭐ after a CONFIRMATION: "Identity confirmed." (a status), the forms gone, ⛔ "does not need an identity check" — not even for one render', async () => {
    getIdentityCheckDetail.mockResolvedValueOnce(detail()).mockResolvedValue(confirmedDetail());
    recordIdentityCheck.mockResolvedValue({ validation_id: M, outcome: 'confirmed', superseded_validation_id: null, state: 'lock-in', kyc_completed: false });
    const everSeen: string[] = [];
    const watch = new MutationObserver(() => {
      if (document.querySelector('[data-testid="identity-check-not-eligible"]')) everSeen.push('not-eligible line');
    });
    watch.observe(document.body, { childList: true, subtree: true });
    try {
      renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
      await chooseConfirm();
      fireEvent.click(screen.getByTestId('identity-check-confirm'));
      await screen.findByTestId(`identity-check-history-${M}`); // the refetched detail is on screen
      expect(screen.getByTestId('identity-check-saved')).toHaveTextContent('Identity confirmed.');
      expect(screen.getByTestId('identity-check-saved-region')).toHaveAttribute('role', 'status');
      expect(screen.queryByTestId('identity-check-forms')).toBeNull();
      expect(screen.queryByTestId('identity-check-not-eligible')).toBeNull();
      await sleep(10);
      expect(everSeen).toEqual([]);
    } finally {
      watch.disconnect();
    }
  });

  it('after a NOT-CONFIRMED: "Saved." (a status), the forms stay and are cleared', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    recordIdentityCheck.mockResolvedValue({ validation_id: M, outcome: 'not_confirmed', superseded_validation_id: null, state: 'lock-in', kyc_completed: false });
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    fireEvent.change(await screen.findByTestId('not-confirmed-reason'), { target: { value: 'member_not_reached' } });
    fireEvent.change(screen.getByTestId('not-confirmed-note'), { target: { value: 'Phoned twice' } });
    fireEvent.click(screen.getByTestId('identity-check-could-not-confirm'));
    const saved = await screen.findByTestId('identity-check-saved');
    expect(saved).toHaveTextContent(/^Saved\.$/);
    expect(screen.getByTestId('identity-check-saved-region')).toContainElement(saved);
    expect(screen.getByTestId('identity-check-forms')).toBeInTheDocument();
    expect(screen.getByTestId('not-confirmed-note')).toHaveValue('');
    expect(screen.queryByTestId('identity-check-not-eligible')).toBeNull();
  });

  it('the acknowledgement is gone as soon as the next attempt starts, and a failed save shows the save error and ⛔ a saved line', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    recordIdentityCheck
      .mockResolvedValueOnce({ validation_id: M, outcome: 'not_confirmed', superseded_validation_id: null, state: 'lock-in', kyc_completed: false })
      .mockRejectedValueOnce(new ApiError(500, 'http.500', 'no'));
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    const record = async (note: string) => {
      fireEvent.change(await screen.findByTestId('not-confirmed-reason'), { target: { value: 'member_not_reached' } });
      fireEvent.change(screen.getByTestId('not-confirmed-note'), { target: { value: note } });
      fireEvent.click(screen.getByTestId('identity-check-could-not-confirm'));
    };
    await record('first');
    await screen.findByTestId('identity-check-saved');
    await record('second');
    expect(await screen.findByTestId('identity-check-save-error')).toHaveTextContent(t.form.saveError);
    expect(screen.queryByTestId('identity-check-saved')).toBeNull();
  });

  it('⭐ a 409 refusal REFRESHES the detail and the queue (the history and the banner must show what changed)', async () => {
    getIdentityCheckDetail.mockResolvedValueOnce(detail()).mockResolvedValue(detail({ death_reported: true, eligible: false, identity: null, masked_mobile: null }));
    recordIdentityCheck.mockRejectedValue(new ApiError(409, 'identity_validation.death_reported', 'no'));
    const client = createQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    render(
      <QueryClientProvider client={client}>
        <IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />
      </QueryClientProvider>,
    );
    await chooseConfirm();
    fireEvent.click(screen.getByTestId('identity-check-confirm'));
    expect(await screen.findByTestId('identity-check-death-banner')).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: identityCheckDetailKey(PARIWAR, M) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: identityCheckQueueKey(PARIWAR) });
    await waitFor(() => expect(getIdentityCheckDetail).toHaveBeenCalledTimes(2)); // the detail IS re-read
    expect(screen.queryByTestId('identity-check-saved')).toBeNull();
  });

  it('a 409 that is not a standing refusal (a concurrent save) shows the save error and refreshes nothing', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    recordIdentityCheck.mockRejectedValue(new ApiError(409, 'identity_validation.concurrent', 'no'));
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    await chooseConfirm();
    fireEvent.click(screen.getByTestId('identity-check-confirm'));
    expect(await screen.findByTestId('identity-check-save-error')).toBeInTheDocument();
    await sleep(20);
    expect(getIdentityCheckDetail).toHaveBeenCalledTimes(1);
  });

  it('a 401 on a save sends the admin to sign-in, back to this member', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    recordIdentityCheck.mockRejectedValue(new ApiError(401, 'auth.unauthenticated', 'no'));
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    await chooseConfirm();
    fireEvent.click(screen.getByTestId('identity-check-confirm'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login', search: { next: `/p/${PARIWAR}/identity-checks/${M}` } }));
    expect(screen.queryByTestId('identity-check-save-error')).toBeNull();
  });

  it('⭐ the selects are `required`; the browser\'s own handling stops an empty one and the control says `aria-invalid` (⛔ new words, ⛔ a send)', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    const evidence = await screen.findByTestId('confirm-evidence');
    const document_ = screen.getByTestId('confirm-document');
    expect(evidence).toBeRequired();
    expect(document_).toBeRequired();
    expect(screen.getByTestId('not-confirmed-reason')).toBeRequired();
    fireEvent.click(screen.getByTestId('identity-check-confirm')); // jsdom runs the constraint validation a click on a submit button runs
    await waitFor(() => expect(evidence).toHaveAttribute('aria-invalid', 'true'));
    expect(document_).toHaveAttribute('aria-invalid', 'true');
    expect(recordIdentityCheck).not.toHaveBeenCalled();
    // Choosing clears the mark on that control only.
    fireEvent.change(evidence, { target: { value: 'photo_id_in_person' } });
    expect(evidence).not.toHaveAttribute('aria-invalid');
    expect(document_).toHaveAttribute('aria-invalid', 'true');
  });

  it('⭐ the submit guard (the backstop when validation is bypassed) marks EVERY empty select `aria-invalid` and focuses the FIRST — Confirm', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    const evidence = await screen.findByTestId('confirm-evidence');
    const document_ = screen.getByTestId('confirm-document');
    screen.getByTestId('identity-check-confirm').focus(); // focus starts elsewhere — a focus that does not move is no proof
    expect(document.activeElement).not.toBe(evidence);
    fireEvent.submit(screen.getByTestId('identity-check-confirm-form'));
    expect(evidence).toHaveAttribute('aria-invalid', 'true');
    expect(document_).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(evidence);
    // Only the SECOND left empty ⇒ the first is fine and the second is the one focused.
    fireEvent.change(evidence, { target: { value: 'photo_id_video_call' } });
    screen.getByTestId('identity-check-confirm').focus();
    fireEvent.submit(screen.getByTestId('identity-check-confirm-form'));
    expect(evidence).not.toHaveAttribute('aria-invalid');
    expect(document.activeElement).toBe(document_);
    expect(recordIdentityCheck).not.toHaveBeenCalled();
  });

  it('⭐ the same guard on Could not confirm: the reason, then (when asked) the two kinds — every empty one marked, the first focused, the note line too', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    const reason = await screen.findByTestId('not-confirmed-reason');
    const button = screen.getByTestId('identity-check-could-not-confirm');
    button.focus();
    fireEvent.submit(screen.getByTestId('identity-check-not-confirmed-form'));
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(reason);
    expect(await screen.findByTestId('identity-check-note-required')).toBeInTheDocument();
    // A reason judged from a document asks BOTH kinds; with neither chosen both are marked and the first is focused.
    fireEvent.change(reason, { target: { value: 'details_do_not_match' } });
    expect(reason).not.toHaveAttribute('aria-invalid');
    const evidence = screen.getByTestId('not-confirmed-evidence');
    const document_ = screen.getByTestId('not-confirmed-document');
    expect(evidence).toBeRequired();
    expect(document_).toBeRequired();
    button.focus();
    fireEvent.submit(screen.getByTestId('identity-check-not-confirmed-form'));
    expect(evidence).toHaveAttribute('aria-invalid', 'true');
    expect(document_).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(evidence);
    expect(recordIdentityCheck).not.toHaveBeenCalled();
  });
});

describe('⭐ P14 + the contract change — the detail shows the member\'s state; a withheld identity shows ⛔ rows', () => {
  it('the state reads in the EXISTING queue words beside "Joined on" — and a state with no label shows ⛔ its internal name, nothing at all', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail({ state: 'pending-valid' }));
    const first = renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    expect(await screen.findByTestId('identity-check-state')).toHaveTextContent(t.queue.stateLabels['pending-valid']!);
    expect(screen.getByTestId('identity-check-state')).toHaveTextContent('Waiting for identity check');
    expect(screen.getByTestId('identity-check-state').parentElement).toHaveTextContent(/1 Jun 2026 · Waiting for identity check/);
    first.unmount();
    getIdentityCheckDetail.mockResolvedValue(detail({ state: 'lock-in' }));
    const second = renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    expect(await screen.findByTestId('identity-check-state')).toHaveTextContent('In lock-in');
    second.unmount();
    // A member who is active, withdrawn or anonymized now has a detail: their state has no label here, so it is ⛔ printed raw.
    for (const state of ['active', 'withdrawn', 'anonymized', 'some-new-state']) {
      getIdentityCheckDetail.mockResolvedValue(detail({ state, eligible: false, identity: null, masked_mobile: null }));
      const view = renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
      await screen.findByTestId('identity-check-facts');
      expect(screen.queryByTestId('identity-check-state')).toBeNull();
      expect(screen.getByTestId('identity-check-facts')).toHaveTextContent('Joined on1 Jun 2026');
      expect(screen.getByTestId('identity-check-facts')).not.toHaveTextContent(state);
      view.unmount();
    }
  });

  it('`identity: null` (a member who needs no check) shows ⛔ name, date of birth or "No photo on record"; an awaited check with no photo still says so', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail({ eligible: false, identity: null, masked_mobile: null }));
    const first = renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    await screen.findByTestId('identity-check-facts');
    expect(screen.queryByTestId('identity-check-name')).toBeNull();
    expect(screen.queryByTestId('identity-check-dob')).toBeNull();
    expect(screen.queryByText(t.detail.noPhoto)).toBeNull();
    expect(screen.getByText(t.detail.joinedOn)).toBeInTheDocument(); // the rest of the facts stay
    first.unmount();
    getIdentityCheckDetail.mockResolvedValue(detail());
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    expect(await screen.findByTestId('identity-check-name')).toHaveTextContent('Sita Devi');
    expect(screen.getByText(t.detail.noPhoto)).toBeInTheDocument();
  });

  it('a 503 on the detail (the identity could not be read, or the audit line could not be written) shows the load-error line, ⛔ the forms, and is asked ONCE', async () => {
    for (const code of ['identity_validation.identity_unreadable', 'identity_validation.audit_unavailable']) {
      getIdentityCheckDetail.mockReset();
      getIdentityCheckDetail.mockRejectedValue(new ApiError(503, code, 'no'));
      const view = renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
      expect(await screen.findByTestId('identity-check-load-error')).toHaveTextContent(t.detail.loadError);
      expect(screen.queryByTestId('identity-check-forms')).toBeNull();
      expect(getIdentityCheckDetail).toHaveBeenCalledTimes(1);
      view.unmount();
    }
  });
});

// ── Round 2 — an adversarial review of the round above ──────────────────────────────────────────────────────────────────

/** A request the test answers BY HAND, when it chooses (the in-flight moment is the one under test). */
interface Gate {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}
const gateAnswers = (mock: ReturnType<typeof vi.fn>): Gate[] => {
  const gates: Gate[] = [];
  mock.mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        gates.push({ resolve, reject });
      }),
  );
  return gates;
};

describe('⭐ R2-1 — the queue pager: stays mounted while a page loads or fails; a later page that empties steps back', () => {
  const entryB = { ...entry, member_id: '22222222-2222-4222-8222-222222222222', short_member_id: '22222222' };
  const page = (entries: unknown[], has_more: boolean) => ({ entries, can_check: true, has_more });

  it('⭐ while the next page loads, the old rows AND the page controls stay — the pressed button is the SAME node, focus on it, ⛔ a "Loading…" swap', async () => {
    const gates = gateAnswers(getIdentityCheckQueue);
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    await waitFor(() => expect(gates).toHaveLength(1));
    await act(async () => gates[0]!.resolve(page([entry], true)));
    const next = await screen.findByTestId('identity-checks-page-next');
    next.focus();
    fireEvent.click(next);
    await waitFor(() => expect(gates).toHaveLength(2)); // page 50 is IN FLIGHT
    expect(screen.queryByTestId('identity-checks-loading')).toBeNull();
    expect(screen.getByTestId(`identity-checks-item-${M}`)).toBeInTheDocument(); // the last page's rows stay until the next arrive
    expect(screen.getByTestId('identity-checks-page-next')).toBe(next);
    expect(next.isConnected).toBe(true);
    expect(document.activeElement).toBe(next);

    await act(async () => gates[1]!.resolve(page([entryB], true)));
    await screen.findByTestId(`identity-checks-item-${entryB.member_id}`);
    expect(screen.getByTestId('identity-checks-page-next')).toBe(next);
    expect(document.activeElement).toBe(next);

    // Back to page 0 (a fresh load): the controls and the rows of the page being left stay here too.
    const prev = screen.getByTestId('identity-checks-page-prev');
    prev.focus();
    fireEvent.click(prev);
    await waitFor(() => expect(gates).toHaveLength(3));
    expect(screen.queryByTestId('identity-checks-loading')).toBeNull();
    expect(screen.getByTestId(`identity-checks-item-${entryB.member_id}`)).toBeInTheDocument();
    expect(prev.isConnected).toBe(true);
    expect(screen.getByTestId('identity-checks-page-prev')).toBe(prev);
    await act(async () => gates[2]!.resolve(page([entry], true)));
    await screen.findByTestId(`identity-checks-item-${M}`);
  });

  it('⭐ a press while the next page is still loading is ignored — it would skip a page nobody saw', async () => {
    const gates = gateAnswers(getIdentityCheckQueue);
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    await waitFor(() => expect(gates).toHaveLength(1));
    await act(async () => gates[0]!.resolve(page([entry], true)));
    const next = await screen.findByTestId('identity-checks-page-next');
    fireEvent.click(next);
    fireEvent.click(next); // the old page's `has_more` is still on screen — a second press must NOT ask for offset 100
    await act(async () => gates[1]!.resolve(page([entryB], true)));
    await screen.findByTestId(`identity-checks-item-${entryB.member_id}`);
    expect(getIdentityCheckQueue.mock.calls.map((c) => c[1])).toEqual([0, 50]);
  });

  it('⭐ a page that FAILS leaves the error line AND Previous (staff are ⛔ stranded on page 2); Previous goes back', async () => {
    getIdentityCheckQueue.mockImplementation((_pariwar: string, offset: number) =>
      offset === 0 ? Promise.resolve(page([entry], true)) : Promise.reject(new ApiError(500, 'http.500', 'no')),
    );
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByTestId('identity-checks-page-next'));
    expect(await screen.findByTestId('identity-checks-error')).toHaveTextContent(t.queue.loadError);
    expect(screen.getByTestId('identity-checks-page-prev')).toBeEnabled();
    expect(screen.getByTestId('identity-checks-page-prev')).toHaveTextContent('Previous');
    expect(screen.getByTestId('identity-checks-page-next')).toBeDisabled();
    fireEvent.click(screen.getByTestId('identity-checks-page-prev'));
    expect(await screen.findByTestId(`identity-checks-item-${M}`)).toBeInTheDocument();
    expect(screen.queryByTestId('identity-checks-error')).toBeNull();
  });

  it('⭐ a LATER page that settles empty steps back by itself — ⛔ "No member is waiting" is said while earlier pages still hold members', async () => {
    getIdentityCheckQueue.mockImplementation((_pariwar: string, offset: number) =>
      Promise.resolve(offset === 0 ? page([entry], true) : page([], false)),
    );
    const saidEmpty: string[] = [];
    const watch = new MutationObserver(() => {
      if (document.querySelector('[data-testid="identity-checks-empty"]')) saidEmpty.push('No member is waiting');
    });
    watch.observe(document.body, { childList: true, subtree: true });
    try {
      renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
      fireEvent.click(await screen.findByTestId('identity-checks-page-next'));
      await waitFor(() => expect(getIdentityCheckQueue.mock.calls.map((c) => c[1])).toEqual([0, 50, 0]));
      expect(await screen.findByTestId(`identity-checks-item-${M}`)).toBeInTheDocument();
      expect(screen.getByTestId('identity-checks-page-prev')).toBeDisabled(); // back on the first page
      await sleep(10);
      expect(screen.queryByTestId('identity-checks-empty')).toBeNull();
      expect(saidEmpty).toEqual([]);
    } finally {
      watch.disconnect();
    }
  });

  it('an empty FIRST page still says so (the line is TRUE there), and ⛔ steps anywhere', async () => {
    getIdentityCheckQueue.mockResolvedValue(page([], false));
    renderWithClient(<IdentityChecksView pariwarId={PARIWAR} />);
    expect(await screen.findByTestId('identity-checks-empty')).toHaveTextContent(t.queue.empty);
    await sleep(10);
    expect(getIdentityCheckQueue).toHaveBeenCalledTimes(1);
  });
});

describe('⭐ R2-2 — the revealed number: the mutation forgets it with the screen; its live region is always mounted', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete (document as unknown as Record<string, unknown>)['visibilityState'];
  });
  const renderIn = (client: QueryClient) =>
    render(
      <QueryClientProvider client={client}>
        <RevealMobile pariwarId={PARIWAR} memberId={M} />
      </QueryClientProvider>,
    );
  // The LIBRARY's own client: the mutation stays in its cache for as long as ONE observer still holds it.
  const holdsNumber = (client: QueryClient) => client.getMutationCache().getAll().some((m) => (m.state.data as { mobile?: string } | undefined)?.mobile === MOBILE);

  it('⭐ after 60 seconds the number is gone from the screen AND from the mutation (`reset()`), though the component is still mounted', async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    revealIdentityCheckMobile.mockResolvedValue({ mobile: MOBILE });
    renderIn(client);
    const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
    fireEvent.click(screen.getByTestId(PRESS(M)));
    await advance(10);
    expect(screen.queryByText(MOBILE)).not.toBeNull();
    expect(holdsNumber(client)).toBe(true); // the control: while it is on screen the mutation holds it
    await advance(60_000);
    expect(screen.queryByText(MOBILE)).toBeNull();
    expect(holdsNumber(client)).toBe(false);
  });

  it('⭐ a hidden tab clears the number from the mutation too', async () => {
    const client = new QueryClient();
    revealIdentityCheckMobile.mockResolvedValue({ mobile: MOBILE });
    renderIn(client);
    fireEvent.click(screen.getByTestId(PRESS(M)));
    await screen.findByText(MOBILE);
    expect(holdsNumber(client)).toBe(true);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.queryByText(MOBILE)).toBeNull();
    await waitFor(() => expect(holdsNumber(client)).toBe(false));
  });

  it('⭐ a NEW press takes the old number off the screen and out of the mutation at once — ⛔ it stays up while the next showing is awaited', async () => {
    const client = new QueryClient();
    revealIdentityCheckMobile.mockResolvedValueOnce({ mobile: MOBILE });
    renderIn(client);
    fireEvent.click(screen.getByTestId(PRESS(M)));
    await screen.findByText(MOBILE);
    const second = gateAnswers(revealIdentityCheckMobile);
    fireEvent.click(screen.getByTestId(PRESS(M)));
    await waitFor(() => expect(second).toHaveLength(1)); // the second showing is IN FLIGHT
    expect(screen.queryByText(MOBILE)).toBeNull();
    await waitFor(() => expect(holdsNumber(client)).toBe(false));
    await act(async () => second[0]!.resolve({ mobile: MOBILE }));
    expect(await screen.findByText(MOBILE)).toBeInTheDocument(); // and the new showing arrives as usual
  });
});

describe('⭐ R2-3 — the detail page', () => {
  const saveNotConfirmed = async (note = 'Phoned twice') => {
    fireEvent.change(await screen.findByTestId('not-confirmed-reason'), { target: { value: 'member_not_reached' } });
    fireEvent.change(screen.getByTestId('not-confirmed-note'), { target: { value: note } });
    fireEvent.click(screen.getByTestId('identity-check-could-not-confirm'));
  };
  const confirmDetail = (over: Record<string, unknown> = {}) =>
    detail({
      eligible: false,
      identity: null,
      masked_mobile: null,
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
      ...over,
    });
  const chooseAndConfirm = async () => {
    fireEvent.change(await screen.findByTestId('confirm-evidence'), { target: { value: 'photo_id_in_person' } });
    fireEvent.change(screen.getByTestId('confirm-document'), { target: { value: 'voter_id' } });
    fireEvent.click(screen.getByTestId('identity-check-confirm'));
  };
  const confirmedOk = { validation_id: M, outcome: 'confirmed', superseded_validation_id: null, state: 'lock-in', kyc_completed: false };

  it('⭐ (a) a refetch that FAILS after a save keeps the page on its data, says so as an alert, and ⛔ swaps to the bare error state', async () => {
    getIdentityCheckDetail.mockResolvedValueOnce(detail()).mockRejectedValue(new ApiError(503, 'identity_validation.audit_unavailable', 'no'));
    recordIdentityCheck.mockResolvedValue(confirmedOk);
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    await chooseAndConfirm();
    const line = await screen.findByTestId('identity-check-refresh-error');
    expect(line).toHaveTextContent(t.detail.loadError);
    expect(line).toHaveAttribute('role', 'alert');
    expect(screen.queryByTestId('identity-check-load-error')).toBeNull(); // not the bare error state ...
    expect(screen.getByTestId('identity-check-facts')).toBeInTheDocument(); // ... the page is still ON its data
    expect(screen.getByTestId('identity-check-lead')).toBeInTheDocument();
    expect(screen.getByTestId('identity-check-saved')).toHaveTextContent('Identity confirmed.');
  });

  it('(a) the bare error state is still what a page that NEVER had its data shows', async () => {
    getIdentityCheckDetail.mockRejectedValue(new ApiError(503, 'identity_validation.identity_unreadable', 'no'));
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    expect(await screen.findByTestId('identity-check-load-error')).toHaveTextContent(t.detail.loadError);
    expect(screen.queryByTestId('identity-check-refresh-error')).toBeNull();
    expect(screen.queryByTestId('identity-check-facts')).toBeNull();
  });

  it('⭐ (b) a saved CONFIRMATION hides the forms, the identity, the number and the press AT ONCE — before the refetch answers — and says ⛔ "does not need an identity check"', async () => {
    getIdentityCheckDetail.mockResolvedValueOnce(detail());
    const refetch = gateAnswers(getIdentityCheckDetail);
    recordIdentityCheck.mockResolvedValue(confirmedOk);
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    expect(await screen.findByTestId('identity-check-name')).toBeInTheDocument();
    expect(screen.getByTestId(`reveal-mobile-button-${M}`)).toBeInTheDocument(); // the controls: all there before the save
    await chooseAndConfirm();
    await waitFor(() => expect(refetch).toHaveLength(1)); // the re-read is IN FLIGHT, unanswered
    expect(screen.getByTestId('identity-check-saved')).toHaveTextContent('Identity confirmed.');
    expect(screen.queryByTestId('identity-check-forms')).toBeNull();
    expect(screen.queryByTestId('identity-check-name')).toBeNull();
    expect(screen.queryByTestId('identity-check-dob')).toBeNull();
    expect(screen.queryByTestId('identity-check-masked-mobile')).toBeNull();
    expect(screen.queryByTestId(`reveal-mobile-button-${M}`)).toBeNull();
    expect(screen.queryByTestId('identity-check-not-eligible')).toBeNull();
    await act(async () => refetch[0]!.resolve(confirmDetail()));
    expect(await screen.findByTestId(`identity-check-history-${M}`)).toBeInTheDocument();
    expect(screen.queryByTestId('identity-check-not-eligible')).toBeNull();
  });

  it('⭐ (c) a mark on a select that unmounts goes with it — the kind asked AGAIN does not come back already `aria-invalid`; one still asked keeps its mark', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    const reason = await screen.findByTestId('not-confirmed-reason');
    fireEvent.change(reason, { target: { value: 'details_do_not_match' } });
    fireEvent.submit(screen.getByTestId('identity-check-not-confirmed-form')); // both kinds asked, both empty ⇒ both marked
    expect(screen.getByTestId('not-confirmed-evidence')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('not-confirmed-document')).toHaveAttribute('aria-invalid', 'true');
    // Another reason that asks BOTH kinds: they stay mounted and keep their marks.
    fireEvent.change(reason, { target: { value: 'photo_does_not_match' } });
    expect(screen.getByTestId('not-confirmed-evidence')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('not-confirmed-document')).toHaveAttribute('aria-invalid', 'true');
    // "Could not reach the member" asks neither: both selects unmount ...
    fireEvent.change(reason, { target: { value: 'member_not_reached' } });
    expect(screen.queryByTestId('not-confirmed-evidence')).toBeNull();
    expect(screen.queryByTestId('not-confirmed-document')).toBeNull();
    // ... and asked again they are NEW selects, ⛔ pre-marked.
    fireEvent.change(reason, { target: { value: 'details_do_not_match' } });
    expect(screen.getByTestId('not-confirmed-evidence')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByTestId('not-confirmed-document')).not.toHaveAttribute('aria-invalid');
    // A kind that unmounts alone (evidence is asked by every reason but one; document by two): marks drop with their select.
    fireEvent.submit(screen.getByTestId('identity-check-not-confirmed-form'));
    expect(screen.getByTestId('not-confirmed-document')).toHaveAttribute('aria-invalid', 'true');
  });

  it('⭐ (d) the saved line lives in a status region that is ALWAYS mounted (empty until a save), and a save moves focus TO it — after a confirmation too, when the pressed button is gone', async () => {
    getIdentityCheckDetail.mockResolvedValueOnce(detail()).mockResolvedValue(confirmDetail());
    recordIdentityCheck.mockResolvedValue(confirmedOk);
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    const region = await screen.findByTestId('identity-check-saved-region');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toBeEmptyDOMElement();
    fireEvent.change(screen.getByTestId('confirm-evidence'), { target: { value: 'photo_id_in_person' } });
    fireEvent.change(screen.getByTestId('confirm-document'), { target: { value: 'voter_id' } });
    const button = screen.getByTestId('identity-check-confirm');
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByTestId('identity-check-saved')).toHaveTextContent('Identity confirmed.'));
    expect(screen.getByTestId('identity-check-saved-region')).toBe(region); // the SAME node, the text inserted into it
    expect(screen.getByTestId('identity-check-saved-region')).toContainElement(screen.getByTestId('identity-check-saved'));
    expect(button.isConnected).toBe(false); // the pressed button went with the forms ...
    expect(document.activeElement).toBe(region); // ... and focus did NOT fall to the page
  });

  it('(d) after a NOT-CONFIRMED save, whose button stays, focus still moves to the saved line', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    recordIdentityCheck.mockResolvedValue({ validation_id: M, outcome: 'not_confirmed', superseded_validation_id: null, state: 'lock-in', kyc_completed: false });
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    await screen.findByTestId('not-confirmed-reason');
    screen.getByTestId('identity-check-could-not-confirm').focus();
    await saveNotConfirmed();
    await screen.findByTestId('identity-check-saved');
    expect(document.activeElement).toBe(screen.getByTestId('identity-check-saved-region'));
  });

  it('⭐ (e) the Route keys the view by member: a saved line and a refusal of ONE member are ⛔ carried to the next', async () => {
    const M2 = '33333333-3333-4333-8333-333333333333';
    getSession.mockResolvedValue({ userId: M, nationalGrants: [] });
    getIdentityCheckDetail.mockImplementation((_pariwar: string, member: string) => Promise.resolve(detail({ member_id: member, short_member_id: member.slice(0, 8) })));
    recordIdentityCheck.mockResolvedValue({ validation_id: M, outcome: 'not_confirmed', superseded_validation_id: null, state: 'lock-in', kyc_completed: false });
    const client = createQueryClient();
    // A FRESH element each time: the route reads its params from the router mock, so an identical element would not re-render.
    const ui = () => (
      <QueryClientProvider client={client}>
        <IdentityCheckDetailRoute />
      </QueryClientProvider>
    );
    params = { pariwarId: PARIWAR, memberId: M };
    const view = render(ui());
    await saveNotConfirmed();
    expect(await screen.findByTestId('identity-check-saved')).toHaveTextContent('Saved.');
    // The admin opens another member's check (the route's param changes; the same component sits in the same place).
    params = { pariwarId: PARIWAR, memberId: M2 };
    view.rerender(ui());
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('33333333'));
    expect(screen.queryByTestId('identity-check-saved')).toBeNull();
    expect(screen.getByTestId('identity-check-saved-region')).toBeEmptyDOMElement();
  });

  it('⭐ (f) a refusal is the server\'s word at ONE moment: when the re-read says the member awaits a check and no death claim stands, the banner goes and the forms return', async () => {
    const reread = gateAnswers(getIdentityCheckDetail);
    getIdentityCheckDetail.mockImplementationOnce(() => Promise.resolve(detail())); // the first read; the next is answered by hand
    recordIdentityCheck.mockRejectedValue(new ApiError(409, 'identity_validation.death_reported', 'no'));
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    await chooseAndConfirm();
    // The refusal shows at once, whatever the (stale) data says.
    expect(await screen.findByTestId('identity-check-death-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('identity-check-forms')).toBeNull();
    await waitFor(() => expect(reread).toHaveLength(1));
    // The claim was released as innocent: the re-read says awaiting, no death claim.
    await act(async () => reread[0]!.resolve(detail()));
    await waitFor(() => expect(screen.queryByTestId('identity-check-death-banner')).toBeNull());
    expect(screen.getByTestId('identity-check-forms')).toBeInTheDocument();
    expect(screen.getByTestId(`reveal-mobile-button-${M}`)).toBeInTheDocument();
  });

  it('(f) while the claim STANDS the refusal stays: the re-read agrees ⇒ the banner is kept', async () => {
    getIdentityCheckDetail.mockResolvedValueOnce(detail()).mockResolvedValue(detail({ death_reported: true, eligible: false, identity: null, masked_mobile: null }));
    recordIdentityCheck.mockRejectedValue(new ApiError(409, 'identity_validation.death_reported', 'no'));
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    await chooseAndConfirm();
    await waitFor(() => expect(getIdentityCheckDetail).toHaveBeenCalledTimes(2));
    await sleep(20);
    expect(screen.getByTestId('identity-check-death-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('identity-check-forms')).toBeNull();
  });

  it('⭐ (h) no Mobile row and no press when the detail carries no masked number — even for a member whose check is awaited', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail({ masked_mobile: null }));
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    await screen.findByTestId('identity-check-facts');
    expect(screen.getByTestId('identity-check-name')).toBeInTheDocument(); // the check IS awaited ...
    expect(screen.getByTestId('identity-check-forms')).toBeInTheDocument();
    expect(screen.queryByText(t.detail.mobile)).toBeNull(); // ... yet ⛔ a "Mobile" row, ⛔ a dash,
    expect(screen.queryByTestId('identity-check-masked-mobile')).toBeNull();
    expect(screen.queryByTestId(`reveal-mobile-button-${M}`)).toBeNull(); // ⛔ the press
  });
});
