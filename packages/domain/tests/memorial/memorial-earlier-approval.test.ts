// Story 11b.4 (review R2 / R9) — an OLDER approval that still stands while a newer version is current
// (`deriveEarlierApprovalStands`), and the chain's withdraw-approval target (`memorialWithdrawApprovalTargetId`). DB-free.

import { describe, expect, it } from 'vitest';

import {
  deriveEarlierApprovalStands,
  deriveEarlierApprovalWithdrawn,
  latestApprovedIndex,
  memorialReviewTargetIndex,
  memorialWithdrawApprovalTargetId,
  type MemorialChainLink,
  type MemorialReviewAction,
  type MemorialWithdrawalActor,
} from '../../src/memorial/index.js';

let seq = 1000;
function link(opts: { action?: MemorialReviewAction; withdrawnBy?: MemorialWithdrawalActor } = {}): MemorialChainLink {
  seq += 1;
  return {
    submission: { submissionId: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}` } as MemorialChainLink['submission'],
    decision: opts.action ? ({ action: opts.action } as MemorialChainLink['decision']) : null,
    withdrawal: opts.withdrawnBy
      ? ({
          withdrawnBy: opts.withdrawnBy,
          reasonCode: opts.withdrawnBy === 'trust' ? 'identifies_a_child' : null,
        } as MemorialChainLink['withdrawal'])
      : null,
  };
}

describe('deriveEarlierApprovalStands (R2)', () => {
  it('v1 approved_with_omissions + v2 withdrawn by the family → true (v1 is still the approved version)', () => {
    expect(deriveEarlierApprovalStands([link({ action: 'approved_with_omissions' }), link({ withdrawnBy: 'family' })])).toBe(true);
  });

  it('v1 approved_with_omissions + v2 not_approved → true', () => {
    expect(deriveEarlierApprovalStands([link({ action: 'approved_with_omissions' }), link({ action: 'not_approved' })])).toBe(true);
  });

  it('v1 approved_with_omissions + v2 still with the Trust → true (the caller shows it only for the withdrawn / declined states)', () => {
    expect(deriveEarlierApprovalStands([link({ action: 'approved_with_omissions' }), link()])).toBe(true);
  });

  it('v1 approved_with_omissions + v2 approved then withdrawn by the Trust → true (v1 stands again)', () => {
    const chain = [link({ action: 'approved_with_omissions' }), link({ action: 'approved', withdrawnBy: 'trust' })];
    expect(deriveEarlierApprovalStands(chain)).toBe(true);
  });

  it('a single version → false, whatever its state', () => {
    expect(deriveEarlierApprovalStands([link({ action: 'approved_with_omissions' })])).toBe(false);
    expect(deriveEarlierApprovalStands([link({ action: 'approved' })])).toBe(false);
    expect(deriveEarlierApprovalStands([link()])).toBe(false);
    expect(deriveEarlierApprovalStands([link({ withdrawnBy: 'family' })])).toBe(false);
  });

  it('no versions → false', () => {
    expect(deriveEarlierApprovalStands([])).toBe(false);
  });

  it('v1 withdrawn by the Trust (+ any v2) → false: nothing stands', () => {
    expect(deriveEarlierApprovalStands([link({ action: 'approved_with_omissions', withdrawnBy: 'trust' })])).toBe(false);
    expect(
      deriveEarlierApprovalStands([link({ action: 'approved_with_omissions', withdrawnBy: 'trust' }), link({ withdrawnBy: 'family' })]),
    ).toBe(false);
    expect(
      deriveEarlierApprovalStands([link({ action: 'approved_with_omissions', withdrawnBy: 'trust' }), link({ action: 'not_approved' })]),
    ).toBe(false);
  });

  it('v2 approved → false: the newest version IS the approved one', () => {
    expect(deriveEarlierApprovalStands([link({ action: 'approved_with_omissions' }), link({ action: 'approved' })])).toBe(false);
    expect(deriveEarlierApprovalStands([link({ action: 'approved_with_omissions' }), link({ action: 'approved_with_omissions' })])).toBe(false);
  });

  it('v1 never approved (not_approved / withdrawn by the family) + v2 → false', () => {
    expect(deriveEarlierApprovalStands([link({ action: 'not_approved' }), link({ withdrawnBy: 'family' })])).toBe(false);
    expect(deriveEarlierApprovalStands([link({ withdrawnBy: 'family' }), link()])).toBe(false);
  });

  it('agrees with latestApprovedIndex, and can hold together with earlierApprovalWithdrawn (an older v1 stands, v2 was withdrawn)', () => {
    const chain = [link({ action: 'approved_with_omissions' }), link({ action: 'approved_with_omissions', withdrawnBy: 'trust' }), link({ withdrawnBy: 'family' })];
    expect(latestApprovedIndex(chain)).toBe(0);
    expect(deriveEarlierApprovalStands(chain)).toBe(true);
    expect(deriveEarlierApprovalWithdrawn(chain)).toEqual({ reasonCode: 'identifies_a_child' });
  });
});

describe('memorialWithdrawApprovalTargetId (R9 — MA16: "whatever newer versions follow it")', () => {
  it('names the latest approved, un-withdrawn version from ANY version of the chain', () => {
    const v1 = link({ action: 'approved_with_omissions' });
    const v2 = link();
    const chain = [v1, v2];
    expect(memorialWithdrawApprovalTargetId(chain)).toBe(v1.submission.submissionId);
    // The route still validates its target with the same predicate: only v1 is a valid withdraw-approval target.
    expect(memorialReviewTargetIndex(chain, v1.submission.submissionId, 'withdraw_approval')).toBe(0);
    expect(memorialReviewTargetIndex(chain, v2.submission.submissionId, 'withdraw_approval')).toBeNull();
  });

  it('is the newest approval when several exist, and skips one the Trust already withdrew', () => {
    const v1 = link({ action: 'approved_with_omissions' });
    const v2 = link({ action: 'approved_with_omissions', withdrawnBy: 'trust' });
    const v3 = link({ action: 'approved_with_omissions' });
    expect(memorialWithdrawApprovalTargetId([v1, v2, v3])).toBe(v3.submission.submissionId);
    expect(memorialWithdrawApprovalTargetId([v1, v2])).toBe(v1.submission.submissionId);
  });

  it('is null when nothing is approved, or every approval was withdrawn', () => {
    expect(memorialWithdrawApprovalTargetId([])).toBeNull();
    expect(memorialWithdrawApprovalTargetId([link()])).toBeNull();
    expect(memorialWithdrawApprovalTargetId([link({ action: 'not_approved' }), link()])).toBeNull();
    expect(memorialWithdrawApprovalTargetId([link({ action: 'approved', withdrawnBy: 'trust' })])).toBeNull();
  });
});
