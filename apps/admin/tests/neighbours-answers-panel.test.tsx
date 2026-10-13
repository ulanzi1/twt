// <NeighboursAnswersPanel> — the later approvers' ON-DEMAND view of the neighbours' answers (Story 6.27b, PM24; Task
// 3.5 / 3.7; AC6). The fetch is a PII control (each open is ONE audited read that may decrypt a name and a number):
//   · ⛔ request before the first open; ONE request per open; ⛔ request on window focus; the answers FORGOTTEN on close;
//   · `present` ⇒ the SAME `<PeerMeshView>` as the console; `empty` / `unavailable` / a failed request ⇒ the
//     `<NonPresent>` words; a 404 ⇒ "Nothing to show at this step" (⛔ the transient-fault words); hidden (`peerMesh`
//     ABSENT) ⇒ NOTHING, the disclosure itself removed;
//   · the flags' and the call-back basis' words (AC8, AC11) — "May be phoned on" vs "Mobile", ⛔ a date in a flag line.

import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ClaimPeerAnswersResponse, PeerMeshTranscript } from '@twt/contracts';

const getClaimPeerAnswers = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getClaimPeerAnswers: (p: string, c: string) => getClaimPeerAnswers(p, c) };
});

const { ApiError } = await import('../src/api/client.js');
const { claimPeerAnswersKey } = await import('../src/api/hooks.js');
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
});
const PRESENT: ClaimPeerAnswersResponse = {
  peerMesh: {
    status: 'present',
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
          ],
        },
        callbackMobile: { status: 'shown', text: '+919876543210' },
        callbackBasis: 'consented',
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
      },
    ]),
  },
};

let qc: QueryClient;
function renderPanel() {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NeighboursAnswersPanel pariwarId={PARIWAR} claimCaseId={CLAIM} />
    </QueryClientProvider>,
  );
}
const toggle = () => screen.getByTestId('neighbours-answers-toggle');

beforeEach(() => {
  getClaimPeerAnswers.mockReset();
});
afterEach(() => {
  focusManager.setFocused(undefined);
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
    expect(getClaimPeerAnswers).toHaveBeenCalledWith(PARIWAR, CLAIM);

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(getClaimPeerAnswers).toHaveBeenCalledTimes(1);

    fireEvent.click(toggle()); // close
    expect(qc.getQueryData(claimPeerAnswersKey(PARIWAR, CLAIM))).toBeUndefined();
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

  it('a 404 ⇒ "Nothing to show at this step" (⛔ the transient-fault words)', async () => {
    getClaimPeerAnswers.mockRejectedValue(new ApiError(404, 'claim.peer_answers_not_found', 'nothing'));
    renderPanel();
    fireEvent.click(toggle());
    expect(await screen.findByTestId('neighbours-answers-not-at-step')).toHaveTextContent(t.neighboursPanel.notAtStep);
    expect(screen.queryByTestId('section-state-unavailable')).toBeNull();
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
      getClaimPeerAnswers.mockResolvedValue({ peerMesh: { status } });
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
  });
});
