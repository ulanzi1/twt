// <ConvergenceDecisionStripContainer> — Story 6.28 (OP10), code review round 3: the override's "Closed — another claim
// for this death goes ahead" line belongs to THAT override only. The strip lists MANY pending attempts, so a later merge
// clears it (`override.reset()`) — ⛔ never left beside an unrelated attempt. The hooks are mocked: this pins the
// container's wiring, the pure strip's rendering is `ConvergenceDecisionStrip.test.tsx`'s.

import type { PendingIntakeAttempt } from '@twt/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const ATTEMPT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLAIM_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const PENDING: PendingIntakeAttempt = {
  intakeAttemptId: ATTEMPT_ID,
  deceasedMemberId: '22222222-2222-4222-8222-222222222222',
  intakeChannel: 'helpline',
  createdAt: '2026-07-09T10:00:00.000Z',
  candidates: [{ claimCaseId: CLAIM_ID, intakeChannels: ['member_app'], currentState: 'intake_converged', createdAt: '2026-07-09T09:00:00.000Z' }],
};

const override = { data: { state: 'closed' } as { state: string } | undefined, isPending: false, variables: undefined, error: null, mutate: vi.fn(), reset: vi.fn() };
const merge = { isPending: false, variables: undefined, error: null, mutate: vi.fn() };

vi.mock('../src/api/hooks.js', () => ({
  useConvergencePending: () => ({ data: { pending: [PENDING] }, isLoading: false, error: null }),
  useConfirmConvergenceMerge: () => merge,
  useOverrideConvergence: () => override,
}));

const { ConvergenceDecisionStripContainer } = await import('../src/modules/helpline-claims/ConvergenceDecisionStrip.js');

describe('<ConvergenceDecisionStripContainer> — the override\'s closed line', () => {
  it('shows after a closed override, and a later MERGE clears it before merging', () => {
    render(<ConvergenceDecisionStripContainer pariwarId="44444444-4444-4444-8444-444444444444" />);
    expect(screen.getByTestId('convergence-override-closed')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`convergence-merge-${ATTEMPT_ID}-${CLAIM_ID}`));
    expect(override.reset).toHaveBeenCalledTimes(1);
    expect(merge.mutate).toHaveBeenCalledWith({ intakeAttemptId: ATTEMPT_ID, claimCaseId: CLAIM_ID });
    expect(override.reset.mock.invocationCallOrder[0]!).toBeLessThan(merge.mutate.mock.invocationCallOrder[0]!);
  });
});
