// <CorrectionQueueRoute> — the District Admin's correction queue (Story 6.18, AC11).
//
// ⭐⭐ WHAT THIS SUITE IS REALLY PINNING. `2026-09-20-227` cl.10 sends a claim BACK to the District
// Admin with a note. A return moves ⛔ no state, so a returned claim is indistinguishable from any
// other claim in `verifier_approved` — and before this page there was no District Admin list in the
// app at all. The loop was unusable end to end: the person the claim was sent TO could not find it.
//
// ⛔ AND IT IS NOT A DENIAL. The assertions about WORDING are load-bearing: this is the surface a
// District Admin reads, so if a badge here ever says "rejected" or "denied", the ruling has been
// reversed in the UI regardless of what the domain does.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ClaimsUnderCorrectionResponse } from '@twt/contracts';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ pariwarId: PARIWAR }),
  useNavigate: () => navigate,
}));

const getClaimsUnderCorrection = vi.fn();
// ⭐ The route is session-gated (2026-09-23b) — a signed-in session by default; the gate test below
// makes it fail.
const getSession = vi.fn(async () => ({ actorId: 'a', grants: [] }));
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getClaimsUnderCorrection: (p: string) => getClaimsUnderCorrection(p),
    getSession: () => getSession(),
  };
});

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';

const { CorrectionQueueRoute } = await import('../src/routes/CorrectionQueueRoute.js');

type Item = ClaimsUnderCorrectionResponse['items'][number];

const ITEM: Item = {
  claim_case_id: CLAIM,
  deceased_member_id: '22222222-2222-4222-8222-222222222222',
  claim_state: 'verifier_approved',
  claim_filed_at: '2026-09-01T00:00:00.000Z',
  returned_at: '2026-09-19T10:00:00.000Z',
  returned_by_actor_display: 'Kalpana Bharti',
  return_note: { state: 'readable', value: 'The holder name on account 2 is not the declared nominee.' },
  sent_back_by_check: false,
  accounts_complete: true,
};

const setup = (items: Item[]) => {
  getClaimsUnderCorrection.mockResolvedValue({ pariwar_id: PARIWAR, items });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <CorrectionQueueRoute />
    </QueryClientProvider>,
  );
};

describe('<CorrectionQueueRoute> — AC11', () => {
  it('⭐ lists a returned claim WITH the Pariwar Admin’s note — the thing that makes the loop usable', async () => {
    setup([ITEM]);
    expect(await screen.findByTestId(`correction-queue-item-${CLAIM}`)).toBeInTheDocument();
    expect(screen.getByTestId('queue-return-note').textContent).toContain('not the declared nominee');
    expect(screen.getByText('Kalpana Bharti', { exact: false })).toBeInTheDocument();
  });

  it('⛔ says "returned", ⛔ NEVER "rejected"/"denied"/"failed" — `-227` cl.10 is not a denial', async () => {
    setup([ITEM]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    const text = (document.body.textContent ?? '').toLowerCase();
    expect(text).toContain('returned');
    for (const forbidden of ['rejected', 'denied', 'refused this', 'failed']) {
      expect(text, `the queue used denial wording: ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('⛔ offers NO "Re-submit" control — the resubmission is DERIVED (AC11)', async () => {
    setup([ITEM]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    // ⭐ Recording a fresh passing name check on the claim IS the resubmission. A button here would
    // be either a no-op or a second, undeclared write path — and AC11 forbids a new route for it.
    const text = (document.body.textContent ?? '').toLowerCase();
    expect(text).not.toContain('re-submit');
    expect(text).not.toContain('resubmit');
    expect(screen.getByTestId(`queue-open-${CLAIM}`)).toBeInTheDocument();
  });

  it('⛔ carries NO name and NO account detail — the names stay behind the per-claim read (Trap 4)', async () => {
    setup([ITEM]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    const text = document.body.textContent ?? '';
    // The fixture deliberately plants none, and the DTO has no field that could carry one —
    // this pins that the page does not grow one later.
    for (const forbidden of ['Asha', 'Devi', 'Ravi Kumar', 'IFSC', 'account number']) {
      expect(text, `the queue rendered ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('distinguishes the District Admin’s OWN does_not_match from a Pariwar Admin return', async () => {
    setup([
      { ...ITEM, returned_at: null, returned_by_actor_display: null, return_note: null, sent_back_by_check: true },
    ]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(screen.getByTestId('queue-badge-check')).toBeInTheDocument();
    expect(screen.queryByTestId('queue-badge-returned')).toBeNull();
  });

  it('⭐ an EMPTY queue says so — a blank panel would read as a failed load', async () => {
    setup([]);
    expect(await screen.findByTestId('correction-queue-empty')).toBeInTheDocument();
  });

  it('surfaces an unreadable note as such — ⛔ never as "they gave no reason"', async () => {
    setup([{ ...ITEM, return_note: { state: 'unreadable' } }]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(screen.getByTestId('queue-return-note').textContent).not.toBe('—');
    expect(screen.getByTestId('queue-return-note').textContent).toContain('Could not be read');
  });
});

describe('<CorrectionQueueRoute> — the session gate (code review 2026-09-23b)', () => {
  it('⛔ an expired session redirects to /login — ⛔ not "the list could not be loaded", and the queue is ⛔ never read', async () => {
    getSession.mockRejectedValueOnce(new Error('401'));
    navigate.mockClear();
    getClaimsUnderCorrection.mockClear();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <CorrectionQueueRoute />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
    expect(screen.queryByTestId('correction-queue-error')).not.toBeInTheDocument();
    expect(getClaimsUnderCorrection).not.toHaveBeenCalled();
  });
});

describe('<CorrectionQueueRoute> — the QUEUE read’s own 401/403 (code review 2026-09-23c)', () => {
  const renderRoute = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <CorrectionQueueRoute />
      </QueryClientProvider>,
    );
  };

  it('⛔ a 403 on the queue says "no access" — ⛔ never "could not be loaded"', async () => {
    const { ApiError } = await import('../src/api/client.js');
    getClaimsUnderCorrection.mockRejectedValue(new ApiError(403, 'auth.forbidden', 'nope'));
    renderRoute();
    expect(await screen.findByTestId('correction-queue-forbidden')).toBeInTheDocument();
    expect(screen.queryByTestId('correction-queue-error')).not.toBeInTheDocument();
  });

  it('⛔ a 401 on the queue redirects to /login even while the session read still succeeds', async () => {
    const { ApiError } = await import('../src/api/client.js');
    navigate.mockClear();
    getClaimsUnderCorrection.mockRejectedValue(new ApiError(401, 'auth.session_required', 'expired'));
    renderRoute();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
  });
});
