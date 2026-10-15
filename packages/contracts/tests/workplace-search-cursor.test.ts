// Story 6.36a (review 2026-10-15, R2-10) — the server mints the search cursor as base64url(JSON([name, workplace_id])). The
// contract's `cursor` bound must admit the WORST case the server can produce: a name at the column's 200-code-point CHECK made
// of astral characters (4 UTF-8 bytes each) plus a UUID — otherwise the next page fails `request.validation` and a member can
// never page past that row. (UDISE names are ASCII upper-case; a staff-added name — 6.36c — need not be.)

import { describe, expect, it } from 'vitest';

import { WORKPLACE_SEARCH_CURSOR_MAX, WorkplaceSearchQuery } from '../src/members/workplace.js';

/** The domain's `encodeCursor` shape (packages/domain/src/member/workplace.ts) — base64url of a JSON array. */
function encodeCursor(parts: readonly string[]): string {
  return Buffer.from(JSON.stringify(parts), 'utf8').toString('base64url');
}

describe('the search cursor bound admits the worst case the server can mint', () => {
  it('a 200-code-point astral name + a UUID fits, and the query accepts it', () => {
    const name = '𝔊'.repeat(200); // U+1D50A — 4 bytes each, ⛔ escaped by JSON.stringify
    const cursor = encodeCursor([name, '0192f0c1-2b3c-7d4e-8f5a-6b7c8d9e0f1a']);
    expect(cursor.length).toBeLessThanOrEqual(WORKPLACE_SEARCH_CURSOR_MAX);
    const parsed = WorkplaceSearchQuery.safeParse({ district: 'Patna', kind: 'school', cursor });
    expect(parsed.success).toBe(true);
  });

  it('a name of JSON-escaped characters (quotes, backslashes) fits too', () => {
    const name = '"\\'.repeat(100); // 200 code points, each escaped to two
    const cursor = encodeCursor([name, '0192f0c1-2b3c-7d4e-8f5a-6b7c8d9e0f1a']);
    expect(cursor.length).toBeLessThanOrEqual(WORKPLACE_SEARCH_CURSOR_MAX);
  });

  it('the TRUE worst case — 200 C0 controls, six bytes each once JSON-escaped — fits (the import refuses them; a staff name must too)', () => {
    const name = '\u0001'.repeat(200);
    const cursor = encodeCursor([name, '0192f0c1-2b3c-7d4e-8f5a-6b7c8d9e0f1a']);
    expect(cursor.length).toBeGreaterThan(1500); // the bound the review first picked was ⛔ enough
    expect(cursor.length).toBeLessThanOrEqual(WORKPLACE_SEARCH_CURSOR_MAX);
  });
});
