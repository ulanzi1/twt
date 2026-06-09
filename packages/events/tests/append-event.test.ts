import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { schema } from '@twt/domain';

import { appendEvent, ConcurrencyError, loadEvents } from '../src/events-log';
import { getTx, hasDatabase, setupLiveDb } from './integration-setup';

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

  it('duplicate eventVersion on the same stream raises ConcurrencyError', async () => {
    // The test-isolation transaction (from setupLiveDb) is already open.
    // To exercise the unique-violation cleanly we use a SAVEPOINT around
    // the conflicting INSERT so the outer ROLLBACK still cleans everything up.
    // Note: true two-connection concurrency is deferred to Story 1.6 (W4).
    const { client, tx } = getTx();

    await appendEvent(tx, {
      streamId: STREAM,
      eventType: 'test.created',
      payload: {},
      expectedVersion: 0,
      actorId: null,
      pariwarId: PARIWAR,
    });
    await appendEvent(tx, {
      streamId: STREAM,
      eventType: 'test.updated',
      payload: {},
      expectedVersion: 1,
      actorId: null,
      pariwarId: PARIWAR,
    });

    // Caller observed version 1 but the stream is actually at version 2 now.
    // Wrap in savepoint so the transaction isn't poisoned by the unique-violation.
    await client.query('SAVEPOINT before_conflict');
    let caught: unknown;
    try {
      await appendEvent(tx, {
        streamId: STREAM,
        eventType: 'test.updated',
        payload: {},
        expectedVersion: 1,
        actorId: null,
        pariwarId: PARIWAR,
      });
    } catch (e) {
      caught = e;
    }
    await client.query('ROLLBACK TO SAVEPOINT before_conflict');

    expect(caught).toBeInstanceOf(ConcurrencyError);
    expect(caught).toMatchObject({
      name: 'ConcurrencyError',
      streamId: STREAM,
      expectedVersion: 1,
    });
    // currentVersion is intentionally absent — see Decision 2026-06-09-039 §6.
    expect(caught).not.toHaveProperty('currentVersion');
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
    ).rejects.toThrow(/expectedVersion must be >= 0/);
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
