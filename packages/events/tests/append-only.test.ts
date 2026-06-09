import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { schema } from '@twt/domain';

import { appendEvent } from '../src/events-log';
import { getTx, hasDatabase, setupLiveDb } from './integration-setup';

// drizzle-orm wraps pg errors in `Error('Failed query: …')` and exposes the
// underlying pg error (with the RAISE EXCEPTION message + SQLSTATE code) on
// `.cause`. Match on the cause so the assertion verifies the trigger fired
// rather than the drizzle wrapper.
function getCauseMessage(err: unknown): string {
  if (!(err instanceof Error)) return '';
  const cause = (err as { cause?: unknown }).cause;
  if (cause instanceof Error) return cause.message;
  return err.message;
}

const STREAM = '00000000-0000-0000-0000-00000000c001';
const PARIWAR = '00000000-0000-0000-0000-0000000000c1';

describe.skipIf(!hasDatabase)('events_log append-only triggers (live DB)', () => {
  setupLiveDb();

  it('rejects UPDATE on existing rows', async () => {
    const { tx } = getTx();
    const row = await appendEvent(tx, {
      streamId: STREAM,
      eventType: 'test.created',
      payload: { v: 1 },
      expectedVersion: 0,
      actorId: null,
      pariwarId: PARIWAR,
    });
    // Note: drizzle's sql tag prefixes columns with the table name
    // (`"events_log"."event_type"`), which is invalid inside an UPDATE SET
    // clause — pg parses that as `column "events_log" of relation "events_log"`.
    // Use a raw column reference for the SET target.
    const err = await tx
      .execute(
        sql`update ${schema.eventsLog} set event_type = 'tampered' where ${schema.eventsLog.eventId} = ${row.eventId}`,
      )
      .catch((e: unknown) => e);
    expect(getCauseMessage(err)).toMatch(/append-only/);
  });

  it('rejects DELETE on existing rows', async () => {
    const { tx } = getTx();
    const row = await appendEvent(tx, {
      streamId: STREAM,
      eventType: 'test.created',
      payload: {},
      expectedVersion: 0,
      actorId: null,
      pariwarId: PARIWAR,
    });
    const err = await tx
      .execute(
        sql`delete from ${schema.eventsLog} where ${schema.eventsLog.eventId} = ${row.eventId}`,
      )
      .catch((e: unknown) => e);
    expect(getCauseMessage(err)).toMatch(/append-only/);
  });

  it('rejects TRUNCATE on the table', async () => {
    const { tx } = getTx();
    const err = await tx
      .execute(sql`truncate ${schema.eventsLog}`)
      .catch((e: unknown) => e);
    expect(getCauseMessage(err)).toMatch(/append-only/);
  });
});
