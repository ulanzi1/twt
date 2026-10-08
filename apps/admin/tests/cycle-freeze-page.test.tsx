// <CycleFreezePage> — the decision's `opts` forwarding, end to end (Story 6.19b; fourth-pass review 2026-10-01).
//
// ⭐ `PendingCaseCard` clears its inputs ONLY in the `onSuccess` it hands to `onDecision`, and the PAGE owns the
// mutation that must forward it. The card's own suite mocks `onDecision`, so ⛔ nothing proved the page forwards
// `opts` — a page that dropped it left the typed note on screen after a success, and one that called it on every
// settle wiped a failed Return's note. Driven here through the real page, the real hooks and a faked network.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CycleFreezePendingResponse } from '@twt/contracts';

import { verifierConsoleEn } from '../src/modules/claim-verification/i18n-en.js';

const getCycleFreezePending = vi.fn();
const postCycleFreezeDecision = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getCycleFreezePending: (p: string) => getCycleFreezePending(p),
    postCycleFreezeDecision: (p: string, b: unknown) => postCycleFreezeDecision(p, b),
  };
});

const { ApiError } = await import('../src/api/client.js');
const { CycleFreezePage } = await import('../src/modules/cycle-freeze/index.js');

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';

type PendingCase = CycleFreezePendingResponse['ready_to_freeze'][number];

const CASE: PendingCase = {
  claim_case_id: CLAIM,
  deceased_member_id: '22222222-2222-4222-8222-222222222222',
  current_state: 'verifier_approved',
  verifier_decision_id: '33333333-3333-4333-8333-333333333333',
  verifier_actor_display: 'Anita Kumari',
  verifier_reason_code: 'r8_90pct_met',
  verifier_rationale: null,
  signals_summary: 'state=verifier_approved; intake=app',
  concealment_flags: [],
  routed_to_r9: false,
  under_correction: false,
  name_difference_reasons: [],
  approval_name_highlight: null,
  // Story 6.23b (EA7) — a quiet claim: the block every pending case now carries.
  approval_warnings: {
    available: true,
    kinds: [],
    post_death: 'evaluated',
    waiting_for_district_admin: false,
    own_reason_excluded: false,
  },
};

const PENDING: CycleFreezePendingResponse = {
  pariwar_id: PARIWAR,
  ready_to_freeze: [CASE],
  escalated: [],
  voted_pending_commit: [],
  reason_options: [],
};

beforeEach(() => {
  getCycleFreezePending.mockReset();
  postCycleFreezeDecision.mockReset();
  // The card STAYS on the refetch — so its inputs are observable after the decision settles.
  getCycleFreezePending.mockResolvedValue(PENDING);
});

async function renderAndFillRoute(): Promise<{ select: HTMLSelectElement; rationale: HTMLInputElement }> {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <CycleFreezePage pariwarId={PARIWAR} />
    </QueryClientProvider>,
  );
  const section = await screen.findByRole('region', { name: 'Ready to freeze' });
  const select = within(section).getByRole('combobox') as HTMLSelectElement;
  const rationale = within(section).getByLabelText(/Rationale/) as HTMLInputElement;
  fireEvent.change(select, { target: { value: 'r9_special_case' } });
  fireEvent.change(rationale, { target: { value: 'needs the panel' } });
  fireEvent.click(within(section).getByRole('button', { name: 'Route to R9' }));
  return { select, rationale };
}

describe('<CycleFreezePage> — the decision forwards the card’s `opts`', () => {
  it('⭐ the server ACCEPTS ⇒ the card’s inputs clear', async () => {
    postCycleFreezeDecision.mockResolvedValue({});
    const { select, rationale } = await renderAndFillRoute();
    await waitFor(() => expect(postCycleFreezeDecision).toHaveBeenCalledTimes(1));
    expect(postCycleFreezeDecision.mock.calls[0]![1]).toMatchObject({
      claim_case_id: CLAIM,
      action: 'route_to_r9',
      reason_code: 'r9_special_case',
      rationale: 'needs the panel',
    });
    await waitFor(() => expect(rationale.value).toBe(''));
    expect(select.value).toBe('');
  });

  it('⛔ the server REFUSES ⇒ the inputs STAY (the typed note is ⛔ lost) and the refusal shows as HUMAN copy', async () => {
    // A REAL code the decision route raises (`translateCycleFreezeError`) — ⛔ an invented one pinned as copy.
    postCycleFreezeDecision.mockRejectedValue(new ApiError(409, 'cycle_freeze.not_routable', 'no'));
    const { select, rationale } = await renderAndFillRoute();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This claim cannot be routed to R9 in its current state. Reload the page to see where it stands.');
    // ⛔ The raw code is ⛔ the copy (fifth-pass review 2026-10-01).
    expect(alert.textContent).not.toContain('cycle_freeze.');
    expect(rationale.value).toBe('needs the panel');
    expect(select.value).toBe('r9_special_case');
  });
});

describe('<CycleFreezePage> — Story 6.26a (GI11), the ground-inspection WAIT in the trustee\'s words', () => {
  for (const [reason, words] of [
    ['no_completed_inspection', 'This claim is waiting for its ground inspection. It is not refused.'],
    ['certificate_check_required', 'This claim is waiting for an inspector to see the original of its current death certificate. It is not refused.'],
  ] as const) {
    it(`⭐ \`cycle_freeze.ground_inspection_required\` (${reason}) ⇒ "${words}" — ⛔ a raw code, ⛔ "refused"`, async () => {
      postCycleFreezeDecision.mockRejectedValue(new ApiError(409, 'cycle_freeze.ground_inspection_required', 'server words', { reason }));
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
      render(
        <QueryClientProvider client={qc}>
          <CycleFreezePage pariwarId={PARIWAR} />
        </QueryClientProvider>,
      );
      const section = await screen.findByRole('region', { name: 'Ready to freeze' });
      fireEvent.click(within(section).getByRole('button', { name: 'Approve' }));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(words);
      expect(alert.textContent).not.toContain('cycle_freeze.');
    });
  }
});

describe('<CycleFreezePage> — Story 6.24a (RF5), the suspicion-appeal WAIT in words', () => {
  for (const reason of ['appeal_not_filed', 'appeal_open'] as const) {
    it(`⭐ \`cycle_freeze.suspicion_appeal_pending\` (${reason}) ⇒ the words, "It is not refused." — ⛔ not a raw code`, async () => {
      postCycleFreezeDecision.mockRejectedValue(new ApiError(409, 'cycle_freeze.suspicion_appeal_pending', 'server words', { reason }));
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
      render(
        <QueryClientProvider client={qc}>
          <CycleFreezePage pariwarId={PARIWAR} />
        </QueryClientProvider>,
      );
      const section = await screen.findByRole('region', { name: 'Ready to freeze' });
      fireEvent.click(within(section).getByRole('button', { name: 'Approve' }));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(verifierConsoleEn.suspicionRefusal.approvalGate[reason]!);
      expect(alert).toHaveTextContent('It is not refused.');
      expect(alert.textContent).not.toContain('cycle_freeze.');
    });
  }
});

