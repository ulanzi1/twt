// Story 6.27b (BD4, `2026-10-13-327` decision 2; PM25 (c); AC7, AC10) — an approver whose OWN ground visit on the claim is
// pending sees ONE neutral block on every approving control, and ⛔ a neighbour kind:
//   · the console strip: Approve disabled with the neutral words (the route's `canApprove` + `approveBlockedReason`), the
//     revise of an APPROVAL replaced by them, a denial's revise and Deny / Escalate untouched;
//   · the four later-approver hosts: the shared `approvalBlockedReason` / `<LaterApprovalWarnings>` say it (on the R9
//     panel only where an approve is in play — a voted cycle-freeze card has ⛔ approve control);
//   · the ONE neutral 409 (`<prefix>.own_ground_visit_pending`) reads the same words on every surface;
//   · ⛔ a kind, ⛔ a count, ⛔ a word about neighbours in any of it.

import type { ApprovalWarningsSummary } from '@twt/contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../src/api/client.js';
import {
  approvalBlockedReason,
  LaterApprovalWarnings,
} from '../src/modules/claim-verification/LaterApprovalWarnings.js';
import { laterApprovalWarningErrorMessage } from '../src/modules/claim-verification/nominee-errors.js';
import { verifierConsoleEn as t } from '../src/modules/claim-verification/i18n-en.js';
import { VerificationDecisionStrip } from '../src/modules/claim-verification/VerificationDecisionStrip.js';
import { approvalWarningErrorMessage } from '../src/routes/VerifierConsoleRoute.js';

const HIDDEN: ApprovalWarningsSummary = {
  available: true,
  kinds: [],
  post_death: 'evaluated',
  waiting_for_district_admin: false,
  own_reason_excluded: false,
  own_visit_pending: true,
};

describe('the ONE neutral block — its words', () => {
  it('⛔ a kind, ⛔ a count, ⛔ a word about neighbours', () => {
    expect(t.ownVisitPending).toBe(
      'A ground visit on this claim is assigned to you and is not finished. It must be completed, or given to someone else, before you can approve.',
    );
    expect(t.ownVisitPending).not.toMatch(/neighbour|answer|warning|\d/i);
  });
});

describe('<VerificationDecisionStrip> — the console (AC7)', () => {
  it('a hidden District Admin: Approve disabled WITH the neutral words; Deny and Escalate stay enabled', () => {
    render(
      <VerificationDecisionStrip
        claimState="verifier_review"
        onDecision={vi.fn()}
        canApprove={false}
        approveBlockedReason={t.ownVisitPending}
        ownVisitPending
        approvalWarnings={{ kinds: [], reasonOptions: [] }}
      />,
    );
    expect(screen.getByTestId('action-approve')).toBeDisabled();
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(t.ownVisitPending);
    expect(screen.getByTestId('action-deny')).toBeEnabled();
    expect(screen.getByTestId('action-escalate')).toBeEnabled();
  });

  it('the revise of an APPROVAL is replaced by the neutral words (⛔ form); a DENIAL\'s revise is untouched', () => {
    const { unmount } = render(<VerificationDecisionStrip claimState="verifier_approved" onDecision={vi.fn()} onRevise={vi.fn()} ownVisitPending />);
    expect(screen.getByTestId('revise-blocked-own-visit')).toHaveTextContent(t.ownVisitPending);
    expect(screen.queryByTestId('decision-form')).toBeNull();
    unmount();
    render(<VerificationDecisionStrip claimState="denied" onDecision={vi.fn()} onRevise={vi.fn()} ownVisitPending />);
    expect(screen.queryByTestId('revise-blocked-own-visit')).toBeNull();
    expect(screen.getByTestId('decision-form')).toBeInTheDocument();
  });
});

describe('the four later-approver hosts — the shared block (AC7)', () => {
  it('`approvalBlockedReason` says the neutral words (BEFORE a wait), on every surface', () => {
    expect(approvalBlockedReason(HIDDEN)).toBe(t.ownVisitPending);
    expect(approvalBlockedReason({ ...HIDDEN, waiting_for_district_admin: true }, 'r9')).toBe(t.ownVisitPending);
    expect(approvalBlockedReason({ ...HIDDEN, own_visit_pending: false })).toBeNull();
  });

  it('`<LaterApprovalWarnings>` renders the block where an approve is in play — and ⛔ on a surface with no approve control', () => {
    const { unmount } = render(<LaterApprovalWarnings summary={HIDDEN} options={[]} value="" onChange={vi.fn()} idPrefix="cf-x" />);
    expect(screen.getByTestId('cf-x-approval-blocked')).toHaveTextContent(t.ownVisitPending);
    unmount();
    // The R9 panel (the wait does ⛔ hold the vote): an APPROVE vote is held by BD4 too.
    const { unmount: u2 } = render(
      <LaterApprovalWarnings summary={HIDDEN} options={[]} value="" onChange={vi.fn()} idPrefix="r9-x" waitBlocksHere={false} showPicker />,
    );
    expect(screen.getByTestId('r9-x-approval-blocked')).toHaveTextContent(t.ownVisitPending);
    u2();
    // A voted cycle-freeze card (⛔ approve control at all).
    render(<LaterApprovalWarnings summary={HIDDEN} options={[]} value="" onChange={vi.fn()} idPrefix="voted-x" waitBlocksHere={false} showPicker={false} />);
    expect(screen.queryByTestId('voted-x-approval-blocked')).toBeNull();
  });
});

describe('the ONE neutral 409 reads the same words on every surface (AC10)', () => {
  it.each(['verifier_decision', 'cycle_freeze', 'r9_voting', 'closure'])('`%s.own_ground_visit_pending`', (prefix) => {
    const err = new ApiError(409, `${prefix}.own_ground_visit_pending`, 'server words');
    expect(laterApprovalWarningErrorMessage(err)).toBe(t.ownVisitPending);
  });
  it('the console\'s table (the approval, its revise and the late reason)', () => {
    expect(approvalWarningErrorMessage(new ApiError(409, 'verifier_decision.own_ground_visit_pending', 'x'))).toBe(t.ownVisitPending);
  });
});
