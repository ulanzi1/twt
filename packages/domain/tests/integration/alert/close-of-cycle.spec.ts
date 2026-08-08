// Close-of-cycle emitter — the DOMAIN half (Story 8.14, Tasks 2/5; AC1, AC3, AC4).
//
// `alert.closed` was specified by Story 8.1 (reducer arm + payload schema + registry entry) and
// assigned forward; no production emitter was ever built. `closeCycleAlert` is that emitter's
// domain half — the caller `apps/jobs/src/scheduler/close-cycle-alert.ts` drives.
//
// What this suite pins, and why each assertion exists:
//   · AC1 — the close runs through the EXISTING `projectAlertState`, so the event lands on the
//     alert's own stream at the next version AND the guarded `alerts.current_state` upsert runs.
//     A test that only asserted the event row would pass against a second write path, which is
//     exactly what AC1 forbids.
//   · AC1 — the not-`live` precondition is ASYMMETRIC: `closed`/`settled` is an idempotent no-op
//     SUCCESS, `draft`/`frozen`/`published` is an ERROR. Collapsing the two would either make a
//     redelivery throw or let a cycle whose window never opened "close".
//   · AC3 — the close instant is a PARAMETER. The domain must not re-derive it (it cannot: it may
//     not import `@twt/contracts`, where `CYCLE_WINDOW_DAYS` lives). The cross-check against the
//     cycle's own durable `cycle.frozen` attestation is what makes the parameter load-bearing
//     rather than decorative.
//   · AC4 — no second `alert.closed` is EVER appended to a stream.
//
// Per-test transaction rollback (`setupLiveDb`); scope every assertion to a FRESH cycle/alert
// stream ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import type { AlertId } from '../../../src/ids/index.js';
import { cycleFreezeCommitId as toCycleId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import {
  createPoolAssignmentSeam,
  finalizeCycleIfComplete,
  planCycleSpawn,
  spawnChildPool,
} from '../../../src/pool/index.js';
import {
  CLOSE_OF_CYCLE_TRIGGER,
  closeCycleAlert,
  deriveAlertId,
  openCycleAlert,
  projectAlertState,
} from '../../../src/alert/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

const FIXED_AMOUNT = 500;
/** The cycle-freeze instant every case in this suite anchors on (mirrors the 8.1 de-risk suite). */
const COMMITTED_AT = new Date('2026-07-15T06:00:00Z');
/** A plausible caller-computed Day-15 boundary (`COMMITTED_AT` + 15d). The DOMAIN never derives it. */
const CLOSE_AT = new Date(COMMITTED_AT.getTime() + 15 * 24 * 60 * 60 * 1000);

async function seedFixedAmount(tx: Db, pariwarId: string, amount: number): Promise<void> {
  await tx.insert(schema.poolFixedAmountSchedule).values({
    pariwarId: toPariwarId(pariwarId),
    version: 1,
    fixedAmount: amount,
    effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    effectiveUntil: null,
    changeType: 'standard',
    createdByActor: 'system:test-seed',
  });
}

async function seedCommit(tx: Db, pariwarId: string, commitId: string, claimIds: string[]): Promise<void> {
  await tx.insert(schema.cycleFreezeCommits).values({
    commitId: toCycleId(commitId),
    pariwarId: toPariwarId(pariwarId),
    actorId: 'trustee-actor-1',
    actorDisplay: 'Trustee One',
    committedClaimIds: claimIds,
    committedAt: COMMITTED_AT,
  });
}

async function alertStreamEvents(tx: Db, alertId: string) {
  return tx
    .select({
      type: schema.eventsLog.eventType,
      version: schema.eventsLog.eventVersion,
      payload: schema.eventsLog.payload,
      actorId: schema.eventsLog.actorId,
    })
    .from(schema.eventsLog)
    .where(eq(schema.eventsLog.streamId, alertId))
    .orderBy(asc(schema.eventsLog.eventVersion));
}

/** Drive a real single-pool cycle through the REAL spawn saga to its `cycle.frozen` commit point. */
async function driveCycleToFrozen(
  tx: Db,
  client: Parameters<typeof spawnChildPool>[0],
  cycleId: string,
  claimId: string,
): Promise<void> {
  const plan = await planCycleSpawn(tx, {
    pariwarId: PARIWAR_A,
    cycleId: toCycleId(cycleId),
    frozenClaims: [{ claimCaseId: claimId }],
  });
  await spawnChildPool(client, plan.children[0]!, createPoolAssignmentSeam(), [randomUUID()], true);
  const fin = await finalizeCycleIfComplete(client, {
    pariwarId: PARIWAR_A,
    cycleId: toCycleId(cycleId),
    poolCount: 1,
  });
  expect(fin.frozen).toBe(true);
}

/** Drive a fresh cycle all the way to a `live` alert through the real cycle-open path. */
async function driveCycleToLiveAlert(
  tx: Db,
  client: Parameters<typeof spawnChildPool>[0],
  cycleId: string,
): Promise<AlertId> {
  const claimId = randomUUID();
  await seedCommit(tx, PARIWAR_A, cycleId, [claimId]);
  await seedFixedAmount(tx, PARIWAR_A, FIXED_AMOUNT);
  await enterAppScope(client, PARIWAR_A);
  await driveCycleToFrozen(tx, client, cycleId, claimId);
  const opened = await openCycleAlert(client, { cycleId });
  expect(opened.state).toBe('live');
  return opened.alertId;
}

describe.skipIf(!hasDatabase)('closeCycleAlert — the close-of-cycle emitter (Story 8.14)', () => {
  setupLiveDb();

  it('AC1: a live alert closes through the EXISTING projector — event on the stream + guarded projection', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const alertId = await driveCycleToLiveAlert(tx, client, cycleId);

    const result = await closeCycleAlert(client, { cycleId, closeAt: CLOSE_AT });

    expect(result.alertId).toBe(alertId);
    expect(result.closed).toBe(true);
    expect(result.state).toBe('closed');

    // The event landed on the ALERT's own stream, at the next version after alert.live (=4).
    const events = await alertStreamEvents(tx, alertId);
    expect(events.map((e) => e.type)).toEqual([
      'alert.frozen',
      'alert.published',
      'alert.live',
      'alert.closed',
    ]);
    expect(events.at(-1)!.version).toBe(4);
    // The payload is the registered `.strict()` audit shape — NOT a `'{}'` fixture.
    expect(events.at(-1)!.payload).toEqual({
      from_state: 'live',
      to_state: 'closed',
      trigger: CLOSE_OF_CYCLE_TRIGGER,
      actor: 'system',
    });
    // NULL actor_id = system, the documented convention the cycle-open trigger also uses.
    expect(events.at(-1)!.actorId).toBeNull();

    // The PROJECTION moved too — proving the close went through `projectAlertState` (which owns the
    // `app.alert_state_writer`-guarded upsert), not around it.
    const [row] = await tx
      .select({ currentState: schema.alerts.currentState, version: schema.alerts.stateEventVersion })
      .from(schema.alerts)
      .where(eq(schema.alerts.alertId, alertId));
    expect(row!.currentState).toBe('closed');
    expect(row!.version).toBe(4);
  });

  it('AC4: a sequential redelivery is a no-op SUCCESS — no second alert.closed is ever appended', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const alertId = await driveCycleToLiveAlert(tx, client, cycleId);

    const first = await closeCycleAlert(client, { cycleId, closeAt: CLOSE_AT });
    expect(first.closed).toBe(true);

    const second = await closeCycleAlert(client, { cycleId, closeAt: CLOSE_AT });
    expect(second.closed).toBe(false);
    expect(second.state).toBe('closed');

    const events = await alertStreamEvents(tx, alertId);
    expect(events.filter((e) => e.type === 'alert.closed')).toHaveLength(1);
    expect(events).toHaveLength(4);
  });

  it('AC1: a `settled` alert is also an idempotent no-op (the terminal state is never regressed)', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const alertId = await driveCycleToLiveAlert(tx, client, cycleId);
    await closeCycleAlert(client, { cycleId, closeAt: CLOSE_AT });

    // Drive `closed → settled` through the projector directly (Epic 9's transition; unemitted today).
    const [row] = await tx
      .select({ poolCount: schema.alerts.poolCount, createdByActor: schema.alerts.createdByActor })
      .from(schema.alerts)
      .where(eq(schema.alerts.alertId, alertId));
    await projectAlertState(client, {
      alertId: deriveAlertId(cycleId),
      cycleId: toCycleId(cycleId),
      pariwarId: PARIWAR_A,
      poolCount: row!.poolCount,
      createdByActor: row!.createdByActor,
      eventType: 'alert.settled',
      payload: { from_state: 'closed', to_state: 'settled', trigger: 'test:settle', actor: 'system' },
      actorId: null,
    });

    const result = await closeCycleAlert(client, { cycleId, closeAt: CLOSE_AT });
    expect(result.closed).toBe(false);
    expect(result.state).toBe('settled');
    const events = await alertStreamEvents(tx, alertId);
    expect(events.filter((e) => e.type === 'alert.closed')).toHaveLength(1);
  });

  it('AC1: a PRE-live alert is an ERROR — a cycle whose window never opened cannot close', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimId = randomUUID();
    await seedCommit(tx, PARIWAR_A, cycleId, [claimId]);
    await seedFixedAmount(tx, PARIWAR_A, FIXED_AMOUNT);
    await enterAppScope(client, PARIWAR_A);
    await driveCycleToFrozen(tx, client, cycleId, claimId);

    // Genesis ONLY — the alert stops at `frozen`; the contribution window never opened.
    const alertId = deriveAlertId(cycleId);
    await projectAlertState(client, {
      alertId,
      cycleId: toCycleId(cycleId),
      pariwarId: PARIWAR_A,
      poolCount: 1,
      createdByActor: 'trustee-actor-1',
      eventType: 'alert.frozen',
      payload: {
        from_state: 'draft',
        to_state: 'frozen',
        trigger: 'test:genesis',
        actor: 'system',
        cycle_id: cycleId,
        pariwar_id: PARIWAR_A,
        pool_count: 1,
        pool_ids: [randomUUID()],
        attestation: {
          actor_id: 'trustee-actor-1',
          actor_display: 'Trustee One',
          committed_at: COMMITTED_AT.toISOString(),
        },
      },
      actorId: null,
    });

    await expect(closeCycleAlert(client, { cycleId, closeAt: CLOSE_AT })).rejects.toThrow(/frozen/);
    const events = await alertStreamEvents(tx, alertId);
    expect(events.filter((e) => e.type === 'alert.closed')).toHaveLength(0);
  });

  it('AC1: a cycle with NO alert is an ERROR, never a silent success', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      closeCycleAlert(client, { cycleId: randomUUID(), closeAt: CLOSE_AT }),
    ).rejects.toThrow(/no alert/i);
  });

  it('AC3: the caller-supplied close instant is cross-checked against the cycle’s own attestation', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const alertId = await driveCycleToLiveAlert(tx, client, cycleId);

    // An instant at//before the freeze cannot be this cycle's Day-15 boundary — the caller anchored
    // on the wrong cycle, or on a clock-skewed value. D3's exact hazard, refused rather than written.
    await expect(
      closeCycleAlert(client, { cycleId, closeAt: COMMITTED_AT }),
    ).rejects.toThrow(/close instant/i);

    const events = await alertStreamEvents(tx, alertId);
    expect(events.filter((e) => e.type === 'alert.closed')).toHaveLength(0);
    const [row] = await tx
      .select({ currentState: schema.alerts.currentState })
      .from(schema.alerts)
      .where(eq(schema.alerts.alertId, alertId));
    expect(row!.currentState).toBe('live');
  });
});
