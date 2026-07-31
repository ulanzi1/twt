// Reports assembly harness — the Open/Closed proof + fail-closed authorization (Story 10.7, AC1/AC6).
//
// The 10.6 twin: (1) a BEHAVIORAL proof — two DIVERGENT fixture templates flow through the UNCHANGED
// `assembleReport`; (2) a SOURCE-TEXT proof — assemble.ts contains no `reportType === '…'` branch. Plus
// the fail-closed guards: unknown type throws, and an unauthorized actor is denied before `query`.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { AuthorizationDeniedError } from '../../src/errors.js';
import {
  UnknownReportTypeError,
  assembleReport,
  createReportRegistry,
  type ReportScopeCtx,
} from '../../src/reports/index.js';
import type { Db } from '../../src/db.js';
import { SUPER_ADMIN_GLOBAL_GRANT, fixtureAlpha, fixtureBeta } from './fixtures.js';

const DUMMY_DB = {} as Db; // the fixtures' query ignores the client (pure).
const PARIWAR = '11111111-1111-1111-1111-111111111111';

function authorizedCtx(): ReportScopeCtx {
  return {
    actorId: 'actor-1',
    grants: [{ ...SUPER_ADMIN_GLOBAL_GRANT }],
    pariwarId: PARIWAR,
    resolvedScope: { dimension: 'global', value: null },
  };
}

describe('assembleReport — Open/Closed', () => {
  it('runs TWO divergent fixture templates through the UNCHANGED harness (behavioral proof)', async () => {
    const registry = createReportRegistry([fixtureAlpha, fixtureBeta]);

    const alpha = await assembleReport(registry, 'fixture_alpha', authorizedCtx(), DUMMY_DB);
    expect(alpha.rowCount).toBe(2);
    expect(alpha.rows).toEqual([
      { a: 'one', n: 1 },
      { a: 'two', n: 2 },
    ]);
    expect(alpha.columns.map((c) => c.key)).toEqual(['a', 'n']);

    const beta = await assembleReport(registry, 'fixture_beta', authorizedCtx(), DUMMY_DB);
    expect(beta.rowCount).toBe(1);
    expect(beta.rows).toEqual([{ x: 'p', y: 'q', z: 'r' }]);
    expect(beta.columns.map((c) => c.key)).toEqual(['x', 'y', 'z']);
  });

  it('assemble.ts contains no reportType string-literal comparison (structural Open/Closed check)', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../src/reports/assemble.ts', import.meta.url)),
      'utf8',
    );
    expect(source).not.toMatch(/reportType\s*===\s*['"]/);
    expect(source).not.toMatch(/template\.reportType\s*===/);
  });

  it('throws UnknownReportTypeError for an unregistered reportType (fail-closed)', async () => {
    const registry = createReportRegistry([fixtureAlpha]);
    await expect(assembleReport(registry, 'ghost', authorizedCtx(), DUMMY_DB)).rejects.toThrow(
      UnknownReportTypeError,
    );
  });

  it('denies an unauthorized actor BEFORE running query (fail-closed authorization)', async () => {
    const registry = createReportRegistry([fixtureAlpha]);
    let queried = false;
    const spyTemplate = {
      ...fixtureAlpha,
      reportType: 'fixture_spy',
      query: (): Promise<{ a: string; n: number }[]> => {
        queried = true;
        return Promise.resolve([]);
      },
    };
    registry.register(spyTemplate);
    // An actor with NO grants cannot hold audit.export → denied.
    const ctx: ReportScopeCtx = {
      actorId: 'nobody',
      grants: [],
      pariwarId: PARIWAR,
      resolvedScope: { dimension: 'pariwar', value: PARIWAR },
    };
    await expect(assembleReport(registry, 'fixture_spy', ctx, DUMMY_DB)).rejects.toThrow(
      AuthorizationDeniedError,
    );
    expect(queried).toBe(false); // query never ran — denied first.
  });
});
