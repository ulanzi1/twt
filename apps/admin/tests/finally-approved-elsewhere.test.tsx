// Story 6.28 (`2026-10-11-319` OP14 (b)) — the approval surfaces when ANOTHER claim of the death has passed the final vote
// or is paid: the banner (by REFERENCE — ⛔ an id), the FINAL approve disabled (Deny / Route untouched), and on a PAID
// banner the "Close this claim" action with its result lines (closed / not closed / busy). Decision support — OP2's 409
// is the control (its words are pinned in `cycle-freeze-page.test.tsx`).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CycleFreezePendingResponse } from '@twt/contracts';

const postCloseForPaidDeath = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, postCloseForPaidDeath: (p: string, c: string) => postCloseForPaidDeath(p, c) };
});

const { PendingCaseCard } = await import('../src/modules/cycle-freeze/index.js');
const { ApiError } = await import('../src/api/client.js');
const { verifierConsoleEn } = await import('../src/modules/claim-verification/i18n-en.js');

type PendingCase = CycleFreezePendingResponse['ready_to_freeze'][number];
const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const t = verifierConsoleEn.onePaymentPerDeath;

const CASE: PendingCase = {
  claim_case_id: CLAIM,
  deceased_member_id: '22222222-2222-4222-8222-222222222222',
  current_state: 'verifier_approved',
  verifier_decision_id: null,
  verifier_actor_display: null,
  verifier_reason_code: null,
  verifier_rationale: null,
  verifier_rationale_withheld: null,
  signals_summary: '',
  concealment_flags: [],
  routed_to_r9: false,
  under_correction: false,
  name_difference_reasons: [],
  approval_name_highlight: null,
  finally_approved_elsewhere: null,
  approval_warnings: {
    available: true,
    kinds: [],
    post_death: 'evaluated',
    waiting_for_district_admin: false,
    own_reason_excluded: false,
    own_visit_pending: false,
  },
};

const setup = (over: Partial<PendingCase>, bucket: 'ready_to_freeze' | 'escalated' | 'voted_pending_commit' = 'ready_to_freeze') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ul>
        <PendingCaseCard case_={{ ...CASE, ...over }} bucket={bucket} pariwarId={PARIWAR} onDecision={vi.fn()} pending={false} reasonOptions={[]} />
      </ul>
    </QueryClientProvider>,
  );
};

beforeEach(() => postCloseForPaidDeath.mockReset());

describe('<PendingCaseCard> — Story 6.28 OP14 (b)', () => {
  it('⛔ no other claim finally approved ⇒ ⛔ no banner; Approve enabled', () => {
    setup({});
    expect(screen.queryByTestId(`finally-approved-elsewhere-${CLAIM}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('cycle-freeze-approve')).not.toBeDisabled();
  });

  it('another claim PASSED THE FINAL VOTE ⇒ the banner by reference, Approve DISABLED, Deny untouched, ⛔ no close action', () => {
    setup({ finally_approved_elsewhere: { claim_reference: 'A1B2C3D4', stage: 'passed_final_vote' } });
    expect(screen.getByTestId(`finally-approved-elsewhere-${CLAIM}`)).toHaveTextContent(t.bannerVoted('A1B2C3D4'));
    expect(screen.getByTestId('cycle-freeze-approve')).toBeDisabled();
    // Code review round 3 (checklist 13(d)) — DESCRIBED by the banner.
    expect(screen.getByTestId('cycle-freeze-approve').getAttribute('aria-describedby')).toBe(`finally-approved-elsewhere-${CLAIM}`);
    expect(screen.getByRole('button', { name: 'Deny' })).not.toBeDisabled();
    expect(screen.queryByTestId(`close-for-paid-death-${CLAIM}`)).not.toBeInTheDocument();
  });

  // Code review round 3 — "Resolve → Approve" (the escalated bucket) is a FINAL approval too.
  it('the ESCALATED bucket: "Resolve → Approve" DISABLED under the banner and described by it; Resolve → Deny untouched', () => {
    setup({ finally_approved_elsewhere: { claim_reference: 'A1B2C3D4', stage: 'passed_final_vote' } }, 'escalated');
    expect(screen.getByTestId('cycle-freeze-resolve-approve')).toBeDisabled();
    expect(screen.getByTestId('cycle-freeze-resolve-approve').getAttribute('aria-describedby')).toBe(`finally-approved-elsewhere-${CLAIM}`);
    expect(screen.getByRole('button', { name: 'Resolve → Deny' })).not.toBeDisabled();
  });

  it('another claim PAID ⇒ "Close this claim"; closed ⇒ its line; the button then stays disabled', async () => {
    postCloseForPaidDeath.mockResolvedValue({ this_claim_closed: true, closed_count: 1 });
    setup({ finally_approved_elsewhere: { claim_reference: 'A1B2C3D4', stage: 'paid' } });
    expect(screen.getByTestId(`finally-approved-elsewhere-${CLAIM}`)).toHaveTextContent(t.bannerPaid('A1B2C3D4'));
    fireEvent.click(screen.getByTestId(`close-for-paid-death-${CLAIM}`));
    expect(await screen.findByTestId(`close-for-paid-death-result-${CLAIM}`)).toHaveTextContent(t.closed);
    expect(postCloseForPaidDeath).toHaveBeenCalledWith(PARIWAR, CLAIM);
    expect(screen.getByTestId(`close-for-paid-death-${CLAIM}`)).toBeDisabled();
  });

  it('the action answers "not closed" in its own words (⛔ the glyph); a 503 says BUSY, ⛔ "not closed"', async () => {
    postCloseForPaidDeath.mockResolvedValueOnce({ this_claim_closed: false, closed_count: 0 });
    setup({ finally_approved_elsewhere: { claim_reference: 'A1B2C3D4', stage: 'paid' } }, 'voted_pending_commit');
    fireEvent.click(screen.getByTestId(`close-for-paid-death-${CLAIM}`));
    const line = await screen.findByTestId(`close-for-paid-death-result-${CLAIM}`);
    expect(line).toHaveTextContent(t.notClosed);
    expect(line.textContent).not.toContain('⛔');
    postCloseForPaidDeath.mockRejectedValueOnce(new ApiError(503, 'cycle_freeze.close_busy', 'Busy', {}));
    fireEvent.click(screen.getByTestId(`close-for-paid-death-${CLAIM}`));
    expect(await screen.findByText(t.busy)).toBeInTheDocument();
  });

  // Code review round 3 (`2026-10-12-320` D2 A) — the action also closes the death's OTHER closable claims; the line
  // says how many (`closed_count` minus this claim), ⛔ never silently.
  it('the OTHER claims the action closed are counted — beside "not closed" and beside "closed"', async () => {
    postCloseForPaidDeath.mockResolvedValueOnce({ this_claim_closed: false, closed_count: 2 });
    setup({ finally_approved_elsewhere: { claim_reference: 'A1B2C3D4', stage: 'paid' } });
    fireEvent.click(screen.getByTestId(`close-for-paid-death-${CLAIM}`));
    expect(await screen.findByTestId(`close-for-paid-death-result-${CLAIM}`)).toHaveTextContent(`${t.notClosed} ${t.othersClosed(2)}`);
    postCloseForPaidDeath.mockResolvedValueOnce({ this_claim_closed: true, closed_count: 2 });
    fireEvent.click(screen.getByTestId(`close-for-paid-death-${CLAIM}`));
    expect(await screen.findByText(`${t.closed} ${t.othersClosed(1)}`)).toBeInTheDocument();
    expect(t.othersClosed(1)).toBe('1 other claim for this death was closed.');
  });
});
