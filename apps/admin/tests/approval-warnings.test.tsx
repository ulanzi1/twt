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

  it('announces the choice in words', () => {
    render(<ApprovalWarningReasonPicker idPrefix="t" options={OPTIONS} value={STORED.code} onChange={vi.fn()} />);
    const status = screen.getByTestId('t-warning-reason-selected');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe(t.approvalWarnings.selected(STORED.label));
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

  it('a Deny on a warned claim shows ⛔ no picker', () => {
    setup();
    fireEvent.click(screen.getByTestId('action-deny'));
    expect(screen.queryByTestId('decision-warning-reason-picker')).toBeNull();
  });

  it('⭐ `reviseBlocked` REPLACES the revise control with its own words — one per reason', () => {
    for (const reason of ['warning_approval_final', 'warnings_not_current'] as const) {
      const { unmount } = render(
        <VerificationDecisionStrip claimState="verifier_approved" onDecision={vi.fn()} onRevise={vi.fn()} reviseBlocked={reason} />,
      );
      expect(screen.getByTestId(`revise-blocked-${reason}`).textContent).toBe(t.approvalWarnings.reviseBlocked[reason]);
      expect(screen.queryByTestId('decision-form')).toBeNull();
      expect(screen.queryByTestId('revise-window-note')).toBeNull();
      unmount();
    }
  });
});

describe('<LateWarningReasonPanel> (NW14; AC7)', () => {
  it('needs a reason, then a note; says the approver cannot clear their own approval when another person answered', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<LateWarningReasonPanel options={OPTIONS} uncoveredSinceApproval={0} lateKeysUncoveredForViewer={1} onSubmit={onSubmit} />);
    expect(screen.getByTestId('late-warning-reason-own-cannot-clear').textContent).toBe(t.approvalWarnings.late.ownCannotClear);
    expect(screen.getByTestId('late-warning-reason-count').textContent).toBe(t.approvalWarnings.late.uncovered(1));
    fireEvent.click(screen.getByTestId('late-warning-reason-submit'));
    expect(screen.getByTestId('late-warning-reason-error')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('late-warning-reason-radio-warnings_reviewed'));
    fireEvent.click(screen.getByTestId('late-warning-reason-submit'));
    expect(screen.getByTestId('late-warning-reason-note-error').textContent).toBe(t.approvalWarnings.noteRequiredError);
    fireEvent.change(screen.getByTestId('late-warning-reason-note'), { target: { value: 'The date moved.' } });
    fireEvent.click(screen.getByTestId('late-warning-reason-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ warningReasonCode: 'warnings_reviewed', note: 'The date moved.' }));
  });

  it('⛔ no "cannot clear" line while the warnings are uncovered for everyone', () => {
    render(<LateWarningReasonPanel options={OPTIONS} uncoveredSinceApproval={2} lateKeysUncoveredForViewer={2} onSubmit={vi.fn()} />);
    expect(screen.queryByTestId('late-warning-reason-own-cannot-clear')).toBeNull();
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
