// Story 6.28 (OP1, AC1) — the pure half of "one payment per death". DB-free.
//   · the three state lists, copied BY VALUE into the leaf (NW1's fence — Trap 12), pinned for EVERY state against
//     `CLAIM_TERMINAL_STATES` and each other.
//   · the fragments refuse a non-identifier alias (they splice it raw).

import { describe, expect, it } from 'vitest';

import {
  FINALLY_APPROVED_CLAIM_STATES,
  OPEN_EXCLUDED_TERMINAL_STATES,
  PAYMENT_COMMITTED_CLAIM_STATES,
  otherClaimInStatesSql,
  otherOpenClaimForDeathExistsSql,
  otherOpenClaimsForDeathSql,
} from '../../src/claim/one-payment-per-death.js';
import { CLAIM_TERMINAL_STATES } from '../../src/claim/read.js';
import { CLAIM_LIFECYCLE_STATES } from '../../src/claim/state.js';

const has = (list: readonly string[], s: string) => list.includes(s);

describe('Story 6.28 OP1 — the state lists, pinned for EVERY state', () => {
  for (const state of CLAIM_LIFECYCLE_STATES) {
    it(`${state}: finally approved ⇔ payment committed ∨ state_trustee_approved; terminal ⇔ CLAIM_TERMINAL_STATES`, () => {
      expect(has(FINALLY_APPROVED_CLAIM_STATES, state)).toBe(
        has(PAYMENT_COMMITTED_CLAIM_STATES, state) || state === 'state_trustee_approved',
      );
      expect(has(OPEN_EXCLUDED_TERMINAL_STATES, state)).toBe(has(CLAIM_TERMINAL_STATES, state));
    });
  }

  it('every listed literal IS a lifecycle state (a typo would silently match nothing in SQL)', () => {
    for (const s of [...FINALLY_APPROVED_CLAIM_STATES, ...PAYMENT_COMMITTED_CLAIM_STATES, ...OPEN_EXCLUDED_TERMINAL_STATES]) {
      expect(CLAIM_LIFECYCLE_STATES as readonly string[]).toContain(s);
    }
  });
});

describe('Story 6.28 OP1 — the fragments splice only a bare identifier', () => {
  for (const bad of ['claims; DROP TABLE claims', '"claims"', 'c.x', '']) {
    it(`refuses alias ${JSON.stringify(bad)}`, () => {
      expect(() => otherClaimInStatesSql(bad, FINALLY_APPROVED_CLAIM_STATES)).toThrow(/invalid claim alias/);
      expect(() => otherOpenClaimsForDeathSql(bad)).toThrow(/invalid claim alias/);
      expect(() => otherOpenClaimForDeathExistsSql(bad)).toThrow(/invalid claim alias/);
    });
  }

  it('refuses an empty or non-literal state list', () => {
    expect(() => otherClaimInStatesSql('claims', [])).toThrow(/empty state list/);
    expect(() => otherClaimInStatesSql('claims', ["approved') OR ('1"])).toThrow(/invalid state literal/);
  });
});
