// `allocateAttributionCode` — TWO-CONNECTION races (own-committing). Story 13.2 (code review R5; AC4 / AC8; I1 / I2).
//
// ⭐ A real race needs real concurrent COMMITs on SEPARATE pool clients (the `*-concurrency.spec.ts` family,
// `nominee/nominee-history-concurrency.spec.ts` the precedent): each allocator runs BEGIN → SET LOCAL ROLE twt_app → scope →
// allocate → COMMIT / ROLLBACK, deliberately interleaved:
//   · the same `(pariwar, code)` — the waiter BLOCKS on the holder's uncommitted UNIQUE entry; holder COMMITs ⇒ the waiter's
//     23505 on the code unique rolls back to its savepoint and it REDRAWS (attempt 2), its tx still usable; holder ROLLS BACK
//     ⇒ the waiter takes the code on attempt 1;
//   · the same worker, two different codes — the waiter's pre-check sees nothing (the holder is uncommitted), its INSERT BLOCKS
//     on the worker unique; holder COMMITs ⇒ `FieldWorkerAlreadyHasAttributionCodeError` (⛔ a retry, ⛔ an exhaustion), and
//     the waiter's tx is still usable (CONTROL: it allocates another worker and commits), with ⛔ allocator savepoint left on it;
//   · a NON-unique failure inside the INSERT — the waiter BLOCKS on the holder's uncommitted entry and a THIRD connection then
//     cancels it (`pg_cancel_backend` ⇒ 57014; ⛔ a timer in the test) — is rethrown as THAT error (⛔ a redraw, ⛔ an
//     exhaustion), the savepoint is gone and the tx is still usable (review R2-7: the `throw err` exit of the allocator's `catch`).
// ⭐ "BLOCKS" is PROVED from the server (`pg_blocking_pids`), ⛔ inferred from a timer. Every held tx is ended in a `finally`.
// Committed rows go to a FRESH Pariwar (⛔ PARIWAR_A); the append-only rows leave in `afterAll` under replica mode (the guard
// triggers are fixture-cleanup-only bypassed, as in the precedent).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { fieldWorkerId as toFieldWorkerId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { FieldWorkerId } from '../../../src/ids/index.js';
import { attributionCode } from '../../../src/index.js';
import { pgSqlstateOf } from '../../../src/marketplace/errors.js';
import { expectNoAllocatorSavepoint, scripted } from './_fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = toPariwarId(randomUUID()); // ⭐ a fresh tenant — committed rows never pollute PARIWAR_A
const TIMEOUT = 20_000;
const worker = (): FieldWorkerId => toFieldWorkerId(randomUUID());

describe.skipIf(!hasDatabase)('Story 13.2 — allocateAttributionCode two-connection races (own-committing)', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6 });
  });

  afterAll(async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      // Replica mode disables triggers — including the append-only guard — for fixture cleanup ONLY.
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query('DELETE FROM field_worker_attribution_codes WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    await pool.end();
  });

  async function begin(): Promise<pg.PoolClient> {
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, PARIWAR);
    return client;
  }
  async function end(client: pg.PoolClient, commit: boolean): Promise<void> {
    try {
      await client.query(commit ? 'COMMIT' : 'ROLLBACK');
    } finally {
      client.release();
    }
  }
  const pidOf = async (c: pg.PoolClient): Promise<number> =>
    Number((await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid);

  /** Poll until backend `waiter` is BLOCKED BY backend `holder` (server truth), or give up. */
  async function blockedBy(waiter: number, holder: number, withinMs = 5000): Promise<boolean> {
    const deadline = Date.now() + withinMs;
    while (Date.now() < deadline) {
      const r = await pool.query<{ blockers: number[] }>('SELECT pg_blocking_pids($1) AS blockers', [waiter]);
      if ((r.rows[0]?.blockers ?? []).map(Number).includes(holder)) return true;
      await new Promise((res) => setTimeout(res, 25));
    }
    return false;
  }

  /** The committed rows for these workers, as `worker → code`. */
  async function committed(...workers: FieldWorkerId[]): Promise<Record<string, string>> {
    const r = await pool.query<{ field_worker_id: string; code: string }>(
      'SELECT field_worker_id, code FROM field_worker_attribution_codes WHERE pariwar_id = $1 AND field_worker_id = ANY($2::uuid[])',
      [PARIWAR, workers],
    );
    return Object.fromEntries(r.rows.map((x) => [x.field_worker_id, x.code]));
  }

  /**
   * Run `race` on its own tx (the WAITER) while `holderWork` holds an uncommitted row on another (the HOLDER); prove the waiter is
   * blocked by the holder, then end the holder (`holderCommits`) and return the waiter's outcome — the waiter's tx is left OPEN
   * for the caller's control, and both are ended in a `finally` whatever happens.
   */
  async function raceAgainstHolder<T>(
    holderWork: (holder: pg.PoolClient) => Promise<unknown>,
    holderCommits: boolean,
    race: (waiter: pg.PoolClient) => Promise<T>,
    after: (waiter: pg.PoolClient, outcome: { value?: T; error?: unknown }) => Promise<boolean>,
  ): Promise<void> {
    const holder = await begin();
    const waiter = await begin();
    let holderOpen = true;
    let waiterOpen = true;
    try {
      await holderWork(holder);
      const [holderPid, waiterPid] = [await pidOf(holder), await pidOf(waiter)]; // ⭐ before the race — a busy client queues
      const raced = race(waiter).then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
      );
      expect(await blockedBy(waiterPid, holderPid)).toBe(true);
      await end(holder, holderCommits);
      holderOpen = false;
      const outcome = await raced;
      const commit = await after(waiter, outcome);
      await end(waiter, commit);
      waiterOpen = false;
    } finally {
      if (holderOpen) await end(holder, false).catch(() => undefined);
      if (waiterOpen) await end(waiter, false).catch(() => undefined);
    }
  }

  it(
    'the same code: the waiter BLOCKS; the holder commits ⇒ the waiter’s 23505 redraws on attempt 2 and commits — two rows, two codes',
    async () => {
      const [w1, w2] = [worker(), worker()];
      const g = scripted('731100', '731101');
      await raceAgainstHolder(
        (holder) =>
          attributionCode.allocateAttributionCode(holder, { pariwarId: PARIWAR, fieldWorkerId: w1 }, { generate: scripted('731100').generate }),
        true,
        (waiter) => attributionCode.allocateAttributionCode(waiter, { pariwarId: PARIWAR, fieldWorkerId: w2 }, { generate: g.generate }),
        async (_waiter, { value, error }) => {
          expect(error).toBeUndefined();
          expect(value).toMatchObject({ code: '731101', attempts: 2 });
          expect(g.draws()).toBe(2);
          return true;
        },
      );
      expect(await committed(w1, w2)).toEqual({ [w1]: '731100', [w2]: '731101' });
    },
    TIMEOUT,
  );

  it(
    'the same code: the holder ROLLS BACK ⇒ the waiter takes that code on attempt 1 (⛔ a redraw)',
    async () => {
      const [w1, w2] = [worker(), worker()];
      const g = scripted('731110', '731111');
      await raceAgainstHolder(
        (holder) =>
          attributionCode.allocateAttributionCode(holder, { pariwarId: PARIWAR, fieldWorkerId: w1 }, { generate: scripted('731110').generate }),
        false,
        (waiter) => attributionCode.allocateAttributionCode(waiter, { pariwarId: PARIWAR, fieldWorkerId: w2 }, { generate: g.generate }),
        async (_waiter, { value, error }) => {
          expect(error).toBeUndefined();
          expect(value).toMatchObject({ code: '731110', attempts: 1 });
          expect(g.draws()).toBe(1);
          return true;
        },
      );
      expect(await committed(w1, w2)).toEqual({ [w2]: '731110' });
    },
    TIMEOUT,
  );

  it(
    'the same worker: the waiter’s pre-check passes, its INSERT BLOCKS; the holder commits ⇒ FieldWorkerAlreadyHasAttributionCodeError (⛔ retried) — and the waiter’s tx is still usable (CONTROL)',
    async () => {
      const [w, control] = [worker(), worker()];
      const g = scripted('731120', '731121');
      await raceAgainstHolder(
        (holder) =>
          attributionCode.allocateAttributionCode(holder, { pariwarId: PARIWAR, fieldWorkerId: w }, { generate: scripted('731122').generate }),
        true,
        (waiter) => attributionCode.allocateAttributionCode(waiter, { pariwarId: PARIWAR, fieldWorkerId: w }, { generate: g.generate }),
        async (waiter, { value, error }) => {
          expect(value).toBeUndefined();
          expect(error).toBeInstanceOf(attributionCode.FieldWorkerAlreadyHasAttributionCodeError);
          expect(error).toMatchObject({ pariwarId: PARIWAR, fieldWorkerId: w });
          expect(g.draws()).toBe(1);
          await expectNoAllocatorSavepoint(waiter); // the worker-unique exit RELEASEs too (review R2-7)
          // ⛔ "no row survived" (vacuous after ROLLBACK TO SAVEPOINT) — the CONTROL: the same tx allocates and commits.
          const ok = await attributionCode.allocateAttributionCode(
            waiter,
            { pariwarId: PARIWAR, fieldWorkerId: control },
            { generate: scripted('731120').generate },
          );
          expect(ok).toMatchObject({ code: '731120', attempts: 1 });
          return true;
        },
      );
      expect(await committed(w, control)).toEqual({ [w]: '731122', [control]: '731120' });
    },
    TIMEOUT,
  );

  it(
    'a NON-unique failure inside the INSERT (the waiter BLOCKS, a third connection CANCELS it ⇒ 57014) is rethrown as that error — ⛔ a redraw, ⛔ an exhaustion — and no allocator savepoint remains (CONTROL: the same tx allocates)',
    async () => {
      const [w1, w2, control] = [worker(), worker(), worker()];
      const g = scripted('731130', '731131');
      let holder: pg.PoolClient | undefined;
      let waiter: pg.PoolClient | undefined;
      let raced: Promise<{ value?: unknown; error?: unknown }> | undefined;
      try {
        holder = await begin();
        waiter = await begin();
        await attributionCode.allocateAttributionCode(holder, { pariwarId: PARIWAR, fieldWorkerId: w1 }, { generate: scripted('731130').generate });
        const [holderPid, waiterPid] = [await pidOf(holder), await pidOf(waiter)]; // ⭐ before the race — a busy client queues
        raced = attributionCode.allocateAttributionCode(waiter, { pariwarId: PARIWAR, fieldWorkerId: w2 }, { generate: g.generate }).then(
          (value) => ({ value }),
          (error: unknown) => ({ error }),
        );
        // ⭐ the holder is NOT ended: the waiter's INSERT is blocked on the holder's uncommitted entry (server truth) …
        expect(await blockedBy(waiterPid, holderPid)).toBe(true);
        // … until a THIRD connection cancels it — a non-unique failure with ⛔ a timer anywhere in the test (57014, query_canceled).
        const cancelled = await pool.query<{ ok: boolean }>('SELECT pg_cancel_backend($1) AS ok', [waiterPid]);
        expect(cancelled.rows[0]?.ok).toBe(true);
        const outcome = await raced;
        expect('value' in outcome).toBe(false);
        expect(pgSqlstateOf(outcome.error)).toBe('57014'); // the ORIGINAL error
        expect(outcome.error).not.toBeInstanceOf(attributionCode.AttributionCodeAllocationExhaustedError);
        expect(outcome.error).not.toBeInstanceOf(attributionCode.FieldWorkerAlreadyHasAttributionCodeError);
        expect(g.draws()).toBe(1); // ⛔ a redraw
        await expectNoAllocatorSavepoint(waiter);
        // The CONTROL: the waiter's tx is still usable and commits.
        expect(
          await attributionCode.allocateAttributionCode(waiter, { pariwarId: PARIWAR, fieldWorkerId: control }, { generate: scripted('731132').generate }),
        ).toMatchObject({ code: '731132', attempts: 1 });
        await end(waiter, true);
        waiter = undefined;
      } finally {
        // In order: release the holder (this un-blocks a still-pending waiter), let the allocator settle, THEN end the waiter —
        // ⛔ a ROLLBACK interleaved with the allocator's own statements.
        if (holder) await end(holder, false).catch(() => undefined);
        if (raced) await raced;
        if (waiter) await end(waiter, false).catch(() => undefined);
      }
      expect(await committed(w1, w2, control)).toEqual({ [control]: '731132' });
    },
    TIMEOUT,
  );
}, TIMEOUT);
