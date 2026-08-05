// TRUSTEE_LITE_R7_CLAUSE_IDS lockstep — Story 10.11 (Task 1; AC4).
//
// Story 10.11's `deriveViolatorFlags` filters the Story 4.6 validity payload's applied clauses down to
// the R7 family. The CANONICAL R7 clause-id list is `R7_CLAUSE_IDS` here in the engine — but
// `@twt/domain` CANNOT import it: the engine DEPENDS ON domain, so a domain → engine import is a
// turbo/package cycle (`packages/domain/src/claim/concealment-review.ts:10-13` documents the identical
// constraint for `evaluateConcealmentAt`).
//
// The resolution is the shipped Story 6.14 one (`claim/r9-voting.ts:47-49`): domain re-declares the
// list, and the PIN lives in this package, which CAN import `@twt/domain`. A new or removed R7
// sub-clause fails HERE until the domain copy is updated in lockstep — so the re-declaration is
// mechanized, not a hand-maintained copy hoping to stay honest.

import { trusteeLite } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { R7_CLAUSE_IDS } from '../src/r7-ladder.js';

describe('TRUSTEE_LITE_R7_CLAUSE_IDS ↔ the engine R7_CLAUSE_IDS', () => {
  it('the domain re-declaration is element-for-element identical to the engine truth', () => {
    expect([...trusteeLite.TRUSTEE_LITE_R7_CLAUSE_IDS]).toEqual([...R7_CLAUSE_IDS]);
  });

  it('every engine R7 clause id is recognized by the domain predicate', () => {
    for (const clauseId of R7_CLAUSE_IDS) {
      expect(trusteeLite.isR7ClauseId(clauseId), clauseId).toBe(true);
    }
  });

  it('the predicate fails closed on a non-R7 clause id', () => {
    for (const clauseId of ['niy.special-death.r9', 'niy.ninety-percent-rule.r8-a', '', 'r7-a']) {
      expect(trusteeLite.isR7ClauseId(clauseId), clauseId).toBe(false);
    }
  });
});
