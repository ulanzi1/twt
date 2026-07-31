// Reports-library test fixtures — Story 10.7 (Task 8).
//
// Two DIVERGENT report templates for the Open/Closed proof: they differ in reportType, permissionKey,
// scopeDimension, columns, query shape, and row mappers — yet both flow through the UNCHANGED
// `assembleReport` harness. Their `query` is pure (ignores the client) so the proof needs no DB.

import type { ReportTemplate } from '../../src/reports/index.js';

type AlphaRow = { a: string; n: number };
type BetaRow = { x: string; y: string; z: string };

/** Fixture A — two columns, `audit.export` key, pariwar scope. */
export const fixtureAlpha: ReportTemplate<AlphaRow> = {
  reportType: 'fixture_alpha',
  permissionKey: 'audit.export',
  scopeDimension: 'pariwar',
  auditAction: 'report.generated',
  columns: [
    { key: 'a', header: 'A', piiTier: 3 },
    { key: 'n', header: 'N', piiTier: 3 },
  ],
  // Pure: ignores the client, returns canned rows (the proof is about the HARNESS, not a query).
  query: (): Promise<AlphaRow[]> =>
    Promise.resolve([
      { a: 'one', n: 1 },
      { a: 'two', n: 2 },
    ]),
  csvRow: (r) => ({ a: r.a, n: String(r.n) }),
  jsonRow: (r) => ({ a: r.a, n: r.n }),
};

/** Fixture B — three DIFFERENT columns, a DIFFERENT key + dimension, DIFFERENT row shape. */
export const fixtureBeta: ReportTemplate<BetaRow> = {
  reportType: 'fixture_beta',
  permissionKey: 'member.export_roster',
  scopeDimension: 'district',
  auditAction: 'report.generated',
  columns: [
    { key: 'x', header: 'X', piiTier: 3 },
    { key: 'y', header: 'Y', piiTier: 2 },
    { key: 'z', header: 'Z', piiTier: 3 },
  ],
  query: (): Promise<BetaRow[]> =>
    Promise.resolve([{ x: 'p', y: 'q', z: 'r' }]),
  csvRow: (r) => ({ x: r.x, y: r.y, z: r.z }),
  jsonRow: (r) => ({ x: r.x, y: r.y, z: r.z }),
};

/** A super-admin global grant — holds every catalog key at global scope (authorizes any fixture). */
export const SUPER_ADMIN_GLOBAL_GRANT = {
  pariwarId: '00000000-0000-0000-0000-0000000000aa',
  role: 'super_admin',
  scopeDimension: 'global' as const,
  scopeValue: null,
};
