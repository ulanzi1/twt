// `workplace_import_batches` — one row per workplace-list import run or district rename (Story 6.36a, Task 1.2; migration 0161;
// `2026-10-14-330` SW3).
//
// · The import tool (`scripts/import-workplaces.ts`) inserts the row FIRST (`running`) and finishes it with its counts in the
//   SAME transaction — so a batch row exists for every workplace the run wrote (`workplaces.import_batch_id`).
// · A RENAME row (`source_name = 'rename'`, Task 1.1b) carries ⛔ no source fields; every other row carries all five — the
//   source URL, the retrieval date, the licence, the attribution text and the UDISE state code (0161's CHECK).
// · `finished` is FINAL (0161's trigger); the counts are NULL until then.
// RLS in `policies/workplaces-rls.ts`.

import { date, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type { PariwarId, WorkplaceImportBatchId } from '../ids/index.js';

/** A batch's status. ⚠ LOCKSTEP with 0161's `workplace_import_batches_status_check`. */
export const WORKPLACE_IMPORT_BATCH_STATUSES = ['running', 'finished'] as const;
export type WorkplaceImportBatchStatus = (typeof WORKPLACE_IMPORT_BATCH_STATUSES)[number];

/** The `source_name` of a `--rename-district` batch (0161's source-fields CHECK). */
export const WORKPLACE_RENAME_SOURCE_NAME = 'rename';

export const workplaceImportBatches = pgTable(
  'workplace_import_batches',
  {
    batchId: uuid('batch_id').defaultRandom().primaryKey().$type<WorkplaceImportBatchId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** The source's name (e.g. *"UDISE – Basic Details of Schools (India Data Portal)"*), or `rename`. */
    sourceName: text('source_name').notNull(),
    sourceUrl: text('source_url'),
    /** The date the source file was retrieved (`YYYY-MM-DD`). */
    retrievedOn: date('retrieved_on', { mode: 'string' }),
    licence: text('licence'),
    /** The attribution notice the licence asks for (ODC-BY §4.3). */
    attribution: text('attribution'),
    /** The UDISE state code the run kept (Bihar `10`). */
    stateCode: text('state_code'),
    status: text('status').notNull().default('running').$type<WorkplaceImportBatchStatus>(),
    rowsRead: integer('rows_read'),
    rowsInserted: integer('rows_inserted'),
    rowsUpdated: integer('rows_updated'),
    rowsDelisted: integer('rows_delisted'),
    rowsRelisted: integer('rows_relisted'),
    rowsRefused: integer('rows_refused'),
    rowsDuplicate: integer('rows_duplicate'),
    rowsSkippedStaff: integer('rows_skipped_staff'),
    districtsRetired: integer('districts_retired'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [unique('workplace_import_batches_pariwar_batch_uq').on(t.pariwarId, t.batchId)],
);

export type WorkplaceImportBatchRow = typeof workplaceImportBatches.$inferSelect;
