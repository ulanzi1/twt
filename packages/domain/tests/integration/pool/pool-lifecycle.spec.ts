// Pool lifecycle — live-DB integration (Story 7.1, Task 5/10; AC2/AC5).
//
// Drives the projector (append + project in ONE tx), the AC5 write-rejection trigger,
// and the stream-ordering contract against real Postgres under PARIWAR_A scope, inside
// the per-test BEGIN/ROLLBACK (nothing persists). Asserts MEMBERSHIP / explicit values,
// never DROP SCHEMA; per [[project_live_db_test_gotchas]]. Twin of claim-lifecycle.spec.ts.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  claimId as toClaimId,
  cycleFreezeCommitId as toCycleId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import { isPoolStateDirectWriteError, projectPoolState } from '../../../src/pool/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { mintPoolPublicToken } from '../../../src/pool/public-token.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedPool } from '../_helpers.js';

/** Build the §1.14 audit-shape payload an emitter supplies (extra fields merged in). */
const audit = (
  from: string | null,
  to: string,
  trigger: string,
  actor: 'system' | 'operator' | 'trustee',
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({ from_state: from, to_state: to, trigger, actor, ...extra });

/** The full spawn payload (pool.spawned carries the spawn-snapshot identity). */
const spawnPayload = (cycleId: string): Record<string, unknown> =>
  audit(null, 'spawned', 'cycle_freeze_commit:spawn', 'system', {
    support_category: 'death_support',
    benefit_mechanism: 'pool',
    fixed_amount: 500,
    pool_index: 0,
    cycle_id: cycleId,
    pool_canonical_identifier: 'P-2026-07-001',
  });

describe.skipIf(!hasDatabase)('pool lifecycle (PARIWAR_A scope)', () => {
  setupLiveDb();

  const spawnInput = (poolId: ReturnType<typeof toPoolId>, cycleId: string, claimCaseId: string) => ({
    poolId,
    pariwarId: PARIWAR_A,
    cycleId: toCycleId(cycleId),
    claimCaseId: toClaimId(claimCaseId),
    poolIndex: 0,
    poolCanonicalIdentifier: 'P-2026-07-001',
    supportCategory: 'death_support' as const,
    benefitMechanism: 'pool' as const,
    fixedAmount: 500,
    actorId: null,
  });

  it('projector drives the full lifecycle spawned → live → closed → settled in-tx', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pid = toPoolId(randomUUID());
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();
    const auditId = randomUUID();

    const r1 = await projectPoolState(client, {
      ...spawnInput(pid, cycleId, claimCaseId),
      eventType: 'pool.spawned',
      payload: spawnPayload(cycleId),
      auditId,
    });
    expect(r1.eventVersion).toBe(1);
    expect(r1.state).toBe('spawned');

    const r2 = await projectPoolState(client, {
      ...spawnInput(pid, cycleId, claimCaseId),
      eventType: 'pool.opened_for_contributions',
      payload: audit('spawned', 'live', 'cron:window_open', 'system'),
    });
    expect(r2.eventVersion).toBe(2);
    expect(r2.state).toBe('live');

    const r3 = await projectPoolState(client, {
      ...spawnInput(pid, cycleId, claimCaseId),
      eventType: 'pool.closed',
      payload: audit('live', 'closed', 'cron:window_close', 'system'),
    });
    expect(r3.state).toBe('closed');

    const r4 = await projectPoolState(client, {
      ...spawnInput(pid, cycleId, claimCaseId),
      eventType: 'pool.settled',
      payload: audit('closed', 'settled', 'disbursement:settled', 'system'),
    });
    expect(r4.eventVersion).toBe(4);
    expect(r4.state).toBe('settled');

    // The cached pools row reflects the final projected state + version (same tx view).
    const rows = await tx.select().from(schema.pools).where(eq(schema.pools.poolId, pid));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.currentState).toBe('settled');
    expect(rows[0]?.stateEventVersion).toBe(4);
    expect(rows[0]?.supportCategory).toBe('death_support');
    expect(rows[0]?.benefitMechanism).toBe('pool');
    expect(rows[0]?.fixedAmount).toBe(500);
    expect(rows[0]?.claimCaseId).toBe(claimCaseId);
    expect(rows[0]?.cycleId).toBe(cycleId);
    expect(rows[0]?.auditId).toBe(auditId);

    // All four events landed on the pool's stream.
    const events = await tx
      .select()
      .from(schema.eventsLog)
      .where(eq(schema.eventsLog.streamId, pid));
    expect(events).toHaveLength(4);
  });

  it('AC5: a direct UPDATE pools SET current_state without the projector guard is REJECTED', async () => {
    const { client, tx } = getTx();
    const pid = randomUUID();
    await seedPool(tx, PARIWAR_A, { poolId: pid, currentState: 'spawned' });
    await enterAppScope(client, PARIWAR_A);

    const err = await client
      .query("UPDATE pools SET current_state = 'settled' WHERE pool_id = $1", [pid])
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe('P0001');
    expect((err as Error).message).toContain('pools.current_state direct write rejected');
    expect(isPoolStateDirectWriteError(err)).toBe(true);
  });

  it('AC5 (review fix): a direct UPDATE touching ONLY state_event_version is REJECTED (the cache pair travels together)', async () => {
    const { client, tx } = getTx();
    const pid = randomUUID();
    await seedPool(tx, PARIWAR_A, { poolId: pid, currentState: 'spawned' });
    await enterAppScope(client, PARIWAR_A);

    const err = await client
      .query('UPDATE pools SET state_event_version = 999 WHERE pool_id = $1', [pid])
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe('P0001');
    expect(isPoolStateDirectWriteError(err)).toBe(true);
  });

  it('AC5: a non-state UPDATE (updated_at only) is NOT rejected by the trigger', async () => {
    const { client, tx } = getTx();
    const pid = randomUUID();
    await seedPool(tx, PARIWAR_A, { poolId: pid, currentState: 'spawned' });
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query('UPDATE pools SET updated_at = now() WHERE pool_id = $1', [pid]),
    ).resolves.toBeDefined();
  });

  it('AC5: a direct INSERT into pools without the projector guard is REJECTED', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const err = await client
      .query(
        // ⚠ `public_token` is supplied (Story 11b.10) so this test keeps asserting what it means to
        // assert: WITHOUT it the row would ALSO violate the column's NOT NULL, and the test would
        // then be resting on Postgres running BEFORE-ROW triggers ahead of constraint checks rather
        // than on the guard itself. ⛔ A test that passes for a second, incidental reason is not a
        // test of the first one.
        `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index,
           pool_canonical_identifier, support_category, benefit_mechanism, fixed_amount,
           current_state, state_event_version, public_token)
         VALUES ($1,$2,$3,$4,0,'P-2026-07-777','death_support','pool',500,'spawned',1,$5)`,
        [randomUUID(), PARIWAR_A, randomUUID(), randomUUID(), mintPoolPublicToken()],
      )
      .then(() => null)
      .catch((e: unknown) => e);
    expect((err as { code?: string }).code).toBe('P0001');
    expect(isPoolStateDirectWriteError(err)).toBe(true);
  });

  it('inapplicable event replays as identity (pool.settled from spawned is a no-op)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pid = toPoolId(randomUUID());
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();

    await projectPoolState(client, {
      ...spawnInput(pid, cycleId, claimCaseId),
      eventType: 'pool.spawned',
      payload: spawnPayload(cycleId),
    });
    // settle-before-open: reducer is total → identity, stays `spawned`.
    const r = await projectPoolState(client, {
      ...spawnInput(pid, cycleId, claimCaseId),
      eventType: 'pool.settled',
      payload: audit('spawned', 'settled', 'oops', 'system'),
    });
    expect(r.state).toBe('spawned');

    const rows = await tx.select().from(schema.pools).where(eq(schema.pools.poolId, pid));
    expect(rows[0]?.currentState).toBe('spawned');
    expect(rows[0]?.stateEventVersion).toBe(2); // the event still appended
  });

  it('review fix: the first event on a fresh pool stream MUST be pool.spawned', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pid = toPoolId(randomUUID());
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();

    await expect(
      projectPoolState(client, {
        ...spawnInput(pid, cycleId, claimCaseId),
        eventType: 'pool.closed',
        payload: audit(null, 'closed', 'oops', 'system'),
      }),
    ).rejects.toThrow(/first event for a new pool stream must be 'pool\.spawned'/);
  });

  it("review fix: pool.spawned input/payload mismatch (fixedAmount) is REJECTED", async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pid = toPoolId(randomUUID());
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();

    await expect(
      projectPoolState(client, {
        ...spawnInput(pid, cycleId, claimCaseId),
        fixedAmount: 999, // ← does NOT match spawnPayload's fixed_amount: 500
        eventType: 'pool.spawned',
        payload: spawnPayload(cycleId),
      }),
    ).rejects.toThrow(/pool\.spawned input\/payload mismatch on: fixedAmount/);
  });

  it('review fix: payload.actor="system" with a non-null actorId is REJECTED', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pid = toPoolId(randomUUID());
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();

    await expect(
      projectPoolState(client, {
        ...spawnInput(pid, cycleId, claimCaseId),
        actorId: randomUUID(), // ← non-null, but payload.actor is 'system'
        eventType: 'pool.spawned',
        payload: spawnPayload(cycleId),
      }),
    ).rejects.toThrow(/actor\/actorId mismatch/);
  });

  it('review fix: an unregistered eventType throws a diagnosable error, not a raw TypeError', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pid = toPoolId(randomUUID());
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();

    await expect(
      projectPoolState(client, {
        ...spawnInput(pid, cycleId, claimCaseId),
        eventType: 'pool.frobnicated' as never,
        payload: spawnPayload(cycleId),
      }),
    ).rejects.toThrow(/unknown pool event type: pool\.frobnicated/);
  });

  it('cross-tenant: a pool seeded under B is invisible under scope A', async () => {
    const { client, tx } = getTx();
    const pidA = randomUUID();
    const pidB = randomUUID();
    await seedPool(tx, PARIWAR_A, { poolId: pidA });
    await seedPool(tx, PARIWAR_B, { poolId: pidB });
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.pools);
    expect(rows.some((r) => r.poolId === pidA)).toBe(true);
    expect(rows.some((r) => r.poolId === pidB)).toBe(false);
  });
});
