// `workplaces` — a Pariwar's list of schools and offices (Story 6.36a, Task 1.1; migration 0161; `2026-10-14-330` SW2, SW3).
//
// · A SCHOOL is imported (`source = 'import'`) from a documented CSV profile — the India Data Portal's *"UDISE – Basic
//   Details of Schools"* (SF1) — keyed by its 11-digit UDISE code (`udise_school_code`); `block_code` = the code's first six
//   digits (the file has ⛔ no block NAME — SF2). An OFFICE, or a school the file misses, is the Super Admin's
//   (`source = 'staff'`, 6.36c). An import ⛔ never touches a staff row (except `--rename-district`).
// · ⛔ Never deleted: an imported school missing from a later file is `delisted` (hidden from pickers, kept for every
//   posting that names it — I3) and `listed` again if it returns.
// · The district is an FK to `workplace_districts` (the MAPPED spelling — SF13). A district change on a workplace ⛔ never
//   rewrites a posting (each posting copied its district when written — I2).
// · ⭐ A POSTING FACT, ⛔ not a directory attribute (SW2): ⛔ never an RBAC scope (`-133` cl.1), ⛔ never on a public page or
//   in the member directory, ⛔ never in any text (I1). Tier 3 plaintext (architecture §2.7 — "School").
// · The column grant (0161): ⛔ never `kind`, the code, `source` or `pariwar_id`.
// RLS in `policies/workplaces-rls.ts`.

import { foreignKey, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, WorkplaceId, WorkplaceImportBatchId } from '../ids/index.js';
import { workplaceDistricts } from './workplace_districts.js';
import { workplaceImportBatches } from './workplace_import_batches.js';

/** ⚠ LOCKSTEP with 0161's `workplaces_kind_check`. */
export const WORKPLACE_KINDS = ['school', 'office'] as const;
export type WorkplaceKind = (typeof WORKPLACE_KINDS)[number];

/** ⚠ LOCKSTEP with 0161's `workplaces_source_check`. */
export const WORKPLACE_SOURCES = ['import', 'staff'] as const;
export type WorkplaceSource = (typeof WORKPLACE_SOURCES)[number];

/** ⚠ LOCKSTEP with 0161's `workplaces_status_check`. */
export const WORKPLACE_STATUSES = ['listed', 'delisted'] as const;
export type WorkplaceStatus = (typeof WORKPLACE_STATUSES)[number];

export const workplaces = pgTable(
  'workplaces',
  {
    workplaceId: uuid('workplace_id').defaultRandom().primaryKey().$type<WorkplaceId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    kind: text('kind').notNull().$type<WorkplaceKind>(),
    /** As the source gives it (UDISE names are mostly English upper-case — shown as they are, `-307` §2 item 2). */
    name: text('name').notNull(),
    /** The Pariwar's MAPPED spelling (FK → `workplace_districts`). */
    district: text('district').notNull(),
    /** The UDISE block code (`udise_school_code[0:6]`) — ⛔ a block NAME (SF2). */
    blockCode: text('block_code'),
    clusterName: text('cluster_name'),
    villageName: text('village_name'),
    pincode: text('pincode'),
    /** The 11-digit UDISE code — the import's key; ⛔ for an office. */
    udiseSchoolCode: text('udise_school_code'),
    source: text('source').notNull().$type<WorkplaceSource>(),
    /** The batch that last wrote an IMPORTED row (required for `source = 'import'`). */
    importBatchId: uuid('import_batch_id').$type<WorkplaceImportBatchId>(),
    status: text('status').notNull().default('listed').$type<WorkplaceStatus>(),
    /**
     * The Super Admin who added a staff row (6.36c). ⚠ REQUIRED on a staff row — 0165's `workplaces_staff_actor_check`
     * (`source <> 'staff' OR created_by_actor_id IS NOT NULL`; code review round 2). Like 0161's CHECKs, it lives in the
     * migration only.
     */
    createdByActorId: uuid('created_by_actor_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    unique('workplaces_pariwar_udise_uq').on(t.pariwarId, t.udiseSchoolCode),
    unique('workplaces_pariwar_workplace_uq').on(t.pariwarId, t.workplaceId),
    foreignKey({
      name: 'workplaces_district_fk',
      columns: [t.pariwarId, t.district],
      foreignColumns: [workplaceDistricts.pariwarId, workplaceDistricts.district],
    }),
    foreignKey({
      name: 'workplaces_import_batch_fk',
      columns: [t.pariwarId, t.importBatchId],
      foreignColumns: [workplaceImportBatches.pariwarId, workplaceImportBatches.batchId],
    }),
    index('workplaces_pariwar_district_kind_status_idx').on(t.pariwarId, t.district, t.kind, t.status),
  ],
);

export type WorkplaceRow = typeof workplaces.$inferSelect;
