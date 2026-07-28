// The OVER-PAYMENT GOVERNANCE fence — Story 9.11 (AC6/AC7), DB-free.
//
// "Facilitated, never enforced; every money-moving action is human-attested" (FR-36 / §4.14) is the
// load-bearing invariant this story protects. This file makes the NEGATIVES executable — teeth, not a green
// happy path ([[feedback_gate_scope_semantic_coverage]]):
//   (a) an over-payment is NEVER auto-corrected — it stays a red `amount_mismatch`, never rewritten to valid;
//   (b) the pure matcher NEVER confirms an over-payment (an over deposit yields a mismatch, zero confirmations);
//   (c) `applied_next_cycle_credit` (+ the two sibling terminal codes) is a RECORDED decision, NOT automation —
//       the literal appears ONLY in the reason-code vocabulary, never wired to a money-moving append/emit;
//   (d) an over-payment is NEVER remapped to another pool (the mismatch stays scoped to the assigned pool).
//
// Revert-sanity: flip the amount branch to `valid`, or wire `applied_next_cycle_credit` to an append, and a
// test here goes red.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { classifyAmountMismatchDirection, classifyContributionAmount } from '../../src/pool/index.js';
import { matchPool } from '../../src/reconciliation/matcher.js';

const POOL_A = '00000000-0000-4000-8000-0000000000a1';
const POOL_B = '00000000-0000-4000-8000-0000000000b2';

function att(overrides: Record<string, unknown> = {}) {
  return {
    attestationEventId: 'a1',
    memberId: 'm1',
    poolId: POOL_A,
    alertId: 'alert-1',
    tr: 'tr-1',
    utr: '111111111111',
    ...overrides,
  } as Parameters<typeof matchPool>[0]['attestations'][number];
}

function entry(overrides: Record<string, unknown> = {}) {
  return {
    entryId: 'e1',
    poolId: POOL_A,
    transactionIdUtr: '111111111111',
    amount: 110_000, // an over deposit against a ₹1,000 (100,000 paise) pool
    transactionDate: '2026-07-10',
    senderVpa: null,
    entryType: 'credit',
    ...overrides,
  } as Parameters<typeof matchPool>[0]['entries'][number];
}

describe('AC7(a) — an over-payment is never auto-corrected to valid', () => {
  it('classifyContributionAmount(deposited > expected) is amount_mismatch, never valid', () => {
    const result = classifyContributionAmount({ expectedFixedAmount: 100_000, depositedAmount: 110_000 });
    expect(result.verdict).toBe('amount_mismatch');
    expect(result.verdict).not.toBe('valid');
    // The direction is `over` — the classifier surfaces the excess, it never rounds/rewrites the amount.
    expect(classifyAmountMismatchDirection({ expectedPaise: 100_000, depositedPaise: 110_000 })).toBe('over');
  });
});

describe('AC7(b)/(d) — the matcher never confirms or remaps an over-payment', () => {
  it('an OVER deposit to the CORRECT pool → one amount_mismatch, ZERO confirmations, still in its own pool', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ poolId: POOL_A })],
      entries: [entry({ poolId: POOL_A, amount: 110_000 })],
    });
    expect(result.confirmations).toHaveLength(0); // (b) never green
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]).toMatchObject({
      reason: 'amount_mismatch',
      poolId: POOL_A, // (d) the mismatch stays scoped to the member's ASSIGNED pool — never remapped
      depositedAmountPaise: 110_000,
      expectedAmountPaise: 100_000,
    });
  });

  it('an OVER deposit to the WRONG pool → wrong_pool (amount NEVER checked; no remap, no carried amounts)', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ poolId: POOL_A })],
      entries: [entry({ poolId: POOL_B, amount: 110_000 })],
    });
    expect(result.confirmations).toHaveLength(0);
    expect(result.mismatches[0]?.reason).toBe('wrong_pool');
    expect(result.mismatches[0]?.poolId).toBe(POOL_A); // never adopts the deposit's pool
    // A wrong-pool short-circuit makes NO amount comparison — the amounts must be absent (not fabricated).
    expect(result.mismatches[0]?.depositedAmountPaise).toBeUndefined();
    expect(result.mismatches[0]?.expectedAmountPaise).toBeUndefined();
  });
});

// ── (c) the three terminal recover codes are RECORDED, not automation — structural absence of a money path ──

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const PRUNED_DIRS = new Set(['node_modules', 'dist', '.turbo', '.next', 'build', 'coverage']);

// Non-test source files under packages + apps, pruning vendored/build dirs at the directory boundary.
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dirRel: string): void => {
    for (const e of readdirSync(path.join(repoRoot, dirRel), { withFileTypes: true })) {
      const rel = path.join(dirRel, e.name);
      if (e.isDirectory()) {
        if (!PRUNED_DIRS.has(e.name)) walk(rel);
      } else if (/\.(ts|tsx|mts|cts)$/.test(e.name) && !/\.(test|spec)\.(ts|tsx)$/.test(e.name) && !rel.includes('/tests/')) {
        out.push(rel);
      }
    }
  };
  walk('packages');
  walk('apps');
  return out;
}

describe('AC7(c) — applied_next_cycle_credit (+ siblings) are recorded decisions, never a money path', () => {
  const TERMINAL_CODES = ['refund_difference', 'applied_next_cycle_credit', 'left_as_donation'];
  // The ONLY source files allowed to name these literals: the domain vocabulary + its contracts mirror. No
  // handler / worker / read / projector may reference them (a reference there would be a code path keyed off
  // the decision — the AC7(d) next-cycle-credit engine this story forbids). The admin dropdown gets them
  // DYNAMICALLY via reconciliationReasonCodesForOutcome('recover'), never as a literal.
  const ALLOWED = [
    'packages/domain/src/reconciliation/review-reason-codes.ts',
    'packages/contracts/src/reconciliation/reconciliation-review.ts',
  ];

  it('each terminal code appears ONLY in the reason-code vocabulary source, never wired to an append/emit', () => {
    const files = sourceFiles();
    for (const code of TERMINAL_CODES) {
      const offenders = files.filter((f) => readFileSync(path.join(repoRoot, f), 'utf8').includes(code));
      expect(
        offenders.sort(),
        `'${code}' leaked outside the reason-code vocabulary — a consumer keyed off it would be a money path (AC7).`,
      ).toEqual(ALLOWED.sort());
    }
  });

  it('the scan is live — it actually found the vocabulary files', () => {
    const files = sourceFiles();
    expect(files.length).toBeGreaterThan(100);
    for (const allowed of ALLOWED) expect(files).toContain(allowed);
  });
});
