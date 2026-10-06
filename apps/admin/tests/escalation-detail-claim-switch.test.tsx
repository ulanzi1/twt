// Story 6.23b — code review round 2: the Super Admin's escalation detail is KEYED by the claim. `<EscalationDetail>`
// returns early only while its query LOADS, so switching to a claim whose detail is already CACHED kept the same
// `DecisionForm` mounted — and the warning reason picked (and the note typed) on the previous claim stayed CHOSEN on
// this one (invariant 5: ⛔ nothing pre-selected), one click from being submitted for the wrong claim.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ApprovalWarningReasonOption, EscalatedClosureDetailResponse } from '@twt/contracts';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM_A = '11111111-1111-4111-8111-111111111111';
const CLAIM_B = '12121212-1212-4121-8121-121212121212';
const MEMBER = '22222222-2222-4222-8222-222222222222';
const GENERIC = 'warnings_reviewed';

let search: Record<string, unknown> = {};
// Code review round 3: reset even when an assertion throws first (⛔ no leak into a later test).
afterEach(() => {
  search = {};
});
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ pariwarId: PARIWAR }),
  useSearch: () => search,
  useNavigate: () => vi.fn(),
}));

const getEscalatedClosure = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: async () => ({ userId: 'sa', nationalGrants: [] }),
    getEscalatedClosures: async () => ({ items: [] }),
    getEscalatedClosure: (...a: unknown[]) => getEscalatedClosure(...a),
  };
});

const { CorrectionEscalationsRoute } = await import('../src/routes/CorrectionClosureRoutes.js');

const OPTIONS: ApprovalWarningReasonOption[] = [
  { code: GENERIC, reasonId: null, label: 'Warnings reviewed — approved despite them', whenToUse: 'Use when you have read every warning.', addedByDisplay: null, addedAt: null, replacesLabel: null },
];

const detail = (claimCaseId: string): EscalatedClosureDetailResponse => ({
  closure: {
    closure_id: claimCaseId === CLAIM_A ? '99999999-9999-4999-8999-999999999999' : '98989898-9898-4989-8989-989898989898',
    claim_case_id: claimCaseId,
    origin: 'staff_case',
    state: 'escalated',
    requested_at: null,
    escalated_at: '2026-09-26T10:00:00.000Z',
    under_review_since: null,
    super_admin_decision: null,
    super_admin_reason: null,
    closed_at: null,
    approval_name_highlight: null,
  } as EscalatedClosureDetailResponse['closure'],
  deceased_member_id: MEMBER,
  short_reference: claimCaseId.slice(0, 8).toUpperCase(),
  claim_state: 'verifier_approved',
  request_note: null,
  requested_by: null,
  pariwar_decision_note: null,
  pariwar_decided_by: null,
  review_note: null,
  marks: [],
  directions: [],
  resubmitted: false,
  family_part_done: false,
  name_check_state: 'passing',
  approve_path: 'full_gate',
  approval_warnings: { available: true, kinds: ['post_death_version'], post_death: 'evaluated', waiting_for_district_admin: false, own_reason_excluded: false },
  reason_options: OPTIONS,
});

describe('<CorrectionEscalationsRoute> — the detail is keyed by the claim (code review round 2)', () => {
  it('⭐ a reason picked on claim A is ⛔ chosen on claim B when B\'s detail is already cached', async () => {
    getEscalatedClosure.mockImplementation(async (_p: string, c: string) => detail(c));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const ui = () => (
      <QueryClientProvider client={qc}>
        <CorrectionEscalationsRoute />
      </QueryClientProvider>
    );
    const radio = () => screen.findByTestId(`escalation-decision-warning-reason-radio-${GENERIC}`);
    // B first — so its detail is CACHED when we come back to it.
    search = { claim: CLAIM_B };
    const { rerender } = render(ui());
    await radio();
    search = { claim: CLAIM_A };
    rerender(ui());
    await waitFor(() => expect(getEscalatedClosure).toHaveBeenCalledWith(PARIWAR, CLAIM_A));
    fireEvent.click(await radio());
    expect(await radio()).toBeChecked();
    fireEvent.change(screen.getByTestId('decision-note'), { target: { value: 'About claim A.' } });
    // Back to B (cached ⇒ ⛔ a loading state to unmount the form).
    search = { claim: CLAIM_B };
    rerender(ui());
    await waitFor(() => expect(screen.getByText(new RegExp(CLAIM_B.slice(0, 8), 'i'))).toBeInTheDocument());
    expect(await radio()).not.toBeChecked();
    expect(screen.getByTestId('decision-note')).toHaveValue('');
  });
});
