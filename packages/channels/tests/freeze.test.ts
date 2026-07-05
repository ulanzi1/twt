// Deep-freeze immutability guard tests — Story 5.1 (Task 4; AC4).
//
// Asserts the runtime layer of the immutability-after-dispatch invariant: `deepFreeze` recursively freezes
// nested objects/arrays, and a strict-mode assignment to any frozen field THROWS a TypeError that
// `isFrozenMutationError` recognizes (the P0-violation signal the dispatcher acts on). ES modules are
// always strict mode, so the throw is guaranteed.

import { describe, expect, it } from 'vitest';

import { deepFreeze, isFrozenMutationError } from '../src/freeze.js';

describe('deepFreeze (AC4 runtime layer)', () => {
  it('freezes the top level and all nested objects/arrays', () => {
    const value = deepFreeze({ a: 1, nested: { b: 2 }, list: [{ c: 3 }] });
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.nested)).toBe(true);
    expect(Object.isFrozen(value.list)).toBe(true);
    expect(Object.isFrozen(value.list[0])).toBe(true);
  });

  it('throws on a top-level field assignment (strict mode)', () => {
    const frozen = deepFreeze({ alert_category: 'alert_published' }) as { alert_category: string };
    let caught: unknown;
    try {
      frozen.alert_category = 'niyamavali_amended';
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TypeError);
    expect(isFrozenMutationError(caught)).toBe(true);
  });

  it('throws on a NESTED field assignment (deep freeze)', () => {
    const frozen = deepFreeze({ payload_data: { title: 'x' } }) as { payload_data: { title: string } };
    let caught: unknown;
    try {
      frozen.payload_data.title = 'mutated';
    } catch (err) {
      caught = err;
    }
    expect(isFrozenMutationError(caught)).toBe(true);
  });

  it('throws on adding a new property (not extensible)', () => {
    const frozen = deepFreeze({}) as Record<string, unknown>;
    let caught: unknown;
    try {
      frozen.injected = true;
    } catch (err) {
      caught = err;
    }
    expect(isFrozenMutationError(caught)).toBe(true);
  });

  it('isFrozenMutationError is false for unrelated errors', () => {
    expect(isFrozenMutationError(new Error('boom'))).toBe(false);
    expect(isFrozenMutationError(new TypeError('undefined is not a function'))).toBe(false);
  });

  it('is idempotent + returns primitives/null unchanged', () => {
    expect(deepFreeze(null)).toBeNull();
    expect(deepFreeze(42)).toBe(42);
    const once = deepFreeze({ x: 1 });
    expect(deepFreeze(once)).toBe(once);
  });

  it('descends through a SHALLOW-frozen root (the review-found AC4 bypass)', () => {
    // A caller that did Object.freeze(alert) hands over a frozen top level with mutable children —
    // deepFreeze must still freeze the children, not skip on the frozen root.
    const shallow = Object.freeze({ payload_data: { title: 'x' } });
    const frozen = deepFreeze(shallow) as { payload_data: { title: string } };
    expect(Object.isFrozen(frozen.payload_data)).toBe(true);
    let caught: unknown;
    try {
      frozen.payload_data.title = 'mutated';
    } catch (err) {
      caught = err;
    }
    expect(isFrozenMutationError(caught)).toBe(true);
  });

  it('handles cyclic structures without infinite recursion', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    const frozen = deepFreeze(a);
    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it("classifies `delete` on a frozen object as a mutation (P0 signal)", () => {
    const frozen = deepFreeze({ payload_data: { title: 'x' } }) as { payload_data?: { title: string } };
    let caught: unknown;
    try {
      delete frozen.payload_data;
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TypeError);
    expect(isFrozenMutationError(caught)).toBe(true);
  });

  it('classifies Object.defineProperty on a frozen object as a mutation (P0 signal)', () => {
    const frozen = deepFreeze({ x: 1 });
    let caught: unknown;
    try {
      Object.defineProperty(frozen, 'x', { value: 2 });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TypeError);
    expect(isFrozenMutationError(caught)).toBe(true);
  });
});
