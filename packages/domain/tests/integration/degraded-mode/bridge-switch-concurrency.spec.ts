// The degraded-mode bridge's Super Admin switch — a TRUE two-connection race on the change (Story 5.8b; code review 2026-10-28,
// P2-4; load-bearing-invariant checklist family 2).
//
// ⛔ WHAT THIS EXISTS TO PROVE. `setDegradedBridgeSmsSwitchInTx` locks the control row (`SELECT … FOR UPDATE`) and only THEN
// compares the state it wants with the state it finds. Two identical changes racing each other must produce ONE history row and ONE
// state change: the loser blocks on the lock, re-reads the winner's committed state, and returns `changed: false` (⛔ a write).
// `degraded-bridge-sms-switch-policy-regression.spec.ts` runs its changes SEQUENTIALLY inside one transaction, so deleting the lock
// leaves it green — this file is the two-connection proof.
//
// ⭐ THE DISCRIMINATOR. Without the lock, B's read does not see A's uncommitted change (READ COMMITTED): B finds the OLD state,
// INSERTs a SECOND history row, then waits on A's row lock only at its UPDATE and goes on to report `changed: true`. With the lock, B
// waits at its read and finds nothing to do. ⇒ B's `changed: false` AND exactly ONE history row between the two actors are what make
// deleting `FOR UPDATE` fail this suite. ⛔ Weaken neither.
//
// ⚠ THE RACE IS FORCED, ⛔ timed: writer A is held open until B's backend is SEEN waiting on a lock (`pg_stat_activity`), and only then
// committed — two calls that merely start together can serialize by luck and pass with or without the lock.
//
// ⚠ Own-committing (⛔ `setupLiveDb`): a real race needs REAL commits on SEPARATE connections. The history is APPEND-ONLY for every
// role (0188's trigger), so this suite's rows are NOT removed — they are found by this suite's own actor ids, never by a global
// count; the switch's state is restored to what the suite found (by another actor id) in `finally`.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readDegradedBridgeSmsSwitch, setDegradedBridgeSmsSwitch, setDegradedBridgeSmsSwitchInTx } from '../../../src/degraded-mode/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

/** Wait until backend `pid` is blocked on a heavyweight lock — the moment the race is real. Throws after `ms`. */
async function untilWaitingOnLock(observer: pg.Pool, pid: number, ms = 5000): Promise<void> {
  const deadline = Date.now() + ms;
  for (;;) {
    const { rows } = await observer.query<{ w: string | null }>(`SELECT wait_event_type AS w FROM pg_stat_activity WHERE pid = $1`, [pid]);
    if (rows[0]?.w === 'Lock') return;
    if (Date.now() > deadline) throw new Error(`backend ${String(pid)} never waited on a lock`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe.skipIf(!hasDatabase)('the degraded-mode bridge switch — two-connection change race (own-committing)', { timeout: 20_000 }, () => {
  let pool: pg.Pool;
  /** Writer B's pool — ONE connection, so its backend pid is known before the race. */
  let poolB: pg.Pool;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });
    poolB = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  });
  afterAll(async () => {
    await poolB.end();
    await pool.end();
  });

  it('⭐ two IDENTICAL changes race: ONE history row, ONE state change; the loser waits at the lock, then finds nothing to do (`changed: false`)', async () => {
    const found = (await readDegradedBridgeSmsSwitch(pool)).enabled;
    const target = !found;
    const actorA = randomUUID();
    const actorB = randomUUID();
    const pidB = (await poolB.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;

    const a = await pool.connect();
    let bResult: Awaited<ReturnType<typeof setDegradedBridgeSmsSwitch>> | undefined;
    // Code review 2026-10-28 (second pass) — the restore wraps EVERYTHING, and B is always awaited: on a throw before A commits, A's
    // ROLLBACK releases B, which then COMMITS its own flip; restoring before B lands would leave the shared DB switched.
    try {
      let bWrite: Promise<unknown> | undefined;
      try {
        await a.query('BEGIN');
        // ── Writer A: locks the row, appends its history row, flips the state — and is HELD OPEN (uncommitted). ──
        const aResult = await setDegradedBridgeSmsSwitchInTx(a, { enabled: target, actorId: actorA, actorDisplay: 'Race A', reason: 'race A', auditId: randomUUID() });
        expect(aResult.changed).toBe(true);

        // ── Writer B: the SAME change, through the real pooled entry point, while A is still uncommitted. ──
        const b = setDegradedBridgeSmsSwitch(poolB, { enabled: target, actorId: actorB, actorDisplay: 'Race B', reason: 'race B', auditId: randomUUID() });
        bWrite = b;
        await untilWaitingOnLock(pool, pidB);
        // Only NOW does A commit — releasing the lock B is waiting on.
        await a.query('COMMIT');
        bResult = await b;
      } finally {
        await a.query('ROLLBACK').catch(() => undefined);
        a.release();
        // A is gone (committed or rolled back), so B can finish; its outcome is asserted below, never dropped here.
        await bWrite?.catch(() => undefined);
      }

      expect(bResult).toMatchObject({ changed: false, state: { enabled: target, changedByActor: actorA, changedByDisplay: 'Race A', reason: 'race A' } });
      const { rows } = await pool.query<{ changed_by_actor: string; enabled: boolean }>(
        `SELECT changed_by_actor, enabled FROM degraded_bridge_sms_switch_changes WHERE changed_by_actor = ANY($1::uuid[])`,
        [[actorA, actorB]],
      );
      expect(rows).toEqual([{ changed_by_actor: actorA, enabled: target }]);
      expect((await readDegradedBridgeSmsSwitch(pool)).enabled).toBe(target);
    } finally {
      await setDegradedBridgeSmsSwitch(pool, { enabled: found, actorId: randomUUID(), actorDisplay: 'spec', reason: 'spec restore', auditId: randomUUID() });
    }
  });
});
