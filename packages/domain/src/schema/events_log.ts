// `events_log` table — Story 1.3 substrate.
//
// Architecture canonical home per §1.14 line 1227 (member state derived from
// event history) + AR-8 (epics line 263: packages/events enforces event
// immutability) + AR-14 + AR-57 (determinism & replay).
//
// Drizzle table definition lives in @twt/domain (architecture line 4341-4356);
// the API surface (appendEvent / loadEvents / replayState) lives in @twt/events.
//
// Naming discipline per architecture line 3663-3677:
//   - DB columns are snake_case (event_id, stream_id, event_type, …)
//   - TS field names are camelCase (eventId, streamId, eventType, …)
//
// Append-only enforcement is structural — the migration that creates this
// table also installs BEFORE UPDATE / DELETE / TRUNCATE triggers that
// RAISE EXCEPTION (see migrations/0001_events-log.sql hand-supplemented body).
// The application layer (@twt/events) provides no UPDATE / DELETE paths.

import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const eventsLog = pgTable(
  'events_log',
  {
    // Server-side default `gen_random_uuid()` (pgcrypto extension, pre-installed
    // in Cloud SQL Postgres 16 per architecture §5.2 line 2976-2980). Callers
    // MAY supply an explicit eventId to support idempotent re-append semantics
    // (architecture AR-58 idempotency-keyed-store posture); when omitted the
    // DB default fires.
    eventId: uuid('event_id').defaultRandom().primaryKey(),

    // Opaque to @twt/events. Downstream consumers choose what a stream is:
    //   - one stream per member for member-lifecycle (Story 3.1+),
    //   - one stream per claim for claim-state (Story 6.x),
    //   - one stream per pool for pool-state (Story 7.x),
    //   - one stream per alert for alert-state (Story 8.x),
    //   - one stream per reconciliation cycle for Story 9.x.
    streamId: uuid('stream_id').notNull(),

    // Dotted resource.action convention per architecture line 3830-3833
    // (`member.signup_initiated`, `pool.spawned`, `contribution.matched`, …).
    // Free-form at the storage layer; downstream consumers add Zod validation
    // via packages/contracts/ or per-domain helpers.
    eventType: text('event_type').notNull(),

    // Event payload. Written via the canonical-JSON serializer
    // (@twt/events canonicalJsonStringify) at the read-and-hash boundary by
    // audit-log writers (Story 1.10) + Pool Engine snapshot writers (Story 7.x).
    // DB stores parsed JSONB; canonical-JSON is for hash producers only.
    payload: jsonb('payload').notNull(),

    // Drizzle bigint mode:'number' is safe up to Number.MAX_SAFE_INTEGER
    // (2^53 − 1) — well beyond v1 envelope. If Story 1.10's audit-log hash
    // chain requires BigInt at the TS layer, revisit per packages/events
    // README §Numerics.
    eventVersion: bigint('event_version', { mode: 'number' }).notNull(),

    // Postgres timestamptz; database-authoritative time per architecture §1.11
    // + line 3809. Default now() so callers don't pass clock; test clock
    // injection lands with Story 1.10 audit-log + downstream stories.
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // NULL = system / SIE per architecture §1.14 line 1262-1268 + Cross-Cutting
    // #14 (time-driven transitions emit `actor: 'system'`). Non-NULL UUID for
    // human-or-service actors. Downstream consumers MAY add a `system_actor_kind`
    // JSONB key inside the payload to discriminate SIE / scheduler / matcher.
    actorId: uuid('actor_id'),

    // Multi-tenant scoping per architecture §1.2 line 717-725. First-class
    // column structurally so Story 1.6's pgPolicy attaches without table
    // rewrite. Story 1.3 does NOT install RLS — Story 1.6 territory.
    pariwarId: uuid('pariwar_id').notNull(),
  },
  (t) => [
    // Structural enforcement of optimistic concurrency. A concurrent
    // appendEvent with the same (streamId, eventVersion) raises a unique-
    // violation that @twt/events catches and maps to ConcurrencyError.
    uniqueIndex('events_log_stream_id_event_version_uq').on(
      t.streamId,
      t.eventVersion,
    ),

    // event_version starts at 1 and monotonically increases per stream.
    check('events_log_event_version_positive', sql`${t.eventVersion} >= 1`),

    // Per-tenant per-stream replay-load (most common access pattern).
    // pariwar_id leads for RLS-aware planner hints when Story 1.6 lands.
    index('events_log_pariwar_stream_idx').on(
      t.pariwarId,
      t.streamId,
      t.eventVersion,
    ),

    // Per-tenant tail reads ("emit events since T") for projections /
    // dispatchers (Story 8.x alert dispatcher; Story 9.x reconciliation matcher).
    index('events_log_pariwar_occurred_at_idx').on(t.pariwarId, t.occurredAt),
  ],
);
