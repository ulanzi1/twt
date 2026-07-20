import { describe, expect, it } from 'vitest';

import { isAllowlistedWrite, scanAlertStateWrites } from './lib.js';

/** Wrap a statement inside a function body so AST positions are stable. */
const wrap = (body: string): string =>
  `import { alerts } from '../schema/alerts.js';\n` +
  `export function q(db: any) {\n` +
  `  ${body}\n` +
  `}\n`;

describe('scanAlertStateWrites — alert-state-invariant gate teeth', () => {
  it('FLAGS .update(alerts).set({ currentState })', () => {
    const f = scanAlertStateWrites('f.ts', wrap("return db.update(alerts).set({ currentState: 'live' });"));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/update\(alerts\)\.set/);
  });

  it('FLAGS .update(alerts).set({ currentState, ... }) among other columns', () => {
    const f = scanAlertStateWrites(
      'f.ts',
      wrap("return db.update(alerts).set({ currentState: 'published', stateEventVersion: 3 }).where(x);"),
    );
    expect(f).toHaveLength(1);
  });

  it('FLAGS .insert(alerts)…onConflictDoUpdate({ set: { currentState } }) (the projector pattern)', () => {
    const f = scanAlertStateWrites(
      'f.ts',
      wrap(
        "return db.insert(alerts).values(v).onConflictDoUpdate({ target: alerts.alertId, set: { currentState: s, updatedAt: now } });",
      ),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/onConflictDoUpdate/);
  });

  it('FLAGS a direct alerts.currentState = … assignment', () => {
    const f = scanAlertStateWrites('f.ts', wrap('alerts.currentState = nextState;'));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/direct assignment/);
  });

  it('FLAGS .update(alerts).set({ stateEventVersion }) — the cache pair travels together', () => {
    const f = scanAlertStateWrites('f.ts', wrap('return db.update(alerts).set({ stateEventVersion: 4 });'));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/update\(alerts\)\.set/);
  });

  it('PASSES .update(pools).set({ currentState }) — different table', () => {
    expect(
      scanAlertStateWrites('f.ts', wrap("return db.update(pools).set({ currentState: 'settled' });")),
    ).toHaveLength(0);
  });

  it('PASSES a SELECT of alerts.currentState (read, not write)', () => {
    expect(
      scanAlertStateWrites('f.ts', wrap('return db.select({ s: alerts.currentState }).from(alerts);')),
    ).toHaveLength(0);
  });

  it('does NOT match a `.set({ currentState })` substring inside a comment or string literal', () => {
    const src =
      `// prose: db.update(alerts).set({ currentState: 'x' })\n` +
      `const s = "db.update(alerts).set({ currentState: 'x' })";\n`;
    expect(scanAlertStateWrites('f.ts', src)).toHaveLength(0);
  });

  it('reports the correct file + 1-based line', () => {
    const f = scanAlertStateWrites(
      'packages/domain/src/x/write.ts',
      wrap("return db.update(alerts).set({ currentState: 'live' });"),
    );
    expect(f[0]!.file).toBe('packages/domain/src/x/write.ts');
    expect(f[0]!.line).toBe(3);
  });

  it('FLAGS a BARE .insert(alerts).values({ currentState }) with no further chaining', () => {
    const f = scanAlertStateWrites(
      'f.ts',
      wrap("return db.insert(alerts).values({ currentState: 'frozen' });"),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/INSERT \(create-time\) write/);
  });

  it('FLAGS a namespaced `schema.alerts` update — not just the bare `alerts` identifier', () => {
    const src =
      `import * as schema from '../schema/index.js';\n` +
      `export function q(db: any) {\n` +
      `  return db.update(schema.alerts).set({ currentState: 'published' });\n` +
      `}\n`;
    expect(scanAlertStateWrites('f.ts', src)).toHaveLength(1);
  });

  it('FLAGS a namespaced `schema.alerts` direct assignment', () => {
    const src =
      `import * as schema from '../schema/index.js';\n` +
      `export function q() {\n` +
      `  schema.alerts.currentState = 'published';\n` +
      `}\n`;
    const f = scanAlertStateWrites('f.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/direct assignment/);
  });

  it("FLAGS a computed-property-key state write: { ['currentState']: value }", () => {
    const f = scanAlertStateWrites(
      'f.ts',
      wrap("return db.update(alerts).set({ ['currentState']: 'published' });"),
    );
    expect(f).toHaveLength(1);
  });

  it('PASSES a namespaced `schema.pools` update — different table, still no false positive', () => {
    const src =
      `import * as schema from '../schema/index.js';\n` +
      `export function q(db: any) {\n` +
      `  return db.update(schema.pools).set({ currentState: 'closed' });\n` +
      `}\n`;
    expect(scanAlertStateWrites('f.ts', src)).toHaveLength(0);
  });

  it('FLAGS a BARE .insert(alerts).values({ stateEventVersion }) — the cache pair travels together', () => {
    const f = scanAlertStateWrites('f.ts', wrap("return db.insert(alerts).values({ stateEventVersion: 1 });"));
    expect(f).toHaveLength(1);
  });

  it('PASSES a BARE .insert(alerts).values({...}) that touches neither guarded column', () => {
    const f = scanAlertStateWrites('f.ts', wrap("return db.insert(alerts).values({ poolCount: 1 });"));
    expect(f).toHaveLength(0);
  });

  it('FLAGS the bulk/array form .insert(alerts).values([{ currentState }, ...])', () => {
    const f = scanAlertStateWrites(
      'f.ts',
      wrap("return db.insert(alerts).values([{ poolCount: 0 }, { currentState: 'frozen' }]);"),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/INSERT \(create-time\) write/);
  });

  it('PASSES a bulk/array .values([...]) where no element touches a guarded column', () => {
    const f = scanAlertStateWrites(
      'f.ts',
      wrap('return db.insert(alerts).values([{ poolCount: 0 }, { poolCount: 1 }]);'),
    );
    expect(f).toHaveLength(0);
  });

  it('records the enclosing named function for a flagged write', () => {
    const f = scanAlertStateWrites(
      'f.ts',
      wrap("return db.update(alerts).set({ currentState: 'live' });"),
    );
    expect(f[0]!.enclosingFunction).toBe('q');
  });

  it('records enclosingFunction for an arrow function assigned to a const', () => {
    const src =
      `import { alerts } from '../schema/alerts.js';\n` +
      `export const q = (db: any) => {\n` +
      `  return db.update(alerts).set({ currentState: 'live' });\n` +
      `};\n`;
    const f = scanAlertStateWrites('f.ts', src);
    expect(f[0]!.enclosingFunction).toBe('q');
  });
});

describe('isAllowlistedWrite — function-scoped allowlist (not whole-file)', () => {
  const allowlist = [{ file: 'packages/domain/src/alert/project.ts', functions: new Set(['projectAlertState']) }];

  it('allows a write inside the allowlisted function of the allowlisted file', () => {
    expect(
      isAllowlistedWrite(
        { file: 'packages/domain/src/alert/project.ts', enclosingFunction: 'projectAlertState' },
        allowlist,
      ),
    ).toBe(true);
  });

  it('flags a write in the SAME file but a DIFFERENT function — no whole-file amnesty', () => {
    expect(
      isAllowlistedWrite(
        { file: 'packages/domain/src/alert/project.ts', enclosingFunction: 'mintAndOpenAlert' },
        allowlist,
      ),
    ).toBe(false);
  });

  it('flags a write with no enclosing function (module scope) even in the allowlisted file', () => {
    expect(
      isAllowlistedWrite({ file: 'packages/domain/src/alert/project.ts', enclosingFunction: undefined }, allowlist),
    ).toBe(false);
  });

  it('flags a write in a different file entirely', () => {
    expect(
      isAllowlistedWrite(
        { file: 'packages/domain/src/alert/other.ts', enclosingFunction: 'projectAlertState' },
        allowlist,
      ),
    ).toBe(false);
  });
});
