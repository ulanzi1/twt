// scripts/marketplace-module-state-invariant/lib.test.ts — the gate's TEETH (Story 12.1 AC9).
//
// The known-bad fixtures live HERE (the helpdesk / pool practice), ⛔ in packages/domain/src: a write
// outside the allowlist → a finding, for EACH of the six projected columns. The AC9 legs:
//   - `.set({ slotsRemaining })` and `.set({ auditId })` outside the allowlist are FLAGGED;
//   - the FULL guarded `.set({ … })` written directly inside `projectModuleTransition` (and the genesis
//     `.values({ … })` inside `projectModuleGenesis`) produce ZERO findings after `isAllowlistedWrite`;
//   - the same write moved into an inner named helper of project.ts is FLAGGED (lexical, ⛔ whole-file).

import { describe, expect, it } from 'vitest';

import { type AllowlistEntry, isAllowlistedWrite, scanMarketplaceModuleStateWrites } from './lib.js';

/** Wrap a statement inside a function body so AST positions are stable. */
const wrap = (body: string): string =>
  `import { marketplaceModules } from '../schema/marketplace_modules.js';\n` +
  `export function q(db: any) {\n` +
  `  ${body}\n` +
  `}\n`;

const PROJECT_FILE = 'packages/domain/src/marketplace/project.ts';
const ALLOWLIST: readonly AllowlistEntry[] = [
  { file: PROJECT_FILE, functions: new Set(['projectModuleGenesis', 'projectModuleTransition']) },
];

describe('scanMarketplaceModuleStateWrites — gate teeth', () => {
  it.each(['currentState', 'stateEventVersion', 'slotsRemaining', 'archiveReason', 'auditId', 'updatedAt'])(
    'FLAGS .update(marketplaceModules).set({ %s }) outside the allowlist',
    (col) => {
      const f = scanMarketplaceModuleStateWrites('packages/domain/src/x/write.ts', wrap(`return db.update(marketplaceModules).set({ ${col}: v });`));
      expect(f).toHaveLength(1);
      expect(isAllowlistedWrite(f[0]!, ALLOWLIST)).toBe(false);
    },
  );

  it('FLAGS .set({ slotsRemaining }) — the AC9 leg (a place taken outside the projector)', () => {
    const f = scanMarketplaceModuleStateWrites('f.ts', wrap('return db.update(marketplaceModules).set({ slotsRemaining: 0 }).where(x);'));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/update\(marketplaceModules\)\.set/);
  });

  it('FLAGS .set({ auditId }) — the AC9 leg (the audit anchor is projected too)', () => {
    expect(scanMarketplaceModuleStateWrites('f.ts', wrap('return db.update(marketplaceModules).set({ auditId: a });'))).toHaveLength(1);
  });

  it('FLAGS a bare .insert(marketplaceModules).values({ currentState }) (a genesis outside the projector)', () => {
    const f = scanMarketplaceModuleStateWrites('f.ts', wrap("return db.insert(marketplaceModules).values({ moduleId: m, currentState: 'draft' });"));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/INSERT \(create-time\) write/);
  });

  it('FLAGS a bulk .insert(marketplaceModules).values([{ slotsRemaining }])', () => {
    expect(
      scanMarketplaceModuleStateWrites('f.ts', wrap('return db.insert(marketplaceModules).values([{ moduleId: m, slotsRemaining: 3 }]);')),
    ).toHaveLength(1);
  });

  it('FLAGS …onConflictDoUpdate({ set: { archiveReason } })', () => {
    const f = scanMarketplaceModuleStateWrites(
      'f.ts',
      wrap("return db.insert(marketplaceModules).values({ moduleId: m }).onConflictDoUpdate({ target: marketplaceModules.moduleId, set: { archiveReason: 'trustee_archived' } });"),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/onConflictDoUpdate/);
  });

  it('FLAGS a direct marketplaceModules.slotsRemaining = … assignment', () => {
    const f = scanMarketplaceModuleStateWrites('f.ts', wrap('marketplaceModules.slotsRemaining = 0;'));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/direct assignment/);
  });

  it('FLAGS a namespaced schema.marketplaceModules update and a computed key', () => {
    expect(scanMarketplaceModuleStateWrites('f.ts', wrap('return db.update(schema.marketplaceModules).set({ updatedAt: now });'))).toHaveLength(1);
    expect(scanMarketplaceModuleStateWrites('f.ts', wrap("return db.update(marketplaceModules).set({ ['stateEventVersion']: 2 });"))).toHaveLength(1);
  });

  it('PASSES a write to a content column only (the DB trigger, ⛔ this gate, owns I2)', () => {
    expect(scanMarketplaceModuleStateWrites('f.ts', wrap("return db.update(marketplaceModules).set({ nameEn: 'x' });"))).toHaveLength(0);
  });

  it('PASSES .update(helpdeskTickets).set({ currentState }) — a different table', () => {
    expect(scanMarketplaceModuleStateWrites('f.ts', wrap("return db.update(helpdeskTickets).set({ currentState: 'open' });"))).toHaveLength(0);
  });

  it('PASSES a SELECT of marketplaceModules.slotsRemaining (read, not write) and a comment / string', () => {
    expect(
      scanMarketplaceModuleStateWrites('f.ts', wrap('return db.select({ s: marketplaceModules.slotsRemaining }).from(marketplaceModules);')),
    ).toHaveLength(0);
    const src =
      `// prose: db.update(marketplaceModules).set({ slotsRemaining: 0 })\n` +
      `const s = "db.update(marketplaceModules).set({ auditId: a })";\n`;
    expect(scanMarketplaceModuleStateWrites('f.ts', src)).toHaveLength(0);
  });
});

describe('the projector allowlist — function-scoped, lexical', () => {
  const projectorSrc =
    `import { marketplaceModules } from '../schema/marketplace_modules.js';\n` +
    `export async function projectModuleGenesis(db: any) {\n` +
    `  await db.insert(marketplaceModules).values({ moduleId: m, currentState: 'draft', stateEventVersion: 1, slotsRemaining: c, archiveReason: null, auditId: a });\n` +
    `}\n` +
    `export async function projectModuleTransition(db: any) {\n` +
    `  try {\n` +
    `    await db.update(marketplaceModules).set({ currentState: to, stateEventVersion: v, slotsRemaining: s, archiveReason: r, auditId: a, updatedAt: sql\`now()\` }).where(w);\n` +
    `  } finally {\n` +
    `    await reset();\n` +
    `  }\n` +
    `}\n`;

  it('the FULL guarded writes inside the two projector bodies produce ZERO findings after the allowlist', () => {
    const raw = scanMarketplaceModuleStateWrites(PROJECT_FILE, projectorSrc);
    expect(raw).toHaveLength(2); // both are seen …
    expect(raw.map((f) => f.enclosingFunction).sort()).toEqual(['projectModuleGenesis', 'projectModuleTransition']);
    expect(raw.filter((f) => !isAllowlistedWrite(f, ALLOWLIST))).toHaveLength(0); // … and both allowlisted
  });

  it('the same write in an inner named arrow of project.ts is FLAGGED — ⛔ whole-file amnesty', () => {
    const src =
      `export async function projectModuleTransition(db: any) {\n` +
      `  const writeRow = async () => db.update(marketplaceModules).set({ slotsRemaining: 0 });\n` +
      `  await writeRow();\n` +
      `}\n`;
    const f = scanMarketplaceModuleStateWrites(PROJECT_FILE, src);
    expect(f).toHaveLength(1);
    expect(f[0]!.enclosingFunction).toBe('writeRow');
    expect(isAllowlistedWrite(f[0]!, ALLOWLIST)).toBe(false);
  });

  it('the projector function NAME in another file is FLAGGED', () => {
    const f = scanMarketplaceModuleStateWrites('packages/domain/src/marketplace/commands.ts', projectorSrc);
    expect(f.filter((x) => !isAllowlistedWrite(x, ALLOWLIST))).toHaveLength(2);
  });

  it('records the enclosing named function + correct 1-based line', () => {
    const f = scanMarketplaceModuleStateWrites('packages/domain/src/x/write.ts', wrap('return db.update(marketplaceModules).set({ auditId: a });'));
    expect(f[0]!.line).toBe(3);
    expect(f[0]!.enclosingFunction).toBe('q');
  });
});
