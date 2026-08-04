// My Pool card read accessors — live-DB integration (Story 8.2, Task 7). twt-test-pg on :5433.
//
// Exercises the NEW read accessors the My Pool handler composes, against a real Postgres with RLS:
//   · alert.listLiveAlertsForPariwar — returns ONLY `live` alerts, tenant-scoped (the card's entry point).
//   · pool.resolveAssignedPoolWithRosterForMember — the fail-soft absence path (a pool with no snapshot
//     resolves to { assigned: false }, never a throw — the card self-suppresses).
//   · pool.resolveUpcomingFixedAmountChange — the AC6 next-future-change resolver.
//
// Own-committing writers are not used here — the seeds run on the rolled-back tx (setupLiveDb afterEach),
// so membership assertions are stable. Never regenerate an applied migration; never DROP SCHEMA reset.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { alert as alertDomain, ids, pool as poolDomain, schema } from '../../../src/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
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
});
