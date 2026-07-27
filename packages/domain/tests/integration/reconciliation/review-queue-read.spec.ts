// Reconciliation review-queue read — live-DB integration (Story 9.8, Task 3; AC1/AC2).
//
// The cross-member queue read: enumerates every OPEN reconciliation case across the reconciling cycles'
// alert + pool streams, deduped open-vs-resolved via the existing hasLiveConfirmation chain + the new
// reject marker, ordered by derived deadline proximity. Exercised against real Postgres under PARIWAR_A
// inside the per-test BEGIN/ROLLBACK envelope. Own-committing writers accumulate rows, so we assert
// MEMBERSHIP by caseKey, NOT list counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { CONFIRMED_EVENT_TYPE } from '../../../src/contribution/read.js';
import { CONTRIBUTION_MISMATCH_EVENT_TYPE } from '../../../src/contribution/history.js';
import {
  RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE,
  RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE,
} from '../../../src/reconciliation/events.js';
import {
  buildCaseKey,
  listOpenReconciliationCases,
} from '../../../src/reconciliation/reconciliation-review-read.js';
import { pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { eventsLog } from '../../../src/schema/events_log.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedAlert, seedPool } from '../_helpers.js';

const POOL_OPENED = 'pool.opened_for_contributions';

async function seedEvent(
  tx: Db,
  pariwarId: string,
  input: {
    streamId: string;
    eventType: string;
    payload: Record<string, unknown>;
    occurredAt?: Date;
    eventId?: string;
    version?: number;
  },
): Promise<string> {
  const eventId = input.eventId ?? randomUUID();
  await tx.insert(eventsLog).values({
    eventId,
    streamId: input.streamId,
    eventType: input.eventType,
    payload: input.payload,
    eventVersion: input.version ?? Math.floor(Math.random() * 1_000_000) + 1,
    pariwarId,
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
  });
  return eventId;
}

/** Seed one reconciling cycle (a live alert + its pool + a pool-open event). Returns {alertId, poolId, cycleId}. */
async function seedReconcilingCycle(
  tx: Db,
  pariwarId: string,
  opts: { poolOpenAt?: Date; currentState?: 'live' | 'closed' } = {},
): Promise<{ alertId: string; poolId: string; cycleId: string }> {
  const cycleId = randomUUID();
  const alertId = await seedAlert(tx, pariwarId, { cycleId, currentState: opts.currentState ?? 'live' });
  const poolId = await seedPool(tx, pariwarId, { cycleId });
  await seedEvent(tx, pariwarId, {
    streamId: poolId,
    eventType: POOL_OPENED,
    payload: { poolId },
    occurredAt: opts.poolOpenAt ?? new Date('2026-07-01T00:00:00.000Z'),
  });
  return { alertId, poolId, cycleId };
}

const NOW = new Date('2026-07-10T00:00:00.000Z');

describe.skipIf(!hasDatabase)('listOpenReconciliationCases — live-DB (Story 9.8)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('lists an open mismatch case, and drops it once confirmed', async () => {
    const { client, tx } = getTx();
    const { alertId, poolId } = await seedReconcilingCycle(tx, PARIWAR_A);
    const memberId = randomUUID();
    await seedEvent(tx, PARIWAR_A, {
      streamId: alertId,
      eventType: CONTRIBUTION_MISMATCH_EVENT_TYPE,
      payload: { poolId, memberId, alertId, reason: 'wrong_pool' },
    });
    await enterAppScope(client, PARIWAR_A);

    const key = buildCaseKey('mismatch', poolId, memberId);
    const before = await listOpenReconciliationCases(tx, { pariwarId: toPariwarId(PARIWAR_A), now: NOW });
    const row = before.rows.find((r) => r.caseKey === key);
    expect(row).toBeDefined();
    expect(row?.caseType).toBe('mismatch');
    expect(row?.memberId).toBe(memberId);
    expect(row?.mismatchReason).toBe('wrong_pool');

    // A live confirmation resolves the case → it drops from the OPEN queue.
    await seedEvent(tx, PARIWAR_A, {
      streamId: alertId,
      eventType: CONFIRMED_EVENT_TYPE,
      payload: { poolId, memberId, alertId },
    });
    const after = await listOpenReconciliationCases(tx, { pariwarId: toPariwarId(PARIWAR_A), now: NOW });
    expect(after.rows.find((r) => r.caseKey === key)).toBeUndefined();
  });

  it('a reject marker closes the case (drops from OPEN)', async () => {
    const { client, tx } = getTx();
    const { alertId, poolId } = await seedReconcilingCycle(tx, PARIWAR_A);
    const memberId = randomUUID();
    await seedEvent(tx, PARIWAR_A, {
      streamId: alertId,
      eventType: CONTRIBUTION_MISMATCH_EVENT_TYPE,
      payload: { poolId, memberId, alertId, reason: 'no_statement_entry' },
    });
    await seedEvent(tx, PARIWAR_A, {
      streamId: alertId,
      eventType: RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE,
      payload: { poolId, memberId, alertId, reasonCode: 'no_evidence', attestedByActorIds: ['t1'], rejectedAt: NOW.toISOString() },
    });
    await enterAppScope(client, PARIWAR_A);

    const key = buildCaseKey('mismatch', poolId, memberId);
    const res = await listOpenReconciliationCases(tx, { pariwarId: toPariwarId(PARIWAR_A), now: NOW });
    expect(res.rows.find((r) => r.caseKey === key)).toBeUndefined();
  });

  it('a self-verify screenshot on a mismatch is ONE merged case (type=mismatch, screenshot attached)', async () => {
    const { client, tx } = getTx();
    const { alertId, poolId } = await seedReconcilingCycle(tx, PARIWAR_A);
    const memberId = randomUUID();
    await seedEvent(tx, PARIWAR_A, {
      streamId: alertId,
      eventType: CONTRIBUTION_MISMATCH_EVENT_TYPE,
      payload: { poolId, memberId, alertId, reason: 'amount_mismatch' },
    });
    await seedEvent(tx, PARIWAR_A, {
      streamId: alertId,
      eventType: RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE,
      payload: { poolId, memberId, alertId, objectKey: 'k/abc', mismatchReason: 'amount_mismatch', contentType: 'image/jpeg', uploadedAt: NOW.toISOString() },
    });
    await enterAppScope(client, PARIWAR_A);

    const mismatchKey = buildCaseKey('mismatch', poolId, memberId);
    const selfVerifyKey = buildCaseKey('self_verify', poolId, memberId);
    const res = await listOpenReconciliationCases(tx, { pariwarId: toPariwarId(PARIWAR_A), now: NOW });
    const merged = res.rows.filter((r) => r.poolId === poolId && r.memberId === memberId);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.caseKey).toBe(mismatchKey);
    expect(res.rows.find((r) => r.caseKey === selfVerifyKey)).toBeUndefined();
    expect(merged[0]?.screenshotObjectKey).toBe('k/abc');
  });

  it('orders by deadline proximity — the earlier-opened live cycle sorts first', async () => {
    const { client, tx } = getTx();
    const early = await seedReconcilingCycle(tx, PARIWAR_A, { poolOpenAt: new Date('2026-07-01T00:00:00.000Z') });
    const late = await seedReconcilingCycle(tx, PARIWAR_A, { poolOpenAt: new Date('2026-07-06T00:00:00.000Z') });
    const mE = randomUUID();
    const mL = randomUUID();
    await seedEvent(tx, PARIWAR_A, { streamId: early.alertId, eventType: CONTRIBUTION_MISMATCH_EVENT_TYPE, payload: { poolId: early.poolId, memberId: mE, alertId: early.alertId, reason: 'wrong_pool' } });
    await seedEvent(tx, PARIWAR_A, { streamId: late.alertId, eventType: CONTRIBUTION_MISMATCH_EVENT_TYPE, payload: { poolId: late.poolId, memberId: mL, alertId: late.alertId, reason: 'wrong_pool' } });
    await enterAppScope(client, PARIWAR_A);

    const res = await listOpenReconciliationCases(tx, { pariwarId: toPariwarId(PARIWAR_A), now: NOW });
    const idxEarly = res.rows.findIndex((r) => r.caseKey === buildCaseKey('mismatch', early.poolId, mE));
    const idxLate = res.rows.findIndex((r) => r.caseKey === buildCaseKey('mismatch', late.poolId, mL));
    expect(idxEarly).toBeGreaterThanOrEqual(0);
    expect(idxLate).toBeGreaterThanOrEqual(0);
    expect(idxEarly).toBeLessThan(idxLate);
  });

  it('reverse re-opens a confirmed case; a fresh confirm drops it again (AC6 green→held→re-green)', async () => {
    const { client, tx } = getTx();
    const { alertId, poolId } = await seedReconcilingCycle(tx, PARIWAR_A);
    const memberId = randomUUID();
    const key = buildCaseKey('mismatch', poolId, memberId);
    await seedEvent(tx, PARIWAR_A, {
      streamId: alertId,
      eventType: CONTRIBUTION_MISMATCH_EVENT_TYPE,
      payload: { poolId, memberId, alertId, reason: 'wrong_pool' },
    });
    // Confirm #1 (explicit id so a reversal can name it) → the case drops (resolved).
    const confirmed1 = randomUUID();
    await seedEvent(tx, PARIWAR_A, {
      streamId: alertId,
      eventType: CONFIRMED_EVENT_TYPE,
      payload: { poolId, memberId, alertId },
      eventId: confirmed1,
    });
    await enterAppScope(client, PARIWAR_A);
    let res = await listOpenReconciliationCases(tx, { pariwarId: toPariwarId(PARIWAR_A), now: NOW });
    expect(res.rows.find((r) => r.caseKey === key)).toBeUndefined();

    // Reverse confirmation #1 → the case RE-OPENS (no live confirmation).
    await seedEvent(tx, PARIWAR_A, {
      streamId: alertId,
      eventType: 'reconciliation.confirmation-reversed',
      payload: { poolId, memberId, alertId, reversedConfirmedEventId: confirmed1 },
    });
    res = await listOpenReconciliationCases(tx, { pariwarId: toPariwarId(PARIWAR_A), now: NOW });
    expect(res.rows.find((r) => r.caseKey === key)).toBeDefined();

    // A FRESH confirmation (new event id) re-greens → drops again (monotonic per-event-id chain).
    await seedEvent(tx, PARIWAR_A, {
      streamId: alertId,
      eventType: CONFIRMED_EVENT_TYPE,
      payload: { poolId, memberId, alertId },
      eventId: randomUUID(),
    });
    res = await listOpenReconciliationCases(tx, { pariwarId: toPariwarId(PARIWAR_A), now: NOW });
    expect(res.rows.find((r) => r.caseKey === key)).toBeUndefined();
  });

  it('is hard-scoped to the actor Pariwar (a cross-Pariwar case is invisible)', async () => {
    const { client, tx } = getTx();
    const { alertId, poolId } = await seedReconcilingCycle(tx, PARIWAR_B);
    const memberId = randomUUID();
    await seedEvent(tx, PARIWAR_B, {
      streamId: alertId,
      eventType: CONTRIBUTION_MISMATCH_EVENT_TYPE,
      payload: { poolId, memberId, alertId, reason: 'wrong_pool' },
    });
    await enterAppScope(client, PARIWAR_A);

    const res = await listOpenReconciliationCases(tx, { pariwarId: toPariwarId(PARIWAR_A), now: NOW });
    expect(res.rows.find((r) => r.poolId === poolId)).toBeUndefined();
  });
});
