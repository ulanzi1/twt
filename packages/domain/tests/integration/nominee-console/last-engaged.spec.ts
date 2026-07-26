// resolveLastEngagedAt — live-DB integration (Story 9.3, Task 5; closes the Story 9.1 seam).
//
// The engagement heartbeat read, exercised against real Postgres under PARIWAR_A inside the per-test
// BEGIN/ROLLBACK envelope: `resolveLastEngagedAt` returns the occurred_at of the LATEST
// `reconciliation.statement-uploaded` event on the pool stream, `null` when the nominee never uploaded,
// and is tenant-scoped. This is the value fed into `computeStaffTakeover({ lastEngagedAt })` — a real
// timestamp resets the day-N clock; null falls through to poolOpenAt (proven pure in takeover.test.ts).
//
// We seed events_log directly (the Story 9.3 apps/api upload handler is the real producer; the domain
// read is tested against the forward payload contract, the 8.3 seed-directly precedent). Own-committing
// writers accumulate rows across runs, so we assert on the RETURNED timestamp, not counts.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { poolId as toPoolId } from '../../../src/ids/index.js';
import { resolveLastEngagedAt } from '../../../src/nominee-console/read.js';
import { RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE } from '../../../src/reconciliation/events.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedEvent, seedPool } from '../_helpers.js';

/** Seed a `reconciliation.statement-uploaded` event on the pool stream at a given occurred_at. */
async function seedUpload(
  tx: Db,
  pariwarId: string,
  poolId: string,
  occurredAt: Date,
  version: number,
  uploadedByRole: 'nominee' | 'staff' = 'nominee',
): Promise<void> {
  await seedEvent(tx, pariwarId, {
    streamId: poolId,
    eventType: RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE,
    eventVersion: version,
    occurredAt,
    payload: {
      poolId,
      claimCaseId: randomUUID(),
      bankCode: 'sbi',
      objectKey: `pariwar/${pariwarId}/pool/${poolId}/${randomUUID()}`,
      parsed: true,
      parserVersion: 'sbi@1',
      rowsParsed: 5,
      rowsRejected: 0,
      uploadedByRole,
    },
  });
}

describe.skipIf(!hasDatabase)('resolveLastEngagedAt — the engagement heartbeat (PARIWAR_A scope)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('returns null when the nominee has never uploaded a statement', async () => {
    const { client, tx } = getTx();
    const poolId = await seedPool(tx, PARIWAR_A, { currentState: 'live' });
    await enterAppScope(client, PARIWAR_A);

    const last = await resolveLastEngagedAt(tx, { pariwarId: PARIWAR_A, poolId: toPoolId(poolId) });
    expect(last).toBeNull();
  });

  it('returns the LATEST upload event occurred_at (not the earliest) — a nominee uploads daily', async () => {
    const { client, tx } = getTx();
    const poolId = await seedPool(tx, PARIWAR_A, { currentState: 'live' });
    const day1 = new Date('2026-07-10T09:00:00.000Z');
    const day3 = new Date('2026-07-12T09:00:00.000Z');
    const day2 = new Date('2026-07-11T09:00:00.000Z');
    // Insert out of chronological order to prove the query orders by occurred_at, not insert order.
    await seedUpload(tx, PARIWAR_A, poolId, day1, 2);
    await seedUpload(tx, PARIWAR_A, poolId, day3, 3);
    await seedUpload(tx, PARIWAR_A, poolId, day2, 4);
    await enterAppScope(client, PARIWAR_A);

    const last = await resolveLastEngagedAt(tx, { pariwarId: PARIWAR_A, poolId: toPoolId(poolId) });
    expect(last?.toISOString()).toBe(day3.toISOString());
  });

  it('is pool-scoped — an upload on a DIFFERENT pool does not leak into this pool', async () => {
    const { client, tx } = getTx();
    const poolA = await seedPool(tx, PARIWAR_A, { currentState: 'live' });
    const poolB = await seedPool(tx, PARIWAR_A, { currentState: 'live' });
    await seedUpload(tx, PARIWAR_A, poolB, new Date('2026-07-15T09:00:00.000Z'), 2);
    await enterAppScope(client, PARIWAR_A);

    const last = await resolveLastEngagedAt(tx, { pariwarId: PARIWAR_A, poolId: toPoolId(poolA) });
    expect(last).toBeNull();
  });

  it('is tenant-scoped — a PARIWAR_B upload on the same pool id is invisible under PARIWAR_A', async () => {
    const { client, tx } = getTx();
    const poolId = await seedPool(tx, PARIWAR_A, { currentState: 'live' });
    // A same-id event tagged to the other tenant must not be returned under PARIWAR_A's scope.
    await seedUpload(tx, PARIWAR_B, poolId, new Date('2026-07-20T09:00:00.000Z'), 2);
    await enterAppScope(client, PARIWAR_A);

    const last = await resolveLastEngagedAt(tx, { pariwarId: PARIWAR_A, poolId: toPoolId(poolId) });
    expect(last).toBeNull();
  });

  it('a STAFF-initiated upload (takeover/fallback-resolution) does NOT reset the nominee engagement clock', async () => {
    const { client, tx } = getTx();
    const poolId = await seedPool(tx, PARIWAR_A, { currentState: 'live' });
    await seedUpload(tx, PARIWAR_A, poolId, new Date('2026-07-18T09:00:00.000Z'), 2, 'staff');
    await enterAppScope(client, PARIWAR_A);

    // If a staff upload reset this clock, the day-N takeover trigger would read "the nominee re-engaged"
    // and mask her continued disengagement — the exact defect this filter closes.
    const last = await resolveLastEngagedAt(tx, { pariwarId: PARIWAR_A, poolId: toPoolId(poolId) });
    expect(last).toBeNull();
  });

  it('a LATER staff upload does not shadow an EARLIER nominee upload — the nominee timestamp still wins', async () => {
    const { client, tx } = getTx();
    const poolId = await seedPool(tx, PARIWAR_A, { currentState: 'live' });
    const nomineeDay = new Date('2026-07-10T09:00:00.000Z');
    const staffDayAfter = new Date('2026-07-16T09:00:00.000Z');
    await seedUpload(tx, PARIWAR_A, poolId, nomineeDay, 2, 'nominee');
    await seedUpload(tx, PARIWAR_A, poolId, staffDayAfter, 3, 'staff');
    await enterAppScope(client, PARIWAR_A);

    const last = await resolveLastEngagedAt(tx, { pariwarId: PARIWAR_A, poolId: toPoolId(poolId) });
    expect(last?.toISOString()).toBe(nomineeDay.toISOString());
  });
});
