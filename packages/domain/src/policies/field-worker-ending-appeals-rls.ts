// RLS policy declarations for `field_worker_ending_appeals` — Story 13.1f (Task 2.3; migration 0207).
//
// TENANT-ISOLATED read + write — mirrors `field-worker-move-requests-rls.ts`. An appeal belongs to exactly one Pariwar and is read /
// written under that Pariwar's `app.pariwar_id` (Story 1.6's fail-closed construct: unset scope → NULL → 0 rows). Three per-command
// policies, ⛔ `FOR ALL` (it would grant DELETE). Orthogonal to 0207's guard trigger, which decides WHAT may change regardless of tenant.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { fieldWorkerEndingAppeals } from '../schema/field_worker_ending_appeals.js';
import { appRole } from './_roles.js';

/** SELECT isolation. */
export const fieldWorkerEndingAppealsTenantIsolationSelect = pgPolicy('field_worker_ending_appeals_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(fieldWorkerEndingAppeals);

/** INSERT isolation — the appeal projector's lodging INSERT. */
export const fieldWorkerEndingAppealsTenantIsolationInsert = pgPolicy('field_worker_ending_appeals_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(fieldWorkerEndingAppeals);

/** UPDATE isolation — the appeal projector's re-projection, and every writer's `FOR UPDATE` appeal lock (TR5). No DELETE policy exists. */
export const fieldWorkerEndingAppealsTenantIsolationUpdate = pgPolicy('field_worker_ending_appeals_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(fieldWorkerEndingAppeals);
