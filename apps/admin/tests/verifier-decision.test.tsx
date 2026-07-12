// Verifier-decision component tests — Story 6.11 (Task 7; AC1/AC8).
//
// Pure render + interaction (the components take everything as props). Focus:
//   · the strip renders the three actions in the active window; a resolved claim → non-interactive summary;
//   · the reason-code dropdown offers ONLY outcome-compatible codes (AC8);
//   · a reason code is mandatory before submit; "Other" + Deny require a rationale (AC1(b));
//   · the confirmation modal IS the attestation — submit fires only after Confirm (AC1(d));
//   · the audit-trail entry renders a semantic verb + the actor_display snapshot (AC4/AC7).

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  AuditTrail,
  ReasonCodeDropdown,
  VerificationDecisionStrip,
} from '../src/modules/claim-verification/index.js';

describe('<VerificationDecisionStrip> — active window (AC1)', () => {
  const setup = (claimState = 'verifier_review') => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    const onRevise = vi.fn().mockResolvedValue(undefined);
    render(
      <VerificationDecisionStrip claimState={claimState} onDecision={onDecision} onRevise={onRevise} />,
    );
    return { onDecision, onRevise };
  };

  it('renders the three actions in the active window', () => {
    setup();
    expect(screen.getByTestId('action-approve')).toBeInTheDocument();
    expect(screen.getByTestId('action-deny')).toBeInTheDocument();
    expect(screen.getByTestId('action-escalate')).toBeInTheDocument();
  });

  it('a resolved/terminal claim renders a non-interactive summary (never reopens review)', () => {
    render(<VerificationDecisionStrip claimState="settled" onDecision={vi.fn()} />);
    expect(screen.getByTestId('decision-strip-historical')).toBeInTheDocument();
    expect(screen.queryByTestId('action-approve')).not.toBeInTheDocument();
  });

  it('requires a reason code before the modal opens', () => {
    setup();
    fireEvent.click(screen.getByTestId('action-approve'));
    fireEvent.click(screen.getByTestId('action-submit'));
    expect(screen.getByTestId('reason-code-error')).toBeInTheDocument();
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
  });

  it('the dropdown offers only outcome-compatible codes (AC8)', () => {
    setup();
    fireEvent.click(screen.getByTestId('action-deny'));
    // Deny → only concealment_flag_uphold + other.
    expect(screen.getByTestId('reason-option-concealment_flag_uphold')).toBeInTheDocument();
    expect(screen.getByTestId('reason-option-other')).toBeInTheDocument();
    expect(screen.queryByTestId('reason-option-r5_d_natural_death')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reason-option-r9_routed_to_voting')).not.toBeInTheDocument();
  });

  it('Deny requires a rationale before the modal opens (AC1(b))', () => {
    setup();
    fireEvent.click(screen.getByTestId('action-deny'));
    fireEvent.change(screen.getByTestId('reason-code-select'), { target: { value: 'concealment_flag_uphold' } });
    fireEvent.click(screen.getByTestId('action-submit'));
    expect(screen.getByTestId('rationale-error')).toBeInTheDocument();
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
  });

  it('the confirmation modal IS the attestation — submit fires only after Confirm (AC1(d))', async () => {
    const { onDecision } = setup();
    fireEvent.click(screen.getByTestId('action-approve'));
    fireEvent.change(screen.getByTestId('reason-code-select'), { target: { value: 'r8_90pct_met' } });
    fireEvent.click(screen.getByTestId('action-submit'));
    // The modal is open; nothing submitted yet.
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(onDecision).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('confirm-submit'));
    await waitFor(() => expect(onDecision).toHaveBeenCalledTimes(1));
    expect(onDecision).toHaveBeenCalledWith({ outcome: 'approved', reasonCode: 'r8_90pct_met' });
  });

  it('number-key shortcuts (1/2/3) choose the outcome via a real keydown, not accessKey', () => {
    setup();
    fireEvent.keyDown(document, { key: '2' });
    expect(screen.getByTestId('action-deny')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(document, { key: '1' });
    expect(screen.getByTestId('action-approve')).toHaveAttribute('aria-pressed', 'true');
  });

  it('a shortcut key typed into the rationale textarea does not trigger an action', () => {
    setup();
    fireEvent.click(screen.getByTestId('action-deny'));
    fireEvent.change(screen.getByTestId('reason-code-select'), { target: { value: 'concealment_flag_uphold' } });
    fireEvent.keyDown(screen.getByTestId('rationale-input'), { key: '1' });
    // Still deny — the "1" keypress inside the textarea must not switch it to approve.
    expect(screen.getByTestId('action-deny')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('action-approve')).toHaveAttribute('aria-pressed', 'false');
  });

  it('a modifier chord (e.g. Alt+1) does not trigger the shortcut', () => {
    setup();
    fireEvent.keyDown(document, { key: '1', altKey: true });
    expect(screen.getByTestId('action-approve')).toHaveAttribute('aria-pressed', 'false');
  });

  it('switching claims (a changed key) resets the form — a half-filled rationale never carries over', () => {
    const { rerender } = render(
      <VerificationDecisionStrip key="claim-a" claimState="verifier_review" onDecision={vi.fn()} onRevise={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('action-deny'));
    fireEvent.change(screen.getByTestId('rationale-input'), { target: { value: 'A note about claim A.' } });
    expect(screen.getByTestId('rationale-input')).toHaveValue('A note about claim A.');

    // VerifierConsoleRoute keys the strip by `${claimCaseId}-${claimState}` — simulate switching claims.
    rerender(
      <VerificationDecisionStrip key="claim-b" claimState="verifier_review" onDecision={vi.fn()} onRevise={vi.fn()} />,
    );
    expect(screen.queryByTestId('rationale-input')).not.toBeInTheDocument(); // no outcome chosen yet — fresh form
    expect(screen.getByTestId('action-approve')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('action-deny')).toHaveAttribute('aria-pressed', 'false');
  });

  it('all controls are disabled while a submission is in flight (processing)', () => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <VerificationDecisionStrip claimState="verifier_review" onDecision={onDecision} processing={false} />,
    );
    // Not yet in flight: pick approve + a reason code, open the confirmation modal.
    fireEvent.click(screen.getByTestId('action-approve'));
    fireEvent.change(screen.getByTestId('reason-code-select'), { target: { value: 'r8_90pct_met' } });
    fireEvent.click(screen.getByTestId('action-submit'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    // The parent flips `processing` once the mutation actually starts (e.g. after Confirm).
    rerender(<VerificationDecisionStrip claimState="verifier_review" onDecision={onDecision} processing={true} />);
    expect(screen.getByTestId('action-approve')).toBeDisabled();
    expect(screen.getByTestId('action-deny')).toBeDisabled();
    expect(screen.getByTestId('action-escalate')).toBeDisabled();
    expect(screen.getByTestId('reason-code-select')).toBeDisabled();
    expect(screen.getByTestId('rationale-input')).toBeDisabled();
    expect(screen.getByTestId('action-submit')).toBeDisabled();
    expect(screen.getByTestId('confirm-submit')).toBeDisabled();
    expect(screen.getByTestId('confirm-cancel')).toBeDisabled();
  });

  it('a failed submit closes the confirmation modal instead of leaving it stuck open', async () => {
    const onDecision = vi.fn().mockRejectedValue(new Error('boom'));
    render(
      <VerificationDecisionStrip
        claimState="verifier_review"
        onDecision={onDecision}
        error="Something went wrong. Please try again."
      />,
    );
    fireEvent.click(screen.getByTestId('action-approve'));
    fireEvent.change(screen.getByTestId('reason-code-select'), { target: { value: 'r8_90pct_met' } });
    fireEvent.click(screen.getByTestId('action-submit'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-submit'));
    await waitFor(() => expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument());
    expect(screen.getByTestId('decision-submit-error')).toBeInTheDocument();
  });

  it('Cancel closes the modal without submitting', () => {
    const { onDecision } = setup();
    fireEvent.click(screen.getByTestId('action-approve'));
    fireEvent.change(screen.getByTestId('reason-code-select'), { target: { value: 'r8_90pct_met' } });
    fireEvent.click(screen.getByTestId('action-submit'));
    fireEvent.click(screen.getByTestId('confirm-cancel'));
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    expect(onDecision).not.toHaveBeenCalled();
  });

  it('the post-verdict window offers a same-outcome revise, routed to onRevise', async () => {
    const { onDecision, onRevise } = setup('denied');
    // Outcome pinned to the live outcome (denied) → the reason dropdown shows deny-compatible codes.
    fireEvent.change(screen.getByTestId('reason-code-select'), { target: { value: 'concealment_flag_uphold' } });
    fireEvent.change(screen.getByTestId('rationale-input'), { target: { value: 'Corrected note.' } });
    fireEvent.click(screen.getByTestId('action-submit'));
    fireEvent.click(screen.getByTestId('confirm-submit'));
    await waitFor(() => expect(onRevise).toHaveBeenCalledTimes(1));
    expect(onDecision).not.toHaveBeenCalled();
    expect(onRevise).toHaveBeenCalledWith({
      outcome: 'denied',
      reasonCode: 'concealment_flag_uphold',
      rationale: 'Corrected note.',
    });
  });

  it('the revise window pre-fills reason-code + rationale from the live decision (never a blank rationale erasing the recorded one)', async () => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    const onRevise = vi.fn().mockResolvedValue(undefined);
    render(
      <VerificationDecisionStrip
        claimState="denied"
        onDecision={onDecision}
        onRevise={onRevise}
        liveDecision={{ reasonCode: 'concealment_flag_uphold', rationale: 'Original note.' }}
      />,
    );
    expect(screen.getByTestId('reason-code-select')).toHaveValue('concealment_flag_uphold');
    expect(screen.getByTestId('rationale-input')).toHaveValue('Original note.');
    // A reason-code-only correction: leave the pre-filled rationale untouched, submit still carries it.
    fireEvent.click(screen.getByTestId('action-submit'));
    fireEvent.click(screen.getByTestId('confirm-submit'));
    await waitFor(() => expect(onRevise).toHaveBeenCalledTimes(1));
    expect(onDecision).not.toHaveBeenCalled();
    expect(onRevise).toHaveBeenCalledWith({
      outcome: 'denied',
      reasonCode: 'concealment_flag_uphold',
      rationale: 'Original note.',
    });
  });
});

describe('<ReasonCodeDropdown> (AC8)', () => {
  it('offers only compatible codes for approve', () => {
    render(<ReasonCodeDropdown outcome="approved" value="" onChange={vi.fn()} />);
    expect(screen.getByTestId('reason-option-r5_d_natural_death')).toBeInTheDocument();
    expect(screen.getByTestId('reason-option-concealment_flag_override')).toBeInTheDocument();
    expect(screen.queryByTestId('reason-option-concealment_flag_uphold')).not.toBeInTheDocument();
  });
});

describe('<AuditTrail> (AC4/AC7)', () => {
  it('renders a semantic verb + the actor_display snapshot', () => {
    render(
      <AuditTrail
        entries={[
          { outcome: 'approved', reasonCode: 'r8_90pct_met', actorDisplay: 'Anita (District Admin)', decidedAt: '2026-07-11T00:00:00Z' },
        ]}
      />,
    );
    expect(screen.getByTestId('audit-actor')).toHaveTextContent('Anita (District Admin)');
    expect(screen.getByText(/Approved by/i)).toBeInTheDocument();
  });

  it('a revision gets its own distinct verb, not the outcome verb (AC5)', () => {
    render(
      <AuditTrail
        entries={[
          { outcome: 'denied', reasonCode: 'other', actorDisplay: 'Anita', decidedAt: 'x', isRevision: true },
        ]}
      />,
    );
    expect(screen.getByText(/Revised by/i)).toBeInTheDocument();
    expect(screen.queryByText(/Denied by/i)).not.toBeInTheDocument();
  });

  it('marks a superseded row + shows the empty state', () => {
    const { rerender } = render(
      <AuditTrail
        entries={[
          { outcome: 'denied', reasonCode: 'concealment_flag_uphold', actorDisplay: 'Anita', decidedAt: 'x', superseded: true },
        ]}
      />,
    );
    expect(screen.getByTestId('audit-superseded')).toBeInTheDocument();
    rerender(<AuditTrail entries={[]} />);
    expect(screen.getByTestId('audit-trail-empty')).toBeInTheDocument();
  });
});
