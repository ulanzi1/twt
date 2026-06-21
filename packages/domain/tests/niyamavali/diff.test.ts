// computePayloadDiff unit tests — Story 2.3 (Task 9, AC4). Pure (no DB).
//
// Asserts the structured key-path diff: added / removed / changed paths, nested
// recursion, array-as-leaf, and DETERMINISM (stable output regardless of input
// key insertion order — the canonicalJsonStringify ordering guarantee).

import { describe, expect, it } from 'vitest';

import { computePayloadDiff } from '../../src/niyamavali/diff.js';

describe('computePayloadDiff (AC4)', () => {
  it('reports added / removed / changed leaf paths', () => {
    const diff = computePayloadDiff(
      { a: 1, b: 2, gone: 'x' },
      { a: 1, b: 3, added: 'y' },
    );
    expect(diff.added).toEqual({ added: 'y' });
    expect(diff.removed).toEqual({ gone: 'x' });
    expect(diff.changed).toEqual({ b: { from: 2, to: 3 } });
  });

  it('recurses into nested objects with dot-path keys', () => {
    const diff = computePayloadDiff(
      { rule: { threshold: 90, window_days: 30 } },
      { rule: { threshold: 95, window_days: 30 } },
    );
    expect(diff.changed).toEqual({ 'rule.threshold': { from: 90, to: 95 } });
    expect(diff.added).toEqual({});
    expect(diff.removed).toEqual({});
  });

  it('treats arrays as leaf values (compared by canonical JSON)', () => {
    const same = computePayloadDiff({ tags: ['a', 'b'] }, { tags: ['a', 'b'] });
    expect(same.changed).toEqual({});
    const changed = computePayloadDiff({ tags: ['a', 'b'] }, { tags: ['a', 'c'] });
    expect(changed.changed).toEqual({ tags: { from: ['a', 'b'], to: ['a', 'c'] } });
  });

  it('an identical payload yields an empty diff', () => {
    const diff = computePayloadDiff({ a: 1, nested: { x: 2 } }, { a: 1, nested: { x: 2 } });
    expect(diff).toEqual({ added: {}, removed: {}, changed: {} });
  });

  it('is DETERMINISTIC: input key order does not change the diff', () => {
    const d1 = computePayloadDiff({ a: 1, b: 2 }, { b: 9, a: 1, c: 3 });
    const d2 = computePayloadDiff({ b: 2, a: 1 }, { c: 3, a: 1, b: 9 });
    expect(JSON.stringify(d1)).toBe(JSON.stringify(d2));
  });

  it('treats a nested-object value reordering as NO change (canonical equality)', () => {
    const diff = computePayloadDiff(
      { meta: { x: 1, y: 2 } },
      { meta: { y: 2, x: 1 } },
    );
    expect(diff.changed).toEqual({});
  });

  it('P9: literal-dot key vs nested key — no path collision (dot escaped as \\. in segment)', () => {
    // prev has literal-dot key 'a.b' → escaped path 'a\\.b', value 1 (removed)
    // next has nested key 'a' (object {b:1}) → path 'a', value {b:1} (added as subtree)
    // Paths 'a\\.b' and 'a' are distinct; no collision.
    const diff = computePayloadDiff(
      { 'a.b': 1 },
      { a: { b: 1 } },
    );
    expect(diff.removed).toEqual({ 'a\\.b': 1 });
    expect(diff.added).toEqual({ a: { b: 1 } });
    expect(diff.changed).toEqual({});
  });

  it('P9: literal-dot key in same payload as nested path — changed entry uses escaped path', () => {
    // Both payloads have literal-dot key 'a.b'; prev=1, next=2.
    // Path 'a\\.b' carries the change, unambiguous from any nested 'a.b' path.
    const diff = computePayloadDiff({ 'a.b': 1 }, { 'a.b': 2 });
    expect(diff.changed).toEqual({ 'a\\.b': { from: 1, to: 2 } });
    expect(diff.added).toEqual({});
    expect(diff.removed).toEqual({});
  });

  it('P10: object → null transition is a single changed entry, not a split added/removed', () => {
    const diff = computePayloadDiff(
      { a: { x: 1 } },
      { a: null },
    );
    expect(diff.changed).toEqual({ a: { from: { x: 1 }, to: null } });
    expect(diff.added).toEqual({});
    expect(diff.removed).toEqual({});
  });

  it('P10: null → object transition is a single changed entry', () => {
    const diff = computePayloadDiff(
      { a: null },
      { a: { x: 1 } },
    );
    expect(diff.changed).toEqual({ a: { from: null, to: { x: 1 } } });
    expect(diff.added).toEqual({});
    expect(diff.removed).toEqual({});
  });

  it('P10: object → scalar transition is a single changed entry', () => {
    const diff = computePayloadDiff(
      { rule: { threshold: 90 } },
      { rule: 'disabled' },
    );
    expect(diff.changed).toEqual({ rule: { from: { threshold: 90 }, to: 'disabled' } });
    expect(diff.added).toEqual({});
    expect(diff.removed).toEqual({});
  });
});
