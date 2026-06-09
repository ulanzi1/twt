// @twt/events — appendEvent / loadEvents / replayState API surface.
//
// Story 1.3 substrate per AR-8 + AR-14 + AR-57 + architecture §1.14 +
// §Process patterns line 3866-3884 (service-layer typed-return error
// discipline for ConcurrencyError).
//
// The events_log table itself lives in @twt/domain (Drizzle canonical home
// per architecture line 4341-4356). This file is the API layer over it.

import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { Db } from '@twt/domain';
import { schema } from '@twt/domain';
import type { z } from 'zod';

export type EventRow = typeof schema.eventsLog.$inferSelect;

/**
 * Minimal return type for appendEvent — the inserted event's id + version.
 * A strict subset of EventRow so callers aren't coupled to the full row shape.
 */
export type AppendResult = Pick<EventRow, 'eventId' | 'eventVersion'>;

export interface AppendEventInput {
  /** Opaque per-domain identifier — member_id, claim_id, pool_id, etc. */
  streamId: string;
  /** Dotted resource.action (architecture line 3830-3833). */
  eventType: string;
  /** Event payload; JSONB at storage layer. */
  payload: unknown;
  /**
   * Optimistic-concurrency anchor: the version the caller observed.
   * The new event lands at expectedVersion + 1. Pass 0 for a brand-new stream
   * (first event lands at eventVersion = 1).
   */
  expectedVersion: number;
  /** NULL = system / SIE per architecture §1.14 line 1262-1268. */
  actorId: string | null;
  /** Multi-tenant scope per architecture §1.2. */
  pariwarId: string;
  /** Optional explicit event UUID for idempotent re-append (AR-58). */
  eventId?: string;
  /**
   * Optional Zod schema validating `payload`. When provided, `.parse(payload)`
   * runs BEFORE the INSERT — fail-fast at the application boundary, defense-
   * in-depth alongside the DB JSONB column type. Per-event-type Zod schemas
   * are downstream-Story territory (Story 3.1+ member.*, 6.x claim.*, etc.).
   */
  payloadSchema?: z.ZodTypeAny;
}

/**
 * Typed return for the optimistic-concurrency failure mode per architecture
 * §Process patterns line 3873-3884. Concurrent appends are an EXPECTED
 * failure (two callers race; one wins, one retries) — not exceptional.
 * The handler at apps/api translates ConcurrencyError → HTTP 409 Conflict
 * (Story 1.6+ territory).
 *
 * Callers that need the current stream version for retry logic should call
 * `loadEvents(db, streamId)` and inspect the last row — not the error itself.
 * The error deliberately does NOT carry a `currentVersion` field because
 * looking it up inside the same transaction would require a savepoint dance
 * (the unique-violation aborts the surrounding transaction in pg) and would
 * couple the error path to transaction-state assumptions we can't make at
 * this layer.
 */
export class ConcurrencyError extends Error {
  public readonly name = 'ConcurrencyError';

  public constructor(
    public readonly streamId: string,
    public readonly expectedVersion: number,
  ) {
    super(
      `events_log concurrency conflict on stream ${streamId} at expected version ${expectedVersion}`,
    );
  }
}

interface PgError {
  code?: string;
  constraint?: string;
  message: string;
}

/**
 * The unique-index name for the (stream_id, event_version) constraint. Keep in
 * sync with the `uniqueIndex(...)` declaration in packages/domain/src/schema/events_log.ts.
 */
const STREAM_VERSION_CONSTRAINT = 'events_log_stream_id_event_version_uq';

/**
 * Unwrap drizzle-orm's wrapped pg error. drizzle wraps the underlying pg
 * error in a generic `Error('Failed query: …')` and exposes the original
 * on `.cause`. The pg error carries the SQLSTATE code in `.code` and the
 * constraint name in `.constraint`.
 *
 * Falls back to checking `err` directly when `.cause` is present but is not
 * an object (defensive against driver versions that format errors differently).
 */
function extractPgError(err: unknown): PgError | null {
  if (!(err instanceof Error)) return null;
  const causeRaw = (err as { cause?: unknown }).cause;
  // Prefer .cause (drizzle wraps pg errors there); fall back to err itself.
  const candidate = causeRaw !== undefined && causeRaw !== null ? causeRaw : err;
  if (typeof candidate !== 'object' || candidate === null) return null;
  const obj = candidate as { code?: unknown; constraint?: unknown; message?: unknown };
  if (typeof obj.code !== 'string') return null;
  return {
    code: obj.code,
    constraint: typeof obj.constraint === 'string' ? obj.constraint : undefined,
    message: typeof obj.message === 'string' ? obj.message : '',
  };
}

export async function appendEvent(
  db: Db,
  input: AppendEventInput,
): Promise<AppendResult> {
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    throw new Error('appendEvent: expectedVersion must be a non-negative integer');
  }
  if (input.expectedVersion >= Number.MAX_SAFE_INTEGER) {
    throw new Error('appendEvent: expectedVersion overflow — stream version exceeds safe integer range');
  }

  if (input.payloadSchema) {
    input.payloadSchema.parse(input.payload);
  }

  const nextVersion = input.expectedVersion + 1;

  try {
    const [row] = await db
      .insert(schema.eventsLog)
      .values({
        // `eventId` omitted when undefined → DB default gen_random_uuid() fires.
        ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
        streamId: input.streamId,
        eventType: input.eventType,
        payload: input.payload,
        eventVersion: nextVersion,
        actorId: input.actorId,
        pariwarId: input.pariwarId,
      })
      .returning();

    if (!row) {
      throw new Error('appendEvent: INSERT returning produced no row');
    }
    return { eventId: row.eventId, eventVersion: row.eventVersion };
  } catch (err) {
    const pgErr = extractPgError(err);
    if (
      pgErr?.code === '23505' &&
      pgErr.constraint === STREAM_VERSION_CONSTRAINT
    ) {
      throw new ConcurrencyError(input.streamId, input.expectedVersion);
    }
    throw err;
  }
}

export interface LoadEventsOptions {
  fromVersion?: number;
  toVersion?: number;
}

export async function loadEvents(
  db: Db,
  streamId: string,
  opts: LoadEventsOptions = {},
): Promise<EventRow[]> {
  const conditions = [eq(schema.eventsLog.streamId, streamId)];
  if (opts.fromVersion !== undefined) {
    conditions.push(gte(schema.eventsLog.eventVersion, opts.fromVersion));
  }
  if (opts.toVersion !== undefined) {
    conditions.push(lte(schema.eventsLog.eventVersion, opts.toVersion));
  }

  return db
    .select()
    .from(schema.eventsLog)
    .where(and(...conditions))
    .orderBy(asc(schema.eventsLog.eventVersion));
}

/**
 * Deterministic fold over an event stream. Equivalent to
 * `loadEvents().then(events => events.reduce(reducer, initialState))` with
 * byte-deterministic semantics (architecture §Cross-Cutting #4 line 284-285;
 * line 1229-1234 "Member state is derived from event history. Persisted
 * state is an optimization only").
 *
 * Reducer type narrows EventRow → E so downstream consumers can use typed
 * event unions without runtime cost.
 */
export async function replayState<S, E extends EventRow = EventRow>(
  db: Db,
  streamId: string,
  reducer: (state: S, event: E) => S,
  initialState: S,
): Promise<S> {
  const events = (await loadEvents(db, streamId)) as E[];
  return events.reduce(reducer, initialState);
}
