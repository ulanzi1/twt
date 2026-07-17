// Canonical-identifier allocator — live-DB specs (Story 7.2, Tasks 2/3; AC1).
//
// The IO half of pool/naming.ts: the per-(pariwar_id, period) counter bump behind
// `P-YYYY-MM-###`. The PURE half (the formatter grammar) is covered DB-free in
// tests/pool/naming.test.ts; what needs a real Postgres is the ATOMICITY + the
// tenant/period partitioning of the counter itself.
//
// The two-connection concurrency race lives in pool-canonical-allocator-concurrency.spec.ts
// (own-committing — a real race needs real concurrent COMMITs, which the per-test
// ROLLBACK harness here structurally cannot produce).

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { pariwarId as toPariwarId } from '../../../src/ids/index.js';
import {
  MAX_CANONICAL_IDENTIFIER_ALLOCATION,
  allocateCanonicalIdentifierRange,
  poolCounterPeriod,
} from '../../../src/pool/naming.js';
import { poolCanonicalCounters } from '../../../src/schema/pool_canonical_counters.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const MAY_2026 = { year: 2026, month: 5 };

describe.skipIf(!hasDatabase)('allocateCanonicalIdentifierRange — counter allocation', () => {
  setupLiveDb();

  it('the first allocation of a month starts at 001 (the UX reference example)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const ids = await allocateCanonicalIdentifierRange(tx, {
      pariwarId: PARIWAR_A,
      freezeMonth: MAY_2026,
      count: 1,
    });
    expect(ids).toEqual(['P-2026-05-001']);
  });

  it('allocates a CONTIGUOUS range of N in one call, in sequence order', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const ids = await allocateCanonicalIdentifierRange(tx, {
      pariwarId: PARIWAR_A,
      freezeMonth: MAY_2026,
      count: 5,
    });
    expect(ids).toEqual([
      'P-2026-05-001',
      'P-2026-05-002',
      'P-2026-05-003',
      'P-2026-05-004',
      'P-2026-05-005',
    ]);
  });

  it('sequential calls never re-issue a sequence (the counter is monotonic)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const first = await allocateCanonicalIdentifierRange(tx, {
      pariwarId: PARIWAR_A,
      freezeMonth: MAY_2026,
      count: 3,
    });
    const second = await allocateCanonicalIdentifierRange(tx, {
      pariwarId: PARIWAR_A,
      freezeMonth: MAY_2026,
      count: 2,
    });
    expect(first).toEqual(['P-2026-05-001', 'P-2026-05-002', 'P-2026-05-003']);
    expect(second).toEqual(['P-2026-05-004', 'P-2026-05-005']);
    // Disjoint — the load-bearing property.
    expect(new Set([...first, ...second]).size).toBe(5);
  });

  it('leaves the counter row pointing at the NEXT free sequence', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await allocateCanonicalIdentifierRange(tx, { pariwarId: PARIWAR_A, freezeMonth: MAY_2026, count: 4 });

    const rows = await tx
      .select()
      .from(poolCanonicalCounters)
      .where(eq(poolCanonicalCounters.period, poolCounterPeriod(MAY_2026)));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.nextSequence).toBe(5);
  });

  it('the ### counter RESETS per month (P-2026-05-001 and P-2026-06-001 coexist)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const may = await allocateCanonicalIdentifierRange(tx, {
      pariwarId: PARIWAR_A,
      freezeMonth: MAY_2026,
      count: 2,
    });
    const june = await allocateCanonicalIdentifierRange(tx, {
      pariwarId: PARIWAR_A,
      freezeMonth: { year: 2026, month: 6 },
      count: 2,
    });
    expect(may).toEqual(['P-2026-05-001', 'P-2026-05-002']);
    expect(june).toEqual(['P-2026-06-001', 'P-2026-06-002']);
  });

  it('counters are PER-PARIWAR: tenant B is unaffected by tenant A burning sequences', async () => {
    // Two separate scoped transactions — the RLS predicate is per-tenant, so B's counter
    // is a different row entirely and starts fresh at 001.
    {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await allocateCanonicalIdentifierRange(tx, { pariwarId: PARIWAR_A, freezeMonth: MAY_2026, count: 9 });
    }
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_B);
    const bIds = await allocateCanonicalIdentifierRange(tx, {
      pariwarId: PARIWAR_B,
      freezeMonth: MAY_2026,
      count: 1,
    });
    expect(bIds).toEqual(['P-2026-05-001']);
  });

  it('honours a per-Pariwar format override against a live counter', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const ids = await allocateCanonicalIdentifierRange(tx, {
      pariwarId: PARIWAR_A,
      freezeMonth: MAY_2026,
      count: 2,
      format: 'POOL/YYYY/MM/###',
    });
    expect(ids).toEqual(['POOL/2026/05/001', 'POOL/2026/05/002']);
  });

  it('rejects a bad count BEFORE bumping the counter (no wasted sequences)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await expect(
      allocateCanonicalIdentifierRange(tx, { pariwarId: PARIWAR_A, freezeMonth: MAY_2026, count: 0 }),
    ).rejects.toThrow(/count must be an integer in/);

    // The counter row must not exist — a rejected call cannot consume a sequence.
    const rows = await tx
      .select()
      .from(poolCanonicalCounters)
      .where(eq(poolCanonicalCounters.period, poolCounterPeriod(MAY_2026)));
    expect(rows).toHaveLength(0);
  });

  it('rejects a count above the allocation ceiling BEFORE bumping the counter', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await expect(
      allocateCanonicalIdentifierRange(tx, {
        pariwarId: PARIWAR_A,
        freezeMonth: MAY_2026,
        count: MAX_CANONICAL_IDENTIFIER_ALLOCATION + 1,
      }),
    ).rejects.toThrow(/count must be an integer in/);

    const rows = await tx
      .select()
      .from(poolCanonicalCounters)
      .where(eq(poolCanonicalCounters.period, poolCounterPeriod(MAY_2026)));
    expect(rows).toHaveLength(0);
  });

  it('rejects a malformed per-Pariwar format override BEFORE bumping the counter', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await expect(
      allocateCanonicalIdentifierRange(tx, {
        pariwarId: PARIWAR_A,
        freezeMonth: MAY_2026,
        count: 3,
        format: 'P-YYYY-YYYY-MM-###', // repeated token
      }),
    ).rejects.toThrow(/exactly once/);

    // A rejected format must not burn any of the 3 sequences it would have allocated.
    const rows = await tx
      .select()
      .from(poolCanonicalCounters)
      .where(eq(poolCanonicalCounters.period, poolCounterPeriod(MAY_2026)));
    expect(rows).toHaveLength(0);
  });

  it('rejects an invalid freeze month BEFORE touching the DB', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await expect(
      allocateCanonicalIdentifierRange(tx, {
        pariwarId: PARIWAR_A,
        freezeMonth: { year: 2026, month: 13 },
        count: 1,
      }),
    ).rejects.toThrow(/month must be an integer 1-12/);
  });

  it('surfaces a LOUD error when the transaction has no pariwar scope (RLS filters the UPSERT)', async () => {
    // The fail-closed posture: without app.pariwar_id the RLS withCheck filters the UPSERT
    // to zero rows. Handing back identifiers that were never durably reserved would let a
    // caller spawn pools on sequences nothing owns — so the allocator must throw instead.
    const { tx, client } = getTx();
    await client.query('SET LOCAL ROLE twt_app'); // shed superuser, set NO scope

    await expect(
      allocateCanonicalIdentifierRange(tx, {
        pariwarId: toPariwarId(randomUUID()),
        freezeMonth: MAY_2026,
        count: 1,
      }),
    ).rejects.toThrow();
  });
});
