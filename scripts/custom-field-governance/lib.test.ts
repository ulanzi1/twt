// scripts/custom-field-governance/lib.test.ts
//
// Story 10.12 AC3 layer 3 — both gate legs, WITH revert-sanity negative controls.
//
// ⚠ THE PLANTED VIOLATIONS ARE THE POINT [[feedback_gate_scope_semantic_coverage]]. A green scan
// proves nothing on its own: a gate that cannot be made to fail is decoration, and a governance gate
// that silently stopped detecting anything is worse than no gate, because the green check actively
// certifies an invariant nobody is enforcing. So each leg has a violation that MUST be reported.

import { describe, expect, it } from 'vitest';

import {
  DEFINITIONS_TABLE_BINDING,
  checkDenylistConformance,
  coversFr100Pattern,
  denylistConformanceIsClean,
  scanDefinitionWrites,
  scanMemberCustomFieldWrites,
} from './lib.js';

// ─────────────────────────────────────────────────────────────────────────────
// Leg (a) — denylist ⊇ fr-100 forbidden_column
// ─────────────────────────────────────────────────────────────────────────────

describe('leg (a) — the denylist superset check', () => {
  const denylist = [
    { pattern: 'payout_destination', mode: 'prefix' },
    { pattern: 'state', mode: 'segment' },
  ];

  it('is clean when a prefix-mode entry covers the fr-100 pattern', () => {
    const r = checkDenylistConformance(denylist, ['payout_destination']);
    expect(denylistConformanceIsClean(r)).toBe(true);
  });

  it('is clean when a SHORTER prefix-mode entry covers a longer fr-100 pattern', () => {
    // `payout_` would match everything `payout_destination` matches, and more. Real coverage.
    const r = checkDenylistConformance([{ pattern: 'payout_', mode: 'prefix' }], ['payout_destination']);
    expect(denylistConformanceIsClean(r)).toBe(true);
  });

  it('⚠ REVERT-SANITY: an fr-100 pattern with NO covering entry fails', () => {
    // The v2 scenario: `fr-100-non-add.yaml` gains a pattern and nobody mirrors it into the fence.
    const r = checkDenylistConformance(denylist, ['payout_destination', 'settlement_account']);
    expect(r.missing).toEqual(['settlement_account']);
    expect(denylistConformanceIsClean(r)).toBe(false);
  });

  it('⚠ REVERT-SANITY: a SEGMENT-mode entry does NOT count as coverage of a prefix pattern', () => {
    // This is the subtle one. Text-wise the entry looks like a match — but segment mode would let
    // `payout_destinations` (the literal forbidden TABLE name) through, so reporting it as coverage
    // would be a vacuous pass of precisely the artifact FR-100 exists to forbid.
    const segmentOnly = [{ pattern: 'payout_destination', mode: 'segment' }];
    expect(coversFr100Pattern(segmentOnly, 'payout_destination')).toBe(false);
    expect(denylistConformanceIsClean(checkDenylistConformance(segmentOnly, ['payout_destination']))).toBe(
      false,
    );
  });

  it('⚠ REVERT-SANITY: an EMPTY denylist fails rather than passing vacuously', () => {
    const r = checkDenylistConformance([], ['payout_destination']);
    expect(r.missing).toEqual(['payout_destination']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Leg (b) — the sole-writer source scan
// ─────────────────────────────────────────────────────────────────────────────

describe('leg (b) — clean sources produce NO findings', () => {
  it('an ordinary reader module is clean', () => {
    const src = `
      import { and, eq } from 'drizzle-orm';
      import { pariwarCustomFieldDefinitions } from '../schema/pariwar_custom_field_definitions.js';
      export async function readAll(db: Db, p: string) {
        return db.select().from(pariwarCustomFieldDefinitions).where(eq(pariwarCustomFieldDefinitions.pariwarId, p));
      }
    `;
    expect(scanDefinitionWrites('packages/domain/src/custom-fields/read.ts', src)).toEqual([]);
  });

  it('does NOT false-positive on the table name in a comment or a string literal', () => {
    // AST-based, not grep-based. Every schema header, README and migration in this repo names its
    // table in prose; a gate that fired on that would be turned off within a week.
    const src = `
      // Never call insert(pariwarCustomFieldDefinitions) outside the registry.
      const doc = "db.insert(pariwarCustomFieldDefinitions).values({})";
      export const note = doc;
    `;
    expect(scanDefinitionWrites('packages/domain/src/custom-fields/errors.ts', src)).toEqual([]);
  });

  it('does not fire on an INSERT into a DIFFERENT table', () => {
    const src = `export const f = (db: Db) => db.insert(members).values({});`;
    expect(scanDefinitionWrites('packages/domain/src/member/create.ts', src)).toEqual([]);
  });
});

describe('⚠ leg (b) REVERT-SANITY: a planted out-of-module INSERT MUST be reported', () => {
  it('catches the canonical `db.insert(pariwarCustomFieldDefinitions)` write', () => {
    const src = `
      import { pariwarCustomFieldDefinitions } from '@twt/domain';
      export async function sneak(db: Db) {
        await db.insert(pariwarCustomFieldDefinitions).values({ fieldKey: 'payout_destinations' });
      }
    `;
    const findings = scanDefinitionWrites('apps/api/src/modules/custom-fields/handlers.ts', src);
    expect(findings.length).toBe(1);
    expect(findings[0]?.detail).toContain(DEFINITIONS_TABLE_BINDING);
  });

  it('catches a BARE `insert(t)` from a destructured builder', () => {
    // A scan that only understood `db.insert(...)` would miss this entirely — and it is a one-line
    // route to a definition row that never sees the fence.
    const src = `
      const { insert } = db;
      export const f = () => insert(pariwarCustomFieldDefinitions).values({});
    `;
    const findings = scanDefinitionWrites('packages/domain/src/custom-fields/member-write.ts', src);
    expect(findings.length).toBe(1);
  });

  it('catches a NAMESPACE-QUALIFIED table reference (`schema.pariwarCustomFieldDefinitions`)', () => {
    const src = `
      import * as schema from '../schema/index.js';
      export const f = (db: Db) => db.insert(schema.pariwarCustomFieldDefinitions).values({});
    `;
    const findings = scanDefinitionWrites('packages/domain/src/seed/seed.ts', src);
    expect(findings.length).toBe(1);
  });

  it('reports the LINE so a failure is actionable', () => {
    const src = `const a = 1;\nconst b = 2;\nexport const f = (db) => db.insert(pariwarCustomFieldDefinitions).values({});\n`;
    expect(scanDefinitionWrites('apps/jobs/src/x.ts', src)[0]?.line).toBe(3);
  });

  it('catches EVERY write site in a file, not just the first', () => {
    const src = `
      export const a = (db) => db.insert(pariwarCustomFieldDefinitions).values({});
      export const b = (db) => db.insert(pariwarCustomFieldDefinitions).values({});
    `;
    expect(scanDefinitionWrites('apps/api/src/x.ts', src).length).toBe(2);
  });

  // ⭐ [Review][Patch] ALIAS REVERT-SANITY — the `governance-boundary` precedent
  // (`gate-inventory.md:37`, "named symbol incl. aliases"). Before this fix, both forms below passed
  // the scan clean: the bare-identifier check compared the ARGUMENT's own text against the literal
  // export name, and an aliased import's local name is never that literal text.
  it('⚠ catches an IMPORT-ALIASED table reference (`import { X as cf }`)', () => {
    const src = `
      import { pariwarCustomFieldDefinitions as cf } from '@twt/domain';
      export const sneak = (db: Db) => db.insert(cf).values({ fieldKey: 'payout_destinations' });
    `;
    const findings = scanDefinitionWrites('apps/api/src/modules/rogue/handlers.ts', src);
    expect(findings.length).toBe(1);
    expect(findings[0]?.detail).toContain('insert(cf)');
  });

  it('⚠ catches a DESTRUCTURING-ALIASED table reference (`const { X: cf } = schema`)', () => {
    const src = `
      import * as schema from '../schema/index.js';
      const { pariwarCustomFieldDefinitions: cf } = schema;
      export const sneak = (db: Db) => db.insert(cf).values({});
    `;
    const findings = scanDefinitionWrites('packages/domain/src/custom-fields/rogue-write.ts', src);
    expect(findings.length).toBe(1);
  });

  it('does NOT false-positive on an unrelated import aliased to the same local name', () => {
    // A local name matching the table binding, bound to something ELSE entirely, must stay clean.
    const src = `
      import { someOtherTable as pariwarCustomFieldDefinitions } from '../schema/other.js';
      export const f = (db: Db) => db.insert(pariwarCustomFieldDefinitions).values({});
    `;
    // ⚠ This one is INTENTIONALLY still a finding: the LOCAL name in scope is literally
    // 'pariwarCustomFieldDefinitions', which is exactly the identifier the sole-writer module itself
    // must be free to use unaliased. The gate polices the local name in scope at the call site — not
    // provenance — matching leg (b)'s stated scope limit (README.md): it is a source-scan invariant,
    // not a type-checker. Documented here so the intent is not mistaken for a missed case.
    expect(scanDefinitionWrites('packages/domain/src/custom-fields/registry.ts', src).length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ [Review][Patch] Leg (c) — the `members.custom_fields` sole-writer scan
// ─────────────────────────────────────────────────────────────────────────────
// AC6 claimed this was "asserted by AC3's source-scan leg" with no scan ever built for it. Mirrors
// leg (b)'s fixture shape exactly, including the alias revert-sanity cases.

describe('leg (c) — clean sources produce NO findings', () => {
  it('an ordinary reader module is clean', () => {
    const src = `
      export async function readOne(db: Db, id: string) {
        return db.select().from(members).where(eq(members.id, id));
      }
    `;
    expect(scanMemberCustomFieldWrites('packages/domain/src/custom-fields/read.ts', src)).toEqual([]);
  });

  it('does not fire on an UPDATE of members that does NOT touch customFields', () => {
    const src = `
      export const f = (db: Db) => db.update(members).set({ state: 'active' }).where(eq(members.id, id));
    `;
    expect(scanMemberCustomFieldWrites('packages/domain/src/member/lock-in.ts', src)).toEqual([]);
  });

  it('does not fire on an UPDATE of a DIFFERENT table', () => {
    const src = `
      export const f = (db: Db) => db.update(pariwarCustomFieldDefinitions).set({ customFields: {} });
    `;
    expect(scanMemberCustomFieldWrites('packages/domain/src/custom-fields/registry.ts', src)).toEqual([]);
  });
});

describe('⚠ leg (c) REVERT-SANITY: a planted out-of-module members.customFields UPDATE MUST be reported', () => {
  it('catches the canonical `db.update(members).set({ customFields })` write', () => {
    const src = `
      import { members } from '@twt/domain';
      export async function sneak(db: Db, memberId: string) {
        await db.update(members).set({ customFields: { x: 1 } }).where(eq(members.id, memberId));
      }
    `;
    const findings = scanMemberCustomFieldWrites('apps/api/src/modules/rogue/handlers.ts', src);
    expect(findings.length).toBe(1);
  });

  it('catches the SHORTHAND form `.set({ customFields })`', () => {
    const src = `
      export const f = (db: Db, customFields: unknown) =>
        db.update(members).set({ customFields }).where(eq(members.id, id));
    `;
    const findings = scanMemberCustomFieldWrites('packages/domain/src/member/rogue.ts', src);
    expect(findings.length).toBe(1);
  });

  it('⚠ catches an IMPORT-ALIASED table reference (`import { members as m }`)', () => {
    const src = `
      import { members as m } from '@twt/domain';
      export const sneak = (db: Db) => db.update(m).set({ customFields: {} }).where(eq(m.id, id));
    `;
    const findings = scanMemberCustomFieldWrites('apps/api/src/modules/rogue/handlers.ts', src);
    expect(findings.length).toBe(1);
  });

  it('catches a NAMESPACE-QUALIFIED table reference (`schema.members`)', () => {
    const src = `
      import * as schema from '../schema/index.js';
      export const f = (db: Db) => db.update(schema.members).set({ customFields: {} });
    `;
    const findings = scanMemberCustomFieldWrites('packages/domain/src/seed/seed.ts', src);
    expect(findings.length).toBe(1);
  });

  it('reports the LINE so a failure is actionable', () => {
    const src = `const a = 1;\nconst b = 2;\nexport const f = (db) => db.update(members).set({ customFields: {} });\n`;
    expect(scanMemberCustomFieldWrites('apps/jobs/src/x.ts', src)[0]?.line).toBe(3);
  });
});
