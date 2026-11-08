// RLS policy declarations for `field_worker_move_requests` — Story 13.1d (Task 2.1; migration 0205).
//
// TENANT-ISOLATED read + write — mirrors `field-workers-rls.ts`. A move request belongs to exactly one Pariwar and is read / written under
// that Pariwar's `app.pariwar_id` (Story 1.6's fail-closed construct: unset scope → NULL → 0 rows). Three per-command policies,
// ⛔ `FOR ALL` (it would grant DELETE). Orthogonal to 0205's guard trigger, which decides WHAT may change regardless of tenant.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { fieldWorkerMoveRequests } from '../schema/field_worker_move_requests.js';
import { appRole } from './_roles.js';

/** SELECT isolation. */
export const fieldWorkerMoveRequestsTenantIsolationSelect = pgPolicy('field_worker_move_requests_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(fieldWorkerMoveRequests);

/** INSERT isolation — the request projector's opening INSERT. */
export const fieldWorkerMoveRequestsTenantIsolationInsert = pgPolicy('field_worker_move_requests_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(fieldWorkerMoveRequests);

/** UPDATE isolation — the request projector's re-projection, and every writer's `FOR UPDATE` request lock (I5). No DELETE policy exists. */
export const fieldWorkerMoveRequestsTenantIsolationUpdate = pgPolicy('field_worker_move_requests_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(fieldWorkerMoveRequests);
