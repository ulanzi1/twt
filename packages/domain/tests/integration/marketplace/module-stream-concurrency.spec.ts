// Story 12.1 — true two-connection races on a module stream (AC6, I5, I10; TR6, TR11). Live DB.
//
//   1. The LAST-PLACE race, at READ COMMITTED: two members race for one place — exactly one event, 0 places
//      left, and the loser gets `ModuleSlotsExhaustedError` (asserted symmetrically: either may win).
//   2. ARCHIVE vs LEAD on the same module, at READ COMMITTED: typed outcomes only — NEVER 40P01. This is
//      the deadlock the helpdesk projector's append-then-UPDATE order would produce (TR12); the row lock
//      taken FIRST (I10) serialises the two instead. ⚠ A PROBABILISTIC SMOKE: the interleaving is not forced, and
//      no revert-sanity (append-first order) has been recorded. I10's ORDER is pinned deterministically, per
//      command, in tests/marketplace/commands-guards.test.ts (RP4).
//   2b. The REDELIVERY races (RP3): the SAME (member, lead id) from two connections — one event, one replay; one
//      member with two lead ids — one winner, one ModuleLeadAlreadySubmittedError.
//   3. The GENESIS race, at REPEATABLE READ + a barrier (the alert-stream-concurrency shape): exactly one
//      stream; the loser gets `ModuleGenesisAlreadyExistsError`.
// ⚠ Races 1 and 2 run at READ COMMITTED: under REPEATABLE READ the loser's `FOR UPDATE` after the winner's
// commit is a 40001 (TR6), which is ⛔ the behaviour under test.
//
// Own pool, own commits (a race needs REAL concurrent COMMITs). Cleanup by the ids this suite created.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { pariwarId as toPariwarId, type ModuleId } from '../../../src/ids/index.js';
import { activateModule, archiveModule, authorModule, submitModuleLead } from '../../../src/marketplace/commands.js';
import {
  ModuleGenesisAlreadyExistsError,
  ModuleLeadAlreadySubmittedError,
  ModuleNotActiveError,
  ModuleSlotsExhaustedError,
} from '../../../src/marketplace/errors.js';
import { DATABASE_URL, hasDatabase } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A } from '../_helpers.js';
import { expectRowMatchesStream, manifestInput, newLeadId, newMemberId, newModuleId, streamTypes, txNow } from './_fixtures.js';

const A = toPariwarId(PARIWAR_A);
const OPERATOR = randomUUID();

/**
 * A two-party rendezvous: both arrive, then both proceed. ⚠ If the second party never arrives (its connect / BEGIN threw)
 * the gate REJECTS after `timeoutMs`, so the waiting racer reaches its ROLLBACK + release instead of holding an open
 * transaction that makes `pool.end()` hang (RP11).
 */
function barrier(timeoutMs = 4_000): () => Promise<void> {
  let release!: () => void;
  let fail!: (e: Error) => void;
  const gate = new Promise<void>((resolve, reject) => {
    release = resolve;
    fail = reject;
  });
  gate.catch(() => undefined); // never an unhandled rejection when nobody is waiting
  const timer = setTimeout(() => fail(new Error('barrier: the second racer never arrived')), timeoutMs);
  let arrived = 0;
  return () => {
    arrived += 1;
    if (arrived === 2) {
      clearTimeout(timer);
      release();
    }
    return gate;
  };
}

describe.skipIf(!hasDatabase)('module stream — two-connection concurrency (own-committing)', () => {
  let pool: pg.Pool;
  const created: ModuleId[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    pool.on('error', (err) => console.error('[module-stream-concurrency pool]', err.message));
  });

  afterAll(async () => {
    if (!pool) return;
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM marketplace_modules WHERE module_id = ANY($1)', [created]);
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [created]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[module-stream-concurrency.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  const base = (moduleId: ModuleId) => ({ pariwarId: A, moduleId, auditId: randomUUID(), actor: 'operator' as const, actorId: OPERATOR });

  async function begin(client: pg.PoolClient, isolation: 'READ COMMITTED' | 'REPEATABLE READ'): Promise<void> {
    await client.query('BEGIN');
    await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolation}`);
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, PARIWAR_A);
  }

  /** Author + activate a module and COMMIT it. */
  async function committedActiveModule(slotCapacity: number | null): Promise<ModuleId> {
    const id = newModuleId();
    created.push(id);
    const client = await pool.connect();
    try {
      await begin(client, 'READ COMMITTED');
      const now = await txNow(client);
      await authorModule(client, { ...base(id), manifest: manifestInput(now, { slot_capacity: slotCapacity }) });
      await activateModule(client, base(id));
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined); // ⛔ hand an aborted, role-switched connection back to the pool (RP11)
      throw e;
    } finally {
      client.release();
    }
    return id;
  }

  /** Run `fn` on its own READ COMMITTED transaction after the barrier; commit on success. */
  async function racer<T>(arrive: () => Promise<void>, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await begin(client, 'READ COMMITTED');
      await arrive();
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }

  async function inspect(id: ModuleId): Promise<{ types: string[]; slots: number | null; state: string }> {
    const client = await pool.connect();
    try {
      const r = await client.query<{ slots_remaining: number | null; current_state: string }>(
        'SELECT slots_remaining, current_state FROM marketplace_modules WHERE module_id = $1',
        [id],
      );
      await expectRowMatchesStream(client, id);
      return { types: await streamTypes(client, id), slots: r.rows[0]!.slots_remaining, state: r.rows[0]!.current_state };
    } finally {
      client.release();
    }
  }

  it('the last place: two members race for slot_capacity = 1 — exactly one lead, the other ModuleSlotsExhaustedError', async () => {
    const id = await committedActiveModule(1);
    const arrive = barrier();
    // Every statement each racer sends, so the test can tell the LOCK from the retry backstop (RP4).
    const sentBy: string[][] = [];
    const lead = () => {
      const member = newMemberId();
      const sent: string[] = [];
      sentBy.push(sent);
      return racer(arrive, (c) => {
        const spy = vi.spyOn(c, 'query');
        return submitModuleLead(c, { ...base(id), actor: 'member', actorId: member, memberId: member, leadId: newLeadId() }).finally(() => {
          sent.push(...spy.mock.calls.map(([q]) => (typeof q === 'string' ? q : (q as { text: string }).text)));
          spy.mockRestore();
        });
      });
    };
    const results = await Promise.allSettled([lead(), lead()]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toBeInstanceOf(ModuleSlotsExhaustedError);
    expect((fulfilled[0] as PromiseFulfilledResult<{ slotsRemainingAfter: number | null }>).value.slotsRemainingAfter).toBe(0);

    const after = await inspect(id);
    expect(after.types.filter((t) => t === 'module.lead_submitted')).toHaveLength(1); // I5
    expect(after.slots).toBe(0);
    expect(after.state).toBe('active');

    // RP4: without `FOR UPDATE` both racers read slots = 1 and both append v4; the loser's 23505 would be rescued by the
    // retry backstop (a SECOND savepoint) and end in the same ModuleSlotsExhaustedError. With the lock the loser WAITS
    // and is refused on its FIRST attempt — so each racer opened exactly ONE `SAVEPOINT module_lead_append`.
    for (const sent of sentBy) expect(sent.filter((t) => /^SAVEPOINT module_lead_append/.test(t))).toHaveLength(1);
  });

  // RP3 — redelivery, live. ⚠ These two pin the redelivery CONTRACT end to end (exactly one event, one replay; one member,
  // one place): they do NOT prove the row lock — with `FOR UPDATE` removed they still pass, because `module_lead_member_uq`,
  // the version unique index and the retry backstop converge on the same outcomes (checked by mutation). The LOCK is pinned
  // by the single-SAVEPOINT assertion above and, deterministically per command, by commands-guards.test.ts (RP4).
  it('the SAME (member, lead id) from two connections: exactly one event, one {replayed:false}, one {replayed:true}', async () => {
    const id = await committedActiveModule(5);
    const arrive = barrier();
    const member = newMemberId();
    const leadId = newLeadId();
    const call = () =>
      racer(arrive, (c) => submitModuleLead(c, { ...base(id), actor: 'member', actorId: member, memberId: member, leadId }));
    const results = await Promise.allSettled([call(), call()]);

    const values = results.map((r) => (r.status === 'fulfilled' ? r.value : r.reason));
    expect(results.map((r) => r.status), String(values)).toEqual(['fulfilled', 'fulfilled']);
    expect(values.map((v) => (v as { replayed: boolean }).replayed).sort()).toEqual([false, true]);
    const after = await inspect(id);
    expect(after.types.filter((t) => t === 'module.lead_submitted')).toHaveLength(1);
    expect(after.slots).toBe(4);
  });

  it('ONE member with TWO lead ids at once: one winner, the other ModuleLeadAlreadySubmittedError, one place taken', async () => {
    const id = await committedActiveModule(5);
    const arrive = barrier();
    const member = newMemberId();
    const call = () =>
      racer(arrive, (c) =>
        submitModuleLead(c, { ...base(id), actor: 'member', actorId: member, memberId: member, leadId: newLeadId() }),
      );
    const results = await Promise.allSettled([call(), call()]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toBeInstanceOf(ModuleLeadAlreadySubmittedError);
    const after = await inspect(id);
    expect(after.types.filter((t) => t === 'module.lead_submitted')).toHaveLength(1);
    expect(after.slots).toBe(4);
  });

  it('archive vs lead on the same module: typed outcomes only, NEVER 40P01 (one lock order — I10)', async () => {
    for (let round = 0; round < 6; round += 1) {
      const id = await committedActiveModule(5);
      const arrive = barrier();
      const member = newMemberId();
      const [archived, leaded] = await Promise.allSettled([
        racer(arrive, (c) => archiveModule(c, { ...base(id), reason: 'trustee_archived' })),
        racer(arrive, (c) =>
          submitModuleLead(c, { ...base(id), actor: 'member', actorId: member, memberId: member, leadId: newLeadId() }),
        ),
      ]);

      // The archive always wins its own transition — the lead either ran first or saw an archived module.
      expect(archived.status, `round ${round}: archive ${String((archived as PromiseRejectedResult).reason)}`).toBe('fulfilled');
      if (leaded.status === 'rejected') {
        const err = leaded.reason as { code?: string; cause?: { code?: string } };
        expect(err.code ?? err.cause?.code).not.toBe('40P01');
        expect(leaded.reason).toBeInstanceOf(ModuleNotActiveError);
      }
      const after = await inspect(id);
      expect(after.state).toBe('archived');
      expect(after.types.at(-1)).toBe('module.archived');
      expect(after.slots).toBe(leaded.status === 'fulfilled' ? 4 : 5);
    }
  }, 30_000);

  it('the genesis race (REPEATABLE READ + barrier): one stream; the loser gets ModuleGenesisAlreadyExistsError', async () => {
    const id = newModuleId();
    created.push(id);
    const arrive = barrier();

    async function attempt(): Promise<number> {
      const client = await pool.connect();
      try {
        await begin(client, 'REPEATABLE READ');
        // Pin the snapshot BEFORE the barrier — both transactions see an EMPTY stream.
        await client.query('SELECT max(event_version) FROM events_log WHERE stream_id = $1', [id]);
        await arrive();
        const now = await txNow(client);
        const r = await authorModule(client, { ...base(id), manifest: manifestInput(now) });
        await client.query('COMMIT');
        return r.eventVersion;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw e;
      } finally {
        client.release();
      }
    }

    const results = await Promise.allSettled([attempt(), attempt()]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toBeInstanceOf(ModuleGenesisAlreadyExistsError);

    const after = await inspect(id);
    expect(after.types).toEqual(['module.authored']);
  });
});
