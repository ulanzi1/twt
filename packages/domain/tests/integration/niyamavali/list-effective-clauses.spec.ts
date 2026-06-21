// listEffectiveClauses — live-DB integration (Story 2.5, Task 4; AC2, AC8).
//
// The public-render read: for each clause_id in a Pariwar, the latest NON-deprecated
// version effective at `asOf`. Drives the accessor against real Postgres under
// PARIWAR_A scope inside the per-test BEGIN/ROLLBACK (nothing persists). Seeding
// happens BEFORE entering app scope (as the Docker superuser, RLS bypassed) so rows
// for BOTH tenants land; the scoped read then proves RLS + the explicit predicate
// keep the result to PARIWAR_A's effective set.
//
// Per [[project_live_db_test_gotchas]]: assert MEMBERSHIP (by clause_id → version),
// not exact counts — own-committing writers elsewhere can accumulate rows; the
// cross-tenant assertion below is the isolation guard.

import { describe, expect, it } from 'vitest';

import { listEffectiveClauses } from '../../../src/niyamavali/index.js';
import { hasDatabase, getTx, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClauseVersion } from '../_helpers.js';

// Distinct clause_ids so DISTINCT ON has multiple groups to collapse.
const A = 'niy.contribution-discipline.r7-a';
const B = 'niy.ninety-percent-rule.r8';
const C = 'niy.special-death.r9-suicide-murder';
const D = 'niy.future.r10';

const D1 = new Date('2025-01-01T00:00:00Z');
const D2 = new Date('2025-06-01T00:00:00Z');
const BETWEEN = new Date('2025-03-01T00:00:00Z');
const FUTURE = new Date('2999-01-01T00:00:00Z');

/** Map the result rows to a {clauseId → version} membership view for stable asserts. */
function byClause(rows: { clauseId: string; version: number }[]): Record<string, number> {
  return Object.fromEntries(rows.map((r) => [r.clauseId, r.version]));
}

describe.skipIf(!hasDatabase)('listEffectiveClauses (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('returns the latest effective non-deprecated version per clause_id (AC2)', async () => {
    const { tx, client } = getTx();
    // Clause A: two non-deprecated versions; v2 is the latest effective at now.
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: A, version: 1, effectiveDate: D1 });
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: A, version: 2, effectiveDate: D2 });
    // Clause B: a single effective version.
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: B, version: 1, effectiveDate: D1 });

    await enterAppScope(client, PARIWAR_A);
    const rows = await listEffectiveClauses(tx, PARIWAR_A);
    const view = byClause(rows);

    expect(view[A]).toBe(2); // latest version wins
    expect(view[B]).toBe(1);
  });

  it('asOf rewinds the effective set (a not-yet-effective version is invisible)', async () => {
    const { tx, client } = getTx();
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: A, version: 1, effectiveDate: D1 });
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: A, version: 2, effectiveDate: D2 });

    await enterAppScope(client, PARIWAR_A);
    const rows = await listEffectiveClauses(tx, PARIWAR_A, BETWEEN);
    expect(byClause(rows)[A]).toBe(1); // v2 (eff D2) not yet effective at BETWEEN → v1
  });

  it('excludes a deprecated clause (its only version is retired) — AC2', async () => {
    const { tx, client } = getTx();
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: B, version: 1, effectiveDate: D1 });
    await seedClauseVersion(tx, PARIWAR_A, {
      clauseId: C,
      version: 1,
      effectiveDate: D1,
      deprecatedAt: D2,
    });

    await enterAppScope(client, PARIWAR_A);
    const view = byClause(await listEffectiveClauses(tx, PARIWAR_A));
    expect(view[B]).toBe(1);
    expect(view[C]).toBeUndefined(); // deprecated → absent from the effective set
  });

  it('excludes a future-effective clause at now()', async () => {
    const { tx, client } = getTx();
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: B, version: 1, effectiveDate: D1 });
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: D, version: 1, effectiveDate: FUTURE });

    await enterAppScope(client, PARIWAR_A);
    const view = byClause(await listEffectiveClauses(tx, PARIWAR_A));
    expect(view[B]).toBe(1);
    expect(view[D]).toBeUndefined(); // not yet effective → absent
  });

  it('is tenant-isolated: a second Pariwar’s clauses never appear (AC8)', async () => {
    const { tx, client } = getTx();
    // Same clause_id slug seeded for BOTH tenants, different versions, before scope.
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: A, version: 1, effectiveDate: D1 });
    await seedClauseVersion(tx, PARIWAR_B, { clauseId: A, version: 9, effectiveDate: D1 });

    await enterAppScope(client, PARIWAR_A);
    const rows = await listEffectiveClauses(tx, PARIWAR_A);
    // Only PARIWAR_A's row (version 1) is visible; PARIWAR_B's version 9 is not.
    expect(byClause(rows)[A]).toBe(1);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
  });

  it('returns an empty array for a Pariwar with no effective clauses', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    expect(await listEffectiveClauses(tx, PARIWAR_A)).toEqual([]);
  });
});
