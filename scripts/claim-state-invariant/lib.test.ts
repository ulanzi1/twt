import { describe, expect, it } from 'vitest';

import { scanClaimStateWrites } from './lib.js';

/** Wrap a statement inside a function body so AST positions are stable. */
const wrap = (body: string): string =>
  `import { claims } from '../schema/claims.js';\n` +
  `export function q(db: any) {\n` +
  `  ${body}\n` +
  `}\n`;

describe('scanClaimStateWrites — claim-state-invariant gate teeth', () => {
  it('FLAGS .update(claims).set({ currentState })', () => {
    const f = scanClaimStateWrites('f.ts', wrap("return db.update(claims).set({ currentState: 'approved' });"));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/update\(claims\)\.set/);
  });

  it('FLAGS .update(claims).set({ currentState, ... }) among other columns', () => {
    const f = scanClaimStateWrites(
      'f.ts',
      wrap("return db.update(claims).set({ currentState: 'denied', stateEventVersion: 3 }).where(x);"),
    );
    expect(f).toHaveLength(1);
  });

  it('FLAGS .insert(claims)…onConflictDoUpdate({ set: { currentState } }) (the projector pattern)', () => {
    const f = scanClaimStateWrites(
      'f.ts',
      wrap(
        "return db.insert(claims).values(v).onConflictDoUpdate({ target: claims.claimCaseId, set: { currentState: s, updatedAt: now } });",
      ),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/onConflictDoUpdate/);
  });

  it('FLAGS a direct claims.currentState = … assignment', () => {
    const f = scanClaimStateWrites('f.ts', wrap('claims.currentState = nextState;'));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/direct assignment/);
  });

  it('PASSES .update(claims).set({ stateEventVersion }) — no state write', () => {
    expect(
      scanClaimStateWrites('f.ts', wrap('return db.update(claims).set({ stateEventVersion: 4 });')),
    ).toHaveLength(0);
  });

  it('PASSES .update(members).set({ state }) — different table + column', () => {
    expect(
      scanClaimStateWrites('f.ts', wrap("return db.update(members).set({ state: 'active' });")),
    ).toHaveLength(0);
  });

  it('PASSES a SELECT of claims.currentState (read, not write)', () => {
    expect(
      scanClaimStateWrites('f.ts', wrap('return db.select({ s: claims.currentState }).from(claims);')),
    ).toHaveLength(0);
  });

  it('does NOT match a `.set({ currentState })` substring inside a comment or string literal', () => {
    const src =
      `// prose: db.update(claims).set({ currentState: 'x' })\n` +
      `const s = "db.update(claims).set({ currentState: 'x' })";\n`;
    expect(scanClaimStateWrites('f.ts', src)).toHaveLength(0);
  });

  it('reports the correct file + 1-based line', () => {
    const f = scanClaimStateWrites(
      'packages/domain/src/x/write.ts',
      wrap("return db.update(claims).set({ currentState: 'approved' });"),
    );
    expect(f[0]!.file).toBe('packages/domain/src/x/write.ts');
    expect(f[0]!.line).toBe(3);
  });

  // ── Story 6.1 review findings: bypass vectors closed by the scanner hardening ──

  it('FLAGS a BARE .insert(claims).values({ currentState }) with no further chaining', () => {
    const f = scanClaimStateWrites(
      'f.ts',
      wrap("return db.insert(claims).values({ currentState: 'intake_pending' });"),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/INSERT \(create-time\) write/);
  });

  it('FLAGS a namespaced `schema.claims` update — not just the bare `claims` identifier', () => {
    const src =
      `import * as schema from '../schema/index.js';\n` +
      `export function q(db: any) {\n` +
      `  return db.update(schema.claims).set({ currentState: 'denied' });\n` +
      `}\n`;
    const f = scanClaimStateWrites('f.ts', src);
    expect(f).toHaveLength(1);
  });

  it('FLAGS a namespaced `schema.claims` direct assignment', () => {
    const src =
      `import * as schema from '../schema/index.js';\n` +
      `export function q() {\n` +
      `  schema.claims.currentState = 'denied';\n` +
      `}\n`;
    const f = scanClaimStateWrites('f.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/direct assignment/);
  });

  it('FLAGS a computed-property-key state write: { [\'currentState\']: value }', () => {
    const f = scanClaimStateWrites(
      'f.ts',
      wrap("return db.update(claims).set({ ['currentState']: 'denied' });"),
    );
    expect(f).toHaveLength(1);
  });

  it('PASSES a namespaced `schema.members` update — different table, still no false positive', () => {
    const src =
      `import * as schema from '../schema/index.js';\n` +
      `export function q(db: any) {\n` +
      `  return db.update(schema.members).set({ state: 'active' });\n` +
      `}\n`;
    expect(scanClaimStateWrites('f.ts', src)).toHaveLength(0);
  });

  it('PASSES a BARE .insert(claims).values({...}) that does NOT touch currentState', () => {
    const f = scanClaimStateWrites(
      'f.ts',
      wrap("return db.insert(claims).values({ stateEventVersion: 1 });"),
    );
    expect(f).toHaveLength(0);
  });
});
