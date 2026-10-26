// Story 6.36f (Task 2.2; MK3, `2026-10-26-407`) — the links read takes the marks-only BASIS (`ranks`) FIRST, then the live marks,
// in ONE READ COMMITTED transaction. A save that commits between the two reads then leaves `ranks` stale, and the marks-only save
// is refused `marks_stale` — so a mark added between the reads can ⛔ be removed unseen. Reversed, a FRESH `ranks` could sit beside
// STALE `links`. Two connections cannot pause the handler between its two statements, so the ORDER is pinned by source: the
// `links()` handler's body must call `getProjectedNomineeVersions` before `listNomineeLinksForDeclarer`, both inside one `inScope`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(fileURLToPath(new URL('../../src/modules/nominee-links/handlers.ts', import.meta.url)), 'utf8');

/** The `links(request)` handler's body: from its signature to the next handler's doc comment. */
function linksBody(src: string): string {
  const start = src.indexOf('async links(request: FastifyRequest)');
  expect(start, 'the links() handler').toBeGreaterThan(-1);
  const end = src.indexOf('async requests(request: FastifyRequest)', start);
  expect(end, 'the requests() handler after it').toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('Story 6.36f — the links read: the basis FIRST, then the marks, in ONE transaction (MK3)', () => {
  it('`getProjectedNomineeVersions` precedes `listNomineeLinksForDeclarer`, each called ONCE', () => {
    const body = linksBody(SOURCE);
    const basis = body.indexOf('nomineeDomain.getProjectedNomineeVersions(');
    const marks = body.indexOf('nomineeDomain.listNomineeLinksForDeclarer(');
    expect(basis).toBeGreaterThan(-1);
    expect(marks).toBeGreaterThan(basis);
    expect(body.split('nomineeDomain.getProjectedNomineeVersions(').length).toBe(2);
    expect(body.split('nomineeDomain.listNomineeLinksForDeclarer(').length).toBe(2);
  });

  it('both reads sit inside the SAME `inScope(…)` callback (one transaction — a read outside it would also lose the RLS scope)', () => {
    const body = linksBody(SOURCE);
    const scope = body.indexOf('await inScope(pariwarId, async (tx) => {');
    expect(scope).toBeGreaterThan(-1);
    expect(body.split('inScope(').length).toBe(2); // ONE transaction in the handler
    const close = body.indexOf('});', scope);
    for (const call of ['nomineeDomain.getProjectedNomineeVersions(tx,', 'nomineeDomain.listNomineeLinksForDeclarer(tx,']) {
      const at = body.indexOf(call);
      expect(at, call).toBeGreaterThan(scope);
      expect(at, call).toBeLessThan(close);
    }
  });
});
