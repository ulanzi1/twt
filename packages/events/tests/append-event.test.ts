import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { schema, setPariwarScope, type Db } from '@twt/domain';

import { appendEvent, ConcurrencyError, loadEvents } from '../src/events-log';
import { DATABASE_URL, getTx, hasDatabase, setupLiveDb } from './integration-setup';

const STREAM = '00000000-0000-0000-0000-00000000a001';
const PARIWAR = '00000000-0000-0000-0000-0000000000a1';

describe.skipIf(!hasDatabase)('appendEvent (live DB)', () => {
  setupLiveDb();

  it('happy path: first append to a stream lands at eventVersion = 1', async () => {
    const { tx } = getTx();
    // appendEvent returns AppendResult (eventId + eventVersion only).
    const result = await appendEvent(tx, {
      streamId: STREAM,
      eventType: 'test.created',
      payload: { x: 1 },
      expectedVersion: 0,
      actorId: null,
      pariwarId: PARIWAR,
    });
    expect(result.eventVersion).toBe(1);
    expect(result.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    // Verify the full stored row via loadEvents.
    const [stored] = await loadEvents(tx, STREAM);
    expect(stored?.streamId).toBe(STREAM);
    expect(stored?.eventType).toBe('test.created');
    expect(stored?.payload).toEqual({ x: 1 });
    expect(stored?.actorId).toBeNull();
    expect(stored?.pariwarId).toBe(PARIWAR);
    expect(stored?.occurredAt).toBeInstanceOf(Date);
  });

  it('sequential appends increment eventVersion monotonically', async () => {
    const { tx } = getTx();
    const r1 = await appendEvent(tx, {
      streamId: STREAM,
      eventType: 'test.created',
      payload: { v: 1 },
      expectedVersion: 0,
      actorId: null,
      pariwarId: PARIWAR,
    });
    const r2 = await appendEvent(tx, {
      streamId: STREAM,
      eventType: 'test.updated',
      payload: { v: 2 },
      expectedVersion: 1,
      actorId: null,
      pariwarId: PARIWAR,
    });
    const r3 = await appendEvent(tx, {
      streamId: STREAM,
      eventType: 'test.updated',
      payload: { v: 3 },
      expectedVersion: 2,
      actorId: null,
      pariwarId: PARIWAR,
    });
    expect(r1.eventVersion).toBe(1);
    expect(r2.eventVersion).toBe(2);
    expect(r3.eventVersion).toBe(3);
  });

  it('rejects negative expectedVersion', async () => {
    const { tx } = getTx();
    await expect(
      appendEvent(tx, {
        streamId: STREAM,
        eventType: 'test.created',
        payload: {},
        expectedVersion: -1,
        actorId: null,
        pariwarId: PARIWAR,
      }),
    ).rejects.toThrow(/expectedVersion must be a non-negative integer/);
  });

  it('rejects payload BEFORE INSERT when payloadSchema mismatches (no row inserted)', async () => {
    const { tx } = getTx();
    const schemaCheck = z.object({ amount: z.number() });
    await expect(
      appendEvent(tx, {
        streamId: STREAM,
        eventType: 'test.created',
        payload: { amount: 'not-a-number' },
        expectedVersion: 0,
        actorId: null,
        pariwarId: PARIWAR,
        payloadSchema: schemaCheck,
      }),
    ).rejects.toThrow(/Expected number/);

    // Verify nothing landed (defense-in-depth: Zod fails FIRST).
    const countResult = await tx.execute(
      sql`select count(*)::int as c from ${schema.eventsLog} where ${schema.eventsLog.streamId} = ${STREAM}`,
    );
    const rows = countResult.rows as Array<{ c: number }>;
    expect(rows[0]?.c).toBe(0);
  });

  it('idempotent re-append with explicit eventId: second attempt fails on event_id PK (NOT the (stream_id,event_version) UNIQUE)', async () => {
    const { tx, client } = getTx();
    const eventId = '00000000-0000-0000-0000-0000000ee001';
    await appendEvent(tx, {
      eventId,
      streamId: STREAM,
      eventType: 'test.created',
      payload: {},
      expectedVersion: 0,
      actorId: null,
      pariwarId: PARIWAR,
    });
    // Same eventId, different streamId → triggers PK violation, not unique-index.
    // Application layer is responsible for treating PK violation as
    // "already-applied"; @twt/events only maps the (stream_id, event_version)
    // unique-violation to ConcurrencyError. Wrap in savepoint so the unique-
    // violation doesn't poison the test-isolation transaction.
    await client.query('SAVEPOINT before_pk_violation');
    const err = await appendEvent(tx, {
      eventId,
      streamId: '00000000-0000-0000-0000-00000000a002',
      eventType: 'test.created',
      payload: {},
      expectedVersion: 0,
      actorId: null,
      pariwarId: PARIWAR,
    }).catch((e: unknown) => e);
    await client.query('ROLLBACK TO SAVEPOINT before_pk_violation');
    expect(err).toBeInstanceOf(Error);
    const cause = (err as { cause?: { code?: string } }).cause;
    expect(cause?.code).toBe('23505');
  });
});

// True two-connection optimistic-concurrency test (Story 1.6, closes Story 1.3
// deferred W4 — the prior SAVEPOINT test simulated the unique-violation on a
// single connection; this exercises the real production failure mode: two
// pooled clients race on the same (stream_id, event_version)).
//
// This block manages its OWN pool + two physical connections (NOT setupLiveDb's
// per-test transaction, which is single-connection). Each attempt runs a full
// BEGIN → setPariwarScope → appendEvent → COMMIT unit; the loser's INSERT blocks
// on the winner's uncommitted unique-index entry until the winner COMMITs, then
// surfaces the unique-violation as ConcurrencyError. Running each unit
// independently (rather than holding both transactions open and committing after
// the race) is what avoids a deadlock. The winning row COMMITs (the append-only
// trigger blocks cleanup), so a fresh randomUUID stream per run avoids
// cross-run collisions.
describe.skipIf(!hasDatabase)('appendEvent true concurrency (two connections)', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    pool.on('error', (err) =>
      console.error('[append-event concurrency pool]', err.message),
    );
  });
  afterAll(() => pool.end());

  it(
    'two parallel appendEvent calls — one wins, one throws ConcurrencyError',
    async () => {
      // Same mitigation as packages/domain's pool-stream-concurrency.spec.ts (see
      // [[project_known_livedb_test_failures]] #11): forcing the two connections'
      // INSERTs to genuinely collide depends on their setup round-trips overlapping,
      // which was observed NOT happening reliably on GitHub Actions' service-container
      // Postgres. A same-tick readiness barrier plus a bounded retry on a fresh stream
      // absorbs environment-specific latency skew without touching production code; if
      // the unique-index backstop were actually broken, no retry count would ever
      // produce a collision, so this still fails loud rather than masking a real gap.
      const MAX_ATTEMPTS = 5;
      let lastOutcome = '';

      for (let attemptNum = 1; attemptNum <= MAX_ATTEMPTS; attemptNum++) {
        const stream = randomUUID();

        let arrivals = 0;
        let releaseBarrier!: () => void;
        const barrier = new Promise<void>((resolve) => {
          releaseBarrier = resolve;
        });
        async function arriveAtBarrier(): Promise<void> {
          arrivals += 1;
          if (arrivals === 2) releaseBarrier();
          await barrier;
        }

        async function attempt(client: pg.PoolClient): Promise<number> {
          await client.query('BEGIN');
          await setPariwarScope(client, PARIWAR);
          const db = drizzle(client, { schema }) as unknown as Db;
          await arriveAtBarrier();
          try {
            const res = await appendEvent(db, {
              streamId: stream,
              eventType: 'test.created',
              payload: {},
              expectedVersion: 0,
              actorId: null,
              pariwarId: PARIWAR,
            });
            await client.query('COMMIT');
            return res.eventVersion;
          } catch (e) {
            await client.query('ROLLBACK').catch(() => undefined);
            throw e;
          }
        }

        const c1 = await pool.connect();
        const c2 = await pool.connect();
        let fulfilled: PromiseSettledResult<number>[];
        let rejected: PromiseSettledResult<number>[];
        try {
          const [r1, r2] = await Promise.allSettled([attempt(c1), attempt(c2)]);
          fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
          rejected = [r1, r2].filter((r) => r.status === 'rejected');
        } finally {
          c1.release();
          c2.release();
        }

        if (fulfilled.length === 1 && rejected.length === 1) {
          expect((fulfilled[0] as PromiseFulfilledResult<number>).value).toBe(1);

          const reason = (rejected[0] as PromiseRejectedResult).reason;
          expect(reason).toBeInstanceOf(ConcurrencyError);
          expect(reason).toMatchObject({
            name: 'ConcurrencyError',
            streamId: stream,
            expectedVersion: 0,
          });
          // Decision 2026-06-09-039 §6: currentVersion is intentionally absent from
          // ConcurrencyError (callers must not branch on the current version to avoid
          // TOCTOU races; they must retry from scratch).
          expect(reason).not.toHaveProperty('currentVersion');
          return;
        }
        lastOutcome = `attempt ${attemptNum}: ${fulfilled.length} fulfilled / ${rejected.length} rejected`;
      }

      throw new Error(
        `appendEvent true concurrency: no collision observed across ${MAX_ATTEMPTS} attempts (${lastOutcome}) — ` +
          `either the unique-index backstop is broken, or the two connections never overlapped.`,
      );
    },
    60_000,
  );
});
