import { describe, expect, it } from 'vitest';

import { isAllowlistedWrite, scanHelpdeskStateWrites } from './lib.js';

/** Wrap a statement inside a function body so AST positions are stable. */
const wrap = (body: string): string =>
  `import { helpdeskTickets } from '../schema/helpdesk_tickets.js';\n` +
  `export function q(db: any) {\n` +
  `  ${body}\n` +
  `}\n`;

describe('scanHelpdeskStateWrites — helpdesk-state-invariant gate teeth', () => {
  it('FLAGS .update(helpdeskTickets).set({ currentState })', () => {
    const f = scanHelpdeskStateWrites('f.ts', wrap("return db.update(helpdeskTickets).set({ currentState: 'open' });"));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/update\(helpdeskTickets\)\.set/);
  });

  it('FLAGS .update(helpdeskTickets).set({ currentState, stateEventVersion })', () => {
    const f = scanHelpdeskStateWrites(
      'f.ts',
      wrap("return db.update(helpdeskTickets).set({ currentState: 'in_progress', stateEventVersion: 3 }).where(x);"),
    );
    expect(f).toHaveLength(1);
  });

  it('FLAGS a bare .insert(helpdeskTickets).values({ currentState }) (the projector create path)', () => {
    const f = scanHelpdeskStateWrites('f.ts', wrap("return db.insert(helpdeskTickets).values({ currentState: 'open' });"));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/INSERT \(create-time\) write/);
  });

  it('FLAGS a direct helpdeskTickets.currentState = … assignment', () => {
    const f = scanHelpdeskStateWrites('f.ts', wrap('helpdeskTickets.currentState = nextState;'));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/direct assignment/);
  });

  it('FLAGS .update(helpdeskTickets).set({ stateEventVersion }) — the cache pair travels together', () => {
    const f = scanHelpdeskStateWrites('f.ts', wrap('return db.update(helpdeskTickets).set({ stateEventVersion: 4 });'));
    expect(f).toHaveLength(1);
  });

  it('PASSES .update(claims).set({ currentState }) — different table', () => {
    expect(
      scanHelpdeskStateWrites('f.ts', wrap("return db.update(claims).set({ currentState: 'settled' });")),
    ).toHaveLength(0);
  });

  it('PASSES a SELECT of helpdeskTickets.currentState (read, not write)', () => {
    expect(
      scanHelpdeskStateWrites('f.ts', wrap('return db.select({ s: helpdeskTickets.currentState }).from(helpdeskTickets);')),
    ).toHaveLength(0);
  });

  it('does NOT match a `.set({ currentState })` substring inside a comment or string literal', () => {
    const src =
      `// prose: db.update(helpdeskTickets).set({ currentState: 'x' })\n` +
      `const s = "db.update(helpdeskTickets).set({ currentState: 'x' })";\n`;
    expect(scanHelpdeskStateWrites('f.ts', src)).toHaveLength(0);
  });

  it('FLAGS a namespaced `schema.helpdeskTickets` update — not just the bare identifier', () => {
    const src =
      `import * as schema from '../schema/index.js';\n` +
      `export function q(db: any) {\n` +
      `  return db.update(schema.helpdeskTickets).set({ currentState: 'open' });\n` +
      `}\n`;
    expect(scanHelpdeskStateWrites('f.ts', src)).toHaveLength(1);
  });

  it("FLAGS a computed-property-key state write: { ['currentState']: value }", () => {
    const f = scanHelpdeskStateWrites('f.ts', wrap("return db.update(helpdeskTickets).set({ ['currentState']: 'open' });"));
    expect(f).toHaveLength(1);
  });

  it('PASSES a bare .insert(helpdeskTickets).values({...}) touching neither guarded column', () => {
    expect(scanHelpdeskStateWrites('f.ts', wrap("return db.insert(helpdeskTickets).values({ body: 'x' });"))).toHaveLength(0);
  });

  it("FLAGS a no-substitution template-literal computed key: { [`currentState`]: value }", () => {
    const f = scanHelpdeskStateWrites('f.ts', wrap('return db.update(helpdeskTickets).set({ [`currentState`]: \'open\' });'));
    expect(f).toHaveLength(1);
  });

  it('FLAGS .insert(helpdeskTickets)…onConflictDoUpdate({ set: { currentState } }) — an upsert of current_state', () => {
    const f = scanHelpdeskStateWrites(
      'f.ts',
      wrap("return db.insert(helpdeskTickets).values({ ticketId: t }).onConflictDoUpdate({ target: helpdeskTickets.ticketId, set: { currentState: 'open' } });"),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/onConflictDoUpdate/);
  });

  it('records the enclosing named function + correct 1-based line', () => {
    const f = scanHelpdeskStateWrites(
      'packages/domain/src/x/write.ts',
      wrap("return db.update(helpdeskTickets).set({ currentState: 'open' });"),
    );
    expect(f[0]!.file).toBe('packages/domain/src/x/write.ts');
    expect(f[0]!.line).toBe(3);
    expect(f[0]!.enclosingFunction).toBe('q');
  });
});

describe('isAllowlistedWrite — function-scoped allowlist (not whole-file)', () => {
  const allowlist = [{ file: 'packages/domain/src/helpdesk/project.ts', functions: new Set(['projectTicketGenesis']) }];

  it('allows a write inside the allowlisted function of the allowlisted file', () => {
    expect(
      isAllowlistedWrite(
        { file: 'packages/domain/src/helpdesk/project.ts', enclosingFunction: 'projectTicketGenesis' },
        allowlist,
      ),
    ).toBe(true);
  });

  it('flags a write in the SAME file but a DIFFERENT function — no whole-file amnesty', () => {
    expect(
      isAllowlistedWrite(
        { file: 'packages/domain/src/helpdesk/project.ts', enclosingFunction: 'somethingElse' },
        allowlist,
      ),
    ).toBe(false);
  });

  it('flags a write in a different file entirely', () => {
    expect(
      isAllowlistedWrite(
        { file: 'packages/domain/src/helpdesk/read.ts', enclosingFunction: 'projectTicketGenesis' },
        allowlist,
      ),
    ).toBe(false);
  });

  it('flags a write with NO enclosing function (module scope) even in the allowlisted file — the allowlist is function-scoped, not file-scoped', () => {
    expect(
      isAllowlistedWrite(
        { file: 'packages/domain/src/helpdesk/project.ts', enclosingFunction: undefined },
        allowlist,
      ),
    ).toBe(false);
  });
});
