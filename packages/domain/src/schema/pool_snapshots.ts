// `pool_snapshots` table — Story 7.1 substrate (Task 6; AC3 — the HOT snapshot tier).
//
// The Postgres hot tier for pool snapshots (architecture §1.6 line 909-935: "snapshot
// rows in Postgres for the last 12–18 months"; the cold tier is GCS via the
// `SnapshotStorage` port). Each row is ONE serialized pool snapshot (the
// `serializePoolSnapshot` output — pool/snapshot.ts) captured at a moment (the spawn
// moment for the first; population at spawn is Story 7.3). Append-only history: a pool
// accrues MANY snapshot rows over its life; "latest snapshot" is `created_at DESC`.
//
// This is a PLAIN append table — NOT an event-derived state cache, so there is NO
// write-rejection trigger (contrast pools.current_state). The `integrity_hash` +
// `format_version` + `schema_version` mirror the serialized blob's own fields so a hot
// row is queryable/traceable without re-parsing the JSONB.
//
// Naming discipline per architecture line 3663-3677: DB columns snake_case, TS fields
// camelCase, table snake_case-plural.

import { bigint, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, PoolId } from '../ids/index.js';
import type { PoolSnapshotV1 } from '../pool/snapshot.js';
import { pools } from './pools.js';

export const poolSnapshots = pgTable(
  'pool_snapshots',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default — a snapshot row is
    // a plain record, NOT event-stream-keyed (contrast pools.pool_id = stream_id).
    snapshotId: uuid('snapshot_id').defaultRandom().primaryKey(),

    // The pool this snapshot captures. FK → pools.pool_id (a snapshot without its pool is
    // meaningless; both land in Story 7.1). Branded PoolId.
    poolId: uuid('pool_id')
      .notNull()
      .$type<PoolId>()
      .references(() => pools.poolId),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded. unFK'd
    // (the pre-Epic-3 posture — mirrors pools.pariwar_id).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The snapshot SHAPE version (drives migration-adapter selection). Mirrors the
    // serialized blob's `format_version` for hot-row queries without JSONB parsing.
    formatVersion: integer('format_version').notNull(),

    // The schema/migration-generation identifier (the DB schema that produced the
    // snapshot). Mirrors the blob's `schema_version`.
    schemaVersion: text('schema_version').notNull(),

    // The snapshot's integrity hash (sha-256 hex over the canonical body). Mirrors the
    // blob's `integrity_hash` — a hot-row can be integrity-checked without re-hashing.
    integrityHash: text('integrity_hash').notNull(),

    // The `events_log.event_version` the pool state was at when this snapshot was taken —
    // the staleness anchor tying a snapshot to a point on the pool's event stream.
    stateEventVersion: bigint('state_event_version', { mode: 'number' }).notNull(),

    // The full serialized snapshot (the serializePoolSnapshot output — pool/snapshot.ts).
    snapshot: jsonb('snapshot').notNull().$type<PoolSnapshotV1>(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Per-tenant snapshot scans / RLS-aware planner hint (pariwar_id leads).
    index('pool_snapshots_pariwar_id_idx').on(t.pariwarId),
    // "Latest snapshot per pool" + the 12–18-month retention scan (pool_id, created_at DESC).
    index('pool_snapshots_pool_id_created_at_idx').on(t.poolId, t.createdAt.desc()),
  ],
);

// Inferred row types for the accessor read/write paths (pools precedent).
export type PoolSnapshotRow = typeof poolSnapshots.$inferSelect;
export type PoolSnapshotInsert = typeof poolSnapshots.$inferInsert;
