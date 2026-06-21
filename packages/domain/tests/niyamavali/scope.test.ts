// assertAffectedMemberScope unit tests — Story 2.3 (Task 9; architecture §1.10).
// Pure (no DB). Asserts the structural guard that "amendments cannot be committed
// without a [well-formed] scope declaration".

import { describe, expect, it } from 'vitest';

import {
  InvalidAffectedMemberScopeError,
  assertAffectedMemberScope,
} from '../../src/niyamavali/scope.js';

describe('assertAffectedMemberScope (architecture §1.10)', () => {
  it('accepts the no-field kinds', () => {
    expect(assertAffectedMemberScope({ kind: 'all_members' })).toEqual({ kind: 'all_members' });
    expect(assertAffectedMemberScope({ kind: 'past_lockin' })).toEqual({ kind: 'past_lockin' });
  });

  it('accepts a well-formed rule_subclause', () => {
    const scope = {
      kind: 'rule_subclause',
      clause_id: 'niy.contribution-discipline.r7-a',
      subclause: 'C',
    };
    expect(assertAffectedMemberScope(scope)).toEqual(scope);
  });

  it('accepts a well-formed named_cohort', () => {
    const scope = { kind: 'named_cohort', definition: 'Patna active 2025' };
    expect(assertAffectedMemberScope(scope)).toEqual(scope);
  });

  it.each([
    ['null', null],
    ['a non-object', 'all_members'],
    ['an unknown kind', { kind: 'everyone' }],
    ['a missing kind', { definition: 'x' }],
    ['rule_subclause with a bad clause_id', { kind: 'rule_subclause', clause_id: 'R7', subclause: 'C' }],
    ['rule_subclause with an empty subclause', { kind: 'rule_subclause', clause_id: 'niy.a.b', subclause: '' }],
    ['named_cohort with an empty definition', { kind: 'named_cohort', definition: '' }],
  ])('throws InvalidAffectedMemberScopeError for %s', (_label, bad) => {
    expect(() => assertAffectedMemberScope(bad)).toThrow(InvalidAffectedMemberScopeError);
  });
});
