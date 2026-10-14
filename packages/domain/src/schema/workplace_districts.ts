// `workplace_districts` — a Pariwar's CANONICAL district spellings (Story 6.36a, Task 1.1b; migration 0161; `2026-10-14-330`
// SW3, SW5, SW7).
//
// · Written by the import from its required district map (`--district-map`), so a district with ⛔ no listed school still
//   appears in the picker. The spelling is the one a posting COPIES — and a posting's `district` is an authorisation input
//   compared BYTE-FOR-BYTE (SF13; `member-geo/resolve.ts`) ⇒ ⛔ never normalised on read; two spellings merge ONLY through
//   the tool's explicit `--rename-district`, which `retired`s the old spelling (kept for the postings that copied it — I2 —
//   but ⛔ never offered).
// · A Pariwar with ⛔ no row here has ⛔ no list yet ⇒ the member keeps today's free-text district box (SW7).
// · Every writer that checks a district reads its row `FOR SHARE` (the rename retires the old spelling FIRST, so ⛔ no write
//   lands on it during the move).
// RLS in `policies/workplaces-rls.ts`.

import { foreignKey, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, WorkplaceImportBatchId } from '../ids/index.js';
import { workplaceImportBatches } from './workplace_import_batches.js';

/** A spelling's status. ⚠ LOCKSTEP with 0161's `workplace_districts_status_check`. */
export const WORKPLACE_DISTRICT_STATUSES = ['listed', 'retired'] as const;
export type WorkplaceDistrictStatus = (typeof WORKPLACE_DISTRICT_STATUSES)[number];

export const workplaceDistricts = pgTable(
  'workplace_districts',
  {
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** The spelling, exactly as the map gives it (trimmed — 0161's CHECK). */
    district: text('district').notNull(),
    status: text('status').notNull().default('listed').$type<WorkplaceDistrictStatus>(),
    /** The batch that last listed (or retired) the spelling. */
    sourceBatchId: uuid('source_batch_id').$type<WorkplaceImportBatchId>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'workplace_districts_pariwar_id_district_pk', columns: [t.pariwarId, t.district] }),
    foreignKey({
      name: 'workplace_districts_source_batch_fk',
      columns: [t.pariwarId, t.sourceBatchId],
      foreignColumns: [workplaceImportBatches.pariwarId, workplaceImportBatches.batchId],
    }),
  ],
);

export type WorkplaceDistrictRow = typeof workplaceDistricts.$inferSelect;
