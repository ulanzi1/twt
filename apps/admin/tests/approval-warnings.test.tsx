// Story 6.23a — the nominee-change warnings on the District Admin's surfaces (Task 7; AC5, AC6, AC7; NW9, NW10, NW14).
//
// Pure render + interaction:
//   · the shared PICKER — each option's label, "when to use", added by / on or "built in"; ⛔ nothing pre-selected;
//     the choice announced in words;
//   · the STRIP — with warnings, the picker BESIDE the unchanged approval-reason dropdown, a line per warning, a
//     REQUIRED note, the confirmation restating the warnings and the chosen reason, `warningReasonCode` sent; with
//     none, ⛔ no picker; Deny ⛔ never gated; `reviseBlocked` REPLACES the revise control with its words;
//   · the LATE panel — a reason and a note required; the "cannot clear their own approval" line when
//     `uncoveredSinceApproval` is 0;
//   · the TIMELINE — the FQ1 label VERBATIM; the date-not-known line;
//   · `decisionErrorMessage` — every new 409 code and both `not_revisable` reasons in their own words.

import type { ApprovalWarningReasonOption, NomineeDeclarationTimelineResponse } from '@twt/contracts';
import { NOMINEE_VERSION_WARNING_KINDS, NomineeVersionWarningKind } from '@twt/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../src/api/client.js';
import {
  ApprovalWarningReasonPicker,
  LateWarningReasonPanel,
  NomineeDeclarationPanel,
  VerificationDecisionStrip,
  verifierConsoleEn as t,
} from '../src/modules/claim-verification/index.js';
import { decisionErrorMessage } from '../src/routes/VerifierConsoleRoute.js';

const GENERIC: ApprovalWarningReasonOption = {
  code: 'warnings_reviewed',
  reasonId: null,
  label: 'Warnings reviewed — approved despite them',
  whenToUse: 'Use when you have read every warning shown and still approve. Your note must say why.',
  addedByDisplay: null,
  addedAt: null,
  replacesLabel: null,
};
const STORED: ApprovalWarningReasonOption = {
  code: 'awr_0a1b2c3d',
  reasonId: '55555555-5555-4555-8555-555555555555',
  label: 'Family confirmed the change in person',
  whenToUse: 'Use when the inspector met the family and they confirmed the change.',
  addedByDisplay: 'Sunita (Super Admin)',
  addedAt: '2026-09-01T06:00:00.000Z',
  replacesLabel: 'Seen in person',
};
const OPTIONS = [GENERIC, STORED];

describe('<ApprovalWarningReasonPicker> (NW9)', () => {
  it('⭐ every option shows its label, its "when to use" note and who added it, when — or "built in"; ⛔ nothing pre-selected', () => {
    const onChange = vi.fn();
    render(<ApprovalWarningReasonPicker idPrefix="t" options={OPTIONS} value="" onChange={onChange} />);
    expect(screen.getByTestId('t-warning-reason-warnings_reviewed').textContent).toContain(GENERIC.whenToUse);
    expect(screen.getByTestId('t-warning-reason-provenance-warnings_reviewed').textContent).toBe(t.approvalWarnings.builtIn);
    const prov = screen.getByTestId(`t-warning-reason-provenance-${STORED.code}`).textContent ?? '';
    expect(prov).toMatch(/^Added by Sunita \(Super Admin\) on 1 Sept? 2026/);
    expect(prov).toContain('Replaces “Seen in person”');
    for (const o of OPTIONS) {
      expect((screen.getByTestId(`t-warning-reason-radio-${o.code}`) as HTMLInputElement).checked).toBe(false);
    }
    expect(screen.getByTestId('t-warning-reason-selected').textContent).toBe(t.approvalWarnings.noneChosen);
    fireEvent.click(screen.getByTestId(`t-warning-reason-radio-${STORED.code}`));
    expect(onChange).toHaveBeenCalledWith(STORED.code);
  });

  it('code review round 3 — a RADIOGROUP (⛔ never `aria-invalid` on a plain fieldset): named by its legend, required, and pointing at its error', () => {
    render(<ApprovalWarningReasonPicker idPrefix="t" options={OPTIONS} value="" onChange={vi.fn()} error="Choose one." />);
    const group = screen.getByRole('radiogroup', { name: t.approvalWarnings.pickerLabel });
    expect(group.getAttribute('aria-required')).toBe('true');
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(group.getAttribute('aria-describedby')).toBe(screen.getByTestId('t-warning-reason-error').id);
  });

  it('announces the choice in words', () => {
    render(<ApprovalWarningReasonPicker idPrefix="t" options={OPTIONS} value={STORED.code} onChange={vi.fn()} />);
    const status = screen.getByTestId('t-warning-reason-selected');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe(t.approvalWarnings.selected(STORED.label));
  });
});

describe('Story 6.26b (GI11 [b]; RD8, RD10) — the three death-fact kinds have their OWN words', () => {
  const DEATH_FACT_KINDS = ['inspection_death_date_differs', 'original_certificate_mismatch', 'register_check_mismatch'] as const;

  it('the District Admin\'s strip shows a line per new kind, in its own words, under a kind-neutral heading', () => {
    render(
      <VerificationDecisionStrip
        claimState="verifier_review"
        onDecision={vi.fn().mockResolvedValue(undefined)}
        approvalWarnings={{ kinds: [...DEATH_FACT_KINDS], reasonOptions: OPTIONS }}
      />,
    );
    fireEvent.click(screen.getByTestId('action-approve'));
    for (const k of DEATH_FACT_KINDS) {
      expect(screen.getByTestId(`approval-warning-${k}`).textContent).toBe(t.approvalWarnings.kindLine[k]);
    }
    expect(t.approvalWarnings.heading).not.toMatch(/nominee/i);
  });

  it('⛔ the timeline words them: its VERSION kinds are exactly the two 6.23a kinds (Trap 7)', () => {
    expect([...NOMINEE_VERSION_WARNING_KINDS]).toEqual(['post_death_version', 'recent_nominee_change']);
    for (const k of DEATH_FACT_KINDS) expect(Object.keys(t.nomineeDeclaration.warning)).not.toContain(k);
    expect(NomineeVersionWarningKind.safeParse('inspection_death_date_differs').success).toBe(false);
  });
});

describe('<VerificationDecisionStrip> with warnings (NW9; AC5)', () => {
  const warned = { kinds: ['post_death_version', 'recent_nominee_change'] as const, reasonOptions: OPTIONS };
  const setup = (approvalWarnings: { kinds: readonly ('post_death_version' | 'recent_nominee_change')[]; reasonOptions: ApprovalWarningReasonOption[] } = { ...warned, kinds: [...warned.kinds] }) => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    render(<VerificationDecisionStrip claimState="verifier_review" onDecision={onDecision} approvalWarnings={approvalWarnings} />);
    return { onDecision };
  };

  it('⭐ shows the picker BESIDE the unchanged approval-reason dropdown, a line per warning; requires a reason, then a note; the confirmation restates both; sends the code', async () => {
    const { onDecision } = setup();
    fireEvent.click(screen.getByTestId('action-approve'));
    expect(screen.getByTestId('reason-code-select')).toBeInTheDocument();
    expect(screen.getByTestId('decision-warning-reason-picker')).toBeInTheDocument();
    expect(screen.getByTestId('approval-warning-post_death_version').textContent).toBe(t.approvalWarnings.kindLine.post_death_version);
    expect(screen.getByTestId('approval-warning-recent_nominee_change')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('reason-code-select'), { target: { value: 'r5_d_natural_death' } });
    fireEvent.click(screen.getByTestId('action-submit'));
    expect(screen.getByTestId('decision-warning-reason-error').textContent).toBe(t.approvalWarnings.reasonRequiredError);
    expect(screen.queryByTestId('confirm-modal')).toBeNull();

    fireEvent.click(screen.getByTestId('decision-warning-reason-radio-warnings_reviewed'));
    fireEvent.click(screen.getByTestId('action-submit'));
    expect(screen.getByTestId('rationale-error').textContent).toBe(t.approvalWarnings.noteRequiredError);

    fireEvent.change(screen.getByTestId('rationale-input'), { target: { value: 'Seen the family.' } });
    fireEvent.click(screen.getByTestId('action-submit'));
    expect(screen.getByTestId('confirm-warning-reason').textContent).toContain(GENERIC.label);
    expect(screen.getByTestId('confirm-warnings').textContent).toContain(t.approvalWarnings.kindLine.post_death_version);
    fireEvent.click(screen.getByTestId('confirm-submit'));
    await waitFor(() =>
      expect(onDecision).toHaveBeenCalledWith({
        outcome: 'approved',
        reasonCode: 'r5_d_natural_death',
        rationale: 'Seen the family.',
        warningReasonCode: 'warnings_reviewed',
      }),
    );
  });

  it('⛔ no warning ⇒ ⛔ no picker; ⛔ a Deny is never gated by a warning', () => {
    setup({ kinds: [], reasonOptions: OPTIONS });
    fireEvent.click(screen.getByTestId('action-approve'));
    expect(screen.queryByTestId('decision-warning-reason-picker')).toBeNull();
  });

  it('a Deny on a warned claim shows ⛔ no picker — and SUBMITS with ⛔ no `warningReasonCode` (code review round 3)', async () => {
    const { onDecision } = setup();
    fireEvent.click(screen.getByTestId('action-deny'));
    expect(screen.queryByTestId('decision-warning-reason-picker')).toBeNull();
    fireEvent.change(screen.getByTestId('reason-code-select'), { target: { value: 'other' } });
    fireEvent.change(screen.getByTestId('rationale-input'), { target: { value: 'Refused on the record.' } });
    fireEvent.click(screen.getByTestId('action-submit'));
    expect(screen.queryByTestId('confirm-warnings')).toBeNull();
    fireEvent.click(screen.getByTestId('confirm-submit'));
    await waitFor(() => expect(onDecision).toHaveBeenCalledTimes(1));
    expect(onDecision.mock.calls[0]![0]).toEqual({ outcome: 'denied', reasonCode: 'other', rationale: 'Refused on the record.' });
  });

  it('NW9 (code review round 3 — the re-review 2026-10-05 fix had no test) — approve → deny → approve shows the picker with ⛔ nothing chosen; re-choosing Approve KEEPS the pick', () => {
    setup();
    fireEvent.click(screen.getByTestId('action-approve'));
    fireEvent.click(screen.getByTestId(`decision-warning-reason-radio-${STORED.code}`));
    fireEvent.click(screen.getByTestId('action-approve')); // the SAME outcome again — ⛔ not a switch
    expect((screen.getByTestId(`decision-warning-reason-radio-${STORED.code}`) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByTestId('action-deny'));
    fireEvent.click(screen.getByTestId('action-approve'));
    for (const o of OPTIONS) {
      expect((screen.getByTestId(`decision-warning-reason-radio-${o.code}`) as HTMLInputElement).checked).toBe(false);
    }
    expect(screen.getByTestId('decision-warning-reason-selected').textContent).toBe(t.approvalWarnings.noneChosen);
  });

  it('code review round 3 — a "2" pressed under the open confirmation changes ⛔ nothing: the approval still carries its warning reason', async () => {
    const { onDecision } = setup();
    fireEvent.click(screen.getByTestId('action-approve'));
    fireEvent.change(screen.getByTestId('reason-code-select'), { target: { value: 'r5_d_natural_death' } });
    fireEvent.click(screen.getByTestId('decision-warning-reason-radio-warnings_reviewed'));
    fireEvent.change(screen.getByTestId('rationale-input'), { target: { value: 'Seen the family.' } });
    fireEvent.click(screen.getByTestId('action-submit'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId('confirm-submit'), { key: t.decision.denyShortcut });
    fireEvent.click(screen.getByTestId('confirm-submit'));
    await waitFor(() => expect(onDecision).toHaveBeenCalledTimes(1));
    expect(onDecision.mock.calls[0]![0]).toMatchObject({ outcome: 'approved', warningReasonCode: 'warnings_reviewed' });
  });

  it('code review round 3 — a pick that LEFT the active list (replaced; the packet refetched) is ⛔ not a choice: none shown checked, and submitting asks again', () => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    const props = { claimState: 'verifier_review', onDecision };
    const { rerender } = render(<VerificationDecisionStrip {...props} approvalWarnings={{ kinds: ['post_death_version'], reasonOptions: OPTIONS }} />);
    fireEvent.click(screen.getByTestId('action-approve'));
    fireEvent.change(screen.getByTestId('reason-code-select'), { target: { value: 'r5_d_natural_death' } });
    fireEvent.click(screen.getByTestId(`decision-warning-reason-radio-${STORED.code}`));
    fireEvent.change(screen.getByTestId('rationale-input'), { target: { value: 'Seen the family.' } });
    rerender(<VerificationDecisionStrip {...props} approvalWarnings={{ kinds: ['post_death_version'], reasonOptions: [GENERIC] }} />);
    expect(screen.getByTestId('decision-warning-reason-selected').textContent).toBe(t.approvalWarnings.noneChosen);
    fireEvent.click(screen.getByTestId('action-submit'));
    expect(screen.getByTestId('decision-warning-reason-error').textContent).toBe(t.approvalWarnings.reasonRequiredError);
    expect(screen.queryByTestId('confirm-modal')).toBeNull();
  });

  it('code review round 4 — the pick LEAVES the list while the confirmation is OPEN: Confirm closes it and asks again, ⛔ never sends a known-refused approval', async () => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    const props = { claimState: 'verifier_review', onDecision };
    const { rerender } = render(<VerificationDecisionStrip {...props} approvalWarnings={{ kinds: ['post_death_version'], reasonOptions: OPTIONS }} />);
    fireEvent.click(screen.getByTestId('action-approve'));
    fireEvent.change(screen.getByTestId('reason-code-select'), { target: { value: 'r5_d_natural_death' } });
    fireEvent.click(screen.getByTestId(`decision-warning-reason-radio-${STORED.code}`));
    fireEvent.change(screen.getByTestId('rationale-input'), { target: { value: 'Seen the family.' } });
    fireEvent.click(screen.getByTestId('action-submit'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    rerender(<VerificationDecisionStrip {...props} approvalWarnings={{ kinds: ['post_death_version'], reasonOptions: [GENERIC] }} />);
    fireEvent.click(screen.getByTestId('confirm-submit'));
    expect(screen.queryByTestId('confirm-modal')).toBeNull();
    expect(screen.getByTestId('decision-warning-reason-error').textContent).toBe(t.approvalWarnings.reasonRequiredError);
    await Promise.resolve();
    expect(onDecision).not.toHaveBeenCalled();
  });

  it('⭐ `reviseBlocked` REPLACES the revise control with its own words — one per reason (all three — code review round 3 added `unavailable`)', () => {
    for (const reason of ['warning_approval_final', 'warnings_not_current', 'unavailable'] as const) {
      const { unmount } = render(
        <VerificationDecisionStrip claimState="verifier_approved" onDecision={vi.fn()} onRevise={vi.fn()} reviseBlocked={reason} />,
      );
      expect(screen.getByTestId(`revise-blocked-${reason}`).textContent).toBe(t.approvalWarnings.reviseBlocked[reason]);
      expect(screen.queryByTestId('decision-form')).toBeNull();
      expect(screen.queryByTestId('revise-window-note')).toBeNull();
      unmount();
    }
  });

  it('code review round 3 — NW7 is about APPROVALS: a DENIED decision\'s revise stays offered even when the warnings read failed (`unavailable`)', () => {
    render(<VerificationDecisionStrip claimState="denied" onDecision={vi.fn()} onRevise={vi.fn()} reviseBlocked="unavailable" />);
    expect(screen.queryByTestId('revise-blocked-unavailable')).toBeNull();
    expect(screen.getByTestId('revise-window-note')).toBeInTheDocument();
  });
});

describe('<LateWarningReasonPanel> (NW14; AC7)', () => {
  it('needs a reason, then a note; says another person\'s answer does not stand for this viewer when another person answered', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<LateWarningReasonPanel options={OPTIONS} uncoveredSinceApproval={0} lateKeysUncoveredForViewer={1} onSubmit={onSubmit} canRecord />);
    expect(screen.getByTestId('late-warning-reason-own-cannot-clear').textContent).toBe(t.approvalWarnings.late.ownCannotClear);
    expect(screen.getByTestId('late-warning-reason-count').textContent).toBe(t.approvalWarnings.late.uncovered(1));
    fireEvent.click(screen.getByTestId('late-warning-reason-submit'));
    // The PICKER's own "choose a reason" line — asserted by its WORDS (code review round 3: the panel's server error
    // used to share this id, so presence alone proved nothing).
    expect(screen.getByTestId('late-warning-reason-error').textContent).toBe(t.approvalWarnings.reasonRequiredError);
    expect(screen.queryByTestId('late-warning-reason-server-error')).toBeNull();
    fireEvent.click(screen.getByTestId('late-warning-reason-radio-warnings_reviewed'));
    fireEvent.click(screen.getByTestId('late-warning-reason-submit'));
    expect(screen.getByTestId('late-warning-reason-note-error').textContent).toBe(t.approvalWarnings.noteRequiredError);
    fireEvent.change(screen.getByTestId('late-warning-reason-note'), { target: { value: 'The date moved.' } });
    fireEvent.click(screen.getByTestId('late-warning-reason-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ warningReasonCode: 'warnings_reviewed', note: 'The date moved.' }));
  });

  it('⛔ no "cannot clear" line while the warnings are uncovered for everyone', () => {
    render(<LateWarningReasonPanel options={OPTIONS} uncoveredSinceApproval={2} lateKeysUncoveredForViewer={2} onSubmit={vi.fn()} canRecord />);
    expect(screen.queryByTestId('late-warning-reason-own-cannot-clear')).toBeNull();
  });

  it('⭐ code review round 3 — mounted for its OWN outcome (`canRecord: false`) it shows the outcome ALONE: ⛔ no count, ⛔ no "cannot clear" line, ⛔ no form that would 409', () => {
    render(
      <LateWarningReasonPanel options={OPTIONS} uncoveredSinceApproval={0} lateKeysUncoveredForViewer={0} onSubmit={vi.fn()} recorded canRecord={false} />,
    );
    expect(screen.getByTestId('late-warning-reason-recorded').textContent).toBe(t.approvalWarnings.late.recorded);
    for (const id of ['late-warning-reason-count', 'late-warning-reason-own-cannot-clear', 'late-warning-reason-submit', 'late-warning-picker', 'late-warning-reason-note']) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });

  it('⭐ family 13(d) (code review round 3) — "recorded" is ANNOUNCED: the status region is mounted EMPTY first, and its TEXT changes', () => {
    const props = { options: OPTIONS, uncoveredSinceApproval: 1, lateKeysUncoveredForViewer: 1, onSubmit: vi.fn() };
    const { rerender } = render(<LateWarningReasonPanel {...props} canRecord />);
    const region = screen.getByTestId('late-warning-reason-recorded');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.textContent).toBe('');
    rerender(<LateWarningReasonPanel {...props} recorded canRecord={false} />);
    // The SAME node — a live region that mounts already holding its text is ⛔ never announced.
    expect(screen.getByTestId('late-warning-reason-recorded')).toBe(region);
    expect(region.textContent).toBe(t.approvalWarnings.late.recorded);
  });

  it('code review round 3 — a server error has its OWN id; a chosen code that LEFT the list is ⛔ not sent', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const props = { uncoveredSinceApproval: 1, lateKeysUncoveredForViewer: 1, onSubmit, canRecord: true };
    const { rerender } = render(<LateWarningReasonPanel {...props} options={OPTIONS} error="Refused." />);
    expect(screen.getByTestId('late-warning-reason-server-error').textContent).toBe('Refused.');
    fireEvent.click(screen.getByTestId(`late-warning-reason-radio-${STORED.code}`));
    fireEvent.change(screen.getByTestId('late-warning-reason-note'), { target: { value: 'The date moved.' } });
    rerender(<LateWarningReasonPanel {...props} options={[GENERIC]} error={null} />);
    fireEvent.click(screen.getByTestId('late-warning-reason-submit'));
    expect(screen.getByTestId('late-warning-reason-error').textContent).toBe(t.approvalWarnings.reasonRequiredError);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('code review round 3 — the note says it is REQUIRED and names its error in the accessibility tree', () => {
    render(<LateWarningReasonPanel options={OPTIONS} uncoveredSinceApproval={1} lateKeysUncoveredForViewer={1} onSubmit={vi.fn()} canRecord />);
    const note = screen.getByTestId('late-warning-reason-note');
    expect(note.getAttribute('aria-required')).toBe('true');
    fireEvent.click(screen.getByTestId('late-warning-reason-radio-warnings_reviewed'));
    fireEvent.click(screen.getByTestId('late-warning-reason-submit'));
    expect(note.getAttribute('aria-invalid')).toBe('true');
    expect(note.getAttribute('aria-describedby')).toBe(screen.getByTestId('late-warning-reason-note-error').id);
  });
});

describe('<NomineeDeclarationPanel> — the FQ1 label and the date-not-known line (NW4, NW10; AC6)', () => {
  const V = '00000000-0000-4000-8000-0000000000b1';
  const timeline = (over: Partial<NomineeDeclarationTimelineResponse> = {}): NomineeDeclarationTimelineResponse => ({
    claim_case_id: '11111111-1111-4111-8111-111111111111',
    claim_state: 'verifier_review',
    deceased_member_id: '22222222-2222-4222-8222-222222222222',
    versions: [
      {
        version_id: V,
        rank: 1,
        version_no: 2,
        kind: 'declared',
        source: 'correction',
        relationship: 'spouse',
        split_pct: 100,
        recorded_at: '2026-08-01T06:00:00.000Z',
        effective_at: '2026-01-05T06:00:00.000Z',
        corrects_version_id: '00000000-0000-4000-8000-0000000000b0',
        warnings: [],
        correction_label: { district_admin_display: 'Anita', pariwar_admin_display: 'Prakash' },
      },
    ],
    watermark: { rank1: 2, rank2: null },
    live_determination: null,
    earlier_determinations: [],
    declaration_status: 'undetermined',
    determination_recordable: true,
    viewer: { can_determine: false, can_decide_district: false },
    pending_corrections: { da_pending: 0, pa_pending: 0 },
    accepted_certificate: null,
    warning_basis: { death_date_known: false, first_filed_at: '2026-08-30T05:30:00.000Z' },
    ...over,
  });
  const props = (tl: NomineeDeclarationTimelineResponse) => ({
    timeline: tl,
    onShowDetails: vi.fn(),
    onDetermine: vi.fn(),
    onDecide: vi.fn(),
    decideStep: 'district' as const,
  });

  it('⭐ the label is the RATIFIED words, VERBATIM (Trap 12); the date-not-known line shows', () => {
    render(<NomineeDeclarationPanel {...props(timeline())} />);
    expect(screen.getByTestId(`nominee-correction-label-${V}`).textContent).toBe(
      'corrected after the death — approved by Anita and Prakash',
    );
    expect(screen.getByTestId('nominee-warning-date-not-known').textContent).toBe(t.nomineeDeclaration.warning.dateNotKnown);
  });

  it('the 90-day line names the first claim\'s filing day; ⛔ no date-not-known line once the date is known', () => {
    const tl = timeline({
      warning_basis: { death_date_known: true, first_filed_at: '2026-08-30T05:30:00.000Z' },
      versions: [{ ...timeline().versions[0]!, source: 'member', corrects_version_id: null, correction_label: null, warnings: ['recent_nominee_change'] }],
    });
    render(<NomineeDeclarationPanel {...props(tl)} />);
    expect(screen.queryByTestId('nominee-warning-date-not-known')).toBeNull();
    expect(screen.getByTestId(`nominee-warning-recent_nominee_change-${V}`).textContent).toMatch(
      /^Warning: named or changed within 90 days before the first claim for this death was filed \(30 Aug 2026\)$/,
    );
    expect(screen.queryByTestId('nominee-warning-anchor-unavailable')).toBeNull();
  });

  it('code review round 3 — an UNREADABLE anchor (`first_filed_at: null`) says the 90-day check is unavailable (⛔ never "no warnings" on an unknown)', () => {
    render(<NomineeDeclarationPanel {...props(timeline({ warning_basis: { death_date_known: true, first_filed_at: null } }))} />);
    expect(screen.getByTestId('nominee-warning-anchor-unavailable').textContent).toBe(t.nomineeDeclaration.warning.anchorUnavailable);
    expect(screen.queryByTestId('nominee-warning-date-not-known')).toBeNull();
  });
});

describe('decisionErrorMessage — Story 6.23a codes in their own words (AC5)', () => {
  const e = t.approvalWarnings.errors;
  it.each([
    ['verifier_decision.warning_reason_required', e.warningReasonRequired],
    ['verifier_decision.warning_reason_ungrounded', e.warningReasonUngrounded],
    ['verifier_decision.warning_reason_unavailable', e.warningReasonUnavailable],
    ['verifier_decision.late_warning_reason.nothing_uncovered', e.lateNothingUncovered],
    ['verifier_decision.late_warning_reason.determination_required', e.lateDeterminationRequired],
    ['verifier_decision.late_warning_reason.no_district_admin_approval', e.lateNoApproval],
    ['verifier_decision.late_warning_reason.not_recordable_state', e.lateNotRecordable],
    ['verifier_decision.late_warning_reason.missing_display', e.lateMissingDisplay],
  ])('%s', (code, words) => {
    expect(decisionErrorMessage(new ApiError(409, code, 'x'))).toBe(words);
  });

  it('both `not_revisable` reasons — ⛔ never "Please try again"', () => {
    for (const reason of ['warning_approval_final', 'warnings_not_current'] as const) {
      const msg = decisionErrorMessage(new ApiError(409, 'verifier_decision.not_revisable', 'x', { reason }));
      expect(msg).toBe(t.approvalWarnings.reviseBlocked[reason]);
      expect(msg).not.toBe(t.decision.submitError);
    }
  });
});
