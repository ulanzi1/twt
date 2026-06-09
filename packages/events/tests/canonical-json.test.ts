import { describe, expect, it } from 'vitest';
import { canonicalJsonStringify } from '../src/canonical-json';

describe('canonicalJsonStringify', () => {
  it('key-order independence — semantically equal objects produce identical bytes', () => {
    expect(canonicalJsonStringify({ a: 1, b: 2 })).toBe(
      canonicalJsonStringify({ b: 2, a: 1 }),
    );
  });

  it('sorts object keys lexicographically at every nesting level', () => {
    expect(canonicalJsonStringify({ outer: { z: 1, a: 2 } })).toBe(
      '{"outer":{"a":2,"z":1}}',
    );
  });

  it('preserves array order (arrays are ordered, not sorted)', () => {
    expect(canonicalJsonStringify([3, 1, 2])).toBe('[3,1,2]');
  });

  it('escapes strings per RFC 8259 (matches JSON.stringify)', () => {
    const s = 'a"b\\c';
    expect(canonicalJsonStringify(s)).toBe(JSON.stringify(s));
  });

  it('normalizes -0 to 0', () => {
    expect(canonicalJsonStringify(-0)).toBe('0');
    expect(canonicalJsonStringify(0)).toBe('0');
  });

  it('throws on NaN', () => {
    expect(() => canonicalJsonStringify(Number.NaN)).toThrow(TypeError);
  });

  it('throws on Infinity', () => {
    expect(() => canonicalJsonStringify(Number.POSITIVE_INFINITY)).toThrow(
      TypeError,
    );
    expect(() => canonicalJsonStringify(Number.NEGATIVE_INFINITY)).toThrow(
      TypeError,
    );
  });

  it('null + booleans + integers emit the standard JSON literals', () => {
    expect(canonicalJsonStringify(null)).toBe('null');
    expect(canonicalJsonStringify(true)).toBe('true');
    expect(canonicalJsonStringify(false)).toBe('false');
    expect(canonicalJsonStringify(42)).toBe('42');
    expect(canonicalJsonStringify(-7)).toBe('-7');
  });

  it('round-trips: JSON.parse(canonicalize(x)) is deeply equal to x for representable values', () => {
    const obj = {
      string: 'hello',
      integer: 42,
      negative: -7,
      bool: true,
      nullish: null,
      nested: { z: [1, 2, 3], a: { deep: 'value' } },
    };
    expect(JSON.parse(canonicalJsonStringify(obj))).toEqual(obj);
  });

  it('cross-key-order: deeply nested object produces stable bytes regardless of insertion order', () => {
    const a = { outer: { z: { y: 1, x: 2 }, a: { d: 3, c: 4 } } };
    const b = { outer: { a: { c: 4, d: 3 }, z: { x: 2, y: 1 } } };
    expect(canonicalJsonStringify(a)).toBe(canonicalJsonStringify(b));
  });
});
