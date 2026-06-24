import { describe, expect, it } from 'vitest';

import { scanMemberStateWrites } from './lib.js';

/** Wrap a statement inside a function body so AST positions are stable. */
const wrap = (body: string): string =>
  `import { members } from '../schema/members.js';\n` +
  `export function q(db: any) {\n` +
  `  ${body}\n` +
  `}\n`;

describe('scanMemberStateWrites — member-state-invariant gate teeth', () => {
  it('FLAGS .update(members).set({ state })', () => {
    const f = scanMemberStateWrites('f.ts', wrap("return db.update(members).set({ state: 'active' });"));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/update\(members\)\.set/);
  });

  it('FLAGS .update(members).set({ state, ... }) among other columns', () => {
    const f = scanMemberStateWrites(
      'f.ts',
      wrap("return db.update(members).set({ state: 'lock-in', stateEventVersion: 3 }).where(x);"),
    );
    expect(f).toHaveLength(1);
  });

  it('FLAGS .insert(members)…onConflictDoUpdate({ set: { state } }) (the projector pattern)', () => {
    const f = scanMemberStateWrites(
      'f.ts',
      wrap(
        "return db.insert(members).values(v).onConflictDoUpdate({ target: members.memberId, set: { state: s, updatedAt: now } });",
      ),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/onConflictDoUpdate/);
  });

  it('FLAGS a direct members.state = … assignment', () => {
    const f = scanMemberStateWrites('f.ts', wrap('members.state = nextState;'));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/direct assignment/);
  });

  it('PASSES .update(members).set({ stateEventVersion }) — no state write', () => {
    expect(
      scanMemberStateWrites('f.ts', wrap('return db.update(members).set({ stateEventVersion: 4 });')),
    ).toHaveLength(0);
  });

  it('PASSES .update(otherTable).set({ state }) — different table', () => {
    expect(
      scanMemberStateWrites('f.ts', wrap("return db.update(claims).set({ state: 'open' });")),
    ).toHaveLength(0);
  });

  it('PASSES a SELECT of members.state (read, not write)', () => {
    expect(
      scanMemberStateWrites('f.ts', wrap('return db.select({ s: members.state }).from(members);')),
    ).toHaveLength(0);
  });

  it('does NOT match a `.set({ state })` substring inside a comment or string literal', () => {
    const src =
      `// prose: db.update(members).set({ state: 'x' })\n` +
      `const s = "db.update(members).set({ state: 'x' })";\n`;
    expect(scanMemberStateWrites('f.ts', src)).toHaveLength(0);
  });

  it('reports the correct file + 1-based line', () => {
    const f = scanMemberStateWrites(
      'packages/domain/src/x/write.ts',
      wrap("return db.update(members).set({ state: 'active' });"),
    );
    expect(f[0]!.file).toBe('packages/domain/src/x/write.ts');
    expect(f[0]!.line).toBe(3);
  });
});
