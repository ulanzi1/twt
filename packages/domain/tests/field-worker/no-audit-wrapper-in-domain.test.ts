// Story 13.1 (QE14; AC5) — ⛔ file under `packages/domain/src/field-worker/` calls
// `withCompensatingAudit`: audit pairing is the CALLER's (the registration route — 12.1 QE15's rule). Cloned from
// `tests/marketplace/no-audit-wrapper-in-domain.test.ts` (the same predicate and its teeth).

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const FIELD_WORKER_SRC = join(dirname(fileURLToPath(import.meta.url)), '../../src/field-worker');

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

describe('QE14 — no audit wrapper in the field-worker domain', () => {
  const files = readdirSync(FIELD_WORKER_SRC).filter((f) => f.endsWith('.ts'));

  it('scans a non-empty set that includes every 13.1 file', () => {
    expect(files).toEqual(expect.arrayContaining(['commands.ts', 'project.ts', 'read.ts', 'state.ts', 'events.ts', 'errors.ts', 'index.ts']));
  });

  it('⛔ field-worker source file calls withCompensatingAudit( outside a comment', () => {
    const offenders = files.filter((f) => callsAuditWrapper(readFileSync(join(FIELD_WORKER_SRC, f), 'utf8')));
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
