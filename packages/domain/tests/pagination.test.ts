import { describe, expect, it } from 'vitest';

import { clampLimit } from '../src/pagination.js';

describe('clampLimit — family-(a) forced-pagination invariant', () => {
  const opts = { default: 50, cap: 200 };

  it('defaults when limit is undefined', () => {
    expect(clampLimit(undefined, opts)).toBe(50);
  });

  it('passes a normal in-range limit through unchanged', () => {
    expect(clampLimit(75, opts)).toBe(75);
  });

  it('caps an over-cap limit at the ceiling', () => {
    expect(clampLimit(500, opts)).toBe(200);
    expect(clampLimit(201, opts)).toBe(200);
  });

  it('clamps a NEGATIVE limit to 1 — NOT a Postgres LIMIT -1 bypass (the 2.7 P2 class)', () => {
    expect(clampLimit(-1, opts)).toBe(1);
    expect(clampLimit(-9999, opts)).toBe(1);
  });

  it('clamps zero to 1', () => {
    expect(clampLimit(0, opts)).toBe(1);
  });

  it('honours the exact cap, default, and lower boundaries', () => {
    expect(clampLimit(200, opts)).toBe(200);
    expect(clampLimit(1, opts)).toBe(1);
    expect(clampLimit(undefined, { default: 30, cap: 200 })).toBe(30);
  });
});
