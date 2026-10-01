// The admin directory's bound — Story 6.19b (fourth-pass review). The `.limit(...)` literal must stay an integer
// literal (the domain-invariants gate), so it cannot name `ADMIN_DIRECTORY_LIMIT`; this pins the two together — a
// change to either alone fails here (the `truncated` comparison is pinned by its type in the source).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ADMIN_DIRECTORY_LIMIT } from '../../src/claim/admin-directory.js';

const SOURCE = readFileSync(fileURLToPath(new URL('../../src/claim/admin-directory.ts', import.meta.url)), 'utf8');

describe('admin directory bound', () => {
  it('every `.limit(N)` literal in the accessor IS `ADMIN_DIRECTORY_LIMIT`', () => {
    const literals = [...SOURCE.matchAll(/\.limit\((\d+)\)/g)].map((m) => Number(m[1]));
    expect(literals.length).toBeGreaterThan(0);
    expect(new Set(literals)).toEqual(new Set([ADMIN_DIRECTORY_LIMIT]));
  });

  it('`truncated` compares against a bound typed `typeof ADMIN_DIRECTORY_LIMIT`', () => {
    expect(SOURCE).toMatch(/const BOUND: typeof ADMIN_DIRECTORY_LIMIT = (\d+);/);
    expect(Number(/const BOUND: typeof ADMIN_DIRECTORY_LIMIT = (\d+);/.exec(SOURCE)![1])).toBe(ADMIN_DIRECTORY_LIMIT);
    expect(SOURCE).toMatch(/truncated: rows\.length >= BOUND/);
  });
});
