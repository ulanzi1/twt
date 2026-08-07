// scripts/schema-diff/lib.test.ts
//
// Fixture-driven unit tests for the schema-diff gate's pure core (lib.ts). No
// fs / git / DB — a DB-free story. Run via `pnpm schema:test` (root
// package.json); the `schema-diff` CI job runs these before `pnpm schema:check`.
// NOT discovered by `pnpm turbo run test` because scripts/schema-diff/ is not a
// pnpm workspace.
//
// NOTE (self-green / AC-3/AC-7): the forbidden strings below are embedded as
// in-test literals BY DESIGN — this is exactly why scripts/schema-diff/** is
// excluded from the gate's scan roots. These fixtures prove the scanners' teeth;
// they are not artifacts.

import { describe, expect, it } from 'vitest';

import {
  parseFr100Config,
  scanColumns,
  scanEndpoints,
  scanTables,
  scanZodSchemas,
  type Fr100Config,
} from './lib.js';

const SAMPLE_YAML = `
version: 1
patterns:
  forbidden_table: payout_destinations
  forbidden_column: payout_destination
  forbidden_endpoint: /payout-destinations
  forbidden_zod: PayoutDestination
allow: []
`;

const config: Fr100Config = parseFr100Config(SAMPLE_YAML);

// A config that allowlists the v2 greenfield artifacts (proves the allow path).
const allowingConfig: Fr100Config = parseFr100Config(`
version: 2
patterns:
  forbidden_table: payout_destinations
  forbidden_column: payout_destination
  forbidden_endpoint: /payout-destinations
  forbidden_zod: PayoutDestination
allow:
  - kind: table
    artifact: payout_destinations
    rationale: v2 Durghatana Sahayata greenfield surface
    adr: ADR-XXXX
  - kind: column
    artifact: payout_destination_id
    rationale: v2 greenfield
    adr: ADR-XXXX
  - kind: endpoint
    artifact: /payout-destinations
    rationale: v2 greenfield
    adr: ADR-XXXX
  - kind: zod
    artifact: PayoutDestinationSchema
    rationale: v2 greenfield
    adr: ADR-XXXX
`);

// ─── snapshot / DDL fixtures ─────────────────────────────────────────────────

const forbiddenTableSnapshot = {
  tables: {
    'public.payout_destinations': {
      name: 'payout_destinations',
      columns: { id: { name: 'id', type: 'uuid' } },
    },
  },
};

const forbiddenColumnSnapshot = {
  tables: {
    'public.members': {
      name: 'members',
      columns: {
        member_id: { name: 'member_id', type: 'uuid' },
        payout_destination_id: { name: 'payout_destination_id', type: 'uuid' },
      },
    },
  },
};

const compliantSnapshot = {
  tables: {
    'public.member_addresses': {
      name: 'member_addresses',
      columns: {
        address_id: { name: 'address_id', type: 'uuid' },
        mailing_address_id: { name: 'mailing_address_id', type: 'uuid' },
      },
    },
  },
};

const forbiddenTableSql = {
  path: 'packages/domain/migrations/9999_rogue.sql',
  text: 'CREATE TABLE IF NOT EXISTS "payout_destinations" (\n  "id" uuid PRIMARY KEY\n);',
};

const forbiddenColumnSql = {
  path: 'packages/domain/migrations/9999_rogue.sql',
  text: 'ALTER TABLE "members" ADD COLUMN "payout_destination_id" uuid;',
};

const compliantSql = {
  path: 'packages/domain/migrations/0099_member_addresses.sql',
  text: 'CREATE TABLE "member_addresses" (\n  "mailing_address_id" uuid\n);',
};

describe('parseFr100Config', () => {
  it('parses a valid registry (patterns + empty allow)', () => {
    expect(config.version).toBe(1);
    expect(config.patterns).toEqual({
      forbiddenTable: 'payout_destinations',
      forbiddenColumn: 'payout_destination',
      forbiddenEndpoint: '/payout-destinations',
      forbiddenZod: 'PayoutDestination',
    });
    expect(config.allow).toEqual([]);
  });

  it('parses an allow list with kind + artifact + rationale + adr', () => {
    expect(allowingConfig.allow).toHaveLength(4);
    expect(allowingConfig.allow[0]).toMatchObject({
      kind: 'table',
      artifact: 'payout_destinations',
      adr: 'ADR-XXXX',
    });
  });

  it('throws when patterns is missing (malformed registry fails loudly)', () => {
    expect(() => parseFr100Config('version: 1\nallow: []')).toThrow(/patterns. must be a mapping/);
  });

  it('throws when a forbidden pattern is not a string', () => {
    const bad = `
version: 1
patterns:
  forbidden_table: 123
  forbidden_column: payout_destination
  forbidden_endpoint: /payout-destinations
  forbidden_zod: PayoutDestination
`;
    expect(() => parseFr100Config(bad)).toThrow(
      /patterns.forbidden_table must be a non-empty string/,
    );
  });

  it('throws when version is non-numeric', () => {
    expect(() => parseFr100Config('version: one\npatterns: {}')).toThrow(
      /version. must be a number/,
    );
  });

  it('throws when allow is not a list', () => {
    const bad = `
version: 1
patterns:
  forbidden_table: payout_destinations
  forbidden_column: payout_destination
  forbidden_endpoint: /payout-destinations
  forbidden_zod: PayoutDestination
allow: {}
`;
    expect(() => parseFr100Config(bad)).toThrow(/allow. must be a list/);
  });

  it('throws when an allow entry has an invalid kind', () => {
    const bad = `
version: 1
patterns:
  forbidden_table: payout_destinations
  forbidden_column: payout_destination
  forbidden_endpoint: /payout-destinations
  forbidden_zod: PayoutDestination
allow:
  - kind: widget
    artifact: x
`;
    expect(() => parseFr100Config(bad)).toThrow(/allow\[0\].kind must be one of/);
  });
});

describe('scanTables (a)', () => {
  it('flags a forbidden table in the snapshot, naming the artifact', () => {
    const findings = scanTables(forbiddenTableSnapshot, [], config);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('table');
    expect(findings[0].artifact).toBe('payout_destinations');
    expect(findings[0].pattern).toBe('forbidden_table=payout_destinations');
  });

  it('flags a forbidden table in raw DDL, naming the migration file + line', () => {
    const findings = scanTables(null, [forbiddenTableSql], config);
    expect(findings).toHaveLength(1);
    expect(findings[0].location).toBe('packages/domain/migrations/9999_rogue.sql:1');
  });

  it('does NOT flag an unrelated table (member_addresses → no finding)', () => {
    expect(scanTables(compliantSnapshot, [compliantSql], config)).toEqual([]);
  });

  it('does NOT flag a forbidden table that is allowlisted (v2 greenfield admit)', () => {
    expect(scanTables(forbiddenTableSnapshot, [forbiddenTableSql], allowingConfig)).toEqual([]);
  });
});

describe('scanColumns (b)', () => {
  it('flags a forbidden column in the snapshot, naming table.column', () => {
    const findings = scanColumns(forbiddenColumnSnapshot, [], config);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('column');
    expect(findings[0].artifact).toBe('members.payout_destination_id');
  });

  it('flags a forbidden column in raw DDL, naming the migration file + line', () => {
    const findings = scanColumns(null, [forbiddenColumnSql], config);
    expect(findings).toHaveLength(1);
    expect(findings[0].artifact).toBe('payout_destination_id');
    expect(findings[0].location).toBe('packages/domain/migrations/9999_rogue.sql:1');
  });

  it('does NOT flag the plural table name as a column in raw DDL (scanTables owns it)', () => {
    expect(scanColumns(forbiddenTableSnapshot, [forbiddenTableSql], config)).toEqual([]);
  });

  it('does NOT flag an unrelated column (mailing_address_id → no finding)', () => {
    expect(scanColumns(compliantSnapshot, [compliantSql], config)).toEqual([]);
  });

  // ── Comments + string literals are not identifiers (Story 10.12) ────────────────────────────────
  //
  // ⚠ THE FALSE POSITIVE THESE CLOSE HAD AN ABSURD SHAPE. Migration 0095 adds a CHECK constraint
  // that FORBIDS a tenant-authored custom field named `payout_destination*` — the DB half of Story
  // 10.12's governance fence — and explains itself in a comment. The gate flagged that prohibition,
  // twice, as though it were a payout-destination column: it reported its own enforcement as a
  // violation of itself. See `scannableDdl`'s header for the fixes that were rejected.

  it('does NOT flag the pattern inside a single-quoted LIKE pattern (a CHECK that FORBIDS it)', () => {
    const sql = {
      path: 'packages/domain/migrations/0095_x.sql',
      text: `ALTER TABLE t ADD CONSTRAINT t_ck CHECK (lower("field_key") NOT LIKE 'payout\\_destination%');`,
    };
    expect(scanColumns(null, [sql], config)).toEqual([]);
  });

  it('does NOT flag the pattern inside a `--` comment', () => {
    const sql = {
      path: 'packages/domain/migrations/0095_x.sql',
      text: `-- What this MUST cover is the payout_destination* family (FR-100 Hook 2).\nCREATE TABLE t (id uuid);`,
    };
    expect(scanColumns(null, [sql], config)).toEqual([]);
  });

  it('⚠ REVERT-SANITY: a real column on the SAME LINE as a comment is still flagged', () => {
    // The narrowing must not become "ignore any line containing a comment".
    const sql = {
      path: 'packages/domain/migrations/9999_rogue.sql',
      text: `ALTER TABLE members ADD COLUMN payout_destination_id uuid; -- harmless-looking note`,
    };
    const findings = scanColumns(null, [sql], config);
    expect(findings).toHaveLength(1);
    expect(findings[0].artifact).toBe('payout_destination_id');
  });

  it('⚠ REVERT-SANITY: DYNAMIC DDL inside a literal is STILL scanned', () => {
    // The one case where a single-quoted literal really can create a column. Masking literals must
    // not open this route — it is the only way the narrowing above could weaken the gate.
    const sql = {
      path: 'packages/domain/migrations/9999_rogue.sql',
      text: `EXECUTE 'ALTER TABLE members ADD COLUMN payout_destination_id uuid';`,
    };
    const findings = scanColumns(null, [sql], config);
    expect(findings).toHaveLength(1);
    expect(findings[0].artifact).toBe('payout_destination_id');
  });

  it('⚠ REVERT-SANITY: a bare identifier is still flagged (the masking is not a blanket skip)', () => {
    const sql = {
      path: 'packages/domain/migrations/9999_rogue.sql',
      text: `CREATE INDEX i ON t (payout_destination_ref);`,
    };
    expect(scanColumns(null, [sql], config)).toHaveLength(1);
  });

  it('does NOT flag a forbidden column that is allowlisted', () => {
    expect(scanColumns(forbiddenColumnSnapshot, [forbiddenColumnSql], allowingConfig)).toEqual([]);
  });
});

describe('scanEndpoints (c)', () => {
  const forbiddenRoute = {
    path: 'apps/api/src/modules/payouts/payout.routes.ts',
    text: "r.post('/payout-destinations', handler);\nr.get('/payout-destinations/:id', handler);",
  };
  const compliantRoute = {
    path: 'apps/api/src/modules/members/member.routes.ts',
    text: "r.get('/api/v1/members', handler);\nr.post('/api/v1/members/:id/addresses', handler);",
  };

  it('flags a forbidden endpoint literal, naming the file + line + literal', () => {
    const findings = scanEndpoints([forbiddenRoute], config);
    expect(findings).toHaveLength(2);
    expect(findings[0].kind).toBe('endpoint');
    expect(findings[0].artifact).toBe('/payout-destinations');
    expect(findings[0].location).toBe('apps/api/src/modules/payouts/payout.routes.ts:1');
    expect(findings[1].artifact).toBe('/payout-destinations/:id');
  });

  it('does NOT flag unrelated route literals (/api/v1/members → no finding)', () => {
    expect(scanEndpoints([compliantRoute], config)).toEqual([]);
  });

  it('does NOT flag a forbidden endpoint that is allowlisted', () => {
    const onlyExact = {
      path: 'apps/api/src/x.ts',
      text: "r.post('/payout-destinations', handler);",
    };
    expect(scanEndpoints([onlyExact], allowingConfig)).toEqual([]);
  });
});

describe('scanZodSchemas (d)', () => {
  const forbiddenZod = {
    path: 'packages/contracts/src/payouts/index.ts',
    text: 'export const PayoutDestinationSchema = z.object({});\nexport type PayoutDestination = z.infer<typeof PayoutDestinationSchema>;',
  };
  const compliantZod = {
    path: 'packages/contracts/src/members/index.ts',
    text: 'export const MemberAddressSchema = z.object({});\nexport type MemberAddress = z.infer<typeof MemberAddressSchema>;',
  };

  it('flags a forbidden Zod export, naming the file + line + export name', () => {
    const findings = scanZodSchemas([forbiddenZod], config);
    expect(findings).toHaveLength(2);
    expect(findings[0].kind).toBe('zod');
    expect(findings[0].artifact).toBe('PayoutDestinationSchema');
    expect(findings[0].location).toBe('packages/contracts/src/payouts/index.ts:1');
    expect(findings[1].artifact).toBe('PayoutDestination');
  });

  it('does NOT flag an unrelated export (MemberAddressSchema → no finding)', () => {
    expect(scanZodSchemas([compliantZod], config)).toEqual([]);
  });

  it('does NOT flag a forbidden Zod export that is allowlisted', () => {
    const onlyExact = {
      path: 'packages/contracts/src/x.ts',
      text: 'export const PayoutDestinationSchema = z.object({});',
    };
    expect(scanZodSchemas([onlyExact], allowingConfig)).toEqual([]);
  });
});
