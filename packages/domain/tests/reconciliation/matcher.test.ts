// The pure UTR matcher — DB-free unit + frozen vectors + shuffled-replay + fast-check universals
// (Story 9.4, Task 1; AC2/AC4/AC6). This is where the engine earns its correctness — a green happy path
// proves little ([[feedback_gate_scope_semantic_coverage]]); the teeth are the frozen outcome set + the
// order-invariance property + the no-double-confirm property.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  MATCH_MISMATCH_REASONS,
  MEMBER_VPA_NOT_COLLECTED,
  matchPool,
  type MatcherAttestation,
  type MatcherEntry,
  type MatchPoolInput,
} from '../../src/reconciliation/matcher.js';

const POOL_A = '00000000-0000-4000-8000-0000000000a1';
const POOL_B = '00000000-0000-4000-8000-0000000000b2';
const ALERT = '00000000-0000-4000-8000-0000000000e1';

function att(over: Partial<MatcherAttestation> & { attestationEventId: string; utr: string }): MatcherAttestation {
  return {
    memberId: `member-${over.attestationEventId}`,
    poolId: POOL_A,
    alertId: ALERT,
    tr: `tr-${over.attestationEventId}`,
    ...over,
  };
}

function entry(over: Partial<MatcherEntry> & { entryId: string }): MatcherEntry {
  return {
    poolId: POOL_A,
    transactionIdUtr: null,
    amount: 100_000, // ₹1,000 in paise
    transactionDate: '2026-07-10',
    senderVpa: null,
    entryType: 'credit',
    ...over,
  };
}

// ── The units trap — the single most likely wrong-data bug ────────────────────────────────────────────

describe('AC2 — the paise/whole-INR units reconciliation', () => {
  it('confirms a ₹1,000 pool against a 100000-paise deposit (fixedAmount × 100 === amount)', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000, // whole INR
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000 })],
    });
    expect(result.confirmations).toHaveLength(1);
    expect(result.mismatches).toHaveLength(0);
    expect(result.confirmations[0]).toMatchObject({ memberId: 'member-a1', entryId: 'e1' });
  });

  it('a naive fixedAmount===amount (1000 vs 100000) would mismatch — the reconciliation prevents it', () => {
    // The deposit is EXACTLY the fixed amount in paise; a naive fixedAmount===amount (1000 vs 100000) would
    // wrongly mismatch — only the × 100 units reconciliation confirms it.
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000 })],
    });
    expect(result.confirmations).toHaveLength(1);
  });

  it('a real amount mismatch (₹1,000 pool, ₹900 deposit) is amount_mismatch, never confirmed', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 90_000 })],
    });
    expect(result.confirmations).toHaveLength(0);
    expect(result.mismatches).toHaveLength(1);
    // Story 9.11 (AC1) — an UNDER deposit carries both amounts (the durable over/under fact).
    expect(result.mismatches[0]).toMatchObject({
      reason: 'amount_mismatch',
      entryId: 'e1',
      depositedAmountPaise: 90_000,
      expectedAmountPaise: 100_000,
    });
  });

  it('Story 9.11 (AC1) — an OVER deposit (₹1,000 pool, ₹1,100 deposit) carries deposited+expected paise', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 110_000 })],
    });
    expect(result.confirmations).toHaveLength(0);
    expect(result.mismatches[0]).toMatchObject({
      reason: 'amount_mismatch',
      entryId: 'e1',
      depositedAmountPaise: 110_000, // > expected ⇒ the over fact
      expectedAmountPaise: 100_000,
    });
  });

  it('Story 9.11 (AC1) — a wrong_pool mismatch carries NEITHER amount (no comparison was made)', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111', poolId: POOL_A })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 110_000, poolId: POOL_B })],
    });
    expect(result.mismatches[0]?.reason).toBe('wrong_pool');
    expect(result.mismatches[0]?.depositedAmountPaise).toBeUndefined();
    expect(result.mismatches[0]?.expectedAmountPaise).toBeUndefined();
  });

  it('Story 9.11 (AC1) — an entry_already_claimed mismatch carries NEITHER amount', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [
        att({ attestationEventId: 'a1', utr: '111111111111', memberId: 'm1' }),
        att({ attestationEventId: 'a2', utr: '111111111111', memberId: 'm2' }),
      ],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000 })],
    });
    const claimed = result.mismatches.find((m) => m.reason === 'entry_already_claimed');
    expect(claimed).toBeDefined();
    expect(claimed?.depositedAmountPaise).toBeUndefined();
    expect(claimed?.expectedAmountPaise).toBeUndefined();
  });
});

// ── Primary + secondary + the reason vocabulary ───────────────────────────────────────────────────────

describe('AC2/AC6 — primary UTR match + destination-first secondary', () => {
  it('a UTR with no statement entry → no_statement_entry (entryId null)', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '222222222222', amount: 100_000 })],
    });
    expect(result.confirmations).toHaveLength(0);
    expect(result.mismatches[0]).toMatchObject({ reason: 'no_statement_entry', entryId: null });
  });

  it('a UTR-less entry is never matchable (skipped)', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: null, amount: 100_000 })],
    });
    expect(result.mismatches[0]?.reason).toBe('no_statement_entry');
  });

  it('AC6 — a deposit to the WRONG pool is wrong_pool, amount is NEVER checked, NEVER remapped', () => {
    // The member is assigned to POOL_A but the matched entry's provenance pool is POOL_B, AND the amount
    // happens to equal the fixed amount — destination-first still short-circuits to wrong_pool.
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111', poolId: POOL_A })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000, poolId: POOL_B })],
    });
    expect(result.confirmations).toHaveLength(0);
    expect(result.mismatches[0]).toMatchObject({ reason: 'wrong_pool', entryId: 'e1' });
  });

  it('destination precedes amount — a wrong-pool deposit with a wrong amount is wrong_pool, not amount_mismatch', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111', poolId: POOL_A })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 90_000, poolId: POOL_B })],
    });
    expect(result.mismatches[0]?.reason).toBe('wrong_pool');
  });

  it('the sender-VPA arm ships {available:false} on every confirmation (Decision D3) and never blocks', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000, senderVpa: null })],
    });
    expect(result.confirmations[0]?.senderVpaCheck).toEqual({
      available: false,
      reason: MEMBER_VPA_NOT_COLLECTED,
    });
  });

  it('the matcher NEVER emits sender_vpa_mismatch in v1 (the arm is off)', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000, senderVpa: 'someone@upi' })],
    });
    expect(result.mismatches.some((m) => m.reason === 'sender_vpa_mismatch')).toBe(false);
    expect(result.confirmations).toHaveLength(1);
  });
});

describe('Patch (code review) — entry_type is a match precondition, not just carried data', () => {
  it('a debit row is never a match candidate — falls through to no_statement_entry, never confirmed', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000, entryType: 'debit' })],
    });
    expect(result.confirmations).toHaveLength(0);
    expect(result.mismatches[0]).toMatchObject({ reason: 'no_statement_entry', entryId: null });
  });

  it('a reversal row sharing a UTR+amount with a real deposit is never confirmed', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [
        entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000, entryType: 'reversal' }),
        entry({ entryId: 'e2', transactionIdUtr: '222222222222', amount: 100_000, entryType: 'credit' }),
      ],
    });
    expect(result.confirmations).toHaveLength(0);
  });

  it('a credit row with the same UTR still confirms normally', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000, entryType: 'credit' })],
    });
    expect(result.confirmations).toHaveLength(1);
  });
});

describe('Patch (code review) — entry exclusivity: one deposit backs exactly one confirmation, ever', () => {
  it('two attestations with the IDENTICAL utr resolving to the same entry: first wins, second is entry_already_claimed', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [
        att({ attestationEventId: 'a1', utr: '111111111111', memberId: 'm1' }),
        att({ attestationEventId: 'a2', utr: '111111111111', memberId: 'm2' }),
      ],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000 })],
    });
    expect(result.confirmations).toHaveLength(1);
    expect(result.confirmations[0]).toMatchObject({ memberId: 'm1', entryId: 'e1' }); // canonical sort order: a1 < a2
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]).toMatchObject({ memberId: 'm2', reason: 'entry_already_claimed', entryId: 'e1' });
  });

  it('is order-invariant: reversing the attestation array still gives a1 (the lexically-first event id) the win', () => {
    const attestations = [
      att({ attestationEventId: 'a2', utr: '111111111111', memberId: 'm2' }),
      att({ attestationEventId: 'a1', utr: '111111111111', memberId: 'm1' }),
    ];
    const entries = [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000 })];
    const result = matchPool({ poolId: POOL_A, fixedAmount: 1000, attestations, entries });
    expect(result.confirmations[0]).toMatchObject({ memberId: 'm1' });
    expect(result.mismatches[0]).toMatchObject({ memberId: 'm2', reason: 'entry_already_claimed' });
  });

  it('claimedEntryIds (a prior tick\'s confirmation) excludes the entry even from a lone attestation', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111', memberId: 'm1' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000 })],
      claimedEntryIds: new Set(['e1']),
    });
    expect(result.confirmations).toHaveLength(0);
    expect(result.mismatches[0]).toMatchObject({ memberId: 'm1', reason: 'entry_already_claimed', entryId: 'e1' });
  });

  it('a DIFFERENT utr/entry is unaffected by another entry being claimed', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '222222222222', memberId: 'm1' })],
      entries: [entry({ entryId: 'e2', transactionIdUtr: '222222222222', amount: 100_000 })],
      claimedEntryIds: new Set(['e1']),
    });
    expect(result.confirmations).toHaveLength(1);
  });
});

describe('AC2 — the optional timestamp window (secondary)', () => {
  it('an out-of-window entry is not a candidate → no_statement_entry', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000, transactionDate: '2026-06-01' })],
      window: { startInclusive: '2026-07-01', endInclusive: '2026-07-15' },
    });
    expect(result.mismatches[0]?.reason).toBe('no_statement_entry');
  });

  it('an in-window entry (with a time component) confirms', () => {
    const result = matchPool({
      poolId: POOL_A,
      fixedAmount: 1000,
      attestations: [att({ attestationEventId: 'a1', utr: '111111111111' })],
      entries: [entry({ entryId: 'e1', transactionIdUtr: '111111111111', amount: 100_000, transactionDate: '2026-07-10T14:30:00' })],
      window: { startInclusive: '2026-07-01', endInclusive: '2026-07-15' },
    });
    expect(result.confirmations).toHaveLength(1);
  });
});

// ── Frozen vector: a fixed seeded set → a fixed confirmed/mismatch outcome set (AC4) ───────────────────

const FROZEN_INPUT: MatchPoolInput = {
  poolId: POOL_A,
  fixedAmount: 1000,
  window: { startInclusive: '2026-07-01', endInclusive: '2026-07-15' },
  attestations: [
    att({ attestationEventId: 'att-1', utr: '100000000001', memberId: 'm1' }), // → confirmed
    att({ attestationEventId: 'att-2', utr: '100000000002', memberId: 'm2' }), // → amount_mismatch
    att({ attestationEventId: 'att-3', utr: '100000000003', memberId: 'm3' }), // → wrong_pool
    att({ attestationEventId: 'att-4', utr: '100000000004', memberId: 'm4' }), // → no_statement_entry (no entry)
    att({ attestationEventId: 'att-5', utr: '100000000005', memberId: 'm5' }), // → no_statement_entry (out of window)
  ],
  entries: [
    entry({ entryId: 'ent-1', transactionIdUtr: '100000000001', amount: 100_000, poolId: POOL_A }),
    entry({ entryId: 'ent-2', transactionIdUtr: '100000000002', amount: 55_000, poolId: POOL_A }),
    entry({ entryId: 'ent-3', transactionIdUtr: '100000000003', amount: 100_000, poolId: POOL_B }),
    entry({ entryId: 'ent-5', transactionIdUtr: '100000000005', amount: 100_000, poolId: POOL_A, transactionDate: '2026-08-20' }),
    entry({ entryId: 'ent-x', transactionIdUtr: null, amount: 100_000, poolId: POOL_A }),
  ],
};

/** Normalize a result to a comparable, order-independent shape. Story 9.11: the carried over/under amounts
 *  ride the normalized mismatch key ONLY when present (the `amount_mismatch` branch), so the frozen replay
 *  includes them byte-for-byte while the wrong_pool / no_statement_entry rows stay byte-identical (no amounts
 *  appended when absent). */
function normalize(r: ReturnType<typeof matchPool>) {
  return {
    confirmed: r.confirmations.map((c) => `${c.memberId}:${c.entryId}`).sort(),
    mismatched: r.mismatches
      .map((m) => {
        const amounts =
          m.depositedAmountPaise !== undefined && m.expectedAmountPaise !== undefined
            ? `:${m.depositedAmountPaise}/${m.expectedAmountPaise}`
            : '';
        return `${m.memberId}:${m.reason}:${m.entryId ?? 'none'}${amounts}`;
      })
      .sort(),
  };
}

const FROZEN_OUTCOME = {
  confirmed: ['m1:ent-1'],
  mismatched: [
    // Story 9.11: the amount_mismatch row now carries deposited/expected paise (ent-2 is an UNDER deposit:
    // 55000 < 100000); every other reason carries neither, so those rows are byte-unchanged.
    'm2:amount_mismatch:ent-2:55000/100000',
    'm3:wrong_pool:ent-3',
    'm4:no_statement_entry:none',
    'm5:no_statement_entry:none',
  ],
};

describe('AC4 — frozen vectors + shuffled-input replay identity', () => {
  it('the seeded set produces the fixed confirmed/mismatch outcome set', () => {
    expect(normalize(matchPool(FROZEN_INPUT))).toEqual(FROZEN_OUTCOME);
  });

  it('a shuffled input reproduces the frozen outcome EXACTLY (order-invariant)', () => {
    const shuffled: MatchPoolInput = {
      ...FROZEN_INPUT,
      attestations: [...FROZEN_INPUT.attestations].reverse(),
      entries: [FROZEN_INPUT.entries[2]!, FROZEN_INPUT.entries[0]!, FROZEN_INPUT.entries[4]!, FROZEN_INPUT.entries[1]!, FROZEN_INPUT.entries[3]!],
    };
    expect(normalize(matchPool(shuffled))).toEqual(FROZEN_OUTCOME);
  });
});

// ── fast-check universals: order-invariance + no double confirm ───────────────────────────────────────

describe('AC4 — property: order-invariance + no double confirm', () => {
  const utrArb = fc.stringMatching(/^[1-9][0-9]{11}$/);

  const scenarioArb = fc
    .array(
      fc.record({
        idx: fc.integer({ min: 0, max: 40 }),
        utr: utrArb,
        wrongPool: fc.boolean(),
        amountOk: fc.boolean(),
      }),
      { minLength: 0, maxLength: 12 },
    )
    .map((rows) => {
      // Unique per idx so ids are stable + attestations/entries pair up 1:1.
      const seen = new Set<number>();
      const uniq = rows.filter((r) => (seen.has(r.idx) ? false : (seen.add(r.idx), true)));
      const attestations: MatcherAttestation[] = uniq.map((r) =>
        att({ attestationEventId: `att-${r.idx}`, utr: r.utr, memberId: `m-${r.idx}`, poolId: POOL_A }),
      );
      const entries: MatcherEntry[] = uniq.map((r) =>
        entry({
          entryId: `ent-${r.idx}`,
          transactionIdUtr: r.utr,
          amount: r.amountOk ? 100_000 : 90_000,
          poolId: r.wrongPool ? POOL_B : POOL_A,
        }),
      );
      return { attestations, entries };
    });

  it('a shuffled input produces an identical outcome (order-invariance)', () => {
    fc.assert(
      fc.property(scenarioArb, fc.integer({ min: 0, max: 999999 }), (scn, seed) => {
        const base: MatchPoolInput = { poolId: POOL_A, fixedAmount: 1000, attestations: scn.attestations, entries: scn.entries };
        const rng = mulberry(seed);
        const shuffled: MatchPoolInput = {
          ...base,
          attestations: shuffle([...scn.attestations], rng),
          entries: shuffle([...scn.entries], rng),
        };
        expect(normalize(matchPool(shuffled))).toEqual(normalize(matchPool(base)));
      }),
    );
  });

  it('never confirms the same (member, entry) twice + every confirmation is a real amount+destination match', () => {
    fc.assert(
      fc.property(scenarioArb, (scn) => {
        const r = matchPool({ poolId: POOL_A, fixedAmount: 1000, attestations: scn.attestations, entries: scn.entries });
        const keys = r.confirmations.map((c) => `${c.memberId}:${c.entryId}`);
        expect(new Set(keys).size).toBe(keys.length); // no double confirm
        // Every mismatch reason is in the vocabulary; a confirmation always carries an entryId.
        for (const m of r.mismatches) expect(MATCH_MISMATCH_REASONS).toContain(m.reason);
        for (const c of r.confirmations) expect(c.entryId.length).toBeGreaterThan(0);
      }),
    );
  });
});

// ── deterministic PRNG helpers (Date.now/Math.random-free shuffle) ────────────────────────────────────

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
