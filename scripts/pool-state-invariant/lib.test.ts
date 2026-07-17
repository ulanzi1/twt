import { describe, expect, it } from 'vitest';

import { isAllowlistedWrite, scanPoolStateWrites } from './lib.js';

/** Wrap a statement inside a function body so AST positions are stable. */
const wrap = (body: string): string =>
  `import { pools } from '../schema/pools.js';\n` +
  `export function q(db: any) {\n` +
  `  ${body}\n` +
  `}\n`;

describe('scanPoolStateWrites — pool-state-invariant gate teeth', () => {
  it('FLAGS .update(pools).set({ currentState })', () => {
    const f = scanPoolStateWrites('f.ts', wrap("return db.update(pools).set({ currentState: 'settled' });"));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/update\(pools\)\.set/);
  });

  it('FLAGS .update(pools).set({ currentState, ... }) among other columns', () => {
    const f = scanPoolStateWrites(
      'f.ts',
      wrap("return db.update(pools).set({ currentState: 'closed', stateEventVersion: 3 }).where(x);"),
    );
    expect(f).toHaveLength(1);
  });

  it('FLAGS .insert(pools)…onConflictDoUpdate({ set: { currentState } }) (the projector pattern)', () => {
    const f = scanPoolStateWrites(
      'f.ts',
      wrap(
        "return db.insert(pools).values(v).onConflictDoUpdate({ target: pools.poolId, set: { currentState: s, updatedAt: now } });",
      ),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/onConflictDoUpdate/);
  });

  it('FLAGS a direct pools.currentState = … assignment', () => {
    const f = scanPoolStateWrites('f.ts', wrap('pools.currentState = nextState;'));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/direct assignment/);
  });

  it('FLAGS .update(pools).set({ stateEventVersion }) — the cache pair travels together', () => {
    const f = scanPoolStateWrites('f.ts', wrap('return db.update(pools).set({ stateEventVersion: 4 });'));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/update\(pools\)\.set/);
  });

  it('PASSES .update(claims).set({ currentState }) — different table', () => {
    expect(
      scanPoolStateWrites('f.ts', wrap("return db.update(claims).set({ currentState: 'approved' });")),
    ).toHaveLength(0);
  });

  it('PASSES a SELECT of pools.currentState (read, not write)', () => {
    expect(
      scanPoolStateWrites('f.ts', wrap('return db.select({ s: pools.currentState }).from(pools);')),
    ).toHaveLength(0);
  });

  it('does NOT match a `.set({ currentState })` substring inside a comment or string literal', () => {
    const src =
      `// prose: db.update(pools).set({ currentState: 'x' })\n` +
      `const s = "db.update(pools).set({ currentState: 'x' })";\n`;
    expect(scanPoolStateWrites('f.ts', src)).toHaveLength(0);
  });

  it('reports the correct file + 1-based line', () => {
    const f = scanPoolStateWrites(
      'packages/domain/src/x/write.ts',
      wrap("return db.update(pools).set({ currentState: 'settled' });"),
    );
    expect(f[0]!.file).toBe('packages/domain/src/x/write.ts');
    expect(f[0]!.line).toBe(3);
  });

  it('FLAGS a BARE .insert(pools).values({ currentState }) with no further chaining', () => {
    const f = scanPoolStateWrites(
      'f.ts',
      wrap("return db.insert(pools).values({ currentState: 'spawned' });"),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/INSERT \(create-time\) write/);
  });

  it('FLAGS a namespaced `schema.pools` update — not just the bare `pools` identifier', () => {
    const src =
      `import * as schema from '../schema/index.js';\n` +
      `export function q(db: any) {\n` +
      `  return db.update(schema.pools).set({ currentState: 'closed' });\n` +
      `}\n`;
    expect(scanPoolStateWrites('f.ts', src)).toHaveLength(1);
  });

  it('FLAGS a namespaced `schema.pools` direct assignment', () => {
    const src =
      `import * as schema from '../schema/index.js';\n` +
      `export function q() {\n` +
      `  schema.pools.currentState = 'closed';\n` +
      `}\n`;
    const f = scanPoolStateWrites('f.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/direct assignment/);
  });

  it("FLAGS a computed-property-key state write: { ['currentState']: value }", () => {
    const f = scanPoolStateWrites(
      'f.ts',
      wrap("return db.update(pools).set({ ['currentState']: 'closed' });"),
    );
    expect(f).toHaveLength(1);
  });

  it('PASSES a namespaced `schema.claims` update — different table, still no false positive', () => {
    const src =
      `import * as schema from '../schema/index.js';\n` +
      `export function q(db: any) {\n` +
      `  return db.update(schema.claims).set({ currentState: 'denied' });\n` +
      `}\n`;
    expect(scanPoolStateWrites('f.ts', src)).toHaveLength(0);
  });

  it('FLAGS a BARE .insert(pools).values({ stateEventVersion }) — the cache pair travels together', () => {
    const f = scanPoolStateWrites('f.ts', wrap("return db.insert(pools).values({ stateEventVersion: 1 });"));
    expect(f).toHaveLength(1);
  });

  it('PASSES a BARE .insert(pools).values({...}) that touches neither guarded column', () => {
    const f = scanPoolStateWrites('f.ts', wrap("return db.insert(pools).values({ poolIndex: 1 });"));
    expect(f).toHaveLength(0);
  });

  it('FLAGS the bulk/array form .insert(pools).values([{ currentState }, ...])', () => {
    const f = scanPoolStateWrites(
      'f.ts',
      wrap("return db.insert(pools).values([{ poolIndex: 0 }, { currentState: 'spawned' }]);"),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/INSERT \(create-time\) write/);
  });

  it('PASSES a bulk/array .values([...]) where no element touches a guarded column', () => {
    const f = scanPoolStateWrites(
      'f.ts',
      wrap('return db.insert(pools).values([{ poolIndex: 0 }, { poolIndex: 1 }]);'),
    );
    expect(f).toHaveLength(0);
  });

  it('records the enclosing named function for a flagged write', () => {
    const f = scanPoolStateWrites(
      'f.ts',
      wrap("return db.update(pools).set({ currentState: 'settled' });"),
    );
    expect(f[0]!.enclosingFunction).toBe('q');
  });

  it('records enclosingFunction for an arrow function assigned to a const', () => {
    const src =
      `import { pools } from '../schema/pools.js';\n` +
      `export const q = (db: any) => {\n` +
      `  return db.update(pools).set({ currentState: 'settled' });\n` +
      `};\n`;
    const f = scanPoolStateWrites('f.ts', src);
    expect(f[0]!.enclosingFunction).toBe('q');
  });
});

describe('isAllowlistedWrite — function-scoped allowlist (not whole-file)', () => {
  const allowlist = [{ file: 'packages/domain/src/pool/project.ts', functions: new Set(['projectPoolState']) }];

  it('allows a write inside the allowlisted function of the allowlisted file', () => {
    expect(
      isAllowlistedWrite(
        { file: 'packages/domain/src/pool/project.ts', enclosingFunction: 'projectPoolState' },
        allowlist,
      ),
    ).toBe(true);
  });

  it('flags a write in the SAME file but a DIFFERENT function — no whole-file amnesty', () => {
    expect(
      isAllowlistedWrite(
        { file: 'packages/domain/src/pool/project.ts', enclosingFunction: 'someOtherHelper' },
        allowlist,
      ),
    ).toBe(false);
  });

  it('flags a write with no enclosing function (module scope) even in the allowlisted file', () => {
    expect(
      isAllowlistedWrite({ file: 'packages/domain/src/pool/project.ts', enclosingFunction: undefined }, allowlist),
    ).toBe(false);
  });

  it('flags a write in a different file entirely', () => {
    expect(
      isAllowlistedWrite(
        { file: 'packages/domain/src/pool/other.ts', enclosingFunction: 'projectPoolState' },
        allowlist,
      ),
    ).toBe(false);
  });
});
