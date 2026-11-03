// `field_worker_attribution_codes` — the field-worker attribution-code REGISTRY (Story 13.2, AC1; FR-81 / FR-82). Migration
// 0199 (hand-authored — the GRANT, the per-command policies, FORCE RLS, the CHECKs and the three triggers live there).
//
// ⭐ ONE PERMANENT 6-digit code per field worker, unique INSIDE a Pariwar (I1 — two Pariwars may hand out the same digits;
// ⛔ `UNIQUE (code)`), at most one code per worker, ever (I2). APPEND-ONLY for every role (I3 — a trigger, so the owner and a superuser too; only replica mode or DDL bypasses it): a code is ⛔ freed, ⛔ reused,
// ⛔ reassigned — FR-85 keeps a deactivated worker's existing attributions, so one code must never mean two workers (AT3).
// `allocated_at` is the DATABASE's clock, re-stamped by a `BEFORE INSERT` trigger whatever the writer supplied (I7 — a code
// credits only captures at or after it; ⛔ backdating).
//
// ── The seam with Story 13.1 (AT2) ─────────────────────────────────────────────────────────────────
// This table carries `field_worker_id` with ⛔ FK yet; 13.1's migration adds the COMPOSITE FK `(pariwar_id, field_worker_id)`
// → `field_workers` (a single-column FK check bypasses RLS — the 0178 precedent). `field_workers` carries ⛔ code column: 13.1
// reads the code through `attributionCode.readAttributionCodeForFieldWorker`.
//
// Reachable from `apps/*` ONLY through the API door `apps/api/src/modules/field-worker/attribution-code-access.ts` (the reach
// fence, AT8 v2 ii). TENANT-ISOLATED; RLS in policies/field-worker-attribution-codes-rls.ts. ⛔ PII.

import { sql } from 'drizzle-orm';
import { pgTable, smallint, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { AttributionCodeId, FieldWorkerId, PariwarId } from '../ids/index.js';

export const fieldWorkerAttributionCodes = pgTable(
  'field_worker_attribution_codes',
  {
    attributionCodeId: uuid('attribution_code_id').defaultRandom().primaryKey().$type<AttributionCodeId>(),
    // Tenant key. ⛔ FK (⛔ `pariwars` table).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    // The holder. ⛔ FK until Story 13.1 (AT2).
    fieldWorkerId: uuid('field_worker_id').notNull().$type<FieldWorkerId>(),
    // Exactly six ASCII digits, ⛔ deny-listed (0199's two CHECKs). `text` — leading zeros are real.
    code: text('code').notNull(),
    // The draw that succeeded, 1..32 (0199 CHECK).
    allocationAttempts: smallint('allocation_attempts').notNull(),
    // DB clock — re-stamped by `field_worker_attribution_codes_stamp` (0199).
    allocatedAt: timestamp('allocated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    unique('field_worker_attribution_codes_pariwar_code_uq').on(t.pariwarId, t.code),
    unique('field_worker_attribution_codes_field_worker_uq').on(t.fieldWorkerId),
    // + the SQL-only CHECKs `…_code_format_check` / `…_code_denylist_check` / `…_attempts_check` and the triggers
    // `…_no_update_delete` / `…_no_truncate` / `…_stamp` (0199).
  ],
);

export type FieldWorkerAttributionCodeRow = typeof fieldWorkerAttributionCodes.$inferSelect;
