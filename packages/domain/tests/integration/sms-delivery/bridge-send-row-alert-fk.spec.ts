// Story 5.8b — the bridge's send row on the alert `openCycleAlert` PROJECTS (AC3 / F5; code review 2026-10-28, second pass). Live DB,
// per-test rollback (`setupLiveDb`), as `twt_app` in PARIWAR_A's scope.
//
// The jobs live legs hand-insert their `alerts` row; this one drives the REAL path — a degraded-mode declaration active at the freeze,
// a real single-pool cycle to `cycle.frozen`, `openCycleAlert` minting the time-critical alert — and then writes both shapes of a
// `cycle_open` / `cycle_open_bridge` row against THAT alert's id: a send (begin → finalise `accepted`) and the terminal row the
// ladder's delivery writes (`recordLadderDeliveredAlertSmsSend`). The `alerts` FK admits both and refuses an alert that does not exist.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { deriveAlertId, openCycleAlert } from '../../../src/alert/index.js';
import { declareDegradedMode } from '../../../src/degraded-mode/index.js';
import { cycleFreezeCommitId as toCycleId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { createPoolAssignmentSeam, finalizeCycleIfComplete, planCycleSpawn, spawnChildPool } from '../../../src/pool/index.js';
import * as schema from '../../../src/schema/index.js';
import {
  beginAlertSmsSend,
  finaliseAlertSmsSend,
  lookupAlertSmsSend,
  recordLadderDeliveredAlertSmsSend,
} from '../../../src/sms-delivery/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

const COMMITTED_AT = new Date('2026-07-15T06:00:00Z');

async function seed(tx: Db, cycleId: string, claimId: string): Promise<void> {
  await tx.insert(schema.cycleFreezeCommits).values({
    commitId: toCycleId(cycleId),
    pariwarId: toPariwarId(PARIWAR_A),
    actorId: 'trustee-actor-1',
    actorDisplay: 'Trustee One',
    committedClaimIds: [claimId],
    committedAt: COMMITTED_AT,
  });
  await tx.insert(schema.poolFixedAmountSchedule).values({
    pariwarId: toPariwarId(PARIWAR_A),
    version: 1,
    fixedAmount: 500,
    effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    effectiveUntil: null,
    changeType: 'standard',
    createdByActor: 'system:test-seed',
  });
}

describe.skipIf(!hasDatabase)('Story 5.8b — the bridge send row on the alert `openCycleAlert` projects (AC3 / F5)', () => {
  setupLiveDb();

  it('⭐ a bridged cycle-open\'s REAL alert carries both row shapes — the send `accepted` and the terminal `exhausted:ladder_delivered` — and the FK refuses a made-up alert', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimId = randomUUID();
    const texted = randomUUID();
    const told = randomUUID();
    await seed(tx, cycleId, claimId);
    await enterAppScope(client, PARIWAR_A);
    await declareDegradedMode(tx, {
      pariwarId: toPariwarId(PARIWAR_A),
      mode: 'cycle_open_sms_bridge',
      effectiveFrom: new Date(COMMITTED_AT.getTime() - 60_000),
      expiresAt: null,
      declaredByActor: null,
      reason: 'test: 5.8b send row on the projected alert',
    });
    const plan = await planCycleSpawn(tx, { pariwarId: PARIWAR_A, cycleId: toCycleId(cycleId), frozenClaims: [{ claimCaseId: claimId }] });
    await spawnChildPool(client, plan.children[0]!, createPoolAssignmentSeam(), [texted, told], true);
    expect((await finalizeCycleIfComplete(client, { pariwarId: PARIWAR_A, cycleId: toCycleId(cycleId), poolCount: 1 })).frozen).toBe(true);

    const opened = await openCycleAlert(client, { cycleId });
    expect(opened).toMatchObject({ minted: true, state: 'live', timeCritical: true });
    const alertId = opened.alertId;
    expect(alertId).toBe(deriveAlertId(cycleId));

    const key = (memberId: string) => ({ pariwarId: PARIWAR_A, alertId, memberId, occasion: 'cycle_open' as const });
    // (1) The text: begin, then finalise `accepted` (the seam's order, without the gateway).
    const begun = await beginAlertSmsSend(client, { ...key(texted), message: 'cycle_open_bridge', locale: 'hi', claimToken: 'job-fk:0' });
    expect(begun.kind).toBe('begun');
    if (begun.kind !== 'begun') return;
    expect(
      await finaliseAlertSmsSend(client, {
        pariwarId: PARIWAR_A,
        sendId: begun.sendId,
        claimToken: 'job-fk:0',
        outcome: 'accepted',
        detail: null,
        providerMessageId: 'gw-req-1',
      }),
    ).toBe(true);
    // (2) The ladder delivered with ⛔ row — the terminal row; a second write finds the row (⛔ a second one).
    const told1 = { ...key(told), message: 'cycle_open_bridge' as const, locale: 'en' as const, claimToken: 'job-fk:0', detail: 'exhausted:ladder_delivered' };
    expect(await recordLadderDeliveredAlertSmsSend(client, told1)).toBe(true);
    expect(await recordLadderDeliveredAlertSmsSend(client, { ...told1, claimToken: 'job-fk:1' })).toBe(false);
    expect(await lookupAlertSmsSend(client, key(told))).toMatchObject({ kind: 'final', outcome: 'error', detail: 'exhausted:ladder_delivered' });

    const { rows } = await client.query<{ member_id: string; outcome: string; detail: string | null; message: string; locale: string; cycle_id: string }>(
      `SELECT s.member_id, s.outcome, s.detail, s.message, s.locale, a.cycle_id
         FROM alert_sms_sends s JOIN alerts a ON a.alert_id = s.alert_id
        WHERE s.alert_id = $1 ORDER BY s.outcome`,
      [alertId],
    );
    expect(rows).toEqual([
      { member_id: texted, outcome: 'accepted', detail: null, message: 'cycle_open_bridge', locale: 'hi', cycle_id: cycleId },
      { member_id: told, outcome: 'error', detail: 'exhausted:ladder_delivered', message: 'cycle_open_bridge', locale: 'en', cycle_id: cycleId },
    ]);

    // (3) The FK is what admitted them: an alert id nobody projected is refused (23503) — under a SAVEPOINT (the test's tx survives).
    await client.query('SAVEPOINT fk_probe');
    await expect(
      recordLadderDeliveredAlertSmsSend(client, { ...told1, alertId: randomUUID(), memberId: randomUUID() }),
    ).rejects.toMatchObject({ code: '23503' });
    await client.query('ROLLBACK TO SAVEPOINT fk_probe');
  });
});
