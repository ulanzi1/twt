// scripts/benefit-mechanism/lib.test.ts
//
// Fixture-driven unit tests for the benefit-mechanism gate's pure core (lib.ts).
// No fs / git / DB — a DB-free story. Run via `pnpm benefit:test` (root
// package.json); the `benefit-mechanism` CI job runs these before
// `pnpm benefit:check`. NOT discovered by `pnpm turbo run test` because
// scripts/benefit-mechanism/ is not a pnpm workspace.
//
// NOTE (self-green / AC-7): the keywords below (`benefit_mechanism`, `pool`,
// `reserve`) are embedded as in-test literals BY DESIGN — this is exactly why
// scripts/benefit-mechanism/** is excluded from the gate's scan sources. These
// fixtures prove the engine's teeth; they are not rule records.

import { describe, expect, it } from 'vitest';

import {
  type BenefitMechanismConfig,
  type RuleRecord,
  checkEnumDefinition,
  enumMatchesMechanisms,
  extractFromJsonSeed,
  extractFromSqlInserts,
  parseBenefitMechanismConfig,
  scanRuleTableColumns,
  validateRuleRecord,
  validateRuleRecords,
} from './lib.js';

const SAMPLE_YAML = `
version: 1
mechanisms: [pool, reserve]
v1_only: true
v1_permitted: [pool]
rule_sources:
  tables: [clause_versions]
  seed_globs: []
  fixture_globs: []
`;

const config: BenefitMechanismConfig = parseBenefitMechanismConfig(SAMPLE_YAML);

// A v2 config that has flipped the flag (reserve now permitted).
const v2Config: BenefitMechanismConfig = parseBenefitMechanismConfig(`
version: 2
mechanisms: [pool, reserve]
v1_only: false
v1_permitted: [pool, reserve]
rule_sources:
  tables: [clause_versions]
  seed_globs: []
  fixture_globs: []
`);

// ─── parseBenefitMechanismConfig ─────────────────────────────────────────────

describe('parseBenefitMechanismConfig', () => {
  it('parses a valid registry into a typed config', () => {
    expect(config.version).toBe(1);
    expect(config.mechanisms).toEqual(['pool', 'reserve']);
    expect(config.v1Only).toBe(true);
    expect(config.v1Permitted).toEqual(['pool']);
    expect(config.ruleSources).toEqual({
      tables: ['clause_versions'],
      seedGlobs: [],
      fixtureGlobs: [],
    });
  });

  it('defaults an omitted rule_sources to empty arrays', () => {
    const c = parseBenefitMechanismConfig(`
version: 1
mechanisms: [pool, reserve]
v1_only: true
v1_permitted: [pool]
`);
    expect(c.ruleSources).toEqual({ tables: [], seedGlobs: [], fixtureGlobs: [] });
  });

  it('throws when version is non-numeric', () => {
    expect(() => parseBenefitMechanismConfig('version: one\nmechanisms: [pool]')).toThrow(
      /version. must be a number/,
    );
  });

  it('throws when mechanisms is missing (malformed registry fails loudly)', () => {
    expect(() =>
      parseBenefitMechanismConfig('version: 1\nv1_only: true\nv1_permitted: []'),
    ).toThrow(/mechanisms. must be a list/);
  });

  it('throws when mechanisms is empty', () => {
    expect(() =>
      parseBenefitMechanismConfig('version: 1\nmechanisms: []\nv1_only: true\nv1_permitted: []'),
    ).toThrow(/mechanisms. must be a non-empty list/);
  });

  it('throws when v1_only is not a boolean', () => {
    expect(() =>
      parseBenefitMechanismConfig(
        'version: 1\nmechanisms: [pool, reserve]\nv1_only: yes-please\nv1_permitted: [pool]',
      ),
    ).toThrow(/v1_only. must be a boolean/);
  });

  it('throws when a v1_permitted value is not one of mechanisms', () => {
    expect(() =>
      parseBenefitMechanismConfig(
        'version: 1\nmechanisms: [pool, reserve]\nv1_only: true\nv1_permitted: [death]',
      ),
    ).toThrow(/v1_permitted value 'death' is not one of mechanisms/);
  });

  it('throws when v1_only is absent (missing field)', () => {
    expect(() =>
      parseBenefitMechanismConfig(
        'version: 1\nmechanisms: [pool, reserve]\nv1_permitted: [pool]',
      ),
    ).toThrow(/v1_only. must be a boolean/);
  });

  it('throws when v1_permitted is absent (missing field)', () => {
    expect(() =>
      parseBenefitMechanismConfig(
        'version: 1\nmechanisms: [pool, reserve]\nv1_only: true',
      ),
    ).toThrow(/v1_permitted. must be a list/);
  });

  it('throws when v1_permitted is empty and v1_only is true (incoherent)', () => {
    expect(() =>
      parseBenefitMechanismConfig(
        'version: 1\nmechanisms: [pool, reserve]\nv1_only: true\nv1_permitted: []',
      ),
    ).toThrow(/v1_permitted. must be non-empty when .v1_only. is true/);
  });

  it('throws on an unknown top-level key (strict parsing)', () => {
    expect(() =>
      parseBenefitMechanismConfig(
        'version: 1\nmechanisms: [pool, reserve]\nv1_only: true\nv1_permitted: [pool]\nmachanism: typo',
      ),
    ).toThrow(/unknown key 'machanism'/);
  });
});

// ─── check (a): validateRuleRecord(s) ────────────────────────────────────────

describe('validateRuleRecord (a)', () => {
  it('flags an untagged rule record, naming it', () => {
    const r: RuleRecord = { id: 'R5', _source: 'seed/rules.sql', _line: 12 };
    const findings = validateRuleRecord(r, config);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('rule-tag');
    expect(findings[0].artifact).toBe('R5');
    expect(findings[0].location).toBe('seed/rules.sql:12');
    expect(findings[0].detail).toMatch(/missing the required benefit_mechanism tag/);
  });

  it('flags an out-of-enum value (death), naming the rule', () => {
    const r: RuleRecord = { id: 'R7', benefit_mechanism: 'death', _source: 'seed/rules.sql' };
    const findings = validateRuleRecord(r, config);
    expect(findings).toHaveLength(1);
    expect(findings[0].detail).toMatch(/benefit_mechanism='death' is not one of pool . reserve/);
  });

  it('flags a reserve tag while v1_only (greenfield-only at v1)', () => {
    const r: RuleRecord = { id: 'R9', benefit_mechanism: 'reserve', _source: 'seed/rules.sql' };
    const findings = validateRuleRecord(r, config);
    expect(findings).toHaveLength(1);
    expect(findings[0].detail).toMatch(/not permitted while v1_only/);
  });

  it('flags a non-string tag', () => {
    const r: RuleRecord = { id: 'R10', benefit_mechanism: 42, _source: 'seed/rules.json' };
    expect(validateRuleRecord(r, config)[0].detail).toMatch(/must be a string, got number/);
  });

  it('accepts a pool-tagged record while v1_only (clean)', () => {
    const r: RuleRecord = { id: 'R5', benefit_mechanism: 'pool', _source: 'seed/rules.sql' };
    expect(validateRuleRecord(r, config)).toEqual([]);
  });

  it('accepts a reserve-tagged record once the v2 flag is flipped', () => {
    const r: RuleRecord = { id: 'DS1', benefit_mechanism: 'reserve', _source: 'seed/rules.sql' };
    expect(validateRuleRecord(r, v2Config)).toEqual([]);
  });

  it('validateRuleRecords no-ops over an empty record set (v1)', () => {
    expect(validateRuleRecords([], config)).toEqual([]);
  });

  it('validateRuleRecords accumulates findings across records', () => {
    const records: RuleRecord[] = [
      { id: 'R5', benefit_mechanism: 'pool', _source: 's.sql' },
      { id: 'R7', _source: 's.sql' },
      { id: 'R9', benefit_mechanism: 'reserve', _source: 's.sql' },
    ];
    expect(validateRuleRecords(records, config)).toHaveLength(2);
  });
});

// ─── check (b): enumMatchesMechanisms + checkEnumDefinition ───────────────────

describe('enumMatchesMechanisms (b)', () => {
  it('matches regardless of order', () => {
    expect(enumMatchesMechanisms(['reserve', 'pool'], config)).toBe(true);
  });

  it('rejects a missing value', () => {
    expect(enumMatchesMechanisms(['pool'], config)).toBe(false);
  });

  it('rejects an extra value', () => {
    expect(enumMatchesMechanisms(['pool', 'reserve', 'trust'], config)).toBe(false);
  });
});

describe('checkEnumDefinition (b) — against the real shipped enum', () => {
  it('the shipped BenefitMechanism enum matches the v1 config (no finding)', async () => {
    expect(await checkEnumDefinition(config)).toEqual([]);
  });

  it('flags drift when the config disagrees with the shipped enum', async () => {
    const drifted = parseBenefitMechanismConfig(`
version: 99
mechanisms: [pool]
v1_only: true
v1_permitted: [pool]
`);
    const findings = await checkEnumDefinition(drifted);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('enum-drift');
    expect(findings[0].artifact).toBe('BenefitMechanism');
  });
});

// ─── check (c): scanRuleTableColumns ─────────────────────────────────────────

describe('scanRuleTableColumns (c)', () => {
  const taggedTableSnapshot = {
    tables: {
      'public.clause_versions': {
        name: 'clause_versions',
        columns: {
          clause_version_id: { name: 'clause_version_id', type: 'uuid' },
          benefit_mechanism: { name: 'benefit_mechanism', type: 'benefit_mechanism' },
        },
      },
    },
  };

  const untaggedTableSnapshot = {
    tables: {
      'public.clause_versions': {
        name: 'clause_versions',
        columns: {
          clause_version_id: { name: 'clause_version_id', type: 'uuid' },
          body: { name: 'body', type: 'text' },
        },
      },
    },
  };

  const absentTableSnapshot = {
    tables: {
      'public.members': { name: 'members', columns: { id: { name: 'id', type: 'uuid' } } },
    },
  };

  it('flags the rule table when it lacks the benefit_mechanism column', () => {
    const findings = scanRuleTableColumns(untaggedTableSnapshot, config);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('schema-column');
    expect(findings[0].artifact).toBe('clause_versions');
    expect(findings[0].detail).toMatch(/missing the required benefit_mechanism column/);
  });

  it('does NOT flag the rule table once it carries the column', () => {
    expect(scanRuleTableColumns(taggedTableSnapshot, config)).toEqual([]);
  });

  it('no-ops when the rule table is absent from the snapshot (v1)', () => {
    expect(scanRuleTableColumns(absentTableSnapshot, config)).toEqual([]);
  });

  it('no-ops on a null snapshot (no migrations meta yet)', () => {
    expect(scanRuleTableColumns(null, config)).toEqual([]);
  });

  it('finds the column when its key is schema-qualified (public.benefit_mechanism)', () => {
    const snapshot = {
      tables: {
        'public.clause_versions': {
          name: 'clause_versions',
          columns: {
            'public.clause_version_id': { name: 'clause_version_id', type: 'uuid' },
            'public.benefit_mechanism': { name: 'benefit_mechanism', type: 'benefit_mechanism' },
          },
        },
      },
    };
    expect(scanRuleTableColumns(snapshot, config)).toEqual([]);
  });

  it('matches the rule table case-insensitively', () => {
    const snapshot = {
      tables: {
        'public.Clause_Versions': {
          name: 'Clause_Versions',
          columns: {
            benefit_mechanism: { name: 'benefit_mechanism', type: 'benefit_mechanism' },
          },
        },
      },
    };
    expect(scanRuleTableColumns(snapshot, config)).toEqual([]);
  });
});

// ─── extractors ──────────────────────────────────────────────────────────────

describe('extractFromSqlInserts', () => {
  it('extracts a tagged rule record from an INSERT into the rule table', () => {
    const sql = {
      path: 'packages/domain/migrations/0099_rules.sql',
      text: "INSERT INTO clause_versions (rule_id, benefit_mechanism) VALUES ('R5', 'pool');",
    };
    const records = extractFromSqlInserts([sql], config);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: 'R5',
      benefit_mechanism: 'pool',
      _source: 'packages/domain/migrations/0099_rules.sql',
      _line: 1,
    });
  });

  it('extracts an untagged record (missing column) → check (a) then flags it', () => {
    const sql = {
      path: 'm.sql',
      text: "INSERT INTO clause_versions (rule_id, body) VALUES ('R7', 'x');",
    };
    const records = extractFromSqlInserts([sql], config);
    expect(records[0].benefit_mechanism).toBeUndefined();
    expect(validateRuleRecords(records, config)).toHaveLength(1);
  });

  it('handles quoted identifiers and reports the value', () => {
    const sql = {
      path: 'm.sql',
      text: 'INSERT INTO "clause_versions" ("rule_id", "benefit_mechanism") VALUES (\'R8\', \'reserve\');',
    };
    const records = extractFromSqlInserts([sql], config);
    expect(records[0]).toMatchObject({ id: 'R8', benefit_mechanism: 'reserve' });
  });

  it('ignores INSERTs into tables not in rule_sources.tables', () => {
    const sql = {
      path: 'm.sql',
      text: "INSERT INTO members (id, name) VALUES ('m1', 'Asha');",
    };
    expect(extractFromSqlInserts([sql], config)).toEqual([]);
  });

  it('no-ops when rule_sources.tables is empty (no configured rule table)', () => {
    const noTables = parseBenefitMechanismConfig(
      'version: 1\nmechanisms: [pool, reserve]\nv1_only: true\nv1_permitted: [pool]',
    );
    const sql = {
      path: 'm.sql',
      text: "INSERT INTO clause_versions (rule_id, benefit_mechanism) VALUES ('R5', 'pool');",
    };
    expect(extractFromSqlInserts([sql], noTables)).toEqual([]);
  });

  it('extracts all rows from a multi-row VALUES clause', () => {
    const sql = {
      path: 'm.sql',
      text:
        "INSERT INTO clause_versions (rule_id, benefit_mechanism) VALUES " +
        "('R5', 'pool'), ('R7', 'pool'), ('R9', 'reserve');",
    };
    const records = extractFromSqlInserts([sql], config);
    expect(records).toHaveLength(3);
    expect(records.map((r) => r.id)).toEqual(['R5', 'R7', 'R9']);
    expect(records.map((r) => r.benefit_mechanism)).toEqual(['pool', 'pool', 'reserve']);
  });

  it('extracts from a schema-qualified INSERT (public.clause_versions)', () => {
    const sql = {
      path: 'm.sql',
      text: "INSERT INTO public.clause_versions (rule_id, benefit_mechanism) VALUES ('R5', 'pool');",
    };
    const records = extractFromSqlInserts([sql], config);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ id: 'R5', benefit_mechanism: 'pool' });
  });

  it('extracts from a fully double-quoted schema-qualified INSERT', () => {
    const sql = {
      path: 'm.sql',
      text: 'INSERT INTO "public"."clause_versions" ("rule_id", "benefit_mechanism") VALUES (\'R8\', \'pool\');',
    };
    const records = extractFromSqlInserts([sql], config);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ id: 'R8', benefit_mechanism: 'pool' });
  });

  it('handles a value string containing a closing parenthesis', () => {
    const sql = {
      path: 'm.sql',
      text: "INSERT INTO clause_versions (rule_id, benefit_mechanism, body) VALUES ('R5', 'pool', 'rule(v2)');",
    };
    const records = extractFromSqlInserts([sql], config);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ id: 'R5', benefit_mechanism: 'pool' });
  });

  it('handles a multi-line INSERT statement', () => {
    const sql = {
      path: 'm.sql',
      text:
        'INSERT INTO clause_versions\n' +
        '  (rule_id, benefit_mechanism)\n' +
        "  VALUES\n  ('R5', 'pool');",
    };
    const records = extractFromSqlInserts([sql], config);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ id: 'R5', benefit_mechanism: 'pool' });
  });
});

describe('extractFromJsonSeed', () => {
  it('extracts records from a top-level JSON array', () => {
    const json = {
      path: 'seed/rules.json',
      text: JSON.stringify([
        { rule_id: 'R5', benefit_mechanism: 'pool' },
        { rule_id: 'R9', benefit_mechanism: 'reserve' },
      ]),
    };
    const records = extractFromJsonSeed([json], config);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ id: 'R5', benefit_mechanism: 'pool' });
    // check (a) then flags the reserve-while-v1_only record.
    expect(validateRuleRecords(records, config)).toHaveLength(1);
  });

  it('extracts records from a wrapper object with an array field', () => {
    const json = {
      path: 'seed/rules.json',
      text: JSON.stringify({ rules: [{ rule_id: 'R7' }] }),
    };
    const records = extractFromJsonSeed([json], config);
    expect(records).toHaveLength(1);
    expect(records[0].benefit_mechanism).toBeUndefined();
  });

  it('extracts a single record object that carries the tag', () => {
    const json = {
      path: 'seed/r.json',
      text: JSON.stringify({ id: 'R5', benefit_mechanism: 'pool' }),
    };
    expect(extractFromJsonSeed([json], config)).toHaveLength(1);
  });

  it('throws loudly on malformed JSON', () => {
    expect(() => extractFromJsonSeed([{ path: 'bad.json', text: '{not json' }], config)).toThrow(
      /failed to parse JSON seed bad.json/,
    );
  });
});
