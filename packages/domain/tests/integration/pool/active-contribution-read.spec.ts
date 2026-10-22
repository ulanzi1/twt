// My Pool card read accessors — live-DB integration (Story 8.2, Task 7). twt-test-pg on :5433.
//
// Exercises the NEW read accessors the My Pool handler composes, against a real Postgres with RLS:
//   · alert.listLiveAlertsForPariwar — returns ONLY `live` alerts, tenant-scoped (the card's entry point).
//   · pool.resolveAssignedPoolWithRosterForMember — the fail-soft absence path (a pool with no snapshot
//     resolves to { assigned: false }, never a throw — the card self-suppresses).
//   · pool.resolveUpcomingFixedAmountChange — the AC6 next-future-change resolver.
//   · pool.resolveFirstCycleUnderAmount — Story 8.15 D5: is this pool the FIRST cycle at a changed amount?
//
// Own-committing writers are not used here — the seeds run on the rolled-back tx (setupLiveDb afterEach),
// so membership assertions are stable. Never regenerate an applied migration; never DROP SCHEMA reset.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { alert as alertDomain, ids, pool as poolDomain, schema } from '../../../src/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import type { Db } from '../../../src/db.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedAlert, seedPool } from '../_helpers.js';

describe.skipIf(!hasDatabase)('My Pool card read accessors (Story 8.2)', () => {
  setupLiveDb();

  describe('alert.listLiveAlertsForPariwar', () => {
    it('returns only LIVE alerts for the scoped Pariwar (not draft, not another tenant)', async () => {
      const { client, tx } = getTx();
      const liveId = randomUUID();
      const draftId = randomUUID();
      const otherTenantLiveId = randomUUID();
      await seedAlert(tx, PARIWAR_A, { alertId: liveId, currentState: 'live', poolCount: 3 });
      await seedAlert(tx, PARIWAR_A, { alertId: draftId, currentState: 'draft' });
      await seedAlert(tx, PARIWAR_B, { alertId: otherTenantLiveId, currentState: 'live' });

      await enterAppScope(client, PARIWAR_A);
      const live = await alertDomain.listLiveAlertsForPariwar(tx, ids.pariwarId(PARIWAR_A));

      const returnedIds = live.map((a) => a.alertId);
      expect(returnedIds).toContain(liveId);
      expect(returnedIds).not.toContain(draftId); // not live → excluded
      expect(returnedIds).not.toContain(otherTenantLiveId); // other tenant → RLS-excluded
      const found = live.find((a) => a.alertId === liveId);
      expect(found?.poolCount).toBe(3);
    });

    it('excludes a non-live (published) alert (⇒ with none live, the card self-suppresses)', async () => {
      const { client, tx } = getTx();
      const publishedId = await seedAlert(tx, PARIWAR_A, { currentState: 'published' });
      await enterAppScope(client, PARIWAR_A);
      const live = await alertDomain.listLiveAlertsForPariwar(tx, ids.pariwarId(PARIWAR_A));
      // ⚠ NOT `toEqual([])` (2026-08-04). Own-committing suites elsewhere leave live alerts on
      // PARIWAR_A, so asserting global emptiness encodes "no other suite has ever run against this
      // database" — true on a fresh CI container, false on any reused local DB, and not the property
      // under test. The behaviour that matters is that a `published` (non-live) alert is EXCLUDED
      // from the live list; when no alert is live that list is empty and the card self-suppresses.
      // Renamed to say what it actually proves ([[project_live_db_test_gotchas]]).
      expect(live.map((a) => a.alertId)).not.toContain(publishedId);
    });
  });

  describe('pool.resolveAssignedPoolWithRosterForMember — fail-soft absence', () => {
    it('a pool with NO snapshot resolves to { assigned: false } (no throw — the card self-suppresses)', async () => {
      const { client, tx } = getTx();
      const cycleId = randomUUID();
      await seedPool(tx, PARIWAR_A, { cycleId, poolIndex: 0 });
      await enterAppScope(client, PARIWAR_A);

      const res = await poolDomain.resolveAssignedPoolWithRosterForMember(
        tx,
        ids.pariwarId(PARIWAR_A),
        ids.cycleFreezeCommitId(cycleId),
        ids.memberId(randomUUID()),
      );
      expect(res).toEqual({ assigned: false });
    });
  });

  describe('pool.resolveUpcomingFixedAmountChange — the AC6 next-future-change resolver', () => {
    it('returns the earliest FUTURE schedule row (and null when none is future)', async () => {
      const { client, tx } = getTx();
      const asOf = new Date('2026-07-01T00:00:00.000Z');
      // A past (currently-effective) row and a future scheduled change.
      await tx.insert(schema.poolFixedAmountSchedule).values([
        {
          pariwarId: ids.pariwarId(PARIWAR_A),
          version: 1,
          fixedAmount: 500,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveUntil: new Date('2027-07-01T00:00:00.000Z'),
          changeType: 'standard',
          createdByActor: 'trustee-actor-1',
        },
        {
          pariwarId: ids.pariwarId(PARIWAR_A),
          version: 2,
          fixedAmount: 600,
          effectiveFrom: new Date('2027-07-01T00:00:00.000Z'),
          effectiveUntil: null,
          changeType: 'standard',
          createdByActor: 'trustee-actor-1',
        },
      ]);
      await enterAppScope(client, PARIWAR_A);

      const upcoming = await poolDomain.resolveUpcomingFixedAmountChange(tx, ids.pariwarId(PARIWAR_A), asOf);
      expect(upcoming?.fixedAmount).toBe(600);
      expect(upcoming?.effectiveFrom.toISOString()).toBe('2027-07-01T00:00:00.000Z');

      // As of AFTER the future change, there is no further future change → null.
      const none = await poolDomain.resolveUpcomingFixedAmountChange(
        tx,
        ids.pariwarId(PARIWAR_A),
        new Date('2028-01-01T00:00:00.000Z'),
      );
      expect(none).toBeNull();
    });
  });
  // ── Story 8.15 D5 — the first-cycle read ────────────────────────────────────────────────────────
  //
  // ⚠ A FRESH tenant per test (never PARIWAR_A): the read scans the Pariwar's POOLS in a window, and
  // own-committing suites elsewhere leave pools under the fixed constants. ⚠ Every `committedAt` is
  // EXPLICIT and distinct ([[project_db_clock_ordering_tests_tie]]: one rollback tx ⇒ one now()).
  describe('pool.resolveFirstCycleUnderAmount (Story 8.15 D5)', () => {
    const JAN = new Date('2026-01-01T00:00:00.000Z');
    const APR = new Date('2026-04-01T00:00:00.000Z');

    async function seedRow(
      tx: Db,
      p: string,
      version: number,
      fixedAmount: number,
      effectiveFrom: Date,
      effectiveUntil: Date | null,
      changeType: 'standard' | 'emergency' = 'standard',
    ): Promise<void> {
      await tx.insert(schema.poolFixedAmountSchedule).values({
        pariwarId: ids.pariwarId(p),
        version,
        fixedAmount,
        effectiveFrom,
        effectiveUntil,
        changeType,
        createdByActor: 'trustee-actor-1',
      });
    }

    /** A cycle commit at an explicit instant, with `pools` pools at `fixedAmount` (0 = a zero-claim commit). */
    async function seedCycle(tx: Db, p: string, committedAt: Date, fixedAmount: number, pools = 1): Promise<string> {
      const cycleId = randomUUID();
      await tx.insert(schema.cycleFreezeCommits).values({
        commitId: ids.cycleFreezeCommitId(cycleId),
        pariwarId: ids.pariwarId(p),
        actorId: 'trustee-actor-1',
        actorDisplay: 'Trustee One',
        committedClaimIds: [],
        committedAt,
      });
      for (let i = 0; i < pools; i++) await seedPool(tx, p, { cycleId, poolIndex: i, fixedAmount });
      return cycleId;
    }

    const read = (tx: Db, p: string, committedAt: Date, poolFixedAmount: number) =>
      poolDomain.resolveFirstCycleUnderAmount(tx, ids.pariwarId(p), { committedAt, poolFixedAmount });

    it('the first cycle after a standard change → true; the second cycle under the same row → false', async () => {
      const { client, tx } = getTx();
      const p = randomUUID();
      await seedRow(tx, p, 1, 500, JAN, APR);
      await seedRow(tx, p, 2, 600, APR, null);
      const c1 = new Date('2026-04-10T06:00:00.000Z');
      const c2 = new Date('2026-04-25T06:00:00.000Z');
      await seedCycle(tx, p, c1, 600);
      await seedCycle(tx, p, c2, 600);
      await enterAppScope(client, p);

      expect(await read(tx, p, c1, 600)).toBe(true);
      expect(await read(tx, p, c2, 600)).toBe(false);
    });

    it('genesis (v1, no predecessor) → false', async () => {
      const { client, tx } = getTx();
      const p = randomUUID();
      await seedRow(tx, p, 1, 500, JAN, null);
      const c = new Date('2026-02-10T06:00:00.000Z');
      await seedCycle(tx, p, c, 500);
      await enterAppScope(client, p);
      expect(await read(tx, p, c, 500)).toBe(false);
    });

    it('a change to the SAME amount as the predecessor → false', async () => {
      const { client, tx } = getTx();
      const p = randomUUID();
      await seedRow(tx, p, 1, 500, JAN, APR);
      await seedRow(tx, p, 2, 500, APR, null);
      const c = new Date('2026-04-10T06:00:00.000Z');
      await seedCycle(tx, p, c, 500);
      await enterAppScope(client, p);
      expect(await read(tx, p, c, 500)).toBe(false);
    });

    it('a ZERO-CLAIM commit (no pools) between the change and C does NOT suppress it → true', async () => {
      const { client, tx } = getTx();
      const p = randomUUID();
      await seedRow(tx, p, 1, 500, JAN, APR);
      await seedRow(tx, p, 2, 600, APR, null);
      await seedCycle(tx, p, new Date('2026-04-05T06:00:00.000Z'), 600, 0); // commits, spawns nothing
      const c = new Date('2026-04-10T06:00:00.000Z');
      await seedCycle(tx, p, c, 600);
      await enterAppScope(client, p);
      expect(await read(tx, p, c, 600)).toBe(true);
    });

    it('a BACKDATED emergency covering C while the pool holds the OLD amount → false (the snapshot guard)', async () => {
      const { client, tx } = getTx();
      const p = randomUUID();
      // The pool was spawned at ₹500 on 04-10; an emergency written LATER, effective 04-01 (legal: ≥ the
      // amount in force), now resolves at C. The member's ₹500 pool must not say "the new contribution
      // starts with this cycle".
      await seedRow(tx, p, 1, 500, JAN, APR);
      await seedRow(tx, p, 2, 600, APR, null, 'emergency');
      const c = new Date('2026-04-10T06:00:00.000Z');
      await seedCycle(tx, p, c, 500);
      await enterAppScope(client, p);
      expect(await read(tx, p, c, 500)).toBe(false);
    });

    it('an emergency the pool WAS snapshotted under → true (PQ1 = B: the first-cycle note is a plain fact)', async () => {
      const { client, tx } = getTx();
      const p = randomUUID();
      await seedRow(tx, p, 1, 500, JAN, APR);
      await seedRow(tx, p, 2, 600, APR, null, 'emergency');
      const c = new Date('2026-04-10T06:00:00.000Z');
      await seedCycle(tx, p, c, 600);
      await enterAppScope(client, p);
      expect(await read(tx, p, c, 600)).toBe(true);
    });

    it('a moot (zero-width) row is never the predecessor — the row in force before it is', async () => {
      const { client, tx } = getTx();
      const p = randomUUID();
      // v2 ₹700 was superseded before it took effect (zero-width at 03-01); v3 ₹500 at APR repeats the
      // amount actually in force before it (v1 ₹500) → no change.
      const MAR = new Date('2026-03-01T00:00:00.000Z');
      await seedRow(tx, p, 1, 500, JAN, APR);
      await seedRow(tx, p, 2, 700, MAR, MAR);
      await seedRow(tx, p, 3, 500, APR, null);
      const c = new Date('2026-04-10T06:00:00.000Z');
      await seedCycle(tx, p, c, 500);
      await enterAppScope(client, p);
      expect(await read(tx, p, c, 500)).toBe(false);
    });
  });
});
