// Fixed-amount schedule — live-DB integration (Story 7.5, Task 7; AC2/AC3/AC4/AC5/AC6).
//
// The DB shell of the effective-dated fixed-amount schedule, against real Postgres under PARIWAR_A
// inside the per-test BEGIN/ROLLBACK envelope. The load-bearing proofs (the ACs' teeth):
//   · (a) snapshot-at-committed_at — planCycleSpawn resolves + snapshots the amount effective at the
//        cycle-freeze `committed_at`, retiring the env constant (AC2).
//   · (b) NON-RETROACTIVITY — a future-dated change does NOT alter an already-spawned pool's snapshot
//        (AC4). Structural (a new schedule row is only ever read by a FUTURE spawn); this is its teeth.
//   · (c) emergency atomicity — applyEmergencyOverride writes the schedule row AND its immutable
//        Emergency Adjustment Record together; the record references the schedule version; a
//        change_type='emergency' row without its attestation is impossible (AC3).
//   · (d) the 365-day floor — rejected for a short-notice standard change, bypassed for emergency (AC4).
//   · (f) fail-loud — getEffectiveFixedAmount throws when no entry is effective (never a silent default).
//
// Heeds [[project_live_db_test_gotchas]]: asserts MEMBERSHIP / explicit values, never regenerates an
// applied migration, seeds under superuser (RLS bypassed) then reads back under app scope.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { cycleFreezeCommitId as toCycleId, poolId as toPoolId } from '../../../src/ids/index.js';
import {
  applyEmergencyOverride,
  getEffectiveFixedAmount,
  getEmergencyAttestation,
  planCycleSpawn,
  PoolFixedAmountNoticeTooShortError,
  PoolFixedAmountNotConfiguredError,
  scheduleStandardChange,
  spawnChildPool,
} from '../../../src/pool/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

const COMMITTED_AT = new Date('2026-07-15T06:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

async function seedSchedule(tx: Db, amount: number, effectiveFrom: Date): Promise<void> {
  await tx.insert(schema.poolFixedAmountSchedule).values({
    pariwarId: PARIWAR_A,
    version: 1,
    fixedAmount: amount,
    effectiveFrom,
    effectiveUntil: null,
    changeType: 'standard',
    createdByActor: 'system:test-seed',
  });
}

async function seedCommit(tx: Db, cycleId: string, claimIds: string[]): Promise<void> {
  await tx.insert(schema.cycleFreezeCommits).values({
    commitId: toCycleId(cycleId),
    pariwarId: PARIWAR_A,
    actorId: 'trustee-actor-1',
    actorDisplay: 'Trustee One',
    committedClaimIds: claimIds,
    committedAt: COMMITTED_AT,
  });
}

describe.skipIf(!hasDatabase)('fixed-amount schedule (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('(a) planCycleSpawn snapshots the amount effective at committed_at', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimIds = [randomUUID()];
    // Effective 2026-01-01 → in force at the 2026-07-15 committed_at.
    await seedSchedule(tx, 777, new Date('2026-01-01T00:00:00Z'));
    await seedCommit(tx, cycleId, claimIds);
    await enterAppScope(client, PARIWAR_A);

    const plan = await planCycleSpawn(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      frozenClaims: claimIds.map((c) => ({ claimCaseId: c })),
    });
    expect(plan.children[0]!.fixedAmount).toBe(777);

    await spawnChildPool(client, plan.children[0]!);
    const [pool] = await tx
      .select({ fixedAmount: schema.pools.fixedAmount })
      .from(schema.pools)
      .where(eq(schema.pools.poolId, toPoolId(plan.children[0]!.poolId)));
    expect(pool!.fixedAmount).toBe(777);
  });

  it('(b) a future-dated change does NOT alter an already-spawned pool snapshot (non-retroactivity)', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimIds = [randomUUID()];
    await seedSchedule(tx, 500, new Date('2026-01-01T00:00:00Z'));
    await seedCommit(tx, cycleId, claimIds);
    await enterAppScope(client, PARIWAR_A);

    // Spawn a pool → it snapshots 500 (effective at committed_at).
    const plan = await planCycleSpawn(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      frozenClaims: claimIds.map((c) => ({ claimCaseId: c })),
    });
    const spec = plan.children[0]!;
    await spawnChildPool(client, spec);

    // Schedule a FUTURE change to 900 (>= 365 days out → passes the standard floor).
    const now = new Date();
    await scheduleStandardChange(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 900,
      effectiveFrom: new Date(now.getTime() + 400 * DAY_MS),
      actorId: 'trustee-actor-1',
    });

    // The already-spawned pool's amount is UNCHANGED (the change only affects future spawns).
    const [pool] = await tx
      .select({ fixedAmount: schema.pools.fixedAmount })
      .from(schema.pools)
      .where(eq(schema.pools.poolId, toPoolId(spec.poolId)));
    expect(pool!.fixedAmount).toBe(500);
    // And the amount effective AT the (past) committed_at is still 500.
    expect(await getEffectiveFixedAmount(tx, PARIWAR_A, COMMITTED_AT)).toBe(500);
  });

  it('(c) applyEmergencyOverride writes the schedule row AND its immutable attestation atomically', async () => {
    const { client, tx } = getTx();
    await seedSchedule(tx, 500, new Date('2026-01-01T00:00:00Z')); // genesis head to supersede
    await enterAppScope(client, PARIWAR_A);

    const { schedule: entry, attestation } = await applyEmergencyOverride(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 650,
      effectiveFrom: new Date(),
      documentedReason: 'reserve adequacy — actuarial review',
      panel: [
        { actor_id: 'trustee-a', actor_display: 'Trustee A' },
        { actor_id: 'trustee-b', actor_display: 'Trustee B' },
      ],
      attestedByActor: 'trustee-a',
      attestedDisplay: 'Trustee A',
    });

    // The schedule row is the emergency head (v2 — superseded the seeded v1).
    expect(entry.changeType).toBe('emergency');
    expect(entry.version).toBe(2);
    expect(entry.fixedAmount).toBe(650);
    // The immutable record references THIS schedule version + denormalizes the amount + panel.
    expect(attestation.scheduleVersion).toBe(entry.version);
    expect(attestation.fixedAmount).toBe(650);
    expect(attestation.panel).toHaveLength(2);
    expect(attestation.documentedReason).toContain('reserve adequacy');

    // Both rows are durably present + linked — no emergency schedule row without its attestation.
    const emergencyRows = await tx
      .select({ version: schema.poolFixedAmountSchedule.version })
      .from(schema.poolFixedAmountSchedule)
      .where(
        and(
          eq(schema.poolFixedAmountSchedule.pariwarId, PARIWAR_A),
          eq(schema.poolFixedAmountSchedule.changeType, 'emergency'),
        ),
      );
    expect(emergencyRows.map((r) => r.version)).toContain(entry.version);
    const fetched = await getEmergencyAttestation(tx, PARIWAR_A, entry.version);
    expect(fetched).not.toBeNull();
    expect(fetched!.fixedAmount).toBe(650);
  });

  it('(d) the 365-day floor rejects a short-notice standard change but an emergency bypasses it', async () => {
    const { client, tx } = getTx();
    await seedSchedule(tx, 500, new Date('2026-01-01T00:00:00Z'));
    await enterAppScope(client, PARIWAR_A);
    const now = new Date();

    // Standard change only 10 days out → rejected (the 12-month notice floor, DB-authoritative).
    await expect(
      scheduleStandardChange(tx, {
        pariwarId: PARIWAR_A,
        fixedAmount: 600,
        effectiveFrom: new Date(now.getTime() + 10 * DAY_MS),
        actorId: 'trustee-actor-1',
      }),
    ).rejects.toBeInstanceOf(PoolFixedAmountNoticeTooShortError);

    // Standard change 400 days out → accepted.
    const ok = await scheduleStandardChange(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 600,
      effectiveFrom: new Date(now.getTime() + 400 * DAY_MS),
      actorId: 'trustee-actor-1',
    });
    expect(ok.changeType).toBe('standard');

    // Emergency effective immediately → accepted (no floor).
    const emg = await applyEmergencyOverride(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 700,
      effectiveFrom: now,
      documentedReason: 'regulatory change',
      panel: [
        { actor_id: 'trustee-a', actor_display: 'Trustee A' },
        { actor_id: 'trustee-b', actor_display: 'Trustee B' },
      ],
      attestedByActor: 'trustee-a',
      attestedDisplay: 'Trustee A',
    });
    expect(emg.schedule.changeType).toBe('emergency');
  });

  it('(g) an emergency effective_from preceding a pending FUTURE standard change closes that change at its OWN effective_from — never inverted', async () => {
    // Review-hardening regression: closeOpenHead used to set the row it was closing's
    // effective_until to the NEW row's effective_from unconditionally. When the new write's
    // effective_from precedes the open head it is closing (exactly this scenario — an immediate
    // emergency superseding an already-scheduled future standard change), that produced an
    // INVERTED window (effective_from > effective_until) on the closed row. The fix closes at
    // max(newEffectiveFrom, openHead.effectiveFrom) instead — a zero-width, well-formed, moot
    // window on the row being superseded before it ever took effect.
    const { client, tx } = getTx();
    await seedSchedule(tx, 500, new Date('2026-01-01T00:00:00Z'));
    await enterAppScope(client, PARIWAR_A);
    const now = new Date();

    // Schedule a FUTURE standard change (400 days out) — becomes the open head (v2).
    const future = await scheduleStandardChange(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 900,
      effectiveFrom: new Date(now.getTime() + 400 * DAY_MS),
      actorId: 'trustee-actor-1',
    });
    expect(future.effectiveUntil).toBeNull();

    // An emergency fires NOW — its effective_from precedes v2's effective_from.
    const emg = await applyEmergencyOverride(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 750,
      effectiveFrom: now,
      documentedReason: 'reserve adequacy',
      panel: [
        { actor_id: 'trustee-a', actor_display: 'Trustee A' },
        { actor_id: 'trustee-b', actor_display: 'Trustee B' },
      ],
      attestedByActor: 'trustee-a',
      attestedDisplay: 'Trustee A',
    });
    expect(emg.schedule.changeType).toBe('emergency');
    expect(emg.schedule.effectiveUntil).toBeNull(); // the emergency is the new open head

    // v2 (the pending standard change) is closed at ITS OWN effective_from — zero-width, NOT
    // inverted (effective_from === effective_until, never effective_from > effective_until).
    const [supersededRow] = await tx
      .select({
        effectiveFrom: schema.poolFixedAmountSchedule.effectiveFrom,
        effectiveUntil: schema.poolFixedAmountSchedule.effectiveUntil,
      })
      .from(schema.poolFixedAmountSchedule)
      .where(
        and(
          eq(schema.poolFixedAmountSchedule.pariwarId, PARIWAR_A),
          eq(schema.poolFixedAmountSchedule.version, future.version),
        ),
      );
    expect(supersededRow!.effectiveUntil).not.toBeNull();
    expect(supersededRow!.effectiveUntil!.getTime()).toBe(supersededRow!.effectiveFrom.getTime());

    // The now-moot v2 window can never resolve — asOf === its effective_from does NOT match it
    // (the window predicate is `from <= asOf < until`, and here `until === from`).
    expect(await getEffectiveFixedAmount(tx, PARIWAR_A, future.effectiveFrom)).toBe(750); // the emergency wins
  });

  it('(f) getEffectiveFixedAmount throws when no entry is effective (fail loud, never a silent default)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(getEffectiveFixedAmount(tx, PARIWAR_A, COMMITTED_AT)).rejects.toBeInstanceOf(
      PoolFixedAmountNotConfiguredError,
    );
  });
});
