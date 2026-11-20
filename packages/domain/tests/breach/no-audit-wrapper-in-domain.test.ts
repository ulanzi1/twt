// Story 14.3 (decision `2026-11-20-467` DL10; AC13) — ⛔ file under `packages/domain/src/breach/` calls
// `withCompensatingAudit`: audit pairing is the CALLER's (the data-protection handlers — 12.1 QE15's rule). Cloned from
// `tests/field-worker/no-audit-wrapper-in-domain.test.ts` (the same predicate and its teeth).

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const BREACH_SRC = join(dirname(fileURLToPath(import.meta.url)), '../../src/breach');

/** Strip `/* … *\/` block comments and `//` line comments (a URL's `//` inside a string is not in these files' code). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * A call in any shape: the name followed by a call `(`, a type-argument list `<` (any nesting — `<Result<X>>`, `<() => R>`),
 * an optional call `?.(` or `.call` / `.apply` (12.2 code review round 2, RP40 and its patch-diff review). An import, a
 * `typeof` or a longer identifier is not a call. An alias (`const { withCompensatingAudit: w } = audit`) and a subdirectory
 * stay out of scope, as round 1 recorded — the access-wrapper AST gate is the structural one.
 */
const AUDIT_WRAPPER_CALL = /\bwithCompensatingAudit\b\s*(?:\(|<|\?\.|\.(?:call|apply)\b)/;

function callsAuditWrapper(source: string): boolean {
  return AUDIT_WRAPPER_CALL.test(stripComments(source));
}

describe('Story 14.3 DL10 — no audit wrapper in the breach domain', () => {
  const files = readdirSync(BREACH_SRC).filter((f) => f.endsWith('.ts'));

  it('scans a non-empty set that includes every breach file', () => {
    expect(files).toEqual(expect.arrayContaining(['incidents.ts', 'rules.ts', 'index.ts']));
  });

  it('⛔ breach source file calls withCompensatingAudit( outside a comment', () => {
    const offenders = files.filter((f) => callsAuditWrapper(readFileSync(join(BREACH_SRC, f), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('teeth: the predicate fires on a call outside a comment, and not on one inside a comment', () => {
    expect(callsAuditWrapper('await audit.withCompensatingAudit(pool, { auditIntent, mutate });')).toBe(true);
    expect(callsAuditWrapper('// calls `audit.withCompensatingAudit(servicePool, …)`\nconst x = 1;')).toBe(false);
    expect(callsAuditWrapper('/* withCompensatingAudit(pool) */ const y = 2;')).toBe(false);
    expect(callsAuditWrapper('/**\n * withCompensatingAudit(pool)\n */\nexport const z = withCompensatingAudit(p, o);')).toBe(true);
    // RP40: the generic and spaced call forms are calls too.
    expect(callsAuditWrapper('await audit.withCompensatingAudit<Result>(pool, { auditIntent, mutate });')).toBe(true);
    expect(callsAuditWrapper('await audit.withCompensatingAudit (pool, o);')).toBe(true);
    expect(callsAuditWrapper('await audit.withCompensatingAudit<Result<Row>>(pool, o);')).toBe(true);
    expect(callsAuditWrapper('await audit.withCompensatingAudit<() => Promise<void>>(pool, o);')).toBe(true);
    expect(callsAuditWrapper('await audit.withCompensatingAudit?.(pool, o);')).toBe(true);
    expect(callsAuditWrapper('await audit.withCompensatingAudit.call(audit, pool, o);')).toBe(true);
    expect(callsAuditWrapper('const withCompensatingAuditCount = 1;')).toBe(false);
    expect(callsAuditWrapper("import { withCompensatingAudit } from '../audit.js';")).toBe(false);
    expect(callsAuditWrapper('type W = typeof withCompensatingAudit;')).toBe(false);
  });
});
