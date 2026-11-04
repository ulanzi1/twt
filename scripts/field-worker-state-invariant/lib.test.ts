// scripts/field-worker-state-invariant/lib.test.ts — the gate's TEETH (Story 13.1 AC11).
//
// The known-bad fixtures live HERE (the helpdesk / pool / module practice), ⛔ in packages/domain/src: a write outside the
// allowlist → a finding, for EACH of the eight projected columns. The AC11 legs:
//   - `.set({ <column> })` outside the allowlist is FLAGGED for every one of the eight — and `district`, the column a move
//     changes, is FLAGGED in EACH write form (`.set`, `.values`, bulk `.values([…])`, `onConflictDoUpdate`, direct
//     assignment, namespaced table, computed key);
//   - the FULL guarded `.set({ … })` written directly inside `projectFieldWorkerTransition` (and the genesis `.values({ … })`
//     inside `projectFieldWorkerGenesis`) produce ZERO findings after `isAllowlistedWrite`;
//   - the same write moved into an inner named helper of project.ts is FLAGGED (lexical, ⛔ whole-file) — and, since review R3-27,
//     into ANY function-like node (a callback, an object-property arrow), and a payload or table the scanner cannot read (a
//     variable, a spread, a cast, an alias, a split chain) is itself a finding. The "the scan still SEES the projector write" floor is
//     in `check.ts` (it needs the real tree).

import { describe, expect, it } from 'vitest';

import { type AllowlistEntry, isAllowlistedWrite, scanFieldWorkerStateWrites } from './lib.js';

/** Wrap a statement inside a function body so AST positions are stable. */
const wrap = (body: string): string =>
  `import { fieldWorkers } from '../schema/field_workers.js';\n` +
  `export function q(db: any) {\n` +
  `  ${body}\n` +
  `}\n`;

const PROJECT_FILE = 'packages/domain/src/field-worker/project.ts';
const ALLOWLIST: readonly AllowlistEntry[] = [
  { file: PROJECT_FILE, functions: new Set(['projectFieldWorkerGenesis', 'projectFieldWorkerTransition']) },
];
const EIGHT = ['currentState', 'stateEventVersion', 'kycStatus', 'stateReasonCode', 'district', 'endedOn', 'auditId', 'updatedAt'] as const;

describe('scanFieldWorkerStateWrites — gate teeth', () => {
  it.each(EIGHT)('FLAGS .update(fieldWorkers).set({ %s }) outside the allowlist', (col) => {
    const f = scanFieldWorkerStateWrites('packages/domain/src/x/write.ts', wrap(`return db.update(fieldWorkers).set({ ${col}: v });`));
    expect(f).toHaveLength(1);
    expect(isAllowlistedWrite(f[0]!, ALLOWLIST)).toBe(false);
  });

  it.each(EIGHT)('FLAGS .insert(fieldWorkers).values({ %s }) outside the allowlist (a genesis outside the projector)', (col) => {
    const f = scanFieldWorkerStateWrites('f.ts', wrap(`return db.insert(fieldWorkers).values({ fieldWorkerId: w, ${col}: v });`));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/INSERT \(create-time\) write/);
  });

  describe('`district` — the column `field_worker.posted` moves — in EVERY write form', () => {
    it('.update(fieldWorkers).set({ district }) — shorthand too', () => {
      expect(scanFieldWorkerStateWrites('f.ts', wrap("return db.update(fieldWorkers).set({ district: 'Gaya' }).where(x);"))).toHaveLength(1);
      expect(scanFieldWorkerStateWrites('f.ts', wrap('const district = d; return db.update(fieldWorkers).set({ district });'))).toHaveLength(1);
    });
    it('a bulk .insert(fieldWorkers).values([{ district }])', () => {
      expect(scanFieldWorkerStateWrites('f.ts', wrap("return db.insert(fieldWorkers).values([{ fieldWorkerId: w, district: 'Patna' }]);"))).toHaveLength(1);
    });
    it('…onConflictDoUpdate({ set: { district } })', () => {
      const f = scanFieldWorkerStateWrites(
        'f.ts',
        wrap("return db.insert(fieldWorkers).values({ fieldWorkerId: w }).onConflictDoUpdate({ target: fieldWorkers.fieldWorkerId, set: { district: 'Gaya' } });"),
      );
      expect(f).toHaveLength(1);
      expect(f[0]!.detail).toMatch(/onConflictDoUpdate/);
    });
    it('a direct fieldWorkers.district = … assignment', () => {
      const f = scanFieldWorkerStateWrites('f.ts', wrap("fieldWorkers.district = 'Gaya';"));
      expect(f).toHaveLength(1);
      expect(f[0]!.detail).toMatch(/direct assignment/);
    });
    it('a namespaced schema.fieldWorkers update and a computed key', () => {
      expect(scanFieldWorkerStateWrites('f.ts', wrap("return db.update(schema.fieldWorkers).set({ district: 'Gaya' });"))).toHaveLength(1);
      expect(scanFieldWorkerStateWrites('f.ts', wrap("return db.update(fieldWorkers).set({ ['district']: 'Gaya' });"))).toHaveLength(1);
    });
  });

  // Review R3-27 — the shapes the copied scanner did NOT see (replayed by the Edge Case Hunter: each gave 0 findings).
  describe('the shapes a literal-only scanner missed — each is now a finding', () => {
    it.each([
      ['a variable payload', 'const patch = { district: d }; return db.update(fieldWorkers).set(patch);', /unverifiable shape/],
      ['a spread payload', 'return db.update(fieldWorkers).set({ ...patch });', /unverifiable shape/],
      ['a spread beside a clean key', 'return db.update(fieldWorkers).set({ nameCiphertext: n, ...patch });', /unverifiable shape/],
      ['a variable .values payload', 'return db.insert(fieldWorkers).values(row);', /unverifiable shape/],
      ['a bulk .values with a spread element', 'return db.insert(fieldWorkers).values([...rows]);', /unverifiable shape/],
      ['a cast table', "return db.update(fieldWorkers as any).set({ district: 'Gaya' });", /UPDATE to a projected column/],
      ['a parenthesised table', "return db.update((fieldWorkers)).set({ district: 'Gaya' });", /UPDATE to a projected column/],
      ['a non-null table', "return db.update(fieldWorkers!).set({ district: 'Gaya' });", /UPDATE to a projected column/],
      ['a const alias of the table', "const t = fieldWorkers; return db.update(t).set({ district: 'Gaya' });", /UPDATE to a projected column/],
      ['a SPLIT chain', "const q = db.update(fieldWorkers); return q.set({ district: 'Gaya' });", /UPDATE to a projected column/],
      ['a split chain held awaited', "const q = db.update(fieldWorkers).where(w); return (q).set({ kycStatus: k });", /UPDATE to a projected column/],
      ['an upsert set keyed as a STRING', "return db.insert(fieldWorkers).values({ fieldWorkerId: w }).onConflictDoUpdate({ target: t, 'set': { district: 'Gaya' } });", /upsert of a projected column/],
      ['an upsert set written SHORTHAND', 'return db.insert(fieldWorkers).values({ fieldWorkerId: w }).onConflictDoUpdate({ target: t, set });', /unverifiable/],
      // Review R4-7 — members whose key or value the scanner cannot read.
      ['a NON-literal computed key', "return db.update(fieldWorkers).set({ [k]: 'Gaya' });", /unverifiable shape/],
      ['a getter', "return db.update(fieldWorkers).set({ get district() { return 'Gaya'; } });", /unverifiable shape/],
      ['a method member', 'return db.update(fieldWorkers).set({ toJSON() { return x; } });', /unverifiable shape/],
      // Review R4-8 — aliases and chains the declaration-only collector missed.
      ['a REASSIGNED chain', "let q = db.select(); q = db.update(fieldWorkers); return q.set({ district: 'Gaya' });", /UPDATE to a projected column/],
      ['an alias by ASSIGNMENT', "let t; t = fieldWorkers; return db.update(t).set({ district: 'Gaya' });", /UPDATE to a projected column/],
      ['a destructured table alias', "const { fieldWorkers: fw } = schema; return db.update(fw).set({ district: 'Gaya' });", /UPDATE to a projected column/],
      ['a literal element-access table', "return db.update(schema['fieldWorkers']).set({ district: 'Gaya' });", /UPDATE to a projected column/],
      ['a literal element-access METHOD', "return db.update(fieldWorkers)['set']({ district: 'Gaya' });", /UPDATE to a projected column/],
      ['a literal element-access update', "return db['update'](fieldWorkers).set({ district: 'Gaya' });", /UPDATE to a projected column/],
    ])('FLAGS %s', (_label, body, detail) => {
      const f = scanFieldWorkerStateWrites('packages/domain/src/x/write.ts', wrap(body));
      expect(f.length, body).toBeGreaterThanOrEqual(1);
      expect(f.map((x) => x.detail).join(' | ')).toMatch(detail);
    });

    it('FLAGS a write under an IMPORT alias of the table', () => {
      const src = "import { fieldWorkers as fw } from '../schema/field_workers.js';\nexport function q(db: any) { return db.update(fw).set({ district: 'Gaya' }); }\n";
      expect(scanFieldWorkerStateWrites('f.ts', src)).toHaveLength(1);
    });

    it('PASSES a variable payload on ANOTHER table, and a clean literal on this one (no false positive)', () => {
      expect(scanFieldWorkerStateWrites('f.ts', wrap('return db.update(marketplaceModules).set(patch);'))).toHaveLength(0);
      expect(scanFieldWorkerStateWrites('f.ts', wrap("return db.update(fieldWorkers).set({ nameCiphertext: 'x' });"))).toHaveLength(0);
      expect(scanFieldWorkerStateWrites('f.ts', wrap("return db.update(fieldWorkers).set({ ['nameCiphertext']: 'x', [`mobileCiphertext`]: 'y' });"))).toHaveLength(0); // literal computed keys stay readable
    });
  });

  it('PASSES a write to an identity column only (the DB trigger, ⛔ this gate, owns I2)', () => {
    expect(scanFieldWorkerStateWrites('f.ts', wrap("return db.update(fieldWorkers).set({ nameCiphertext: 'x' });"))).toHaveLength(0);
  });

  it('PASSES .update(marketplaceModules).set({ currentState }) — a different table', () => {
    expect(scanFieldWorkerStateWrites('f.ts', wrap("return db.update(marketplaceModules).set({ currentState: 'active' });"))).toHaveLength(0);
  });

  it('PASSES a SELECT of fieldWorkers.district (read, not write) and a comment / string', () => {
    expect(scanFieldWorkerStateWrites('f.ts', wrap('return db.select({ d: fieldWorkers.district }).from(fieldWorkers);'))).toHaveLength(0);
    const src = `// prose: db.update(fieldWorkers).set({ district: 'x' })\n` + `const s = "db.update(fieldWorkers).set({ auditId: a })";\n`;
    expect(scanFieldWorkerStateWrites('f.ts', src)).toHaveLength(0);
  });
});

describe('the projector allowlist — function-scoped, lexical', () => {
  const projectorSrc =
    `import { fieldWorkers } from '../schema/field_workers.js';\n` +
    `export async function projectFieldWorkerGenesis(db: any) {\n` +
    `  await db.insert(fieldWorkers).values({ fieldWorkerId: w, currentState: 'pending_kyc', stateEventVersion: 1, kycStatus: 'pending', stateReasonCode: null, district: d, endedOn: null, auditId: a });\n` +
    `}\n` +
    `export async function projectFieldWorkerTransition(db: any) {\n` +
    `  try {\n` +
    `    await db.update(fieldWorkers).set({ currentState: to, stateEventVersion: v, kycStatus: k, stateReasonCode: r, district: d, endedOn: e, auditId: a, updatedAt: sql\`now()\` }).where(w);\n` +
    `  } finally {\n` +
    `    await reset();\n` +
    `  }\n` +
    `}\n`;

  it('the FULL guarded writes inside the two projector bodies produce ZERO findings after the allowlist', () => {
    const raw = scanFieldWorkerStateWrites(PROJECT_FILE, projectorSrc);
    expect(raw).toHaveLength(2); // both are seen …
    expect(raw.map((f) => f.enclosingFunction).sort()).toEqual(['projectFieldWorkerGenesis', 'projectFieldWorkerTransition']);
    expect(raw.filter((f) => !isAllowlistedWrite(f, ALLOWLIST))).toHaveLength(0); // … and both allowlisted
  });

  it('the same write in an inner named arrow of project.ts is FLAGGED — ⛔ whole-file amnesty', () => {
    const src =
      `export async function projectFieldWorkerTransition(db: any) {\n` +
      `  const writeRow = async () => db.update(fieldWorkers).set({ district: 'Gaya' });\n` +
      `  await writeRow();\n` +
      `}\n`;
    const f = scanFieldWorkerStateWrites(PROJECT_FILE, src);
    expect(f).toHaveLength(1);
    expect(f[0]!.enclosingFunction).toBe('writeRow');
    expect(isAllowlistedWrite(f[0]!, ALLOWLIST)).toBe(false);
  });

  // Review R3-27 — every function-like node is a boundary: a callback or an object-property arrow inside a projector body is NOT the
  // projector's own write (the copied walk climbed past them to `projectFieldWorkerTransition` and allow-listed them).
  it.each([
    ['an anonymous callback', "  await Promise.all(rows.map(async () => db.update(fieldWorkers).set({ district: 'Gaya' })));\n", '<anonymous>'],
    ['an object-property arrow', "  const h = { writeRow: async () => db.update(fieldWorkers).set({ district: 'Gaya' }) };\n  await h.writeRow();\n", 'writeRow'],
    ['a function expression passed on', "  await run(async function () { await db.update(fieldWorkers).set({ district: 'Gaya' }); });\n", '<anonymous>'],
  ])('the same write in %s inside a projector body is FLAGGED', (_label, body, name) => {
    const src = `export async function projectFieldWorkerTransition(db: any) {\n${body}}\n`;
    const f = scanFieldWorkerStateWrites(PROJECT_FILE, src);
    expect(f).toHaveLength(1);
    expect(f[0]!.enclosingFunction).toBe(name);
    expect(isAllowlistedWrite(f[0]!, ALLOWLIST)).toBe(false);
  });

  it('the projector function NAME in another file is FLAGGED', () => {
    const f = scanFieldWorkerStateWrites('packages/domain/src/field-worker/commands.ts', projectorSrc);
    expect(f.filter((x) => !isAllowlistedWrite(x, ALLOWLIST))).toHaveLength(2);
  });

  it('records the enclosing named function + correct 1-based line', () => {
    const f = scanFieldWorkerStateWrites('packages/domain/src/x/write.ts', wrap('return db.update(fieldWorkers).set({ auditId: a });'));
    expect(f[0]!.line).toBe(3);
    expect(f[0]!.enclosingFunction).toBe('q');
  });
});
