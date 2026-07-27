// AC5 teeth — facilitate-recovery is OUTCOME-INERT (Story 9.8; the Story 7.6 no-silent-remap invariant).
//
// facilitate-recovery must be STRUCTURALLY incapable of changing a reconciliation outcome: it writes NO
// event, opens NO scope-tx, and calls NO append/remap/reassign primitive — only an attributed audit line.
// This is the executable half of AC5 (the pool-bound-payment CI gate is the other half). A source scan
// over the postRecover handler body proves the absence of any outcome-write path; a green scan over a body
// that ALSO reaches an append would be a false pass, so the test first proves the OTHER handlers DO append
// (the scan is live, not vacuous).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const handlersPath = path.resolve(here, '../../src/modules/reconciliation-review/handlers.ts');
const source = readFileSync(handlersPath, 'utf8');

/** Extract a handler function body by brace-balancing from its `async NAME(...) { ... }` opening brace —
 *  robust to reformatting/reordering (a `\n    async ` next-marker heuristic breaks under either). */
function handlerBody(name: string): string {
  const marker = `async ${name}(`;
  const start = source.indexOf(marker);
  expect(start, `handler ${name} not found`).toBeGreaterThanOrEqual(0);
  const braceStart = source.indexOf('{', start + marker.length);
  expect(braceStart, `handler ${name} has no body`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  throw new Error(`handler ${name} body brace never closed`);
}

const OUTCOME_WRITE_TOKENS = [
  'openScopeTx',
  'appendConfirmedContribution',
  'appendReconciliationReject',
  'appendConfirmationReversed',
];

describe('AC5 — facilitate-recovery is outcome-inert (Story 7.6 invariant)', () => {
  it('postRecover writes NO event: no scope-tx, no append/remap primitive in its body', () => {
    const body = handlerBody('postRecover');
    for (const token of OUTCOME_WRITE_TOKENS) {
      expect(body, `postRecover must not reach ${token} — it is outcome-inert (AC5)`).not.toContain(token);
    }
    // It DOES audit (the attributed action line) — its whole job.
    expect(body).toContain('admin_reconciliation.recovery_facilitated');
  });

  it('the scan is live — the confirm/reject/reverse handlers DO reach an outcome-write primitive', () => {
    expect(handlerBody('postConfirm')).toContain('appendConfirmedContribution');
    expect(handlerBody('postReject')).toContain('appendReconciliationReject');
    expect(handlerBody('postReverse')).toContain('appendConfirmationReversed');
  });
});
