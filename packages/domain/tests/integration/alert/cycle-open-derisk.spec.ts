// AI-7-4 first-live-caller de-risk suite — live-DB integration (Story 8.1, Task 9; AC6).
//
// THE load-bearing controlled test (D5): confirm, before the running surface (8.2/8.4) trusts the
// seam, that the two things the epic-7 retrospective flagged actually wire now that alert_id first
// physically exists. This is the ACCEPTANCE of the integration seam, NOT a re-verification of Story
// 7.3 / 7.7 in isolation (those primitives are done; 8.1 proves they COMPOSE at the alert_id bridge):
//
//   (a) the ALERT PATH FIRES — consuming a real cycle.frozen (emitted by finalizeCycleIfComplete
//       under a live-DB harness) produces alert.frozen + alert.published + alert.live on the alert
//       stream + an alerts.current_state = 'live' projection, with the attestation copied from
//       cycle.frozen; and a REDELIVERED cycle.frozen is a clean no-op (exactly one alert — AC2).
//
//   (b) the (member_id, alert_id) tr= BINDING WIRES — for a member assigned to a pool in the cycle,
//       resolving alert_id = deriveAlertId(cycle_id) and calling deriveContributionReference returns a
//       stable, bounded, version-pinned tr= that matches a FROZEN seeded vector (the 7.4/7.7
//       frozen-vector discipline — a green "it's deterministic" test proves nothing without pinned
//       bytes), reconciling the (cycle_id, pool_index) placeholder key 7.3 used (H-2/I-3). The
//       member→pool resolution is the contribution-binding.ts resolveAssignedPoolForMember path (the
//       persisted snapshot), NEVER a naive re-hash.
//
// Own-committing writers accumulate rows → assert MEMBERSHIP / explicit values, never counts of shared
// tables; scope every assertion to a FRESH cycle/alert stream ([[project_live_db_test_gotchas]]).

import { createHash, randomUUID } from 'node:crypto';

import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import {
  cycleFreezeCommitId as toCycleId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
} from '../../../src/ids/index.js';
import {
  createPoolAssignmentSeam,
  deriveContributionReference,
  finalizeCycleIfComplete,
  planCycleSpawn,
  resolveAssignedPoolForMember,
  spawnChildPool,
} from '../../../src/pool/index.js';
import { deriveAlertId, openCycleAlert } from '../../../src/alert/index.js';
import { declareDegradedMode } from '../../../src/degraded-mode/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

const FIXED_AMOUNT = 500;

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
    committedAt: new Date('2026-07-15T06:00:00Z'),
  });
}

async function alertStreamEvents(tx: Db, alertId: string) {
  return tx
    .select({ type: schema.eventsLog.eventType, version: schema.eventsLog.eventVersion, payload: schema.eventsLog.payload })
    .from(schema.eventsLog)
    .where(eq(schema.eventsLog.streamId, alertId))
    .orderBy(asc(schema.eventsLog.eventVersion));
}

/**
 * Drive a real single-pool cycle to the `cycle.frozen` commit point (plan → spawn → finalize),
 * placing `member` into the pool's snapshot via the real assignment seam. Returns the cycle id.
 */
async function driveCycleToFrozen(
  tx: Db,
  client: Parameters<typeof spawnChildPool>[0],
  cycleId: string,
  claimId: string,
  member: string,
): Promise<void> {
  const plan = await planCycleSpawn(tx, {
    pariwarId: PARIWAR_A,
    cycleId: toCycleId(cycleId),
    frozenClaims: [{ claimCaseId: claimId }],
  });
  expect(plan.children).toHaveLength(1);
  // Real assignment seam + a live roster → the member lands in pool 0's snapshot (N=1).
  await spawnChildPool(client, plan.children[0]!, createPoolAssignmentSeam(), [member], true);
  const fin = await finalizeCycleIfComplete(client, {
    pariwarId: PARIWAR_A,
    cycleId: toCycleId(cycleId),
    poolCount: 1,
  });
  expect(fin.frozen).toBe(true);
}

/**
 * Drive a real MULTI-pool cycle (N claims → N pools) to the `cycle.frozen` commit point,
 * placing ALL of `members` into the roster fed to EVERY child spawn so the real balancing
 * assignment seam (not a naive re-hash) decides which member lands in which pool. Returns the
 * cycle id. Twin of `driveCycleToFrozen`, generalized to N > 1 (Review Finding: the original
 * AC6 de-risk suite only ever drove a single-pool cycle, so it couldn't prove the
 * `(member_id, alert_id)` binding disambiguates across multiple pools within one alert — the
 * entire point of the architecture's `(alert_id, claim_id) → pool_id` model this story
 * reconciles).
 */
async function driveMultiPoolCycleToFrozen(
  tx: Db,
  client: Parameters<typeof spawnChildPool>[0],
  cycleId: string,
  claimIds: string[],
  members: string[],
): Promise<void> {
  const plan = await planCycleSpawn(tx, {
    pariwarId: PARIWAR_A,
    cycleId: toCycleId(cycleId),
    frozenClaims: claimIds.map((claimCaseId) => ({ claimCaseId })),
  });
  expect(plan.children).toHaveLength(claimIds.length);
  const seam = createPoolAssignmentSeam();
  for (const child of plan.children) {
    await spawnChildPool(client, child, seam, members, true);
  }
  const fin = await finalizeCycleIfComplete(client, {
    pariwarId: PARIWAR_A,
    cycleId: toCycleId(cycleId),
    poolCount: claimIds.length,
  });
  expect(fin.frozen).toBe(true);
}

describe.skipIf(!hasDatabase)('AI-7-4 de-risk (a) — cycle.frozen fires the alert path (PARIWAR_A)', () => {
  setupLiveDb();

  it('consuming cycle.frozen mints alert.frozen→published→live + alerts.current_state=live, attestation copied', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimId = randomUUID();
    const member = randomUUID();
    await seedCommit(tx, PARIWAR_A, cycleId, [claimId]);
    await seedFixedAmount(tx, PARIWAR_A, FIXED_AMOUNT);
    await enterAppScope(client, PARIWAR_A);

    await driveCycleToFrozen(tx, client, cycleId, claimId, member);

    // Consume cycle.frozen → mint + open the alert.
    const result = await openCycleAlert(client, { cycleId });
    const alertId = deriveAlertId(cycleId);
    expect(result.alertId).toBe(alertId);
    expect(result.minted).toBe(true);
    expect(result.state).toBe('live');
    expect(result.timeCritical).toBe(false); // no cycle_open_sms_bridge declaration active

    // The alert stream carries exactly the three cycle-open lifecycle events, in order.
    const events = await alertStreamEvents(tx, alertId);
    expect(events.map((e) => e.type)).toEqual(['alert.frozen', 'alert.published', 'alert.live']);
    expect(events.map((e) => e.version)).toEqual([1, 2, 3]);

    // The genesis copies the cycle.frozen attestation VERBATIM (never reconstructed).
    const frozen = events[0]!.payload as { attestation: unknown; cycle_id: string; pool_count: number };
    expect(frozen.cycle_id).toBe(cycleId);
    expect(frozen.pool_count).toBe(1);
    expect(frozen.attestation).toEqual({
      actor_id: 'trustee-actor-1',
      actor_display: 'Trustee One',
      committed_at: new Date('2026-07-15T06:00:00Z').toISOString(),
    });
    // alert.published carries the AR-18 signal (false here).
    expect((events[1]!.payload as { time_critical: boolean }).time_critical).toBe(false);

    // The projection is live, keyed to the cycle, minted by the freeze attestation actor.
    const [row] = await tx
      .select({
        currentState: schema.alerts.currentState,
        cycleId: schema.alerts.cycleId,
        poolCount: schema.alerts.poolCount,
        createdByActor: schema.alerts.createdByActor,
        stateEventVersion: schema.alerts.stateEventVersion,
      })
      .from(schema.alerts)
      .where(eq(schema.alerts.alertId, alertId));
    expect(row).toBeDefined();
    expect(row!.currentState).toBe('live');
    expect(row!.cycleId).toBe(cycleId);
    expect(row!.poolCount).toBe(1);
    expect(row!.createdByActor).toBe('trustee-actor-1');
    expect(row!.stateEventVersion).toBe(3);
  });

  it('a REDELIVERED cycle.frozen is a clean no-op — exactly one alert, no duplicate genesis (AC2)', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimId = randomUUID();
    const member = randomUUID();
    await seedCommit(tx, PARIWAR_A, cycleId, [claimId]);
    await seedFixedAmount(tx, PARIWAR_A, FIXED_AMOUNT);
    await enterAppScope(client, PARIWAR_A);
    await driveCycleToFrozen(tx, client, cycleId, claimId, member);

    const first = await openCycleAlert(client, { cycleId });
    expect(first.minted).toBe(true);

    // Redeliver: the same cycle.frozen consumed again → idempotent no-op.
    const second = await openCycleAlert(client, { cycleId });
    expect(second.minted).toBe(false);
    expect(second.state).toBe('live');
    expect(second.alertId).toBe(first.alertId);

    // Still exactly one alert stream (one genesis, three events) + one alerts row.
    const events = await alertStreamEvents(tx, first.alertId);
    expect(events.map((e) => e.type)).toEqual(['alert.frozen', 'alert.published', 'alert.live']);
    const rows = await tx.select({ id: schema.alerts.alertId }).from(schema.alerts).where(eq(schema.alerts.cycleId, toCycleId(cycleId)));
    expect(rows).toHaveLength(1);
  });

  it('AC4 — an ACTIVE cycle_open_sms_bridge declaration sets alert.published.time_critical=true via the real domain path', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimId = randomUUID();
    const member = randomUUID();
    const committedAt = new Date('2026-07-15T06:00:00Z'); // MUST match seedCommit's committedAt below
    await seedCommit(tx, PARIWAR_A, cycleId, [claimId]);
    await seedFixedAmount(tx, PARIWAR_A, FIXED_AMOUNT);
    await enterAppScope(client, PARIWAR_A);

    // A cycle_open_sms_bridge declaration active AT the cycle-freeze committed_at (Story 5.8).
    // Review Finding fix: every other test in this suite only ever exercises the "no active
    // declaration" branch (time_critical=false); this is the first live-DB proof of the true branch.
    await declareDegradedMode(tx, {
      pariwarId: toPariwarId(PARIWAR_A),
      mode: 'cycle_open_sms_bridge',
      effectiveFrom: new Date(committedAt.getTime() - 60_000),
      expiresAt: null,
      declaredByActor: null,
      reason: 'test: forcing the AC4 true branch',
    });

    await driveCycleToFrozen(tx, client, cycleId, claimId, member);

    const result = await openCycleAlert(client, { cycleId });
    expect(result.minted).toBe(true);
    expect(result.timeCritical).toBe(true);

    const alertId = deriveAlertId(cycleId);
    const events = await alertStreamEvents(tx, alertId);
    expect((events[1]!.payload as { time_critical: boolean }).time_critical).toBe(true);
  });
});

describe.skipIf(!hasDatabase)('AI-7-4 de-risk (b) — the (member_id, alert_id) tr= binding wires (PARIWAR_A)', () => {
  setupLiveDb();

  it('resolveAssignedPoolForMember (snapshot path) + deriveContributionReference is stable + bounded', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimId = randomUUID();
    const member = randomUUID();
    await seedCommit(tx, PARIWAR_A, cycleId, [claimId]);
    await seedFixedAmount(tx, PARIWAR_A, FIXED_AMOUNT);
    await enterAppScope(client, PARIWAR_A);
    await driveCycleToFrozen(tx, client, cycleId, claimId, member);
    await openCycleAlert(client, { cycleId });

    // The member→pool resolution is the persisted-snapshot path (NEVER a naive re-hash, D1 of 7.6).
    const resolution = await resolveAssignedPoolForMember(tx, PARIWAR_A, toCycleId(cycleId), toMemberId(member));
    expect(resolution.assigned).toBe(true);

    // Now that alert_id first physically exists, the tr= binds to (member_id, alert_id).
    const alertId = deriveAlertId(cycleId);
    const ref1 = deriveContributionReference({ memberId: toMemberId(member), alertId });
    const ref2 = deriveContributionReference({ memberId: toMemberId(member), alertId });
    expect(ref1).toBe(ref2); // stable across repeats (idempotency by construction)
    expect(ref1.length).toBeLessThanOrEqual(35); // the NPCI tr= ceiling
    expect(ref1).toMatch(/^contrib-v1-[a-z2-7]+$/);
  });
});

describe.skipIf(!hasDatabase)(
  'AI-7-4 de-risk (b) — MULTI-pool cycle: (member_id, alert_id) disambiguates across pools within one alert',
  () => {
    setupLiveDb();

    it('two members in two DIFFERENT pools of the SAME alert resolve to distinct pools + distinct tr=, sharing one alert_id', async () => {
      const { client, tx } = getTx();
      const cycleId = randomUUID();
      const claimIds = [randomUUID(), randomUUID()];
      const members = [randomUUID(), randomUUID()];
      await seedCommit(tx, PARIWAR_A, cycleId, claimIds);
      await seedFixedAmount(tx, PARIWAR_A, FIXED_AMOUNT);
      await enterAppScope(client, PARIWAR_A);

      await driveMultiPoolCycleToFrozen(tx, client, cycleId, claimIds, members);
      const opened = await openCycleAlert(client, { cycleId });
      expect(opened.minted).toBe(true);
      const alertId = deriveAlertId(cycleId);
      expect(opened.alertId).toBe(alertId);

      // Exactly one alert for the whole cycle (AC2), regardless of pool count.
      const alertRows = await tx.select({ id: schema.alerts.alertId }).from(schema.alerts).where(eq(schema.alerts.cycleId, toCycleId(cycleId)));
      expect(alertRows).toHaveLength(1);
      const [alertRow] = alertRows;
      expect(alertRow!.id).toBe(alertId);

      // Each member resolves (via the real persisted-snapshot path, never a re-hash) to a pool
      // WITHIN this alert's cycle — and the two members land in DIFFERENT pools (this is the
      // scenario a single-pool cycle can never exercise: claim_id/pool_index must distinguish
      // the N pools within one alert_id, per the architecture's (alert_id, claim_id) model).
      const resolutions = await Promise.all(
        members.map((m) => resolveAssignedPoolForMember(tx, PARIWAR_A, toCycleId(cycleId), toMemberId(m))),
      );
      const assignedPoolIds = resolutions.map((r) => {
        expect(r.assigned).toBe(true);
        if (!r.assigned) throw new Error('unreachable — asserted above');
        return r.poolId;
      });
      expect(new Set(assignedPoolIds).size).toBe(2); // two members, two DISTINCT pools

      // Both members' tr= binds to the SAME alert_id (one alert per cycle) but produces
      // DISTINCT references (the (member_id, alert_id) composite is what disambiguates them —
      // never (cycle_id, pool_index), the placeholder key this story reconciles away).
      const refs = members.map((m) => deriveContributionReference({ memberId: toMemberId(m), alertId }));
      expect(new Set(refs).size).toBe(2);
      for (const ref of refs) {
        expect(ref.length).toBeLessThanOrEqual(35);
        expect(ref).toMatch(/^contrib-v1-[a-z2-7]+$/);
      }
    });
  },
);

// The FROZEN seeded vector — PURE (no DB), so it runs even without DATABASE_URL. Pins the COMPOSITION
// deriveAlertId(cycle_id) → deriveContributionReference(member_id, alert_id) that 8.1 first makes live.
// A diff here == a deliberate ALERT_ID_NAMESPACE_UUID or CONTRIBUTION_REF_VERSION bump (a replay-identity
// break). NEVER paste a new value to "fix" it — that re-routes every already-issued tr=.
describe('AI-7-4 de-risk (b) — FROZEN composition vector (deriveAlertId → tr=)', () => {
  function seededUuid(seed: string, i: number): string {
    const hex = createHash('sha256').update(`${seed}:${String(i)}`).digest().subarray(0, 16).toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
  const M = seededUuid('twt-8.1-tr-member', 0);
  const C = seededUuid('twt-8.1-tr-cycle', 0);

  it('the seeded ids are themselves pinned (guard the vector below)', () => {
    expect(M).toBe('93af3483-bdf3-ab21-5bfa-cf4df664242f');
    expect(C).toBe('d08150e6-efb2-0dd4-05cc-6b108c856db9');
  });

  it('deriveAlertId(C) is byte-identical to the pinned alert id', () => {
    expect(deriveAlertId(C)).toBe('fd1d53fd-9f62-5e2a-a2d7-91db4cfae7c0');
  });

  it('the composed (member_id, alert_id) tr= is byte-identical to the pinned vector', () => {
    const alertId = deriveAlertId(C);
    const tr = deriveContributionReference({ memberId: toMemberId(M), alertId });
    expect(tr).toBe('contrib-v1-e23by3x2iiysg3w2uoxa');
    expect(tr.length).toBeLessThanOrEqual(35);
  });
});
