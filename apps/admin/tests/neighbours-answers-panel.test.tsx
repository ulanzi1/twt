// <NeighboursAnswersPanel> — the later approvers' ON-DEMAND view of the neighbours' answers (Story 6.27b, PM24; Task
// 3.5 / 3.7; AC6). The fetch is a PII control (each open is ONE audited read that may decrypt a name and a number):
//   · ⛔ request before the first open; ONE request per open; ⛔ request on window focus; the answers FORGOTTEN on close;
//   · `present` ⇒ the SAME `<PeerMeshView>` as the console; `empty` / `unavailable` / a failed request ⇒ the
//     `<NonPresent>` words; a 404 ⇒ "Nothing to show at this step" (⛔ the transient-fault words); hidden (`peerMesh`
//     ABSENT) ⇒ NOTHING, the disclosure itself removed;
//   · the flags' and the call-back basis' words (AC8, AC11) — "May be phoned on" vs "Mobile", ⛔ a date in a flag line;
//   · code review round 2 (S2, S3, S4, S9, S10, S11, S16) — ⛔ a broad invalidation re-reads an open panel; ⛔ a summary
//     change closes it; a FAILED host read keeps it; ⛔ "May be phoned on" without a consent basis; ⛔ a bare 404 is
//     "Nothing to show"; focus ⛔ never falls to <body>; an offline read keeps "Loading…"; each opening its OWN key.
// ⚠ Review X4 — `forget` runs in a PASSIVE effect cleanup, so every "forgotten" assertion after a close / unmount / hide
//   WAITS for it and checks `forget` itself ran (`expectForgotten`) — a synchronous read raced the cleanup under load.

import { focusManager, onlineManager, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApprovalWarningsSummary, ClaimPeerAnswersResponse, PeerMeshTranscript } from '@twt/contracts';

const getClaimPeerAnswers = vi.fn();
const getNomineeNameCheck = vi.fn();
const postCloseForPaidDeath = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getClaimPeerAnswers: (p: string, c: string, signal?: AbortSignal) => getClaimPeerAnswers(p, c, signal),
    getNomineeNameCheck: (p: string, c: string) => getNomineeNameCheck(p, c),
    postCloseForPaidDeath: (p: string, c: string) => postCloseForPaidDeath(p, c),
  };
});

const { ApiError } = await import('../src/api/client.js');
const { claimPeerAnswersKey, useNomineeNameCheck } = await import('../src/api/hooks.js');
const { FinallyApprovedElsewhereBanner } = await import('../src/modules/cycle-freeze/FinallyApprovedElsewhereBanner.js');
const { NeighboursAnswersPanel } = await import('../src/modules/claim-verification/index.js');
const { verifierConsoleEn: t } = await import('../src/modules/claim-verification/i18n-en.js');

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';

const transcript = (pings: PeerMeshTranscript['pings']): PeerMeshTranscript => ({
  selectionId: 's',
  distinctResponderCount: 1,
  pingedMemberIds: ['m1'],
  responses: [],
  verifierAnnotations: { status: 'not_available_yet' },
  outcome: 'sufficient',
  windowExpiresAt: '2026-10-15T00:00:00.000Z',
  pings,
  // Story 6.27d (R5) — REQUIRED, possibly empty.
  inspectionDiscrepancies: [],
  // Story 6.36 (SW20) — the staff line.
  recentChangeBeforeFiling: true,
});
const PRESENT: ClaimPeerAnswersResponse = {
  peerMesh: {
    status: 'present',
    // ⭐ Story 6.32 (IQ7) — REQUIRED on the section, possibly empty.
    familyAccount: [], familyAccountInheritedFromClaimId: null,
    transcript: transcript([
      {
        pingId: 'p1',
        memberId: 'm1',
        responderName: { status: 'shown', text: 'Asha Devi' },
        sendStatus: 'accepted',
        noTargetReason: null,
        reply: {
          submitted: true,
          answers: [
            { questionKey: 'has_died', question: 'Has Ram K. died?', value: { kind: 'codes', codes: ['not_died'], labels: ['No, they have not died'] }, savedVia: 'member_app', savedAt: '2026-10-12T05:00:00.000Z', changeCount: 0, warningFlag: true },
            { questionKey: 'how_known', question: 'How do you know?', value: { kind: 'codes', codes: ['family_told'], labels: ['The family told me'] }, savedVia: 'member_app', savedAt: '2026-10-12T05:00:00.000Z', changeCount: 0, warningFlag: false },
            // Story 6.36 (SW24) — the "How do you know [member]?" answer the source line sits BESIDE.
            { questionKey: 'relationship', question: 'How do you know Ram K.?', value: { kind: 'codes', codes: ['school_colleague'], labels: ['A colleague at the same school'] }, savedVia: 'member_app', savedAt: '2026-10-12T05:00:00.000Z', changeCount: 0, warningFlag: false },
          ],
        },
        callbackMobile: { status: 'shown', text: '+919876543210' },
        callbackBasis: 'consented',
        // Story 6.36 (SW24) — where this person came from.
        source: 'named_by_member',
      },
      {
        pingId: 'p2',
        memberId: 'm2',
        responderName: { status: 'shown', text: 'Bina Kumari' },
        sendStatus: 'accepted',
        noTargetReason: null,
        reply: {
          submitted: false,
          answers: [
            { questionKey: 'death_date', question: 'If you know, on what date did they die?', value: { kind: 'date', date: '2026-10-01' }, savedVia: 'helpline', savedAt: '2026-10-12T05:00:00.000Z', changeCount: 0, warningFlag: true },
            { questionKey: 'has_died', question: 'Has Ram K. died?', value: { kind: 'codes', codes: ['died'], labels: ['Yes, they have died'] }, savedVia: 'helpline', savedAt: '2026-10-12T05:00:00.000Z', changeCount: 0, warningFlag: null },
          ],
        },
        callbackMobile: { status: 'shown', text: '+919812345678' },
        callbackBasis: 'super_admin',
        source: 'named_by_member',
      },
    ]),
  },
};

let qc: QueryClient;
const VISIBLE: ApprovalWarningsSummary = { available: true, kinds: [], post_death: 'evaluated', waiting_for_district_admin: false, own_reason_excluded: false, own_visit_pending: false };
const HIDDEN: ApprovalWarningsSummary = { ...VISIBLE, own_visit_pending: true };
function panel(ownVisitPending = false, pariwarId = PARIWAR, claimCaseId = CLAIM, summary: ApprovalWarningsSummary | null = VISIBLE) {
  return (
    <QueryClientProvider client={qc}>
      <NeighboursAnswersPanel pariwarId={pariwarId} claimCaseId={claimCaseId} approvalWarnings={ownVisitPending ? HIDDEN : summary} />
    </QueryClientProvider>
  );
}
let forgetsSeen = 0;
function newClient(): QueryClient {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(qc, 'removeQueries');
  forgetsSeen = 0;
  return qc;
}
function renderPanel(ownVisitPending = false) {
  newClient();
  return render(panel(ownVisitPending));
}
/**
 * ⚠ Review X4 — `forget` runs in a PASSIVE effect cleanup, so a synchronous "forgotten" read raced it under CPU load: WAIT
 * for the empty cache. ⚠ But the hook's `gcTime: 0` ALSO empties it a tick after the observer leaves, so "empty" alone
 * stays green with `forget` deleted — the opening's OWN `forget` (an EXACT `removeQueries` on a peer-answers key) must
 * ALSO have run since the last check. Red if `forget` is removed.
 */
async function expectForgotten(): Promise<void> {
  await waitFor(() => expect(peerQueries()).toHaveLength(0));
  const forgets = vi
    .mocked(qc.removeQueries)
    .mock.calls.filter(([filters]) => filters?.exact === true && filters.queryKey?.[0] === claimPeerAnswersKey(PARIWAR, CLAIM)[0]).length;
  expect(forgets).toBeGreaterThan(forgetsSeen);
  forgetsSeen = forgets;
}
const toggle = () => screen.getByTestId('neighbours-answers-toggle');
const peerQueries = () => qc.getQueryCache().findAll({ queryKey: claimPeerAnswersKey(PARIWAR, CLAIM) });
function pendingResponse() {
  let resolve!: (response: ClaimPeerAnswersResponse) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<ClaimPeerAnswersResponse>((r, fail) => { resolve = r; reject = fail; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  getClaimPeerAnswers.mockReset();
  getNomineeNameCheck.mockReset();
  postCloseForPaidDeath.mockReset();
});
afterEach(() => {
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe('<NeighboursAnswersPanel> — on demand (a PII control)', () => {
  it('⛔ request before the first open; ONE per open; ⛔ request on window focus; FORGOTTEN on close', async () => {
    getClaimPeerAnswers.mockResolvedValue(PRESENT);
    renderPanel();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(getClaimPeerAnswers).not.toHaveBeenCalled();

    fireEvent.click(toggle());
    expect(await screen.findByTestId('peer-mesh-transcript')).toBeInTheDocument();
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);
    expect(getClaimPeerAnswers).toHaveBeenCalledWith(PARIWAR, CLAIM, expect.any(AbortSignal));

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);

    fireEvent.click(toggle()); // close
    await expectForgotten();
    expect(screen.queryByTestId('peer-mesh-transcript')).toBeNull();

    fireEvent.click(toggle()); // reopen ⇒ a fresh, audited read
    await screen.findByTestId('peer-mesh-transcript');
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(2);
  });

  it('the flags (AC8) and the call-back basis (AC11): ⚠ lines, "could not be checked", "May be phoned on" vs "Mobile" — ⛔ a date in a flag line', async () => {
    getClaimPeerAnswers.mockResolvedValue(PRESENT);
    renderPanel();
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    const warnings = screen.getAllByTestId('peer-answer-warning').map((n) => n.textContent);
    expect(warnings).toEqual([t.peerMesh.warningFlag.has_died, t.peerMesh.warningFlag.death_date]);
    expect(screen.getByTestId('peer-answer-warning-unknown')).toHaveTextContent(t.peerMesh.warningFlag.unknown);
    const callbacks = screen.getAllByTestId('peer-mesh-callback').map((n) => n.textContent);
    expect(callbacks[0]).toBe(`${t.peerMesh.callbackMobile}: +919876543210`);
    expect(callbacks[1]).toBe(`${t.peerMesh.callbackMobileSuperAdmin}: +919812345678`);
    const DATE = /\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}/;
    for (const words of Object.values(t.peerMesh.warningFlag)) expect(words).not.toMatch(DATE);
  });

  it('⭐ Story 6.36 (SW24, SW20; `-326` BD1 A) — the source line BESIDE the relationship answer, else in the ping header; the staff line once at the top', async () => {
    getClaimPeerAnswers.mockResolvedValue(PRESENT);
    renderPanel();
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    const pings = screen.getAllByTestId('peer-mesh-ping');
    // p1 answered "How do you know …?" ⇒ the line is in that answer's row (⛔ the header)
    const first = within(pings[0]!).getAllByTestId('peer-mesh-source');
    expect(first).toHaveLength(1);
    expect(first[0]).toHaveTextContent('Named by the member');
    expect(first[0]!.closest('dd')).not.toBeNull();
    expect(first[0]!.closest('dd')).toHaveTextContent('A colleague at the same school');
    // p2 did not ⇒ the header
    const second = within(pings[1]!).getAllByTestId('peer-mesh-source');
    expect(second).toHaveLength(1);
    expect(second[0]!.closest('dd')).toBeNull();
    expect(screen.getAllByTestId('peer-mesh-recent-change')).toHaveLength(1);
    // R1: use the same accurate chronology on later approvers' panels, including when RF1 uses an earlier filing.
    expect(screen.getByTestId('peer-mesh-recent-change')).toHaveTextContent(
      "The member's workplace, the people they named or their nominees changed in the 90 days before the filing used to choose whom to ask.",
    );
  });

  it('a 404 ⇒ "Nothing to show at this step" (⛔ the transient-fault words)', async () => {
    getClaimPeerAnswers.mockRejectedValue(new ApiError(404, 'claim.peer_answers_not_found', 'nothing'));
    renderPanel();
    fireEvent.click(toggle());
    expect(await screen.findByTestId('neighbours-answers-not-at-step')).toHaveTextContent(t.neighboursPanel.notAtStep);
    expect(screen.queryByTestId('section-state-unavailable')).toBeNull();
  });

  it('S10 — a 404 WITHOUT the route\'s own code (a proxy, a version skew) ⇒ the `unavailable` words (⛔ "Nothing to show at this step")', async () => {
    getClaimPeerAnswers.mockRejectedValue(new ApiError(404, 'route.not_found', 'Not Found'));
    renderPanel();
    fireEvent.click(toggle());
    expect(await screen.findByTestId('section-state-unavailable')).toHaveTextContent(t.states.unavailable);
    expect(screen.queryByTestId('neighbours-answers-not-at-step')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(t.states.unavailable);
  });

  it('a failed request (5xx) ⇒ the `unavailable` words, after ONE request (⛔ automatic retry — each is an audited read)', async () => {
    getClaimPeerAnswers.mockRejectedValue(new ApiError(500, 'internal.error', 'boom'));
    renderPanel();
    fireEvent.click(toggle());
    expect(await screen.findByTestId('section-state-unavailable')).toHaveTextContent(t.states.unavailable);
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);
  });

  it('`empty` / `unavailable` sections ⇒ the `<NonPresent>` words', async () => {
    for (const status of ['empty', 'unavailable'] as const) {
      getClaimPeerAnswers.mockResolvedValue({ peerMesh: status === 'empty' ? { status, familyAccount: [], familyAccountInheritedFromClaimId: null } : { status } });
      const { unmount } = renderPanel();
      fireEvent.click(toggle());
      expect(await screen.findByTestId(`section-state-${status}`)).toBeInTheDocument();
      unmount();
    }
  });

  it('HIDDEN from this reader (`peerMesh` ABSENT) ⇒ NOTHING — the disclosure itself is removed (⛔ a title, ⛔ a hint)', async () => {
    getClaimPeerAnswers.mockResolvedValue({});
    renderPanel();
    fireEvent.click(toggle());
    await waitFor(() => expect(screen.queryByTestId('neighbours-answers-panel')).toBeNull());
    expect(screen.queryByTestId('neighbours-answers-toggle')).toBeNull();
    await expectForgotten();
  });

  it('R2 — unmount forgets decrypted PII; a remount never displays it while the fresh hidden response is pending', async () => {
    getClaimPeerAnswers.mockResolvedValueOnce(PRESENT);
    const first = renderPanel();
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    expect(peerQueries()[0]?.state.data).toEqual(PRESENT);
    first.unmount();
    await expectForgotten();

    const next = pendingResponse();
    getClaimPeerAnswers.mockReturnValueOnce(next.promise);
    render(panel()); // the SAME QueryClient, as on navigation
    fireEvent.click(toggle());
    await waitFor(() => expect(getClaimPeerAnswers).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Asha Devi')).toBeNull();
    expect(screen.queryByText('+919876543210')).toBeNull();
    await act(async () => next.resolve({}));
    await waitFor(() => expect(screen.queryByTestId('neighbours-answers-toggle')).toBeNull());
    await expectForgotten();
  });

  // Review S16 — the old leg seeded a key ⛔ no opening could ever use, so it stayed green with R2 reverted. This one reads
  // the REAL keys: each opening has its own (a fourth, per-opening part), so ⛔ no opening can read another's cache.
  it('R2 — each opening reads under its OWN key (⛔ one shared with a previous opening)', async () => {
    getClaimPeerAnswers.mockResolvedValue(PRESENT);
    renderPanel();
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    const first = peerQueries().map((q) => q.queryKey);
    expect(first).toHaveLength(1);
    expect(first[0]).toHaveLength(claimPeerAnswersKey(PARIWAR, CLAIM).length + 1);
    fireEvent.click(toggle()); // close
    fireEvent.click(toggle()); // reopen
    await screen.findByTestId('peer-mesh-transcript');
    await waitFor(() => expect(peerQueries()).toHaveLength(1));
    const second = peerQueries().map((q) => q.queryKey);
    expect(second).toHaveLength(1);
    expect(second[0]).not.toEqual(first[0]);
  });

  it.each(['close', 'unmount', 'scope change'] as const)('R2 — %s cancels an in-flight read and a late result cannot repopulate the cache', async (how) => {
    const next = pendingResponse();
    getClaimPeerAnswers.mockReturnValueOnce(next.promise);
    const mounted = renderPanel();
    fireEvent.click(toggle());
    await waitFor(() => expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1));
    const signal = getClaimPeerAnswers.mock.calls[0]![2] as AbortSignal;
    if (how === 'close') fireEvent.click(toggle());
    else if (how === 'unmount') mounted.unmount();
    else mounted.rerender(panel(false, '55555555-5555-4555-8555-555555555555'));
    expect(signal.aborted).toBe(true);
    await expectForgotten();
    await act(async () => next.resolve(PRESENT));
    await waitFor(() => expect(peerQueries()).toHaveLength(0));
    expect(screen.queryByTestId('peer-mesh-transcript')).toBeNull();
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);
  });

  it('R3/R4 — a known pending inspector sees no toggle/request; completing or transferring the visit restores an explicit opening', async () => {
    getClaimPeerAnswers.mockResolvedValue(PRESENT);
    const mounted = renderPanel(true);
    expect(screen.queryByTestId('neighbours-answers-toggle')).toBeNull();
    expect(getClaimPeerAnswers).not.toHaveBeenCalled();
    mounted.rerender(panel(false));
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(getClaimPeerAnswers).not.toHaveBeenCalled();
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    mounted.rerender(panel(true));
    expect(screen.queryByTestId('neighbours-answers-toggle')).toBeNull();
    await expectForgotten();
    mounted.rerender(panel(false));
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(2);
  });

  it('R4 — a server-hidden result resets when the host observes the pending visit then its completion', async () => {
    getClaimPeerAnswers.mockResolvedValueOnce({}).mockResolvedValueOnce(PRESENT);
    const mounted = renderPanel();
    fireEvent.click(toggle());
    await waitFor(() => expect(screen.queryByTestId('neighbours-answers-toggle')).toBeNull());
    mounted.rerender(panel(true));
    mounted.rerender(panel(false));
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(2);
  });

  // Review S3 — the reset keys on the VALUE that governs visibility, ⛔ the summary's identity (TanStack's structural
  // sharing keeps a deep-equal refetch's reference, so an identity reset never recovered anything in production — and it
  // CLOSED an open panel on any unrelated change, at the cost of another audited read to re-open).
  it('S3 — a summary change in `kinds` / `waiting_for_district_admin` only ⇒ the OPEN panel stays open, ⛔ a second request', async () => {
    getClaimPeerAnswers.mockResolvedValue(PRESENT);
    const mounted = renderPanel();
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    mounted.rerender(panel(false, PARIWAR, CLAIM, { ...VISIBLE, kinds: ['post_death_version'], waiting_for_district_admin: true }));
    await new Promise((r) => setTimeout(r, 20));
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('peer-mesh-transcript')).toBeInTheDocument();
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);
  });

  it('S3 — a change in `available` resets to CLOSED (⛔ a background read): a server-hidden result can be re-opened explicitly', async () => {
    getClaimPeerAnswers.mockResolvedValueOnce({}).mockResolvedValueOnce(PRESENT);
    const mounted = renderPanel();
    fireEvent.click(toggle());
    await waitFor(() => expect(screen.queryByTestId('neighbours-answers-toggle')).toBeNull());
    mounted.rerender(panel(false, PARIWAR, CLAIM, { ...VISIBLE, kinds: ['post_death_version'] }));
    expect(screen.queryByTestId('neighbours-answers-toggle')).toBeNull(); // ⛔ an identity reset — fail CLOSED
    mounted.rerender(panel(false, PARIWAR, CLAIM, { ...VISIBLE, available: false, kinds: [] }));
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(2);
  });

  // Review S4 — a FAILED host warnings read (`available: false`) is ⛔ not "hidden": the disclosure stays (PM24's route does
  // its own fail-closed hide), still on demand. ⛔ No summary at all (a `closure_request`) ⇒ none.
  it('S4 — an UNAVAILABLE host summary keeps the toggle (⛔ a request until clicked); a `null` summary ⇒ none', async () => {
    getClaimPeerAnswers.mockResolvedValue(PRESENT);
    newClient();
    const mounted = render(panel(false, PARIWAR, CLAIM, { ...VISIBLE, available: false }));
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(getClaimPeerAnswers).not.toHaveBeenCalled();
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);
    mounted.rerender(panel(false, PARIWAR, CLAIM, null));
    expect(screen.queryByTestId('neighbours-answers-toggle')).toBeNull();
    await expectForgotten();
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);
  });

  it('R5 — an unavailable Super Admin mobile uses neutral words beside a neighbour\'s No', async () => {
    const response = structuredClone(PRESENT);
    if (response.peerMesh?.status !== 'present') throw new Error('present fixture');
    response.peerMesh.transcript.pings = response.peerMesh.transcript.pings.slice(1);
    const ping = response.peerMesh.transcript.pings[0]!;
    ping.callbackMobile = { status: 'unavailable' };
    ping.callbackBasis = null;
    ping.reply!.answers.push({ questionKey: 'callback_consent', question: 'May the Admin phone you about this?', value: { kind: 'codes', codes: ['no'], labels: ['No'] }, savedVia: 'member_app', savedAt: '2026-10-12T05:00:00.000Z', changeCount: 0, warningFlag: false });
    getClaimPeerAnswers.mockResolvedValue(response);
    renderPanel();
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByTestId('peer-mesh-callback')).toHaveTextContent(`${t.peerMesh.callbackMobileSuperAdmin}: ${t.peerMesh.couldNotShow}`);
    expect(screen.getByTestId('peer-mesh-callback')).not.toHaveTextContent(t.peerMesh.callbackMobile);
  });

  it('S9 — a SHOWN number with a `null` basis takes the neutral "Mobile" (⛔ "May be phoned on" without a recorded consent)', async () => {
    const response = structuredClone(PRESENT);
    if (response.peerMesh?.status !== 'present') throw new Error('present fixture');
    response.peerMesh.transcript.pings = response.peerMesh.transcript.pings.slice(0, 1);
    response.peerMesh.transcript.pings[0]!.callbackBasis = null;
    getClaimPeerAnswers.mockResolvedValue(response);
    renderPanel();
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    expect(screen.getByTestId('peer-mesh-callback')).toHaveTextContent(`${t.peerMesh.callbackMobileSuperAdmin}: +919876543210`);
    expect(screen.getByTestId('peer-mesh-callback')).not.toHaveTextContent(t.peerMesh.callbackMobile);
  });

  it.each(['404', 'error', 'empty', 'unavailable', 'present'] as const)('R6 — the persistent status region announces loading then %s', async (outcome) => {
    const next = pendingResponse();
    getClaimPeerAnswers.mockReturnValueOnce(next.promise);
    renderPanel();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    fireEvent.click(toggle());
    expect(status).toHaveTextContent(t.neighboursPanel.loading);
    if (outcome === '404' || outcome === 'error') {
      const error = outcome === '404' ? new ApiError(404, 'claim.peer_answers_not_found', 'failed') : new ApiError(500, 'test.error', 'failed');
      await act(async () => next.reject(error));
    } else await act(async () => next.resolve(outcome === 'present' ? PRESENT : { peerMesh: outcome === 'empty' ? { status: outcome, familyAccount: [], familyAccountInheritedFromClaimId: null } : { status: outcome } }));
    const words = outcome === '404' ? t.neighboursPanel.notAtStep : outcome === 'error' || outcome === 'unavailable' ? t.states.unavailable : outcome === 'empty' ? t.states.empty : t.neighboursPanel.ready;
    await waitFor(() => expect(status).toHaveTextContent(words));
  });
});

describe('<NeighboursAnswersPanel> — focus and the offline read (review S11 (a), (b); family 13)', () => {
  const anchor = () => screen.getByTestId('neighbours-answers-focus-anchor');

  it('S11 (a) — a server-HIDDEN result removes the focused toggle ⇒ focus moves to the WORDLESS anchor (⛔ <body>)', async () => {
    getClaimPeerAnswers.mockResolvedValue({});
    renderPanel();
    toggle().focus();
    fireEvent.click(toggle());
    await waitFor(() => expect(screen.queryByTestId('neighbours-answers-panel')).toBeNull());
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(anchor());
    expect(anchor()).toBeEmptyDOMElement();
    expect(anchor()).not.toHaveAttribute('role');
  });

  it('S11 (a) — the HOST flips to hidden while the toggle has focus ⇒ the same anchor (⛔ <body>)', () => {
    const mounted = renderPanel();
    toggle().focus();
    expect(document.activeElement).toBe(toggle());
    mounted.rerender(panel(true));
    expect(screen.queryByTestId('neighbours-answers-toggle')).toBeNull();
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(anchor());
  });

  it('S11 (b) — an OFFLINE (paused) read keeps "Loading…" in the body and the region (⛔ a blank body), then makes ONE read', async () => {
    getClaimPeerAnswers.mockResolvedValue(PRESENT);
    onlineManager.setOnline(false);
    renderPanel();
    fireEvent.click(toggle());
    await new Promise((r) => setTimeout(r, 20));
    expect(getClaimPeerAnswers).not.toHaveBeenCalled();
    expect(screen.getByTestId('neighbours-answers-body')).toHaveTextContent(t.neighboursPanel.loading);
    expect(screen.getByRole('status')).toHaveTextContent(t.neighboursPanel.loading);
    act(() => onlineManager.setOnline(true));
    await screen.findByTestId('peer-mesh-transcript');
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);
  });
});

describe('<NeighboursAnswersPanel> — ⛔ a broad invalidation re-reads it (review S2; Trap 12 / BF7)', () => {
  it('S2 — "Close this claim" refetches the host\'s reads but ⛔ an OPEN neighbours\' panel or name check (each an audited read)', async () => {
    getClaimPeerAnswers.mockResolvedValue(PRESENT);
    getNomineeNameCheck.mockResolvedValue({});
    postCloseForPaidDeath.mockResolvedValue({ closed_count: 1, this_claim_closed: true });
    const hostRead = vi.fn().mockResolvedValue({ host: true });
    function HostReads(): null {
      useQuery({ queryKey: ['cycle-freeze-pending', PARIWAR], queryFn: hostRead });
      useNomineeNameCheck(PARIWAR, CLAIM); // an OPEN name-check disclosure's read
      return null;
    }
    newClient();
    render(
      <QueryClientProvider client={qc}>
        <HostReads />
        <FinallyApprovedElsewhereBanner elsewhere={{ claim_reference: 'A1B2C3D4', stage: 'paid' }} pariwarId={PARIWAR} claimCaseId={CLAIM} canClose />
        <NeighboursAnswersPanel pariwarId={PARIWAR} claimCaseId={CLAIM} approvalWarnings={VISIBLE} />
      </QueryClientProvider>,
    );
    fireEvent.click(toggle());
    await screen.findByTestId('peer-mesh-transcript');
    await waitFor(() => expect(getNomineeNameCheck).toHaveBeenCalledTimes(1));
    expect(hostRead).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId(`close-for-paid-death-${CLAIM}`));
    await screen.findByTestId(`close-for-paid-death-result-${CLAIM}`);
    // The invalidation still refreshes every OTHER active read (the host's list) …
    await waitFor(() => expect(hostRead).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 20));
    // … and ⛔ re-reads either audited disclosure.
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);
    expect(getNomineeNameCheck).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('peer-mesh-transcript')).toBeInTheDocument();
  });
});
