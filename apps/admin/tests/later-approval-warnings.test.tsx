// Story 6.23b (Task 8; AC7, AC11) — EVERY LATER APPROVER sees the nominee-change warnings and picks a reason, on each
// surface: the cycle-freeze card (Approve and Resolve → Approve), the R9 panel (an approve vote; the per-vote "must be
// revised" line; Finalize held with words), the Super Admin's escalation decision (approve only), and the "no correction
// needed" strip (its OWN note — ⛔ the Keep note; ⛔ the closure-request strip, Trap 12). On each: the line per kind, 6.23a's
// picker (label, "when to use", added by / built in, ⛔ nothing pre-selected), a missing reason or note SAID
// (`role="alert"`), the WAIT and a failed read disabling ONLY the approve control WITH words (Trap 15), and the 409s in
// words (⛔ a raw code). AC11 — the verifier's reason on the card as words.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ApprovalWarningReasonOption,
  ApprovalWarningsSummary,
  CycleFreezePendingResponse,
  EscalatedClosureDetailResponse,
  PariwarClosureQueueResponse,
  R9PanelResponse,
} from '@twt/contracts';

const getCycleFreezePending = vi.fn();
const postCycleFreezeDecision = vi.fn();
const getR9Panel = vi.fn();
const castR9Vote = vi.fn();
const getSession = vi.fn();
const getEscalatedClosure = vi.fn();
const decideEscalatedClosure = vi.fn();
const approveNoCorrectionNeeded = vi.fn();
const finalizeR9 = vi.fn();
const requestStepUp = vi.fn();
const verifyStepUp = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getCycleFreezePending: (...a: unknown[]) => getCycleFreezePending(...a),
    postCycleFreezeDecision: (...a: unknown[]) => postCycleFreezeDecision(...a),
    getR9Panel: (...a: unknown[]) => getR9Panel(...a),
    castR9Vote: (...a: unknown[]) => castR9Vote(...a),
    getSession: () => getSession(),
    getEscalatedClosure: (...a: unknown[]) => getEscalatedClosure(...a),
    decideEscalatedClosure: (...a: unknown[]) => decideEscalatedClosure(...a),
    approveNoCorrectionNeeded: (...a: unknown[]) => approveNoCorrectionNeeded(...a),
    finalizeR9: (...a: unknown[]) => finalizeR9(...a),
    requestStepUp: (...a: unknown[]) => requestStepUp(...a),
    verifyStepUp: (...a: unknown[]) => verifyStepUp(...a),
  };
});

const { ApiError } = await import('../src/api/client.js');
const { PendingCaseCard, CycleFreezePage } = await import('../src/modules/cycle-freeze/index.js');
const { R9CasePanel } = await import('../src/modules/r9-voting/R9CasePanel.js');
const { EscalationDetail, PariwarClosureList } = await import('../src/modules/correction-closure/index.js');
const { verifierConsoleEn } = await import('../src/modules/claim-verification/i18n-en.js');

const tw = verifierConsoleEn.approvalWarnings;
const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const MEMBER = '22222222-2222-4222-8222-222222222222';
const ME = '33333333-3333-4333-8333-333333333333';
const GENERIC = 'warnings_reviewed';

const OPTIONS: ApprovalWarningReasonOption[] = [
  { code: GENERIC, reasonId: null, label: 'Warnings reviewed — approved despite them', whenToUse: 'Use when you have read every warning.', addedByDisplay: null, addedAt: null, replacesLabel: null },
  {
    code: 'awr_0a1b2c3d',
    reasonId: '77777777-7777-4777-8777-777777777777',
    label: 'Family confirmed in person',
    whenToUse: 'Use when the inspector met the family.',
    addedByDisplay: 'Sushila (Super Admin)',
    addedAt: '2026-09-30T06:00:00.000Z',
    replacesLabel: null,
  },
];

const summary = (over: Partial<ApprovalWarningsSummary> = {}): ApprovalWarningsSummary => ({
  available: true,
  kinds: ['post_death_version'],
  post_death: 'evaluated',
  waiting_for_district_admin: false,
  own_reason_excluded: false,
  ...over,
});
const QUIET = summary({ kinds: [] });
const UNAVAILABLE = summary({ available: false, kinds: [], post_death: 'awaiting_determination' });

function wrap(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

type PendingCase = CycleFreezePendingResponse['ready_to_freeze'][number];
const CASE: PendingCase = {
  claim_case_id: CLAIM,
  deceased_member_id: MEMBER,
  current_state: 'verifier_approved',
  verifier_decision_id: '33333333-3333-4333-8333-333333333334',
  verifier_actor_display: 'Anita Kumari',
  verifier_reason_code: 'r8_90pct_met',
  verifier_rationale: null,
  signals_summary: 'state=verifier_approved',
  concealment_flags: [],
  routed_to_r9: false,
  under_correction: false,
  name_difference_reasons: [],
  approval_name_highlight: null,
  approval_warnings: summary(),
};

function card(over: Partial<PendingCase> = {}, bucket: 'ready_to_freeze' | 'escalated' | 'voted_pending_commit' = 'ready_to_freeze') {
  const onDecision = vi.fn();
  wrap(
    <ul>
      <PendingCaseCard case_={{ ...CASE, ...over }} bucket={bucket} pariwarId={PARIWAR} onDecision={onDecision} pending={false} reasonOptions={OPTIONS} />
    </ul>,
  );
  return { onDecision };
}

const prefix = `cf-${CLAIM}`;

describe('Story 6.26b (GI11 [b]) — a LATER surface words the three death-fact kinds through the shared map (⛔ per-surface edit)', () => {
  it('the final-vote card shows each new kind\'s own line', () => {
    const kinds = ['inspection_death_date_differs', 'original_certificate_mismatch', 'register_check_mismatch'] as const;
    card({ approval_warnings: summary({ kinds: [...kinds] }) });
    for (const k of kinds) expect(screen.getByTestId(`${prefix}-approval-warning-${k}`)).toHaveTextContent(tw.kindLine[k]);
  });
});

describe('<PendingCaseCard> — the final vote and the escalation (EA3, EA4, EA7)', () => {
  it('⭐ shows the line and the picker (label, when to use, added by / built in, ⛔ nothing pre-selected) BEFORE Approve', () => {
    card();
    expect(screen.getByTestId(`${prefix}-approval-warning-post_death_version`)).toHaveTextContent(tw.kindLine.post_death_version);
    expect(screen.getByText(tw.later.intro)).toBeInTheDocument();
    const radios = within(screen.getByTestId(`${prefix}-warning-reason-picker`)).getAllByRole('radio');
    expect(radios.every((r) => !(r as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByTestId(`${prefix}-warning-reason-provenance-${GENERIC}`)).toHaveTextContent(tw.builtIn);
    expect(screen.getByTestId(`${prefix}-warning-reason-provenance-awr_0a1b2c3d`)).toHaveTextContent('Added by Sushila (Super Admin)');
    expect(screen.getByText(/Use when the inspector met the family/)).toBeInTheDocument();
  });

  it('⭐ a missing reason, then a missing note, is SAID (⛔ a silent disabled button); with both ⇒ the warned body, still ⛔ no `reason_code` (Trap 2)', () => {
    const { onDecision } = card();
    fireEvent.click(screen.getByTestId('cycle-freeze-approve'));
    expect(screen.getByTestId(`${prefix}-warning-reason-error`)).toHaveTextContent(tw.reasonRequiredError);
    expect(onDecision).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId(`${prefix}-warning-reason-radio-${GENERIC}`));
    expect(screen.getByTestId(`${prefix}-warning-reason-selected`)).toHaveTextContent(tw.selected(OPTIONS[0]!.label));
    fireEvent.click(screen.getByTestId('cycle-freeze-approve'));
    expect(screen.getByTestId('pending-case-validation')).toHaveTextContent(tw.noteRequiredError);
    expect(onDecision).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' Read every warning. ' } });
    fireEvent.click(screen.getByTestId('cycle-freeze-approve'));
    expect(onDecision).toHaveBeenCalledWith(
      { claim_case_id: CLAIM, action: 'approve', warning_reason_code: GENERIC, rationale: 'Read every warning.' },
      expect.anything(),
    );
  });

  it('Resolve → Approve carries `escalation_outcome` and the reason; an UN-warned approve body is byte-identical to before', () => {
    const { onDecision } = card({ current_state: 'verifier_review' }, 'escalated');
    fireEvent.click(screen.getByTestId(`${prefix}-warning-reason-radio-${GENERIC}`));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'why' } });
    fireEvent.click(screen.getByTestId('cycle-freeze-resolve-approve'));
    expect(onDecision).toHaveBeenCalledWith(
      { claim_case_id: CLAIM, action: 'resolve_escalation', escalation_outcome: 'approved', warning_reason_code: GENERIC, rationale: 'why' },
      expect.anything(),
    );
  });

  it('⛔ no warning ⇒ ⛔ no block, and the approve body is `{ claim_case_id, action }`', () => {
    const { onDecision } = card({ approval_warnings: QUIET });
    expect(screen.queryByTestId(`${prefix}-approval-warnings`)).toBeNull();
    fireEvent.click(screen.getByTestId('cycle-freeze-approve'));
    expect(onDecision).toHaveBeenCalledWith({ claim_case_id: CLAIM, action: 'approve' }, expect.anything());
  });

  it('⭐ the WAIT disables Approve WITH its words (and the own-reason words); Deny and Route stay as they were', () => {
    card({ approval_warnings: summary({ waiting_for_district_admin: true, own_reason_excluded: true }) });
    const blocked = screen.getByTestId(`${prefix}-approval-blocked`);
    expect(blocked).toHaveTextContent(tw.later.waits);
    expect(blocked).toHaveTextContent(tw.later.ownReasonExcluded);
    expect(screen.getByTestId('cycle-freeze-approve')).toBeDisabled();
    expect(screen.getByTestId('cycle-freeze-approve')).toHaveAttribute('aria-describedby', `${prefix}-approval-blocked`);
    expect(screen.queryByTestId(`${prefix}-warning-reason-picker`)).toBeNull();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Route to R9' })).toBeEnabled();
  });

  it('⭐ Trap 15 — a FAILED read disables ONLY Approve, with the unavailable words (⛔ "no warnings")', () => {
    card({ approval_warnings: UNAVAILABLE });
    expect(screen.getByTestId(`${prefix}-approval-blocked`)).toHaveTextContent(tw.unavailable);
    expect(screen.getByTestId('cycle-freeze-approve')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeEnabled();
  });

  it('a voted case shows the lines but ⛔ no picker (it has ⛔ approve control)', () => {
    card({ current_state: 'state_trustee_approved' }, 'voted_pending_commit');
    expect(screen.getByTestId(`${prefix}-approval-warning-post_death_version`)).toBeInTheDocument();
    expect(screen.queryByTestId(`${prefix}-warning-reason-picker`)).toBeNull();
  });

  // Code review round 2: a voted case offers Route-to-R9 ONLY — ⛔ never the WAIT's "approval is unavailable until they do".
  it('a voted case that WAITS shows the lines but ⛔ not the wait words (it has ⛔ no approve control to hold)', () => {
    card({ current_state: 'state_trustee_approved', approval_warnings: summary({ waiting_for_district_admin: true }) }, 'voted_pending_commit');
    expect(screen.getByTestId(`${prefix}-approval-warning-post_death_version`)).toBeInTheDocument();
    expect(screen.queryByTestId(`${prefix}-approval-blocked`)).toBeNull();
    expect(screen.queryByText(tw.later.waits)).toBeNull();
  });

  it('⭐ AC11 — the verifier\'s reason as WORDS; an unknown code falls back to the code (⛔ blank)', () => {
    card();
    expect(screen.getByTestId('pending-case-verifier')).toHaveTextContent(`Anita Kumari · ${verifierConsoleEn.reasonCodes.r8_90pct_met}`);
    expect(screen.getByTestId('pending-case-verifier')).not.toHaveTextContent('r8_90pct_met');
  });
  it('AC11 — an unknown code is shown as itself', () => {
    card({ verifier_reason_code: 'some_future_code' });
    expect(screen.getByTestId('pending-case-verifier')).toHaveTextContent('some_future_code');
  });
});

describe('<CycleFreezePage> — the 409s in words, and a 409 refetches (a REAL useQuery)', () => {
  beforeEach(() => {
    getCycleFreezePending.mockReset();
    postCycleFreezeDecision.mockReset();
  });

  it('⭐ the WAIT 409 reads as words (⛔ a code), and the list is refetched so the card shows the wait', async () => {
    getCycleFreezePending
      .mockResolvedValueOnce({ pariwar_id: PARIWAR, ready_to_freeze: [CASE], escalated: [], voted_pending_commit: [], reason_options: OPTIONS })
      .mockResolvedValue({
        pariwar_id: PARIWAR,
        ready_to_freeze: [{ ...CASE, approval_warnings: summary({ waiting_for_district_admin: true, own_reason_excluded: true }) }],
        escalated: [],
        voted_pending_commit: [],
        reason_options: OPTIONS,
      });
    postCycleFreezeDecision.mockRejectedValue(
      new ApiError(409, 'cycle_freeze.late_warning_reason_required', 'server words', {
        kinds: ['post_death_version'],
        uncovered_count: 1,
        own_reason_excluded: true,
      }),
    );
    wrap(<CycleFreezePage pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByTestId(`${prefix}-warning-reason-radio-${GENERIC}`));
    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: 'why' } });
    fireEvent.click(screen.getByTestId('cycle-freeze-approve'));
    const alert = await screen.findByText((_, el) => el?.getAttribute('role') === 'alert' && (el.textContent ?? '').includes(tw.errors.lateWarningReasonRequired));
    expect(alert).toHaveTextContent(tw.later.ownReasonExcluded);
    expect(alert).not.toHaveTextContent('cycle_freeze.');
    await waitFor(() => expect(getCycleFreezePending).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId(`${prefix}-approval-blocked`)).toHaveTextContent(tw.later.waits);
    // Code review round 2 — the hazard the Testing line names: the words must SURVIVE the server-state refetch.
    expect(screen.getByText((_, el) => el?.getAttribute('role') === 'alert' && (el.textContent ?? '').includes(tw.errors.lateWarningReasonRequired))).toBeInTheDocument();
  });

  // Code review round 2: the ONE page-level decision's error shows ONLY on the card that acted — ⛔ never as an alert on a
  // claim with ⛔ no warning at all.
  it('a 409 on one card shows its words on THAT card only', async () => {
    const OTHER = '12121212-1212-4121-8121-121212121212';
    getCycleFreezePending.mockResolvedValue({
      pariwar_id: PARIWAR,
      ready_to_freeze: [CASE, { ...CASE, claim_case_id: OTHER, approval_warnings: QUIET }],
      escalated: [],
      voted_pending_commit: [],
      reason_options: OPTIONS,
    });
    postCycleFreezeDecision.mockRejectedValue(new ApiError(409, 'cycle_freeze.late_warning_reason_required', 'server words', { kinds: ['post_death_version'], uncovered_count: 1, own_reason_excluded: false }));
    wrap(<CycleFreezePage pariwarId={PARIWAR} />);
    const radio = await screen.findByTestId(`${prefix}-warning-reason-radio-${GENERIC}`);
    fireEvent.click(radio);
    const actingCard = radio.closest('li')!;
    fireEvent.change(within(actingCard).getAllByRole('textbox')[0]!, { target: { value: 'why' } });
    fireEvent.click(within(actingCard).getByTestId('cycle-freeze-approve'));
    const isWaitAlert = (_: string, el: Element | null) => el?.getAttribute('role') === 'alert' && (el.textContent ?? '').includes(tw.errors.lateWarningReasonRequired);
    expect(await within(actingCard).findByText(isWaitAlert)).toBeInTheDocument();
    expect(screen.getAllByText(isWaitAlert)).toHaveLength(1);
    expect(screen.queryByTestId('cycle-freeze-decision-error')).toBeNull();
  });

  // Code review round 3 — the REGRESSION round 2's per-card scoping introduced: a 409 whose refetch removes the acting
  // claim from every bucket showed its words NOWHERE. They are said once, at the page.
  it('a 409 whose refetch removes the acting claim from every bucket is said at the PAGE (⛔ never lost)', async () => {
    getCycleFreezePending
      .mockResolvedValueOnce({ pariwar_id: PARIWAR, ready_to_freeze: [CASE], escalated: [], voted_pending_commit: [], reason_options: OPTIONS })
      .mockResolvedValue({ pariwar_id: PARIWAR, ready_to_freeze: [], escalated: [], voted_pending_commit: [], reason_options: OPTIONS });
    postCycleFreezeDecision.mockRejectedValue(new ApiError(409, 'cycle_freeze.warning_reason_unavailable', 'x'));
    wrap(<CycleFreezePage pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByTestId(`${prefix}-warning-reason-radio-${GENERIC}`));
    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: 'why' } });
    fireEvent.click(screen.getByTestId('cycle-freeze-approve'));
    await waitFor(() => expect(getCycleFreezePending).toHaveBeenCalledTimes(2));
    const pageError = await screen.findByTestId('cycle-freeze-decision-error');
    expect(pageError).toHaveAttribute('role', 'alert');
    expect(pageError).toHaveTextContent(tw.errors.warningReasonUnavailable);
  });

  // Code review round 3 — round 1's P36: the SERVER's `warning_reason_required` names what is missing (`details.missing`);
  // `'note'` reads as the note words, anything else as the reason words.
  it('`warning_reason_required` with `missing: "note"` reads as the NOTE words; with `"reason"`, the reason words', async () => {
    getCycleFreezePending.mockResolvedValue({ pariwar_id: PARIWAR, ready_to_freeze: [CASE], escalated: [], voted_pending_commit: [], reason_options: OPTIONS });
    postCycleFreezeDecision.mockRejectedValueOnce(new ApiError(409, 'cycle_freeze.warning_reason_required', 'x', { missing: 'note', kinds: ['post_death_version'] }));
    wrap(<CycleFreezePage pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByTestId(`${prefix}-warning-reason-radio-${GENERIC}`));
    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: 'why' } });
    fireEvent.click(screen.getByTestId('cycle-freeze-approve'));
    expect(await screen.findByText(tw.noteRequiredError, { selector: '[role="alert"]' })).toBeInTheDocument();
    postCycleFreezeDecision.mockRejectedValueOnce(new ApiError(409, 'cycle_freeze.warning_reason_required', 'x', { missing: 'reason', kinds: ['post_death_version'] }));
    fireEvent.click(screen.getByTestId('cycle-freeze-approve'));
    expect(await screen.findByText(tw.errors.warningReasonRequired, { selector: '[role="alert"]' })).toBeInTheDocument();
  });

  it('a replaced reason (`warning_reason_unavailable`) reads as its own words', async () => {
    getCycleFreezePending.mockResolvedValue({ pariwar_id: PARIWAR, ready_to_freeze: [CASE], escalated: [], voted_pending_commit: [], reason_options: OPTIONS });
    postCycleFreezeDecision.mockRejectedValue(new ApiError(409, 'cycle_freeze.warning_reason_unavailable', 'x'));
    wrap(<CycleFreezePage pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByTestId(`${prefix}-warning-reason-radio-${GENERIC}`));
    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: 'why' } });
    fireEvent.click(screen.getByTestId('cycle-freeze-approve'));
    expect(await screen.findByText(tw.errors.warningReasonUnavailable)).toBeInTheDocument();
  });
});

// ── R9 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const VOTE_ID = '88888888-8888-4888-8888-888888888888';
const r9Panel = (over: Partial<R9PanelResponse> = {}): R9PanelResponse => ({
  claim_case_id: CLAIM,
  deceased_member_id: MEMBER,
  current_state: 'verifier_approved',
  session: {
    session_id: '55555555-5555-4555-8555-555555555555',
    clause_id: 'niy.special-death.r9',
    clause_version_id: '66666666-6666-4666-8666-666666666666',
    rule_code: 'R9',
    voting_requirement: 'majority',
    panel: [{ actor_id: ME, actor_display: 'Meera Joshi' }],
    quorum_required: 1,
    opened_by_actor: ME,
    opened_display: 'Meera Joshi',
    opened_at: '2026-09-20T10:00:00.000Z',
    outcome: null,
    finalized_display: null,
    finalized_at: null,
  },
  votes: [],
  tally: { approve_count: 0, deny_count: 0, cast_votes: 0, panel_size: 1, quorum_required: 1, provisional_outcome: 'denied', quorum_met: false },
  name_difference_reasons: [],
  approval_warnings: summary(),
  reason_options: OPTIONS,
  ...over,
});
const approveVote = (covers: boolean | null) => ({
  vote_id: VOTE_ID,
  voter_actor_id: ME,
  voter_display: 'Meera Joshi',
  vote: 'approve' as const,
  cast_at: '2026-09-21T10:00:00.000Z',
  clause_version_id: '66666666-6666-4666-8666-666666666666',
  rationale: 'yes',
  covers_current_warnings: covers,
});
const approvedTally = { approve_count: 1, deny_count: 0, cast_votes: 1, panel_size: 1, quorum_required: 1, provisional_outcome: 'approved' as const, quorum_met: true };

describe('<R9CasePanel> — the approve vote and finalize (EA5; RD11)', () => {
  beforeEach(() => {
    getR9Panel.mockReset();
    castR9Vote.mockReset();
    finalizeR9.mockReset();
    requestStepUp.mockReset();
    verifyStepUp.mockReset();
    getSession.mockResolvedValue({ userId: ME, nationalGrants: [] });
  });

  it('⭐ an approve vote shows the picker and needs a reason (SAID); with one ⇒ `warning_reason_code` in the body; a deny vote has ⛔ none', async () => {
    getR9Panel.mockResolvedValue(r9Panel());
    castR9Vote.mockResolvedValue({});
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    const p = `r9-${CLAIM}`;
    expect(await screen.findByTestId(`${p}-approval-warning-post_death_version`)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Rationale (required, ≤500 chars)"), { target: { value: 'yes' } });
    fireEvent.click(screen.getByTestId('r9-submit-vote'));
    expect(screen.getByTestId(`${p}-warning-reason-error`)).toHaveTextContent(tw.reasonRequiredError);
    expect(castR9Vote).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId(`${p}-warning-reason-radio-${GENERIC}`));
    fireEvent.click(screen.getByTestId('r9-submit-vote'));
    await waitFor(() => expect(castR9Vote).toHaveBeenCalledWith(PARIWAR, CLAIM, { vote: 'approve', rationale: 'yes', warning_reason_code: GENERIC }));
    castR9Vote.mockClear();
    fireEvent.click(screen.getByRole('radio', { name: /Deny/ }));
    expect(screen.queryByTestId(`${p}-warning-reason-picker`)).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Rationale (required, ≤500 chars)"), { target: { value: 'no' } });
    fireEvent.click(screen.getByTestId('r9-submit-vote'));
    await waitFor(() => expect(castR9Vote).toHaveBeenCalledWith(PARIWAR, CLAIM, { vote: 'deny', rationale: 'no' }));
  });

  it('⭐ RD11 — a vote that does ⛔ not answer every warning says it must be revised, and Finalize is held WITH words before the step-up', async () => {
    getR9Panel.mockResolvedValue(r9Panel({ votes: [approveVote(false)], tally: approvedTally }));
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    expect(await screen.findByTestId(`r9-vote-must-revise-${VOTE_ID}`)).toHaveTextContent(tw.later.voteMustBeRevised);
    expect(screen.getByTestId('r9-finalize-blocked')).toHaveTextContent(tw.errors.approveVotesNeedWarningReason(1));
    expect(screen.getByTestId('r9-finalize')).toBeDisabled();
    expect(document.getElementById(screen.getByTestId('r9-finalize').getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      tw.errors.approveVotesNeedWarningReason(1),
    );
  });

  it('the WAIT holds Finalize (the R9 own-reason words) but ⛔ not the vote', async () => {
    getR9Panel.mockResolvedValue(
      r9Panel({ votes: [approveVote(true)], tally: approvedTally, approval_warnings: summary({ waiting_for_district_admin: true, own_reason_excluded: true }) }),
    );
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    const held = await screen.findByTestId('r9-finalize-blocked');
    expect(held).toHaveTextContent(tw.later.waits);
    expect(held).toHaveTextContent(tw.later.ownReasonExcludedR9);
    expect(screen.getByTestId('r9-finalize')).toBeDisabled();
    expect(screen.getByTestId(`r9-${CLAIM}-warning-reason-picker`)).toBeInTheDocument();
  });

  it('a covering vote shows ⛔ no "must be revised" (and nothing holds Finalize)', async () => {
    getR9Panel.mockResolvedValue(r9Panel({ votes: [approveVote(true)], tally: { ...approvedTally, provisional_outcome: 'denied' } }));
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    await screen.findByTestId('r9-finalize');
    expect(screen.queryByTestId(`r9-vote-must-revise-${VOTE_ID}`)).toBeNull();
    expect(screen.queryByTestId('r9-finalize-blocked')).toBeNull();
  });

  // Code review 2026-10-06 (P38) — the vote submit's `else if (err.status === 409) void panel.refetch();` had no
  // test (`finalize`'s identical pattern needs the step-up flow mocked too, not set up in this file — out of scope
  // for this coverage patch; this exercises the same `ApiError 409 → refetch` mechanism both handlers share).
  it('⭐ a vote 409 refetches the panel, so the moved warnings show on the SAME screen', async () => {
    getR9Panel
      .mockResolvedValueOnce(r9Panel())
      .mockResolvedValue(r9Panel({ tally: approvedTally, approval_warnings: summary({ waiting_for_district_admin: true }) }));
    // Code review round 3: a code the VOTE route really returns (the reason was replaced since the page loaded) — the WAIT
    // holds finalize, ⛔ not the vote, so `late_warning_reason_required` is ⛔ never a vote's 409.
    castR9Vote.mockRejectedValue(new ApiError(409, 'r9_voting.warning_reason_unavailable', 'server words'));
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    const p = `r9-${CLAIM}`;
    fireEvent.click(await screen.findByTestId(`${p}-warning-reason-radio-${GENERIC}`));
    fireEvent.change(screen.getByPlaceholderText('Rationale (required, ≤500 chars)'), { target: { value: 'yes' } });
    fireEvent.click(screen.getByTestId('r9-submit-vote'));
    // `>= 2`, not `=== 2` — `useCastR9Vote`'s own `onError: invalidateR9` already refetches on ANY error, layered
    // under the component's explicit 409 check; what this test proves is the panel ends up reflecting server state.
    await waitFor(() => expect(getR9Panel.mock.calls.length).toBeGreaterThanOrEqual(2));
    // The WAIT holds Finalize, ⛔ the vote (`waitBlocksHere={false}` on this picker) — so it shows here, not as
    // `${p}-approval-blocked`.
    expect(await screen.findByTestId('r9-finalize-blocked')).toHaveTextContent(tw.later.waits);
    // Code review round 2 — the 409 in its OWN words (⛔ not the server's, ⛔ never a raw code). ⚠ The refetch itself is ALSO
    // done by `useCastR9Vote`'s `onError` — this test proves "a 409 refetches", ⛔ not the component's own 409 branch.
    const alert = screen.getByText((_, el) => el?.getAttribute('role') === 'alert' && (el.textContent ?? '').includes(tw.errors.warningReasonUnavailable));
    expect(alert).not.toHaveTextContent('r9_voting.');
    expect(alert).not.toHaveTextContent('server words');
  });

  // Code review round 3 — FINALIZE's real 409s in words: the WAIT (with the R9 own-reason words) and the COUNTED
  // `approve_votes_need_warning_reason` (the count-free fallback has its own test below).
  it('finalize\'s WAIT 409 reads as words, with the R9 own-reason words', async () => {
    getR9Panel.mockResolvedValue(r9Panel({ votes: [approveVote(true)], tally: approvedTally }));
    finalizeR9.mockRejectedValue(
      new ApiError(409, 'r9_voting.late_warning_reason_required', 'server words', { kinds: ['post_death_version'], uncovered_count: 1, own_reason_excluded: true }),
    );
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    fireEvent.click(await screen.findByTestId('r9-finalize'));
    const alert = await screen.findByText((_, el) => el?.getAttribute('role') === 'alert' && (el.textContent ?? '').includes(tw.errors.lateWarningReasonRequired));
    expect(alert).toHaveTextContent(tw.later.ownReasonExcludedR9);
    expect(alert).not.toHaveTextContent('server words');
  });

  // ⭐ Story 6.26a GI11 (second code review 2026-10-07) — THROUGH the panel, ⛔ not the helper alone: removing the
  // panel's `.ground_inspection_required` branch must turn this red.
  it('GI11 — finalize\'s `ground_inspection_required` 409 reads as the trustee words (the claim waits), ⛔ never the server text', async () => {
    getR9Panel.mockResolvedValue(r9Panel({ votes: [approveVote(true)], tally: approvedTally }));
    finalizeR9.mockRejectedValue(new ApiError(409, 'r9_voting.ground_inspection_required', 'server words', { reason: 'no_completed_inspection' }));
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    fireEvent.click(await screen.findByTestId('r9-finalize'));
    const words = verifierConsoleEn.groundInspectionGate.trusteeApprovalGate.no_completed_inspection!;
    const alert = await screen.findByText((_, el) => el?.getAttribute('role') === 'alert' && (el.textContent ?? '').includes(words));
    expect(alert).not.toHaveTextContent('server words');
  });

  // ⭐ Story 6.24a (RF5) — THROUGH the panel: removing the panel's `.suspicion_appeal_pending` branch turns this red.
  // Both reasons (the `cycle-freeze-page.test.tsx` precedent) — the same shared Record lookup serves either.
  for (const reason of ['appeal_not_filed', 'appeal_open'] as const) {
    it(`6.24a — finalize's \`suspicion_appeal_pending\` 409 (${reason}) reads as the wait words, ⛔ never the server text`, async () => {
      getR9Panel.mockResolvedValue(r9Panel({ votes: [approveVote(true)], tally: approvedTally }));
      finalizeR9.mockRejectedValue(new ApiError(409, 'r9_voting.suspicion_appeal_pending', 'server words', { reason }));
      wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
      fireEvent.click(await screen.findByTestId('r9-finalize'));
      const words = verifierConsoleEn.suspicionRefusal.approvalGate[reason]!;
      const alert = await screen.findByText((_, el) => el?.getAttribute('role') === 'alert' && (el.textContent ?? '').includes(words));
      expect(alert).not.toHaveTextContent('server words');
    });
  }

  it('finalize\'s `approve_votes_need_warning_reason` with `vote_ids` reads as the COUNTED words', async () => {
    getR9Panel.mockResolvedValue(r9Panel({ votes: [approveVote(true)], tally: approvedTally }));
    finalizeR9.mockRejectedValue(
      new ApiError(409, 'r9_voting.approve_votes_need_warning_reason', 'server words', { vote_ids: [VOTE_ID, '89898989-8989-4898-8989-898989898989'], uncovered_count: 1 }),
    );
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    fireEvent.click(await screen.findByTestId('r9-finalize'));
    expect(await screen.findByText(tw.errors.approveVotesNeedWarningReason(2))).toHaveAttribute('role', 'alert');
  });

  // ── Code review round 2 (AC9's admin list) ──
  it('Trap 15 — a FAILED read disables an APPROVE vote, described by the unavailable words; a DENY vote stays open', async () => {
    getR9Panel.mockResolvedValue(r9Panel({ approval_warnings: UNAVAILABLE, reason_options: [] }));
    castR9Vote.mockResolvedValue({});
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    const p = `r9-${CLAIM}`;
    expect(await screen.findByTestId(`${p}-approval-blocked`)).toHaveTextContent(tw.unavailable);
    fireEvent.change(screen.getByPlaceholderText('Rationale (required, ≤500 chars)'), { target: { value: 'x' } });
    const submit = screen.getByTestId('r9-submit-vote');
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-describedby', `${p}-approval-blocked`);
    // Code review round 3: the target EXISTS (⛔ not a dangling id) and carries the words.
    expect(document.getElementById(`${p}-approval-blocked`)).toHaveTextContent(tw.unavailable);
    fireEvent.click(screen.getByRole('radio', { name: /Deny/ }));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(castR9Vote).toHaveBeenCalledWith(PARIWAR, CLAIM, { vote: 'deny', rationale: 'x' }));
  });

  it('invariant 5 — the warning LINES show with Deny selected too (a Deny-selected member can still finalize an approval); the picker is approve-only', async () => {
    getR9Panel.mockResolvedValue(r9Panel({ votes: [approveVote(true)], tally: approvedTally }));
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    const p = `r9-${CLAIM}`;
    await screen.findByTestId(`${p}-approval-warning-post_death_version`);
    fireEvent.click(screen.getByRole('radio', { name: /Deny/ }));
    expect(screen.getByTestId(`${p}-approval-warning-post_death_version`)).toBeInTheDocument();
    expect(screen.queryByTestId(`${p}-warning-reason-picker`)).toBeNull();
  });

  it('a DENIED provisional outcome is ⛔ never held — even while the claim waits and a vote does ⛔ not cover the warnings', async () => {
    getR9Panel.mockResolvedValue(
      r9Panel({
        votes: [approveVote(false)],
        tally: { ...approvedTally, provisional_outcome: 'denied' },
        approval_warnings: summary({ waiting_for_district_admin: true }),
      }),
    );
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    expect(await screen.findByTestId('r9-finalize')).toBeEnabled();
    expect(screen.queryByTestId('r9-finalize-blocked')).toBeNull();
  });

  it('a FINALIZED panel shows ⛔ no "must be revised" (finalizing is past)', async () => {
    getR9Panel.mockResolvedValue(
      r9Panel({
        session: { ...r9Panel().session!, outcome: 'approved', finalized_display: 'Meera Joshi', finalized_at: '2026-09-22T10:00:00.000Z' },
        votes: [approveVote(false)],
        tally: approvedTally,
      }),
    );
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    await screen.findByText(/finalized: approved/);
    expect(screen.queryByTestId(`r9-vote-must-revise-${VOTE_ID}`)).toBeNull();
  });

  it('finalize\'s `approve_votes_need_warning_reason` reads as words — with ⛔ no `vote_ids`, the count-free words (⛔ never a guessed "one")', async () => {
    getR9Panel.mockResolvedValue(r9Panel({ votes: [approveVote(true)], tally: approvedTally }));
    finalizeR9.mockRejectedValue(new ApiError(409, 'r9_voting.approve_votes_need_warning_reason', 'server words', {}));
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    fireEvent.click(await screen.findByTestId('r9-finalize'));
    expect(await screen.findByText(tw.errors.approveVotesNeedWarningReasonUnknownCount)).toHaveAttribute('role', 'alert');
  });

  // Code review round 3: once Finalize is HELD, ⛔ no code is sent and ⛔ none is spent — both step-up buttons go disabled,
  // described by the held words (in a PERSISTENT live region, so the change is announced).
  it('"Send verification code" is disabled once Finalize is held after the step-up asked (⛔ no OTP sent for a refusal)', async () => {
    getR9Panel
      .mockResolvedValueOnce(r9Panel({ votes: [approveVote(true)], tally: approvedTally }))
      .mockResolvedValue(r9Panel({ votes: [approveVote(true)], tally: approvedTally, approval_warnings: summary({ waiting_for_district_admin: true }) }));
    finalizeR9.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'step up'));
    wrap(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    const status = await screen.findByTestId('r9-finalize-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toBeEmptyDOMElement();
    fireEvent.click(screen.getByTestId('r9-finalize'));
    // `useFinalizeR9`'s `onError` refetched the panel — the claim now WAITS; the SAME region carries the words.
    expect(await screen.findByTestId('r9-finalize-blocked')).toHaveTextContent(tw.later.waits);
    expect(screen.getByTestId('r9-finalize-status')).toBe(status);
    const send = screen.getByRole('button', { name: 'Send verification code' });
    expect(send).toBeDisabled();
    expect(document.getElementById(send.getAttribute('aria-describedby') ?? '')).toHaveTextContent(tw.later.waits);
    fireEvent.click(send);
    expect(requestStepUp).not.toHaveBeenCalled();
  });

  it('"Verify & finalize" goes disabled when Finalize becomes held AFTER the code was entered (⛔ no OTP spent)', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getR9Panel.mockResolvedValue(r9Panel({ votes: [approveVote(true)], tally: approvedTally }));
    finalizeR9.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'step up'));
    requestStepUp.mockResolvedValue({});
    render(
      <QueryClientProvider client={qc}>
        <R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByTestId('r9-finalize'));
    fireEvent.click(await screen.findByRole('button', { name: 'Send verification code' }));
    fireEvent.change(await screen.findByLabelText('Enter code'), { target: { value: '123456' } });
    const verify = screen.getByRole('button', { name: /Verify & finalize/ });
    expect(verify).toBeEnabled();
    // The District Admin's approval state moves under the open box — the panel refetches and the claim WAITS.
    getR9Panel.mockResolvedValue(r9Panel({ votes: [approveVote(true)], tally: approvedTally, approval_warnings: summary({ waiting_for_district_admin: true }) }));
    await qc.invalidateQueries();
    expect(await screen.findByTestId('r9-finalize-blocked')).toHaveTextContent(tw.later.waits);
    expect(verify).toBeDisabled();
    fireEvent.click(verify);
    expect(verifyStepUp).not.toHaveBeenCalled();
  });
});

// ── The Super Admin ──────────────────────────────────────────────────────────────────────────────────────────────
const detail = (over: Partial<EscalatedClosureDetailResponse> = {}): EscalatedClosureDetailResponse => ({
  closure: {
    closure_id: '99999999-9999-4999-8999-999999999999',
    claim_case_id: CLAIM,
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
  short_reference: '11111111',
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
  approval_warnings: summary(),
  reason_options: OPTIONS,
  ...over,
});

describe('<EscalationDetail> — the Super Admin\'s approve (EA6a)', () => {
  beforeEach(() => {
    getEscalatedClosure.mockReset();
    decideEscalatedClosure.mockReset();
  });

  it('⭐ approve shows the picker and needs a reason (SAID); with it ⇒ `warning_reason_code`; a refusal shows ⛔ none and sends ⛔ none', async () => {
    getEscalatedClosure.mockResolvedValue(detail());
    decideEscalatedClosure.mockResolvedValue({ claim_case_id: CLAIM, claim_state: 'state_trustee_approved', closure: null, decided_by: 'S', decided_at: 'x' });
    wrap(<EscalationDetail pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    expect(await screen.findByTestId('escalation-decision-approval-warning-post_death_version')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('decision-note'), { target: { value: 'Checked.' } });
    fireEvent.click(screen.getByTestId('decision-submit'));
    expect(screen.getByTestId('escalation-decision-warning-reason-error')).toHaveTextContent(tw.reasonRequiredError);
    expect(decideEscalatedClosure).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId(`escalation-decision-warning-reason-radio-${GENERIC}`));
    fireEvent.click(screen.getByTestId('decision-submit'));
    await waitFor(() =>
      expect(decideEscalatedClosure).toHaveBeenCalledWith(
        PARIWAR,
        CLAIM,
        expect.objectContaining({ decision: 'approve', warning_reason_code: GENERIC, note: 'Checked.' }),
      ),
    );
  });

  it('a refusal is ⛔ gated (⛔ picker, ⛔ code); a FAILED read disables the approve submit only (Trap 15)', async () => {
    getEscalatedClosure.mockResolvedValue(detail({ approval_warnings: UNAVAILABLE }));
    decideEscalatedClosure.mockResolvedValue({ claim_case_id: CLAIM, claim_state: 'denied', closure: null, decided_by: 'S', decided_at: 'x' });
    wrap(<EscalationDetail pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    expect(await screen.findByTestId('escalation-decision-approval-blocked')).toHaveTextContent(tw.unavailable);
    expect(screen.getByTestId('decision-submit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('decision-kind'), { target: { value: 'refuse' } });
    expect(screen.queryByTestId('escalation-decision-approval-warnings')).toBeNull();
    expect(screen.getByTestId('decision-submit')).toBeEnabled();
    fireEvent.change(screen.getByTestId('decision-note'), { target: { value: 'n' } });
    fireEvent.click(screen.getByTestId('decision-submit'));
    await waitFor(() => expect(decideEscalatedClosure).toHaveBeenCalledTimes(1));
    expect(decideEscalatedClosure.mock.calls[0]![2]).not.toHaveProperty('warning_reason_code');
  });

  // Code review 2026-10-06 (P38) — `DecisionForm`'s `onConflict` was wired (code review round 4) but never
  // exercised by a test; only `CycleFreezePage`'s equivalent path had one.
  it('⭐ a 409 refetches the detail, so a changed warning state shows on the SAME screen', async () => {
    getEscalatedClosure
      .mockResolvedValueOnce(detail())
      .mockResolvedValue(detail({ approval_warnings: summary({ waiting_for_district_admin: true }) }));
    decideEscalatedClosure.mockRejectedValue(new ApiError(409, 'closure.late_warning_reason_required', 'server words'));
    wrap(<EscalationDetail pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    fireEvent.click(await screen.findByTestId(`escalation-decision-warning-reason-radio-${GENERIC}`));
    fireEvent.change(screen.getByTestId('decision-note'), { target: { value: 'Checked.' } });
    fireEvent.click(screen.getByTestId('decision-submit'));
    // `>= 2`, not `=== 2` — some environments fire an extra incidental refetch unrelated to `onConflict` (e.g.
    // window-focus refetch); what this test proves is that the 409 triggers at least one more fetch than the load.
    await waitFor(() => expect(getEscalatedClosure.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(await screen.findByTestId('escalation-decision-approval-blocked')).toHaveTextContent(tw.later.waits);
    // Code review round 2 — the 409 in words: `closure.*` refusals carry the server's own words (RD6 — `closureErrorText`),
    // ⛔ never a raw code. ⚠ The refetch is ALSO done by the hook's `onSettled` — this proves "a 409 refetches", ⛔ not `onConflict`.
    const alert = screen.getByText('server words');
    expect(alert.closest('[role="alert"]')).not.toBeNull();
  });

  it('the WAIT with `own_reason_excluded` says the own-reason words (⛔ not the R9 variant) and disables the approve submit', async () => {
    getEscalatedClosure.mockResolvedValue(detail({ approval_warnings: summary({ waiting_for_district_admin: true, own_reason_excluded: true }) }));
    wrap(<EscalationDetail pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    const held = await screen.findByTestId('escalation-decision-approval-blocked');
    expect(held).toHaveTextContent(tw.later.ownReasonExcluded);
    expect(held).not.toHaveTextContent(tw.later.ownReasonExcludedR9);
    expect(screen.getByTestId('decision-submit')).toBeDisabled();
  });
});

// ── "No correction needed" (D27) vs the closure request (Trap 12) ───────────────────────────────────────────────────
type QueueItem = PariwarClosureQueueResponse['items'][number];
const item = (over: Partial<QueueItem> = {}): QueueItem => ({
  kind: 'no_correction_needed',
  claim_case_id: CLAIM,
  deceased_member_id: MEMBER,
  short_reference: '11111111',
  at: '2026-09-25T10:00:00.000Z',
  by: 'District Admin One',
  note: { state: 'readable', value: 'the details were right' },
  family_run_day0: null,
  checked_after_record: true,
  held: false,
  approval_warnings: summary(),
  ...over,
});

describe('<PariwarClosureList> — D27\'s approve carries the picker and its OWN note; the closure request ⛔ none (Trap 12)', () => {
  beforeEach(() => approveNoCorrectionNeeded.mockReset());

  it('⭐ Trap 12 — a closure REQUEST shows ⛔ picker (deciding it is a refusal path)', () => {
    wrap(<PariwarClosureList pariwarId={PARIWAR} reasonOptions={OPTIONS} items={[item({ kind: 'closure_request', approval_warnings: null, family_run_day0: '2026-06-20', checked_after_record: null })]} />);
    expect(screen.getByTestId('closure-approve')).toBeInTheDocument();
    expect(screen.queryByTestId(`no-correction-${CLAIM}-warning-reason-picker`)).toBeNull();
    expect(screen.queryByText(tw.later.intro)).toBeNull();
  });

  it('⭐ a warned "no correction needed": a missing reason and a missing note are SAID; with both ⇒ `{ warning_reason_code, note }` (⛔ the Keep note)', async () => {
    approveNoCorrectionNeeded.mockResolvedValue({ claim_case_id: CLAIM, claim_state: 'state_trustee_approved', closure: null, decided_by: 'P', decided_at: 'x' });
    wrap(<PariwarClosureList pariwarId={PARIWAR} reasonOptions={OPTIONS} items={[item()]} />);
    const p = `no-correction-${CLAIM}`;
    fireEvent.change(screen.getByTestId('no-correction-keep-note'), { target: { value: 'KEEP NOTE' } });
    fireEvent.click(screen.getByTestId('no-correction-approve'));
    expect(screen.getByTestId(`${p}-warning-reason-error`)).toHaveTextContent(tw.reasonRequiredError);
    fireEvent.click(screen.getByTestId(`${p}-warning-reason-radio-${GENERIC}`));
    fireEvent.click(screen.getByTestId('no-correction-approve'));
    expect(screen.getByTestId(`no-correction-approve-note-missing-${CLAIM}`)).toHaveTextContent(tw.noteRequiredError);
    expect(approveNoCorrectionNeeded).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId(`no-correction-approve-note-${CLAIM}`), { target: { value: ' The family showed the will. ' } });
    fireEvent.click(screen.getByTestId('no-correction-approve'));
    await waitFor(() =>
      expect(approveNoCorrectionNeeded).toHaveBeenCalledWith(PARIWAR, CLAIM, { warning_reason_code: GENERIC, note: 'The family showed the will.' }),
    );
  });

  it('an UN-warned approve still posts `{}` (⛔ a note field); the WAIT disables it with words', async () => {
    approveNoCorrectionNeeded.mockResolvedValue({ claim_case_id: CLAIM, claim_state: 'state_trustee_approved', closure: null, decided_by: 'P', decided_at: 'x' });
    const { unmount } = wrap(<PariwarClosureList pariwarId={PARIWAR} reasonOptions={OPTIONS} items={[item({ approval_warnings: QUIET })]} />);
    expect(screen.queryByTestId(`no-correction-approve-note-${CLAIM}`)).toBeNull();
    fireEvent.click(screen.getByTestId('no-correction-approve'));
    await waitFor(() => expect(approveNoCorrectionNeeded).toHaveBeenCalledWith(PARIWAR, CLAIM, {}));
    unmount();
    wrap(<PariwarClosureList pariwarId={PARIWAR} reasonOptions={OPTIONS} items={[item({ approval_warnings: summary({ waiting_for_district_admin: true }) })]} />);
    expect(screen.getByTestId(`no-correction-${CLAIM}-approval-blocked`)).toHaveTextContent(tw.later.waits);
    expect(screen.getByTestId('no-correction-approve')).toBeDisabled();
    expect(screen.getByTestId('no-correction-keep')).toBeEnabled();
  });

  // ── Code review round 2 (AC9's admin list) ──
  it('the kind line; a FAILED read disables ONLY Approve with the unavailable words; the own-reason words', () => {
    const p = `no-correction-${CLAIM}`;
    const { unmount } = wrap(<PariwarClosureList pariwarId={PARIWAR} reasonOptions={OPTIONS} items={[item()]} />);
    expect(screen.getByTestId(`${p}-approval-warning-post_death_version`)).toHaveTextContent(tw.kindLine.post_death_version);
    unmount();
    const second = wrap(<PariwarClosureList pariwarId={PARIWAR} reasonOptions={[]} items={[item({ approval_warnings: UNAVAILABLE })]} />);
    expect(screen.getByTestId(`${p}-approval-blocked`)).toHaveTextContent(tw.unavailable);
    expect(screen.getByTestId('no-correction-approve')).toBeDisabled();
    expect(screen.getByTestId('no-correction-keep')).toBeEnabled();
    second.unmount();
    wrap(<PariwarClosureList pariwarId={PARIWAR} reasonOptions={OPTIONS} items={[item({ approval_warnings: summary({ waiting_for_district_admin: true, own_reason_excluded: true }) })]} />);
    expect(screen.getByTestId(`${p}-approval-blocked`)).toHaveTextContent(tw.later.ownReasonExcluded);
  });

  it('a 409 on the approve reads as words (the server\'s `closure.*` words — ⛔ never a raw code)', async () => {
    approveNoCorrectionNeeded.mockRejectedValueOnce(new ApiError(409, 'closure.warning_reason_unavailable', 'That reason was replaced — choose again.'));
    wrap(<PariwarClosureList pariwarId={PARIWAR} reasonOptions={OPTIONS} items={[item()]} />);
    fireEvent.click(screen.getByTestId(`no-correction-${CLAIM}-warning-reason-radio-${GENERIC}`));
    fireEvent.change(screen.getByTestId(`no-correction-approve-note-${CLAIM}`), { target: { value: 'why' } });
    fireEvent.click(screen.getByTestId('no-correction-approve'));
    const words = await screen.findByText('That reason was replaced — choose again.');
    expect(words.closest('[role="alert"]')).not.toBeNull();
  });
});
