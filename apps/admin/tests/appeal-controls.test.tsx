// Appeal stage-controls component tests — Story 6.16 (Task 8; AC2/AC3/AC4/AC7/AC11).
//
// Pure render + interaction (the components take everything as props). Focus:
//   · Stage 1 renders reverse/advance; the disposition picker shows ONLY on reverse (D-A); a reverse without a
//     disposition cannot submit; the D-D reviewer-conflict read-only state renders when `conflict`.
//   · Stage 2 renders the open form when no session, the vote/finalize/cancel panel when a session is live;
//     finalize is disabled until quorum is met.
//   · Stage 3 always surfaces the external-remedy disclosure (AC4/AC7).
//   · the SLA "overdue" badge renders on a breach (D-H).
//   · the audit lookup renders the SLA-breach badge per row (AC6/D-H).

import type { AppealDecisionsByReviewerItem, AppealPanelSessionView, AppealPanelTally } from '@twt/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppealAuditLookup, AppealStageControls } from '../src/modules/claim-appeal/index.js';

const session: AppealPanelSessionView = {
  session_id: '11111111-1111-1111-1111-111111111111',
  panel: [
    { actor_id: 'a1', actor_display: 'Trustee One' },
    { actor_id: 'a2', actor_display: 'Trustee Two' },
  ],
  quorum_required: 2,
  opened_display: 'Opener',
  opened_at: new Date().toISOString(),
  outcome: null,
  finalized_display: null,
  finalized_at: null,
};

const tallyQuorumMet: AppealPanelTally = {
  reverse_count: 2,
  deny_count: 0,
  cast_votes: 2,
  panel_size: 2,
  quorum_required: 2,
  provisional_outcome: 'reversed',
  quorum_met: true,
};

describe('<AppealStageControls> — Stage 1 (AC2/D-A)', () => {
  it('shows the disposition picker only on a reverse, and blocks submit until it is chosen', () => {
    const onStage1 = vi.fn();
    render(<AppealStageControls claimState="appeal_stage_1" journey={null} session={null} tally={null} sla={null} onStage1={onStage1} />);
    // Default decision is "reverse" → disposition picker present; submit disabled until rationale + disposition.
    expect(screen.getByTestId('disposition-picker')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('rationale'), { target: { value: 'new documents' } });
    expect(screen.getByTestId('stage1-submit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('disposition-picker'), { target: { value: 'new_evidence_presented' } });
    expect(screen.getByTestId('stage1-submit')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('stage1-submit'));
    expect(onStage1).toHaveBeenCalledWith('reversed', 'new documents', 'new_evidence_presented');
  });

  it('an advance decision hides the disposition picker and submits without one', () => {
    const onStage1 = vi.fn();
    render(<AppealStageControls claimState="appeal_stage_1" journey={null} session={null} tally={null} sla={null} onStage1={onStage1} />);
    fireEvent.click(screen.getByText(/Do not reverse/));
    expect(screen.queryByTestId('disposition-picker')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('rationale'), { target: { value: 'stands' } });
    fireEvent.click(screen.getByTestId('stage1-submit'));
    expect(onStage1).toHaveBeenCalledWith('advance', 'stands', undefined);
  });

  it('surfaces the D-D reviewer-conflict read-only state', () => {
    render(<AppealStageControls claimState="appeal_stage_1" journey={null} session={null} tally={null} sla={null} conflict />);
    expect(screen.getByTestId('stage1-conflict')).toBeInTheDocument();
    expect(screen.queryByTestId('stage1-form')).not.toBeInTheDocument();
  });
});

describe('<AppealStageControls> — Stage 2 (AC3)', () => {
  it('renders the open form when no live session', () => {
    render(<AppealStageControls claimState="appeal_stage_2" journey={null} session={null} tally={null} sla={null} />);
    expect(screen.getByTestId('stage2-open-form')).toBeInTheDocument();
  });

  it('finalize is disabled until quorum is met', () => {
    const notMet = { ...tallyQuorumMet, cast_votes: 1, reverse_count: 1, quorum_met: false, provisional_outcome: 'advance' as const };
    const { rerender } = render(<AppealStageControls claimState="appeal_stage_2" journey={null} session={session} tally={notMet} sla={null} />);
    expect(screen.getByTestId('finalize-submit')).toBeDisabled();
    rerender(<AppealStageControls claimState="appeal_stage_2" journey={null} session={session} tally={tallyQuorumMet} sla={null} />);
    // reverse-majority provisional → disposition required before finalize enables.
    expect(screen.getByTestId('finalize-submit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('disposition-picker'), { target: { value: 'procedural_correction' } });
    // A mandatory rationale is also required before finalize enables (6.16 review — no silent placeholder).
    expect(screen.getByTestId('finalize-submit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('rationale'), { target: { value: 'majority reversed on the merits' } });
    expect(screen.getByTestId('finalize-submit')).not.toBeDisabled();
  });
});

describe('<AppealStageControls> — Stage 3 + SLA (AC4/AC7/D-H)', () => {
  it('always surfaces the external-remedy disclosure', () => {
    render(<AppealStageControls claimState="appeal_stage_3" journey={null} session={null} tally={null} sla={null} />);
    expect(screen.getByTestId('external-remedy')).toBeInTheDocument();
  });

  it('renders the SLA overdue badge on a breach', () => {
    render(<AppealStageControls claimState="appeal_stage_3" journey={null} session={null} tally={null} sla={{ stage: '3', sla_days: 14, elapsed_days: 30, breached: true }} />);
    expect(screen.getByTestId('sla-overdue')).toBeInTheDocument();
  });
});

describe('<AppealAuditLookup> (AC6/D-H)', () => {
  const item: AppealDecisionsByReviewerItem = {
    appeal_decision_id: '22222222-2222-2222-2222-222222222222',
    claim_case_id: '33333333-3333-3333-3333-333333333333',
    stage: '1',
    decision: 'advance',
    disposition_category: null,
    decided_at: new Date().toISOString(),
    superseded_at: null,
    sla_breached: true,
    elapsed_days: 40,
  };

  it('renders the SLA-breach badge per breached row', () => {
    render(<AppealAuditLookup decisions={[item]} />);
    expect(screen.getByTestId('audit-sla-breach')).toBeInTheDocument();
  });

  it('fires onLookup with the reviewer + stage', () => {
    const onLookup = vi.fn();
    render(<AppealAuditLookup decisions={null} onLookup={onLookup} />);
    fireEvent.change(screen.getByTestId('audit-reviewer'), { target: { value: 'rev-1' } });
    fireEvent.change(screen.getByTestId('audit-stage'), { target: { value: '2' } });
    fireEvent.click(screen.getByTestId('audit-lookup'));
    expect(onLookup).toHaveBeenCalledWith('rev-1', '2');
  });
});
