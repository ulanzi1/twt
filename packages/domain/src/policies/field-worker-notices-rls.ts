// RLS policy declarations for `field_worker_notices` — Story 13.1d (Task 2.1; migration 0205).
//
// TENANT-ISOLATED read + write — mirrors `field-workers-rls.ts`. An officer's notice belongs to exactly one Pariwar and is read / written under
// that Pariwar's `app.pariwar_id` (Story 1.6's fail-closed construct: unset scope → NULL → 0 rows). Three per-command policies,
// ⛔ `FOR ALL` (it would grant DELETE). Orthogonal to 0205's guard trigger, which decides WHAT may change regardless of tenant.
//
// ⚠ DELIBERATE (checklist 9; code review CR8): these policies separate PARIWARS, ⛔ OFFICERS. The scope transaction sets `app.pariwar_id`
// and no actor (`db.ts`), and AD9 bars adding one, so the DB cannot tell one officer's notices from another's: the read and the seen mark
// filter `recipient_user_id = <actor>` in SQL (`pageFieldWorkerNotices`, `markFieldWorkerNoticesSeen` in `move-request-read.ts`), and a
// read that forgot it would return every officer's notices in the Pariwar (refusal reasons, worker ids). RE-EXAMINE when a SECOND notice
// reader appears, or any read that does not filter on the recipient — nothing in this file can catch it.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { fieldWorkerNotices } from '../schema/field_worker_notices.js';
import { appRole } from './_roles.js';

/** SELECT isolation. */
export const fieldWorkerNoticesTenantIsolationSelect = pgPolicy('field_worker_notices_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(fieldWorkerNotices);

/** INSERT isolation — the notices writer's INSERT (the deciding transaction, AD9). */
export const fieldWorkerNoticesTenantIsolationInsert = pgPolicy('field_worker_notices_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(fieldWorkerNotices);

/** UPDATE isolation — the seen mark (`seen_at` only — a column grant and the 0205 trigger). No DELETE policy exists. */
export const fieldWorkerNoticesTenantIsolationUpdate = pgPolicy('field_worker_notices_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(fieldWorkerNotices);
