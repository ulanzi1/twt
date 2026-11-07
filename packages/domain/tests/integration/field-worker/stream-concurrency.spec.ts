// Story 13.1 — true two-connection races on a field-worker stream (AC6; I4, I13; QE13). Live DB. Twin:
// `marketplace/module-stream-concurrency.spec.ts`.
//
//   (a) suspend vs terminate, from `active`, 6 rounds: terminate ALWAYS fulfils; suspend ran first or lost with
//       IllegalTransition. ⚠ A PROBABILISTIC SMOKE — the interleaving is not forced. I13's ORDER is pinned
//       deterministically per command in `tests/field-worker/commands-guards.test.ts` (with its RED proof).
//   (b) kyc_completed vs itself: one event; the loser KycAlreadyCompleted.
//   (c) the GENESIS race on the SAME id, two DIFFERENT mobiles — REPEATABLE READ, the snapshot pinned BEFORE the barrier.
//   (d) the SAME-MOBILE race, two DIFFERENT ids: the loser MobileAlreadyRegistered BY CONSTRAINT NAME, its transaction
//       still usable, and NO event for its id.
//   (e) post vs terminate (6 rounds), and two moves from the SAME screen (6 rounds): since Story 13.1c AD4 (13.1 D7) the second is
//       refused AuthorizationStale, ⛔ fulfilled from the first's destination.
// (a), (b), (d), (e) run at READ COMMITTED — under REPEATABLE READ a lock waiter gets an untyped 40001 (QE13). Every error
// code is read as `err.code ?? err.cause?.code`; no race may end in 40P01 or 40001.
//
// Own pool, own COMMITs (a race needs real concurrent commits), a FRESH Pariwar. Cleanup by the ids this suite created,
// under `session_replication_role = 'replica'` (`events_log` is append-only; `field_workers` refuses DELETE).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import {
  activateFieldWorker,
  postFieldWorker,
  recordFieldWorkerKycCompleted,
  suspendFieldWorker,
  terminateFieldWorker,
} from '../../../src/field-worker/commands.js';
import {
  FieldWorkerAuthorizationStaleError,
  FieldWorkerGenesisAlreadyExistsError,
  FieldWorkerIllegalTransitionError,
  FieldWorkerKycAlreadyCompletedError,
  FieldWorkerMobileAlreadyRegisteredError,
} from '../../../src/field-worker/errors.js';
import { pariwarId as toPariwarId, type FieldWorkerId } from '../../../src/ids/index.js';
import { DATABASE_URL, hasDatabase } from '../../../src/test-utils/integration-setup.js';
import { actAuthorization, approval, expectRowMatchesStream, moveAuthorization, registerReal, streamTypes } from './_fixtures.js';

const PARIWAR = randomUUID();
const P = toPariwarId(PARIWAR);
const ACTOR = randomUUID();

/** A two-party rendezvous (the twin's): both arrive, then both proceed; rejects after `timeoutMs` if one never arrives. */
function barrier(timeoutMs = 4_000): () => Promise<void> {
  let release!: () => void;
  let fail!: (e: Error) => void;
  const gate = new Promise<void>((resolve, reject) => {
    release = resolve;
    fail = reject;
  });
  gate.catch(() => undefined);
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

const codeOf = (e: unknown): string | undefined => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err.code ?? err.cause?.code;
};

describe.skipIf(!hasDatabase)('field-worker stream — two-connection concurrency (own-committing, AC6)', () => {
  let pool: pg.Pool;
  const created: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    pool.on('error', (err) => console.error('[field-worker-stream-concurrency pool]', err.message));
  });

  afterAll(async () => {
    if (!pool) return;
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      // Story 13.1b — first: replica mode disables the FK, so a worker's `due` row would outlive them for a later sweep to find.
      await admin.query('DELETE FROM field_worker_code_sms_sends WHERE pariwar_id = $1', [PARIWAR]);
      await admin.query('DELETE FROM field_workers WHERE pariwar_id = $1 AND field_worker_id = ANY($2)', [PARIWAR, created]);
      await admin.query('DELETE FROM events_log WHERE pariwar_id = $1 AND stream_id = ANY($2)', [PARIWAR, created]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[field-worker stream-concurrency.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  const base = (id: FieldWorkerId) => ({ pariwarId: P, fieldWorkerId: id, auditId: randomUUID(), actor: 'operator' as const, actorId: ACTOR });
  /** Story 13.1a AD3 — the two approval commands take a verified `field_worker.approve` result (+ the approver's name). */
  const approve = (id: FieldWorkerId) => ({ ...base(id), ...approval(PARIWAR, 'Patna', ACTOR) });
  /** Story 13.1c AD3 — suspend / terminate take a verified result for THEIR key (every worker here starts in Patna). */
  const act = (id: FieldWorkerId, key: 'field_worker.suspend' | 'field_worker.terminate') => ({ ...base(id), authorization: actAuthorization(key, PARIWAR, 'Patna', ACTOR) });
  /** Story 13.1c AD4 — a move from Patna (the district the admin saw), under the `field_worker.move` key at `target`. */
  const moveFromPatna = (id: FieldWorkerId, to: string, target = to) => ({
    ...base(id),
    toDistrict: to,
    expectedFromDistrict: 'Patna',
    authorization: moveAuthorization(PARIWAR, target, ACTOR),
  });

  async function begin(client: pg.PoolClient, isolation: 'READ COMMITTED' | 'REPEATABLE READ'): Promise<void> {
    await client.query('BEGIN');
    await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolation}`);
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, PARIWAR);
  }

  /** Register (and optionally KYC + activate) a worker and COMMIT it. */
  async function committedWorker(state: 'pending_kyc' | 'active'): Promise<FieldWorkerId> {
    const client = await pool.connect();
    try {
      await begin(client, 'READ COMMITTED');
      const id = await registerReal(client, PARIWAR, { actorId: ACTOR });
      created.push(id);
      if (state === 'active') {
        await recordFieldWorkerKycCompleted(client, approve(id));
        await activateFieldWorker(client, approve(id));
      }
      await client.query('COMMIT');
      return id;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }

  /** Run `fn` on its own transaction after the barrier; commit on success. */
  async function racer<T>(arrive: () => Promise<void>, fn: (c: pg.PoolClient) => Promise<T>, isolation: 'READ COMMITTED' | 'REPEATABLE READ' = 'READ COMMITTED'): Promise<T> {
    const client = await pool.connect();
    try {
      await begin(client, isolation);
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

  async function inspect(id: string): Promise<{ types: string[]; row: { current_state: string; district: string } }> {
    const client = await pool.connect();
    try {
      await expectRowMatchesStream(client, id); // I4, and versions 1…n with no gap
      const row = (await client.query('SELECT current_state, district FROM field_workers WHERE field_worker_id = $1', [id])).rows[0];
      return { types: await streamTypes(client, id), row };
    } finally {
      client.release();
    }
  }

  async function istToday(): Promise<string> {
    return (await pool.query<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d")).rows[0]!.d;
  }

  it('(a) suspend vs terminate, from active, 6 rounds: terminate always fulfils; the final state is terminated; never 40P01 / 40001', async () => {
    const today = await istToday();
    for (let round = 0; round < 6; round += 1) {
      const id = await committedWorker('active');
      const arrive = barrier();
      const [suspended, terminated] = await Promise.allSettled([
        racer(arrive, (c) => suspendFieldWorker(c, { ...act(id, 'field_worker.suspend'), reasonCode: 'under_review' })),
        racer(arrive, (c) => terminateFieldWorker(c, { ...act(id, 'field_worker.terminate'), reasonCode: 'inactive', endedOn: today })),
      ]);
      expect(terminated.status, `round ${round}: terminate ${String((terminated as PromiseRejectedResult).reason)}`).toBe('fulfilled');
      const after = await inspect(id);
      expect(after.row.current_state).toBe('terminated');
      expect(after.types.at(-1)).toBe('field_worker.terminated');
      if (suspended.status === 'fulfilled') {
        expect(after.types.slice(-2)).toEqual(['field_worker.suspended', 'field_worker.terminated']);
      } else {
        expect(['40P01', '40001']).not.toContain(codeOf(suspended.reason));
        expect(suspended.reason).toBeInstanceOf(FieldWorkerIllegalTransitionError);
        expect(after.types.slice(-1)).toEqual(['field_worker.terminated']);
        expect(after.types).not.toContain('field_worker.suspended');
      }
    }
  }, 30_000);

  it('(b) kyc_completed vs itself: exactly ONE event; the loser gets KycAlreadyCompleted; pending_kyc with kyc completed', async () => {
    const id = await committedWorker('pending_kyc');
    const arrive = barrier();
    const results = await Promise.allSettled([
      racer(arrive, (c) => recordFieldWorkerKycCompleted(c, approve(id))),
      racer(arrive, (c) => recordFieldWorkerKycCompleted(c, approve(id))),
    ]);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toBeInstanceOf(FieldWorkerKycAlreadyCompletedError);
    const after = await inspect(id);
    expect(after.types.filter((t) => t === 'field_worker.kyc_completed')).toHaveLength(1);
    expect(after.row.current_state).toBe('pending_kyc');
  });

  it('(c) the GENESIS race — the same id, two different mobiles (REPEATABLE READ, snapshot pinned before the barrier): one stream, the loser GenesisAlreadyExists', async () => {
    const id = randomUUID();
    created.push(id);
    const arrive = barrier();
    async function attempt(): Promise<void> {
      const client = await pool.connect();
      try {
        await begin(client, 'REPEATABLE READ');
        await client.query('SELECT max(event_version) FROM events_log WHERE stream_id = $1', [id]); // pin the snapshot
        await arrive();
        await registerReal(client, PARIWAR, { fieldWorkerId: id, actorId: ACTOR });
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw e;
      } finally {
        client.release();
      }
    }
    const results = await Promise.allSettled([attempt(), attempt()]);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toBeInstanceOf(FieldWorkerGenesisAlreadyExistsError);
    expect((await inspect(id)).types).toEqual(['field_worker.registered']);
  });

  it('(d) the SAME-MOBILE race — two ids, one mobile: one row; the loser MobileAlreadyRegistered (by name), its tx STILL USABLE, no event for its id', async () => {
    const mobile = `race-${randomUUID()}`;
    const ids = [randomUUID(), randomUUID()];
    created.push(...ids);
    const arrive = barrier();
    const usable: boolean[] = [];
    const attempt = (id: string) =>
      racer(arrive, async (c) => {
        try {
          await registerReal(c, PARIWAR, { fieldWorkerId: id, mobileBlindIndex: mobile, actorId: ACTOR });
        } catch (e) {
          // The genesis SAVEPOINT rolled back — the same transaction still answers.
          usable.push((await c.query('SELECT 1 AS one')).rows[0]?.one === 1);
          throw e;
        }
      });
    const results = await Promise.allSettled(ids.map(attempt));
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toBeInstanceOf(FieldWorkerMobileAlreadyRegisteredError);
    expect(usable).toEqual([true]);
    const loser = ids[results.findIndex((r) => r.status === 'rejected')]!;
    const winner = ids[results.findIndex((r) => r.status === 'fulfilled')]!;
    const rows = await pool.query('SELECT field_worker_id FROM field_workers WHERE pariwar_id = $1 AND mobile_blind_index = $2', [PARIWAR, mobile]);
    expect(rows.rows.map((r) => r.field_worker_id)).toEqual([winner]);
    expect((await pool.query('SELECT 1 FROM events_log WHERE stream_id = $1', [loser])).rowCount).toBe(0);
  });

  it('(e1) post vs terminate, from active, 6 rounds: terminate always fulfils; post ran first (the terminated row keeps the new district) or lost', async () => {
    const today = await istToday();
    for (let round = 0; round < 6; round += 1) {
      const id = await committedWorker('active');
      const arrive = barrier();
      const [posted, terminated] = await Promise.allSettled([
        racer(arrive, (c) => postFieldWorker(c, { ...moveFromPatna(id, 'Gaya'), reasonCode: 'reassigned' })),
        // The termination's gate read Patna; a move that wins first makes its target stale (13.1c AD3, (3d)) — so it is authorized at
        // the district it will find: Patna if it runs first, Gaya if the move did. Both orders are legal; (3d) is pinned in commands.spec.ts.
        racer(arrive, async (c) => {
          const { district } = (await c.query<{ district: string }>('SELECT district FROM field_workers WHERE field_worker_id = $1 FOR UPDATE', [id])).rows[0]!;
          return terminateFieldWorker(c, { ...base(id), authorization: actAuthorization('field_worker.terminate', PARIWAR, district, ACTOR), reasonCode: 'left_voluntarily', endedOn: today });
        }),
      ]);
      expect(terminated.status, `round ${round}`).toBe('fulfilled');
      const after = await inspect(id);
      expect(after.row.current_state).toBe('terminated');
      if (posted.status === 'fulfilled') {
        expect(after.types.slice(-2)).toEqual(['field_worker.posted', 'field_worker.terminated']);
        expect(after.row.district).toBe('Gaya');
      } else {
        expect(['40P01', '40001']).not.toContain(codeOf(posted.reason));
        expect(posted.reason).toBeInstanceOf(FieldWorkerIllegalTransitionError);
        expect(after.row.district).toBe('Patna');
      }
    }
  }, 30_000);

  // Story 13.1c AD4 (13.1 D7) — before 13.1c, two moves from the same screen BOTH fulfilled, serialised by the row lock (the second
  // ran from the first's destination). Now each names the district its admin saw (`expectedFromDistrict`), so the second is REFUSED.
  it('(e2) two moves from the SAME screen (both saw Patna) at once — one to Gaya at its destination, one to Nalanda at the sending end: exactly one fulfils, the other AuthorizationStale; one posted event', async () => {
    for (let round = 0; round < 6; round += 1) {
      const id = await committedWorker('active');
      const arrive = barrier();
      const results = await Promise.allSettled([
        racer(arrive, (c) => postFieldWorker(c, { ...moveFromPatna(id, 'Gaya'), reasonCode: 'reassigned' })),
        racer(arrive, (c) => postFieldWorker(c, { ...moveFromPatna(id, 'Nalanda', 'Patna'), reasonCode: 'at_worker_request' })),
      ]);
      const won = results.findIndex((r) => r.status === 'fulfilled');
      expect(results.filter((r) => r.status === 'fulfilled'), `round ${round}`).toHaveLength(1);
      const lost = results[1 - won] as PromiseRejectedResult;
      expect(['40P01', '40001']).not.toContain(codeOf(lost.reason));
      expect(lost.reason).toBeInstanceOf(FieldWorkerAuthorizationStaleError);
      const after = await inspect(id);
      expect(after.row.district).toBe(won === 0 ? 'Gaya' : 'Nalanda');
      expect(after.types.filter((t) => t === 'field_worker.posted')).toHaveLength(1);
    }
  }, 30_000);
});
