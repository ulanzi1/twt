// Story 11b.4a — the family's state after a take-down is a CHAIN property (Trap 18), and a take-down must leave NOTHING for
// `latestApprovedIndex` to fall back to (Trap 1). AC7's chain-shape table, DB-free: each shape is built, the take-down is
// applied the way `decideMemorialTakedown` writes it (a `helpline` withdrawal on EVERY version that has none — MP8 (a)), and the
// public pick and the family's state are read back. The live spec (`tests/integration/memorial/takedown.spec.ts`) runs the same
// shapes through the real writer.

import { describe, expect, it } from 'vitest';

import {
  deriveEarlierApprovalStands,
  deriveMemorialChainState,
  deriveMemorialStatus,
  latestApprovedIndex,
  memorialCanSend,
  memorialCanWithdraw,
  memorialWithdrawApprovalTargetId,
  type MemorialChainLink,
  type MemorialChainLinkTimed,
  type MemorialReviewAction,
  type MemorialWithdrawalActor,
} from '../../src/memorial/index.js';

type Code = 'A' | 'A-omit' | 'N' | 'pending' | 'F' | 'A(T)';

interface Link extends MemorialChainLinkTimed {
  readonly submission: { readonly submissionId: string; readonly createdAt: Date };
}

let clock = Date.parse('2026-10-01T00:00:00Z');
const tick = (): Date => new Date((clock += 60_000));

function make(code: Code): Link {
  const createdAt = tick();
  const action: MemorialReviewAction | null = code === 'A' || code === 'A(T)' ? 'approved' : code === 'A-omit' ? 'approved_with_omissions' : code === 'N' ? 'not_approved' : null;
  const by: MemorialWithdrawalActor | null = code === 'F' ? 'family' : code === 'A(T)' ? 'trust' : null;
  return {
    submission: { submissionId: `${code}-${createdAt.getTime()}`, createdAt },
    decision: action === null ? null : { action },
    withdrawal: by === null ? null : { withdrawnBy: by, reasonCode: by === 'trust' ? 'against_the_law' : null, withdrawnAt: tick() },
  };
}

/** MP8 (a) — exactly what `decideMemorialTakedown` writes: `helpline` on every version with ⛔ no withdrawal yet. */
function takeDown(chain: readonly Link[]): Link[] {
  const at = tick();
  return chain.map((l) => (l.withdrawal !== null ? l : { ...l, withdrawal: { withdrawnBy: 'helpline' as const, reasonCode: null, withdrawnAt: at } }));
}

const chainOf = (codes: readonly Code[]): Link[] => codes.map(make);

describe('AC7 — every reachable chain shape, before and after a take-down (Traps 1, 18)', () => {
  // `[A(T)]` (nothing shown) is the request's `404` — ⛔ a take-down (the live spec covers it).
  it.each<[string, readonly Code[], number]>([
    ['[A]', ['A'], 0],
    ['[A-omit]', ['A-omit'], 0],
    ['[A-omit, A] — Trap 1: v1 must ⛔ come back', ['A-omit', 'A'], 1],
    ['[N, A]', ['N', 'A'], 1],
    ['[A-omit, pending] — the head is with the Trust while v1 is on the page', ['A-omit', 'pending'], 0],
    ['[A-omit, not_approved]', ['A-omit', 'N'], 0],
    ['[A-omit, family-withdrawn] — Trap 18: the head was ALREADY withdrawn', ['A-omit', 'F'], 0],
    ['[A-omit, not_approved, A]', ['A-omit', 'N', 'A'], 2],
    ['[A-omit, trust-withdrawn(A)]', ['A-omit', 'A(T)'], 0],
    ['[A-omit, trust-withdrawn(A), pending] — Trap 18', ['A-omit', 'A(T)', 'pending'], 0],
  ])('%s', (_name, codes, shownBefore) => {
    const before = chainOf(codes);
    expect(latestApprovedIndex(before)).toBe(shownBefore);
    const after = takeDown(before);
    // ⭐ Nothing is left for the page: every approval now carries a withdrawal.
    expect(latestApprovedIndex(after)).toBe(-1);
    // The withdraw-approval target reads only the decisions and withdrawals — the full row type is ⛔ not needed here.
    expect(memorialWithdrawApprovalTargetId(after as unknown as MemorialChainLink[])).toBeNull();
    expect(deriveEarlierApprovalStands(after)).toBe(false);
    // ⭐ The family's state is `taken_down` in EVERY shape — whatever the head's own row says.
    const state = deriveMemorialChainState(after);
    expect(state).toBe('taken_down');
    expect(memorialCanSend(state)).toBe(true);
    expect(memorialCanWithdraw(state)).toBe(false);
  });

  it('⚠ the head-only rule is WRONG for `[A-omit, family-withdrawn]` and `[A-omit, A(T)]` (why the chain rule exists)', () => {
    for (const codes of [['A-omit', 'F'], ['A-omit', 'A(T)'], ['A-omit', 'A(T)', 'pending']] as const) {
      const after = takeDown(chainOf(codes));
      const head = after[after.length - 1]!;
      expect(deriveMemorialChainState(after)).toBe('taken_down');
      // The pending head DOES get a `helpline` row; the already-withdrawn heads keep their own — the head alone says otherwise.
      if (codes.length === 2) expect(deriveMemorialStatus(head)).not.toBe('taken_down');
    }
  });

  it('a re-send after a take-down: `[H, H, A′]` shows A′ (state `approved`), and a SECOND take-down takes it down again', () => {
    const first = takeDown(chainOf(['A-omit', 'A']));
    const resent = [...first, make('A')];
    expect(latestApprovedIndex(resent)).toBe(2);
    expect(deriveMemorialChainState(resent)).toBe('approved');
    const second = takeDown(resent);
    expect(latestApprovedIndex(second)).toBe(-1);
    expect(deriveMemorialChainState(second)).toBe('taken_down');
  });

  it('`[H, F′]` — a re-send after a take-down, then a family Withdraw — is `withdrawn`, ⛔ `taken_down` (created_at > withdrawn_at)', () => {
    const after = takeDown(chainOf(['A']));
    const resent = [...after, make('F')];
    expect(deriveMemorialChainState(resent)).toBe('withdrawn');
  });

  it('a version sent after a take-down and still with the Trust is `with_the_trust` (the nominee wrote again — MP9)', () => {
    const resent = [...takeDown(chainOf(['A'])), make('pending')];
    expect(deriveMemorialChainState(resent)).toBe('with_the_trust');
    expect(memorialCanWithdraw(deriveMemorialChainState(resent))).toBe(true);
  });

  it('with ⛔ no helpline withdrawal the chain rule IS the head rule (11b.4 unchanged)', () => {
    for (const codes of [[], ['A'], ['A-omit', 'pending'], ['A-omit', 'F'], ['A-omit', 'A(T)'], ['N']] as const) {
      const chain = chainOf(codes);
      expect(deriveMemorialChainState(chain)).toBe(deriveMemorialStatus(chain.length === 0 ? null : chain[chain.length - 1]!));
    }
  });
});
