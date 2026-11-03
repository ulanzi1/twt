// RLS policy declarations for `field_workers` — Story 13.1 (Task 2.1).
//
// TENANT-ISOLATED read + write — mirrors `marketplace-modules-rls.ts`. A field worker belongs to exactly one Pariwar (a
// worker who moves to another Pariwar is a NEW registration there — QE19); it is read / written under that Pariwar's
// `app.pariwar_id`. Story 1.6's fail-closed `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`
// construct (unset scope → NULL → 0 rows).
//
// Orthogonal to the `field_workers_state_write_guard` trigger (migration 0200): RLS isolates BY TENANT; the trigger blocks
// every projected-column write not from the projector, and every identity-column change at all, regardless of tenant.
//
// ⚠ The transition commands take `SELECT … FOR UPDATE` on the row first (QE13 / I13). Under twt_app that needs the UPDATE
// grant AND both the SELECT and UPDATE policies' USING clauses — which is why UPDATE is a separate policy with a USING.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { fieldWorkers } from '../schema/field_workers.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a query under `app.pariwar_id = X` reads only that Pariwar's field workers. */
export const fieldWorkersTenantIsolationSelect = pgPolicy('field_workers_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(fieldWorkers);

/** INSERT isolation — the projector's genesis write. Deliberately NOT `for: 'all'`: `all` would also grant DELETE, and a
 *  worker row is never deleted (I10). */
export const fieldWorkersTenantIsolationInsert = pgPolicy('field_workers_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(fieldWorkers);

/** UPDATE isolation — the projector's re-projection of the I1 columns, and the transition commands' `FOR UPDATE` row
 *  lock. `withCheck` blocks moving a worker into another tenant (the trigger refuses a `pariwar_id` change anyway — I2).
 *  No DELETE policy exists — see the INSERT policy's comment. */
export const fieldWorkersTenantIsolationUpdate = pgPolicy('field_workers_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(fieldWorkers);
