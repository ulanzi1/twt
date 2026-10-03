// Story 6.19c (AC8c) — the correction CLOSURE's admin surfaces: the District Admin's queue column (plain-words
// refusals, the note REQUIRED before Send), the Pariwar Admin's UX-DR54 strip (primary leftmost, numbered shortcuts, the
// decline note mandatory BEFORE the decline acts, the UX-DR44 entry at once), D27's held item, the Super Admin's decision
// surface (⛔ close on a staff case; the reason set follows the decision; the `-273` §7 highlight on the result), the
// directee's inbox, the closure letter's two required points, the helpline's re-file card, and the highlight badge.
// Family 13: every reachable state is announced (`role="status"` / `role="alert"`), every control is labelled.

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type {
  ClaimsUnderCorrectionResponse,
  ClosureLettersOwedResponse,
  DirectionInboxResponse,
  EscalatedClosureDetailResponse,
  PariwarClosureQueueResponse,
} from '@twt/contracts';

const { ApiError } = await import('../src/api/client.js');
const { claimsUnderCorrectionKey } = await import('../src/api/hooks.js');

const requestCorrectionClosure = vi.fn();
const recordNoCorrectionNeeded = vi.fn();
const decideCorrectionClosure = vi.fn();
const approveNoCorrectionNeeded = vi.fn();
const decideEscalatedClosure = vi.fn();
const getEscalatedClosure = vi.fn();
const respondToClosureDirection = vi.fn();
const recordRefileConfirmation = vi.fn();
const getClosureLetterAddress = vi.fn();
const requestStepUp = vi.fn();
const verifyStepUp = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    requestCorrectionClosure: (...a: unknown[]) => requestCorrectionClosure(...a),
    recordNoCorrectionNeeded: (...a: unknown[]) => recordNoCorrectionNeeded(...a),
    decideCorrectionClosure: (...a: unknown[]) => decideCorrectionClosure(...a),
    approveNoCorrectionNeeded: (...a: unknown[]) => approveNoCorrectionNeeded(...a),
    decideEscalatedClosure: (...a: unknown[]) => decideEscalatedClosure(...a),
    getEscalatedClosure: (...a: unknown[]) => getEscalatedClosure(...a),
    respondToClosureDirection: (...a: unknown[]) => respondToClosureDirection(...a),
    recordRefileConfirmation: (...a: unknown[]) => recordRefileConfirmation(...a),
    getClosureLetterAddress: (...a: unknown[]) => getClosureLetterAddress(...a),
    requestStepUp: (...a: unknown[]) => requestStepUp(...a),
    verifyStepUp: (...a: unknown[]) => verifyStepUp(...a),
  };
});

const {
  ApprovalNameHighlightBadge,
  ClosureColumn,
  ClosureLettersOwedList,
  DirectionInboxList,
  EscalationDetail,
  PariwarClosureList,
  RefileConfirmationCard,
} = await import('../src/modules/correction-closure/index.js');

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const CLOSURE = '33333333-3333-4333-8333-333333333333';

function wrap(ui: ReactElement): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

type QueueItem = ClaimsUnderCorrectionResponse['items'][number];
const queueItem = (closure: Partial<QueueItem['correction_closure']> = {}): QueueItem => ({
  claim_case_id: CLAIM,
  deceased_member_id: '22222222-2222-4222-8222-222222222222',
  claim_state: 'verifier_approved',
  claim_filed_at: '2026-06-01T00:00:00.000Z',
  returned_at: '2026-06-20T10:00:00.000Z',
  returned_by_actor_display: 'Kalpana Bharti',
  return_note: null,
  sent_back_by_check: false,
  accounts_complete: true,
  short_reference: '11111111',
  correction_chase: {
    return_decision_id: '55555555-5555-4555-8555-555555555555',
    must_act: 'family',
    must_act_set_by: 'Pariwar Admin Two',
    must_act_set_at: '2026-06-20T10:00:00.000Z',
    run: { kind: 'family', day0: '2026-06-20', day_count: 96, open: false, ended_on: '2026-09-18', next_reminder_on: null },
    cannot_remind: null,
    claimant_unresolved: false,
    awaiting_check: false,
    people: [],
    escalated: false,
  },
  correction_closure: {
    state: null,
    origin: null,
    requested_at: null,
    requested_by: null,
    blocker: null,
    not_reached: null,
    family_run_day: 96,
    ...closure,
  },
});

describe('<ClosureColumn> — the District Admin (AC6, AC8c)', () => {
  it('each refusal reads in PLAIN WORDS, and ⛔ no request form is offered', () => {
    for (const [blocker, words] of [
      ['too_early', 'Too early'],
      ['not_family_action', 'Staff must act'],
      ['claim_corrected', 'The family has sent corrected details'],
      ['escalated', 'Already with the Super Admin'],
    ] as const) {
      const { unmount } = render(
        <QueryClientProvider client={new QueryClient()}>
          <ClosureColumn pariwarId={PARIWAR} item={queueItem({ blocker })} />
        </QueryClientProvider>,
      );
      expect(screen.getByTestId('closure-blocker').textContent).toContain(words);
      expect(screen.queryByTestId('closure-request-submit')).toBeNull();
      unmount();
    }
  });

  it('"not everyone reached yet" names a COUNT and the ROLES, ⛔ a person', () => {
    wrap(<ClosureColumn pariwarId={PARIWAR} item={queueItem({ blocker: 'not_reached', not_reached: { count: 2, roles: ['claimant', 'nominee'] } })} />);
    const line = screen.getByTestId('closure-blocker').textContent ?? '';
    expect(line).toContain('Not everyone reached yet');
    expect(line).toContain('2 still to be reached (claimant, nominee)');
  });

  it('⭐ when a request would pass: the note is REQUIRED before Send (said, ⛔ a silent no-op), then it is sent', async () => {
    requestCorrectionClosure.mockResolvedValue({});
    wrap(<ClosureColumn pariwarId={PARIWAR} item={queueItem()} />);
    expect(screen.getByTestId('closure-blocker').textContent).toContain('you may ask the Pariwar Admin');
    fireEvent.click(screen.getByTestId('closure-request-submit'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Write a note saying why.');
    expect(requestCorrectionClosure).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('closure-request-note'), { target: { value: 'reached in June, silent since' } });
    fireEvent.click(screen.getByTestId('closure-request-submit'));
    await waitFor(() => expect(requestCorrectionClosure).toHaveBeenCalledWith(PARIWAR, CLAIM, 'reached in June, silent since'));
  });

  it('⭐ code review (2026-10-03) — the success banner SURVIVES its own result and clears on the NEXT server move', async () => {
    requestCorrectionClosure.mockResolvedValue({});
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <ClosureColumn pariwarId={PARIWAR} item={queueItem()} />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByTestId('closure-request-note'), { target: { value: 'reached in June, silent since' } });
    fireEvent.click(screen.getByTestId('closure-request-submit'));
    expect(await screen.findByText('Closure requested — the Pariwar Admin decides.')).toBeInTheDocument();
    // The server's next read reports `request_pending` — the request's OWN result: the banner stays.
    rerender(
      <QueryClientProvider client={qc}>
        <ClosureColumn pariwarId={PARIWAR} item={queueItem({ blocker: 'request_pending', state: 'requested' })} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Closure requested — the Pariwar Admin decides.')).toBeInTheDocument();
    // A LATER move (the Pariwar Admin declined → escalated) — the old banner clears, ⛔ sits beside it.
    rerender(
      <QueryClientProvider client={qc}>
        <ClosureColumn pariwarId={PARIWAR} item={queueItem({ blocker: 'escalated', state: 'escalated' })} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.queryByText('Closure requested — the Pariwar Admin decides.')).toBeNull());
  });

  it('⭐ code review (2026-10-03) — the SAME rule covers the D27 "no correction needed" banner', async () => {
    recordNoCorrectionNeeded.mockResolvedValue({ must_act: 'staff' });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <ClosureColumn pariwarId={PARIWAR} item={queueItem()} />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByTestId('no-correction-note'), { target: { value: 'the bank details were already correct' } });
    fireEvent.click(screen.getByTestId('no-correction-submit'));
    expect(await screen.findByText('Recorded — staff must act until the Pariwar Admin decides.')).toBeInTheDocument();
    // D27 sets the mark to `staff` → `not_family_action`: the record's OWN result — the banner stays.
    rerender(
      <QueryClientProvider client={qc}>
        <ClosureColumn pariwarId={PARIWAR} item={queueItem({ blocker: 'not_family_action' })} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Recorded — staff must act until the Pariwar Admin decides.')).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={qc}>
        <ClosureColumn pariwarId={PARIWAR} item={queueItem({ blocker: 'escalated' })} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.queryByText('Recorded — staff must act until the Pariwar Admin decides.')).toBeNull());
  });

  it('⭐ code review (2026-10-03) — through the REAL hook order (invalidate + refetch BEFORE `success`), the banner is seen', async () => {
    // The column fed by a LIVE query on the key the mutation invalidates: TanStack v5 awaits `onSettled` (the
    // invalidate and this refetch) before it dispatches `success`, so the blocker moves first. A prop-fed test
    // cannot see that order — this one does.
    let serverBlocker: 'request_pending' | null = null;
    requestCorrectionClosure.mockImplementation(async () => {
      serverBlocker = 'request_pending';
      return {};
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function Live(): ReactElement | null {
      const q = useQuery({
        queryKey: [...claimsUnderCorrectionKey(PARIWAR), 'all'],
        queryFn: async () => queueItem({ blocker: serverBlocker, state: serverBlocker === null ? null : 'requested' }),
      });
      return q.data === undefined ? null : <ClosureColumn pariwarId={PARIWAR} item={q.data} />;
    }
    render(
      <QueryClientProvider client={qc}>
        <Live />
      </QueryClientProvider>,
    );
    fireEvent.change(await screen.findByTestId('closure-request-note'), { target: { value: 'silent since June' } });
    fireEvent.click(screen.getByTestId('closure-request-submit'));
    await waitFor(() => expect(screen.getByTestId('closure-blocker')).toHaveAttribute('data-blocker', 'request_pending'));
    expect(await screen.findByText('Closure requested — the Pariwar Admin decides.')).toBeInTheDocument();
  });
});

type ClosureQueueItem = PariwarClosureQueueResponse['items'][number];
const closureQueueItem = (over: Partial<ClosureQueueItem> = {}): ClosureQueueItem => ({
  kind: 'closure_request',
  claim_case_id: CLAIM,
  deceased_member_id: '22222222-2222-4222-8222-222222222222',
  short_reference: '11111111',
  at: '2026-09-25T10:00:00.000Z',
  by: 'District Admin One',
  note: { state: 'readable', value: 'silent since June' },
  family_run_day0: '2026-06-20',
  checked_after_record: null,
  held: false,
  ...over,
});
const decided = {
  claim_case_id: CLAIM,
  claim_state: 'denied',
  closure: null,
  decided_by: 'Pariwar Admin One',
  decided_at: '2026-10-01T10:00:00.000Z',
};

describe('<PariwarClosureList> — the Pariwar Admin (UX-DR54, UX-DR44)', () => {
  it('⭐ the PRIMARY action is leftmost; the DECLINE note is mandatory BEFORE the decline acts', async () => {
    decideCorrectionClosure.mockResolvedValue({ ...decided, claim_state: 'state_trustee_freeze' });
    wrap(<PariwarClosureList pariwarId={PARIWAR} items={[closureQueueItem()]} />);
    expect(screen.getByTestId('closure-queue-note').textContent).toContain('silent since June');
    const buttons = screen.getByTestId(`closure-strip-${CLAIM}`).querySelectorAll('button');
    expect(buttons[0]).toBe(screen.getByTestId('closure-approve'));
    expect(screen.getByTestId('closure-approve')).toHaveAttribute('aria-keyshortcuts', '1');
    expect(screen.getByTestId('closure-decline')).toHaveAttribute('aria-keyshortcuts', '2');
    fireEvent.click(screen.getByTestId('closure-decline'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Write a note saying why you are declining.');
    expect(decideCorrectionClosure).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('closure-decision-note'), { target: { value: 'reached only once' } });
    fireEvent.click(screen.getByTestId('closure-decline'));
    await waitFor(() =>
      expect(decideCorrectionClosure).toHaveBeenCalledWith(PARIWAR, CLAIM, { decision: 'decline', note: 'reached only once' }),
    );
    expect(await screen.findByText('Declined — the claim is now with the Super Admin.')).toBeInTheDocument();
    // ⭐ UX-DR44 — the entry at once, with the server's snapshotted name.
    expect(screen.getByTestId('audit-actor').textContent).toBe('Pariwar Admin One');
  });

  it('⭐ the numbered shortcut 1 approves — and ⛔ a "1" typed INTO the note box does not', async () => {
    decideCorrectionClosure.mockReset();
    decideCorrectionClosure.mockResolvedValue(decided);
    wrap(<PariwarClosureList pariwarId={PARIWAR} items={[closureQueueItem()]} />);
    fireEvent.keyDown(screen.getByTestId('closure-decision-note'), { key: '1' });
    expect(decideCorrectionClosure).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId('closure-approve'), { key: '1' });
    await waitFor(() => expect(decideCorrectionClosure).toHaveBeenCalledWith(PARIWAR, CLAIM, { decision: 'approve' }));
    expect(await screen.findByText('Approved — the claim is closed.')).toBeInTheDocument();
    // Code review (2026-10-03): the approve IS the closure for no response — "Closed by", like the Super Admin's close.
    expect(screen.getByTestId('audit-trail-entry')).toHaveAttribute('data-outcome', 'closed');
    expect(screen.getByTestId('audit-trail-entry').textContent).toContain('Closed by');
  });

  it('⭐ code review (2026-10-03) — the shortcuts: ctrl/alt/meta and auto-repeat SKIP; Shift does ⛔ not; a 2nd press while pending is ignored', async () => {
    decideCorrectionClosure.mockReset();
    let release: (v: typeof decided) => void = () => undefined;
    decideCorrectionClosure.mockImplementation(() => new Promise((r) => (release = r)));
    wrap(<PariwarClosureList pariwarId={PARIWAR} items={[closureQueueItem()]} />);
    const strip = screen.getByTestId('closure-approve');
    for (const mod of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { repeat: true }]) {
      fireEvent.keyDown(strip, { key: '1', ...mod });
    }
    expect(decideCorrectionClosure).not.toHaveBeenCalled();
    // AZERTY: the digit itself arrives WITH Shift — it must still act.
    fireEvent.keyDown(strip, { key: '1', shiftKey: true });
    await waitFor(() => expect(decideCorrectionClosure).toHaveBeenCalledTimes(1));
    // While that decision is pending, further presses are ignored (the synchronous `actingRef`).
    fireEvent.keyDown(strip, { key: '1' });
    fireEvent.keyDown(strip, { key: '2' });
    await act(async () => release(decided));
    expect(await screen.findByText('Approved — the claim is closed.')).toBeInTheDocument();
    expect(decideCorrectionClosure).toHaveBeenCalledTimes(1);
  });

  it('a HELD "no correction needed" claim offers ⛔ no decision and SAYS who decides it now (`-273` §4)', () => {
    wrap(<PariwarClosureList pariwarId={PARIWAR} items={[closureQueueItem({ kind: 'no_correction_needed', held: true, checked_after_record: true, family_run_day0: null })]} />);
    expect(screen.getByTestId(`no-correction-held-${CLAIM}`)).toHaveTextContent('only the Super Admin can decide it now');
    expect(screen.queryByTestId('no-correction-approve')).toBeNull();
  });

  it('D27 — approve is unavailable until a passing check was recorded AFTER the record, and says why', () => {
    wrap(<PariwarClosureList pariwarId={PARIWAR} items={[closureQueueItem({ kind: 'no_correction_needed', checked_after_record: false, family_run_day0: null })]} />);
    expect(screen.getByTestId('no-correction-approve')).toBeDisabled();
    expect(screen.getAllByText(/still needed before you can approve/).length).toBeGreaterThan(0);
  });
});

const detail = (over: Partial<EscalatedClosureDetailResponse> = {}): EscalatedClosureDetailResponse => ({
  closure: {
    closure_id: CLOSURE,
    claim_case_id: CLAIM,
    origin: 'declined_closure',
    state: 'escalated',
    requested_at: '2026-09-25T10:00:00.000Z',
    escalated_at: '2026-09-26T10:00:00.000Z',
    under_review_since: null,
    super_admin_decision: null,
    super_admin_reason: null,
    closed_at: null,
    closure_letter_person_keys: [],
    approval_name_highlight: null,
  },
  deceased_member_id: '22222222-2222-4222-8222-222222222222',
  short_reference: '11111111',
  claim_state: 'verifier_approved',
  request_note: { state: 'readable', value: 'silent since June' },
  requested_by: 'District Admin One',
  pariwar_decision_note: { state: 'readable', value: 'reached only once' },
  pariwar_decided_by: 'Pariwar Admin One',
  review_note: null,
  marks: [],
  directions: [],
  resubmitted: false,
  family_part_done: false,
  name_check_state: 'does_not_match',
  approve_path: 'name_waived_251',
  ...over,
});

describe('<EscalationDetail> — the Super Admin (AC14, AC17)', () => {
  it('shows both admins\' notes, the name check\'s RECORDED state, and what an approve would waive', async () => {
    getEscalatedClosure.mockResolvedValue(detail());
    wrap(<EscalationDetail pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    expect(await screen.findByTestId('escalation-request-note')).toHaveTextContent('silent since June');
    expect(screen.getByTestId('escalation-pariwar-note')).toHaveTextContent('reached only once');
    expect(screen.getByTestId('escalation-name-check')).toHaveTextContent('recorded as not matching');
    fireEvent.change(screen.getByTestId('decision-kind'), { target: { value: 'approve' } });
    expect(screen.getByTestId('decision-approve-path')).toHaveTextContent('waives the name check only');
  });

  it('⭐ code review patch (2026-10-02) — the direction form\'s actor field gets its OWN missing-value alert, ⛔ sharing the text field\'s', async () => {
    getEscalatedClosure.mockResolvedValue(detail());
    wrap(<EscalationDetail pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    await screen.findByTestId('escalation-direction-form');
    // Text filled, actor empty — only the actor alert should fire.
    fireEvent.change(screen.getByTestId('direction-text'), { target: { value: 'call the family once more' } });
    fireEvent.click(screen.getByTestId('direction-submit'));
    expect(await screen.findByTestId('direction-actor-missing')).toBeInTheDocument();
    // The TEXT field's own alert is distinct wording and must ⛔ fire — it is valid, only the actor is empty.
    expect(screen.queryByText('Write a note saying why.')).toBeNull();
  });

  it('⛔ a STAFF case offers no close (`-274` 1a); the reason list follows the decision; a refusal takes its code', async () => {
    getEscalatedClosure.mockResolvedValue(detail({ closure: { ...detail().closure, origin: 'staff_case' }, approve_path: 'full_gate' }));
    wrap(<EscalationDetail pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    const kind = (await screen.findByTestId('decision-kind')) as HTMLSelectElement;
    expect([...kind.options].map((o) => o.value)).toEqual(['approve', 'refuse']);
    const reasons = () => [...(screen.getByTestId('decision-reason') as HTMLSelectElement).options].map((o) => o.value);
    expect(reasons()).toEqual(['name_difference_accepted', 'details_verified', 'other']);
    fireEvent.change(kind, { target: { value: 'refuse' } });
    expect(reasons()).toEqual(['claim_not_payable', 'other']);
    expect(screen.getByTestId('decision-refusal-code')).toBeInTheDocument();
  });

  it('⭐ the decision needs a note; the result shows the UX-DR44 entry and the `-273` §7 highlight', async () => {
    getEscalatedClosure.mockResolvedValue(detail());
    decideEscalatedClosure.mockResolvedValue({
      claim_case_id: CLAIM,
      claim_state: 'state_trustee_approved',
      closure: { ...detail().closure, state: 'approved', super_admin_decision: 'approved', super_admin_reason: 'name_difference_accepted', approval_name_highlight: 'approved_despite_name_mismatch' },
      decided_by: 'Super Admin One',
      decided_at: '2026-10-01T10:00:00.000Z',
    });
    wrap(<EscalationDetail pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    fireEvent.change(await screen.findByTestId('decision-kind'), { target: { value: 'approve' } });
    fireEvent.click(screen.getByTestId('decision-submit'));
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(decideEscalatedClosure).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('decision-note'), { target: { value: 'the bank shortened the name' } });
    fireEvent.click(screen.getByTestId('decision-submit'));
    await waitFor(() =>
      expect(decideEscalatedClosure).toHaveBeenCalledWith(PARIWAR, CLAIM, {
        decision: 'approve',
        reason: 'name_difference_accepted',
        note: 'the bank shortened the name',
      }),
    );
    expect(await screen.findByTestId('approval-name-highlight')).toHaveTextContent('Approved despite a name mismatch');
    expect(screen.getByTestId('audit-actor').textContent).toBe('Super Admin One');
  });

  it('⭐ code review Decision 5 (2026-10-02) — a `close` decision shows its OWN "Closed by" verb, ⛔ not collapsed into "Denied by"', async () => {
    getEscalatedClosure.mockResolvedValue(detail());
    decideEscalatedClosure.mockResolvedValue({
      claim_case_id: CLAIM,
      claim_state: 'denied',
      closure: { ...detail().closure, state: 'closed', super_admin_decision: 'closed', super_admin_reason: 'family_silent_after_reached' },
      decided_by: 'Super Admin One',
      decided_at: '2026-10-01T10:00:00.000Z',
    });
    wrap(<EscalationDetail pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    // `decision-kind` defaults to 'close' (the first option for a non-staff-case row).
    fireEvent.change(await screen.findByTestId('decision-note'), { target: { value: 'never answered after reach' } });
    fireEvent.click(screen.getByTestId('decision-submit'));
    await waitFor(() =>
      expect(decideEscalatedClosure).toHaveBeenCalledWith(PARIWAR, CLAIM, {
        decision: 'close',
        reason: 'family_silent_after_reached',
        note: 'never answered after reach',
      }),
    );
    expect(screen.getByTestId('audit-trail-entry')).toHaveAttribute('data-outcome', 'closed');
    expect(screen.getByTestId('audit-trail-entry')).toHaveTextContent('Closed by');
  });

  it('⭐ code review Decision 5 (2026-10-03, adversarial re-check) — a `refuse` decision still reads "Denied by" — DELIBERATELY ⛔ given its own verb', async () => {
    getEscalatedClosure.mockResolvedValue(detail());
    decideEscalatedClosure.mockResolvedValue({
      claim_case_id: CLAIM,
      claim_state: 'denied',
      closure: { ...detail().closure, state: 'refused', super_admin_decision: 'refused', super_admin_reason: 'claim_not_payable' },
      decided_by: 'Super Admin One',
      decided_at: '2026-10-01T10:00:00.000Z',
    });
    wrap(<EscalationDetail pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    fireEvent.change(await screen.findByTestId('decision-kind'), { target: { value: 'refuse' } });
    fireEvent.change(screen.getByTestId('decision-note'), { target: { value: 'the standing was never met' } });
    fireEvent.click(screen.getByTestId('decision-submit'));
    // Code review (2026-10-03): the REQUEST itself — a refuse with a refuse-valid reason (⛔ close's stale default).
    await waitFor(() =>
      expect(decideEscalatedClosure).toHaveBeenCalledWith(
        PARIWAR,
        CLAIM,
        expect.objectContaining({
          decision: 'refuse',
          reason: 'claim_not_payable',
          note: 'the standing was never met',
          refusal_reason_code: expect.any(String),
        }),
      ),
    );
    expect(screen.getByTestId('audit-trail-entry')).toHaveAttribute('data-outcome', 'denied');
    expect(screen.getByTestId('audit-trail-entry')).toHaveTextContent('Denied by');
  });
});

describe('the directee, the closure letter, the helpline, the highlight', () => {
  it('the inbox: a response is REQUIRED, then recorded', async () => {
    respondToClosureDirection.mockResolvedValue({});
    const item: DirectionInboxResponse['items'][number] = {
      claim_case_id: CLAIM,
      short_reference: '11111111',
      still_held: true,
      direction: {
        direction_id: '66666666-6666-4666-8666-666666666666',
        directed_to_actor: 'me',
        directed_to_role: 'district_admin',
        kind: 'other',
        text: { state: 'readable', value: 'call the family once more' },
        created_by: 'Super Admin One',
        created_at: '2026-09-28T10:00:00.000Z',
        opened_run: false,
        response: null,
        responded_at: null,
        responded_by: null,
      },
    };
    wrap(<DirectionInboxList pariwarId={PARIWAR} items={[item]} />);
    expect(screen.getByText('call the family once more')).toBeInTheDocument();
    expect(screen.getByText('The claim is still with the Super Admin.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('direction-response-submit'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('direction-response'), { target: { value: 'called twice, no answer' } });
    fireEvent.click(screen.getByTestId('direction-response-submit'));
    await waitFor(() =>
      expect(respondToClosureDirection).toHaveBeenCalledWith(PARIWAR, CLAIM, item.direction.direction_id, 'called twice, no answer'),
    );
  });

  it('⭐ the closure letter form STATES its two required points (`-274` 2)', () => {
    wrap(
      <ClosureLettersOwedList
        pariwarId={PARIWAR}
        items={[{ claim_case_id: CLAIM, deceased_member_id: CLAIM, short_reference: '11111111', closed_on: '2026-09-30', days_since_closure: 1, people: [{ person_key: 'claimant', letter: null }] }]}
      />,
    );
    const mustSay = screen.getByTestId('closure-letter-must-say').textContent ?? '';
    expect(mustSay).toContain('closed because the family did not respond');
    expect(mustSay).toContain('a new claim can be filed through the helpline or the District Admin');
  });

  it('⭐ code review patch (2026-10-02) — the "Record the posted letter" button is clickable, ⛔ silently disabled: a missing field is SAID', () => {
    wrap(
      <ClosureLettersOwedList
        pariwarId={PARIWAR}
        items={[{ claim_case_id: CLAIM, deceased_member_id: CLAIM, short_reference: '11111111', closed_on: '2026-09-30', days_since_closure: 1, people: [{ person_key: 'claimant', letter: null }] }]}
      />,
    );
    expect(screen.getByTestId('closure-letter-record')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('closure-letter-record'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the posting date and the tracking number.');
  });

  it('⭐ code review patch (2026-10-03, adversarial re-check) — entering the step-up code actually REVEALS the address, ⛔ a silent no-op', async () => {
    getClosureLetterAddress.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'Step up required'));
    requestStepUp.mockResolvedValue({});
    verifyStepUp.mockResolvedValue({});
    getClosureLetterAddress.mockResolvedValueOnce({ person_key: 'claimant', address: 'Sentinel House 7' });
    const items: ClosureLettersOwedResponse['items'] = [
      { claim_case_id: CLAIM, deceased_member_id: CLAIM, short_reference: '11111111', closed_on: '2026-09-30', days_since_closure: 1, people: [{ person_key: 'claimant', letter: null }] },
    ];
    wrap(<ClosureLettersOwedList pariwarId={PARIWAR} items={items} />);
    fireEvent.click(screen.getByTestId('closure-letter-reveal'));
    expect(await screen.findByTestId('closure-letter-code')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('closure-letter-code'), { target: { value: '123456' } });
    const verifyButton = screen.getByTestId('closure-letter-code').closest('label')!.querySelector('button')!;
    await act(async () => {
      fireEvent.click(verifyButton);
    });
    expect(await screen.findByTestId('closure-letter-address')).toHaveTextContent('Sentinel House 7');
    expect(getClosureLetterAddress).toHaveBeenCalledTimes(2);
  });

  it('⭐ code review (2026-10-03) — a FAILED step-up request shows ⛔ no code form, SAYS the error; a double click reveals once', async () => {
    getClosureLetterAddress.mockReset();
    requestStepUp.mockReset();
    let rejectFirst: (e: unknown) => void = () => undefined;
    getClosureLetterAddress.mockImplementationOnce(() => new Promise((_, rej) => (rejectFirst = rej)));
    requestStepUp.mockRejectedValueOnce(new ApiError(503, 'auth.step_up_unavailable', 'Step-up unavailable'));
    const items: ClosureLettersOwedResponse['items'] = [
      { claim_case_id: CLAIM, deceased_member_id: CLAIM, short_reference: '11111111', closed_on: '2026-09-30', days_since_closure: 1, people: [{ person_key: 'claimant', letter: null }] },
    ];
    wrap(<ClosureLettersOwedList pariwarId={PARIWAR} items={items} />);
    fireEvent.click(screen.getByTestId('closure-letter-reveal'));
    fireEvent.click(screen.getByTestId('closure-letter-reveal'));
    await waitFor(() => expect(getClosureLetterAddress).toHaveBeenCalledTimes(1));
    await act(async () => rejectFirst(new ApiError(403, 'auth.step_up_required', 'Step up required')));
    await waitFor(() => expect(requestStepUp).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('closure-letter-code')).toBeNull();
    expect(getClosureLetterAddress).toHaveBeenCalledTimes(1);
  });

  it('the helpline re-file card: a note is REQUIRED, then the confirmation is recorded against the CLOSED claim', async () => {
    recordRefileConfirmation.mockResolvedValue({ confirmation_id: CLOSURE, closed_claim_case_id: CLAIM, via: 'helpline' });
    wrap(<RefileConfirmationCard pariwarId={PARIWAR} closedClaimCaseId={CLAIM} />);
    // Family 13(d): the card is mounted on the 409, so the step it asks for is an ALERT (announced on insertion).
    expect(screen.getByTestId('refile-confirmation-announce')).toHaveAttribute('role', 'alert');
    fireEvent.click(screen.getByTestId('refile-confirmation-submit'));
    expect(await screen.findByText('Write a note saying why.')).toHaveAttribute('role', 'alert');
    expect(recordRefileConfirmation).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('refile-confirmation-note'), { target: { value: 'the son called back' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('refile-confirmation-submit'));
    });
    await waitFor(() => expect(recordRefileConfirmation).toHaveBeenCalledWith(PARIWAR, CLAIM, 'the son called back'));
    expect(await screen.findByText('Confirmation recorded — you can file the claim now.')).toBeInTheDocument();
  });

  it('the highlight badge: both `-273` §7 wordings, and nothing when there is none', () => {
    const { rerender } = render(<ApprovalNameHighlightBadge highlight="approved_without_passing_check" />);
    expect(screen.getByTestId('approval-name-highlight')).toHaveTextContent('Approved without a current passing name check');
    rerender(<ApprovalNameHighlightBadge highlight="approved_despite_name_mismatch" />);
    expect(screen.getByTestId('approval-name-highlight')).toHaveTextContent('Approved despite a name mismatch');
    rerender(<ApprovalNameHighlightBadge highlight={null} />);
    expect(screen.queryByTestId('approval-name-highlight')).toBeNull();
  });
});
