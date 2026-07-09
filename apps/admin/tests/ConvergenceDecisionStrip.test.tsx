// <ConvergenceDecisionStrip> component tests — Story 6.4 (Task 8; AC2/AC3).
//
// Pure render tests (no router/query — the strip takes everything as props). Focus:
//   · cross-channel matches render (both the incoming channel + the candidate claim's channel set);
//   · Merge fires with the (attempt, candidate) ids;
//   · Override opens a confirmation modal and REQUIRES a min-length reason before it can submit;
//   · the empty state renders when there is nothing pending.
//
// Filename is ConvergenceDecisionStrip.test.tsx (NOT IntakeDecisionStrip.test.tsx) — kept aligned
// with the component it covers so a future <IntakeDecisionStrip> suite never collides.

import type { PendingIntakeAttempt } from '@twt/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConvergenceDecisionStrip } from '../src/modules/helpline-claims/ConvergenceDecisionStrip.js';

const ATTEMPT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CLAIM_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const MEMBER_ID = 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm';

const PENDING: PendingIntakeAttempt = {
  intakeAttemptId: ATTEMPT_ID,
  deceasedMemberId: MEMBER_ID,
  intakeChannel: 'helpline',
  createdAt: '2026-07-09T10:00:00.000Z',
  candidates: [
    {
      claimCaseId: CLAIM_ID,
      intakeChannels: ['member_app'],
      currentState: 'intake_converged',
      createdAt: '2026-07-09T09:00:00.000Z',
    },
  ],
};

describe('<ConvergenceDecisionStrip>', () => {
  it('renders the empty state when nothing is pending', () => {
    render(<ConvergenceDecisionStrip pending={[]} onMerge={vi.fn()} onOverride={vi.fn()} />);
    expect(screen.getByTestId('convergence-empty')).toBeInTheDocument();
  });

  it('renders a cross-channel pending attempt: incoming channel + the candidate claim channel set (AC3)', () => {
    render(<ConvergenceDecisionStrip pending={[PENDING]} onMerge={vi.fn()} onOverride={vi.fn()} />);
    // both channels visible to the resolving actor.
    expect(screen.getByTestId('convergence-incoming-channel')).toHaveTextContent('helpline');
    expect(screen.getByTestId('convergence-candidate-channels')).toHaveTextContent('member_app');
    expect(screen.getByTestId(`convergence-candidate-${CLAIM_ID}`)).toBeInTheDocument();
  });

  it('Merge fires onMerge with the (attempt, candidate) ids', () => {
    const onMerge = vi.fn();
    render(<ConvergenceDecisionStrip pending={[PENDING]} onMerge={onMerge} onOverride={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`convergence-merge-${ATTEMPT_ID}-${CLAIM_ID}`));
    expect(onMerge).toHaveBeenCalledWith({ intakeAttemptId: ATTEMPT_ID, claimCaseId: CLAIM_ID });
  });

  it('Override opens a confirmation modal and REQUIRES a reason before submit', () => {
    const onOverride = vi.fn();
    render(<ConvergenceDecisionStrip pending={[PENDING]} onMerge={vi.fn()} onOverride={onOverride} />);

    // No modal until the operator opens it.
    expect(screen.queryByTestId('convergence-override-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`convergence-override-${ATTEMPT_ID}-${CLAIM_ID}`));
    expect(screen.getByTestId('convergence-override-modal')).toBeInTheDocument();

    // Confirm is disabled with an empty / too-short reason (mandatory-reason gate).
    const confirm = screen.getByTestId('convergence-override-confirm');
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByTestId('convergence-override-reason'), { target: { value: 'short' } });
    expect(confirm).toBeDisabled();
    expect(onOverride).not.toHaveBeenCalled();

    // A real (≥10 char) reason enables confirm; submitting fires onOverride with reason + against id.
    fireEvent.change(screen.getByTestId('convergence-override-reason'), {
      target: { value: 'disputed re-file, distinct claimant' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onOverride).toHaveBeenCalledWith({
      intakeAttemptId: ATTEMPT_ID,
      againstClaimCaseId: CLAIM_ID,
      reason: 'disputed re-file, distinct claimant',
    });
  });

  it('Cancel closes the override modal without firing onOverride', () => {
    const onOverride = vi.fn();
    render(<ConvergenceDecisionStrip pending={[PENDING]} onMerge={vi.fn()} onOverride={onOverride} />);
    fireEvent.click(screen.getByTestId(`convergence-override-${ATTEMPT_ID}-${CLAIM_ID}`));
    fireEvent.click(screen.getByTestId('convergence-override-cancel'));
    expect(screen.queryByTestId('convergence-override-modal')).not.toBeInTheDocument();
    expect(onOverride).not.toHaveBeenCalled();
  });

  it('an in-flight merge on one row does not disable another rows buttons (Review Finding)', () => {
    const OTHER_ATTEMPT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const OTHER_CLAIM_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const other: PendingIntakeAttempt = {
      ...PENDING,
      intakeAttemptId: OTHER_ATTEMPT_ID,
      candidates: [{ ...PENDING.candidates[0]!, claimCaseId: OTHER_CLAIM_ID }],
    };
    render(
      <ConvergenceDecisionStrip
        pending={[PENDING, other]}
        onMerge={vi.fn()}
        onOverride={vi.fn()}
        mergingTarget={{ intakeAttemptId: ATTEMPT_ID, claimCaseId: CLAIM_ID }}
      />,
    );
    expect(screen.getByTestId(`convergence-merge-${ATTEMPT_ID}-${CLAIM_ID}`)).toBeDisabled();
    expect(screen.getByTestId(`convergence-merge-${OTHER_ATTEMPT_ID}-${OTHER_CLAIM_ID}`)).toBeEnabled();
    expect(screen.getByTestId(`convergence-override-${OTHER_ATTEMPT_ID}-${OTHER_CLAIM_ID}`)).toBeEnabled();
  });

  it('shows a no-candidate escalation instead of a silent dead end when candidates is empty (Review Finding)', () => {
    const noCandidate: PendingIntakeAttempt = { ...PENDING, candidates: [] };
    const onEscalateNoCandidate = vi.fn();
    render(
      <ConvergenceDecisionStrip
        pending={[noCandidate]}
        onMerge={vi.fn()}
        onOverride={vi.fn()}
        onEscalateNoCandidate={onEscalateNoCandidate}
      />,
    );
    expect(screen.getByTestId(`convergence-no-candidate-${ATTEMPT_ID}`)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`convergence-escalate-${ATTEMPT_ID}`));
    expect(onEscalateNoCandidate).toHaveBeenCalledWith({ intakeAttemptId: ATTEMPT_ID });
  });
});
