// Reconciliation review-queue route tests — Story 9.8 (Task 7; AC1/AC2/AC7).
//
// Renders the route with the api hooks + router param mocked, asserting: the deadline-ordered queue
// renders; selecting a case shows the detail panel (member, status, bank entries); the four outcome tabs +
// the reason dropdown (outcome-compatible codes only) render; confirm surfaces the bank-entry selector.
// Plus the pure gate view's three states.

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const confirmMutate = vi.fn();
const rejectMutate = vi.fn();
const recoverMutate = vi.fn();
const reverseMutate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ pariwarId: '11111111-1111-1111-1111-111111111111' }),
}));

const caseDetail = {
  case_key: 'mismatch:pool-1:member-1',
  case_type: 'mismatch',
  status: 'open',
  pool_id: 'pool-1',
  alert_id: 'alert-1',
  member_id: 'member-1',
  mismatch_reason: 'wrong_pool',
  deadline_at: '2026-07-16T00:00:00.000Z',
  raised_at: '2026-07-10T00:00:00.000Z',
  in_recovery: false,
  member: { name: 'Asha', mobile: '••••1234' },
  attestation: { utr: '123456789012', tr: null, attested_at: '2026-07-10T00:00:00.000Z', expected_amount_inr: 500 },
  bank_entries: [{ entry_id: 'entry-1', amount_paise: 50000, value_date: '2026-07-11', description: 'UPI/123' }],
  screenshot_url: null,
  notes: [],
  confirmed_event_id: null,
};

vi.mock('../src/api/hooks.js', () => ({
  useSession: () => ({ isLoading: false, isError: false, data: {} }),
  useReconciliationQueue: () => ({
    isLoading: false,
    isError: false,
    data: {
      rows: [
        { case_key: 'mismatch:pool-1:member-1', case_type: 'mismatch', pool_id: 'pool-1', alert_id: 'alert-1', member_id: 'member-1', mismatch_reason: 'wrong_pool', deadline_at: '2026-07-16T00:00:00.000Z', raised_at: '2026-07-10T00:00:00.000Z', in_recovery: false },
      ],
      truncated: false,
    },
  }),
  useReconciliationCase: () => ({ isLoading: false, isError: false, data: caseDetail }),
  useReconciliationActions: () => ({
    confirm: { mutate: confirmMutate },
    reject: { mutate: rejectMutate },
    recover: { mutate: recoverMutate },
    reverse: { mutate: reverseMutate },
  }),
  useRequestStepUp: () => ({ mutate: vi.fn(), reset: vi.fn() }),
  useVerifyStepUp: () => ({ mutate: vi.fn() }),
}));

const { ReconciliationReviewGateView, ReconciliationReviewRoute } = await import('../src/routes/ReconciliationReviewRoute.js');

describe('<ReconciliationReviewGateView> (pure)', () => {
  it('renders the three session states', () => {
    const { rerender } = render(<ReconciliationReviewGateView status="loading">x</ReconciliationReviewGateView>);
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    rerender(<ReconciliationReviewGateView status="error">x</ReconciliationReviewGateView>);
    expect(screen.getByRole('status')).toHaveTextContent('Redirecting');
    rerender(<ReconciliationReviewGateView status="success"><span>allowed</span></ReconciliationReviewGateView>);
    expect(screen.getByText('allowed')).toBeInTheDocument();
  });
});

describe('<ReconciliationReviewRoute> — queue + case panel + actions', () => {
  it('renders the deadline-ordered queue and opens a case detail on click', () => {
    render(<ReconciliationReviewRoute />);
    expect(screen.getByTestId('recon-queue')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('recon-queue-row-mismatch:pool-1:member-1'));
    expect(screen.getByTestId('recon-case-detail')).toBeInTheDocument();
    expect(screen.getByTestId('recon-case-status')).toHaveTextContent('open');
    expect(screen.getByTestId('recon-bank-entries')).toBeInTheDocument();
  });

  it('confirm surfaces the bank-entry selector; reject does not', () => {
    render(<ReconciliationReviewRoute />);
    fireEvent.click(screen.getByTestId('recon-queue-row-mismatch:pool-1:member-1'));
    // confirm is the default outcome → the bank-entry selector is present.
    expect(screen.getByTestId('recon-bank-entry-select')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('recon-outcome-reject'));
    expect(screen.queryByTestId('recon-bank-entry-select')).not.toBeInTheDocument();
  });

  it('the reason dropdown offers only outcome-compatible codes', () => {
    render(<ReconciliationReviewRoute />);
    fireEvent.click(screen.getByTestId('recon-queue-row-mismatch:pool-1:member-1'));
    fireEvent.click(screen.getByTestId('recon-outcome-reject'));
    expect(screen.getByTestId('recon-reason-wrong_pool')).toBeInTheDocument();
    expect(screen.getByTestId('recon-reason-other')).toBeInTheDocument();
    expect(screen.queryByTestId('recon-reason-screenshot_verified')).not.toBeInTheDocument();
  });

  it('a missing reason code blocks submit with an error', () => {
    render(<ReconciliationReviewRoute />);
    fireEvent.click(screen.getByTestId('recon-queue-row-mismatch:pool-1:member-1'));
    fireEvent.click(screen.getByTestId('recon-outcome-reject'));
    fireEvent.click(screen.getByTestId('recon-submit'));
    expect(screen.getByTestId('recon-action-error')).toBeInTheDocument();
    expect(rejectMutate).not.toHaveBeenCalled();
  });
});
