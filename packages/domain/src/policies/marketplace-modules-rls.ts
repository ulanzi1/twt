// RLS policy declarations for `marketplace_modules` — Story 12.1 (Task 2.2).
//
// TENANT-ISOLATED read + write — mirrors `helpdesk-tickets-rls.ts`. A module belongs to exactly one
// Pariwar (the cross-Pariwar manifest is v2, QE4); it is read / written under that Pariwar's
// `app.pariwar_id`. Story 1.6's fail-closed `pariwar_id = nullif(current_setting('app.pariwar_id', true),
// '')::uuid` construct (unset scope → NULL → 0 rows).
//
// Orthogonal to the `marketplace_modules_state_write_guard` trigger (migration 0193): RLS isolates BY
// TENANT; the trigger blocks every projected-column write not from the projector, and every content-column
// change at all, regardless of tenant. Both apply to every INSERT / UPDATE.
//
// ⚠ The transition commands take `SELECT … FOR UPDATE` on the row first (QE7 / I10). Under twt_app that
// needs the UPDATE grant AND both the SELECT and UPDATE policies' USING clauses (G15, the
// `announcement-channels/posts.ts` precedent) — which is why UPDATE is a separate policy with a USING.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { marketplaceModules } from '../schema/marketplace_modules.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a query under `app.pariwar_id = X` reads only that Pariwar's modules. */
export const marketplaceModulesTenantIsolationSelect = pgPolicy('marketplace_modules_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplaceModules);

/** INSERT isolation — the projector's genesis write. `withCheck` blocks authoring a module into another
 *  tenant. Deliberately NOT `for: 'all'`: `all` would also grant DELETE, letting a tenant-scoped caller
 *  orphan a module's `events_log` stream. */
export const marketplaceModulesTenantIsolationInsert = pgPolicy('marketplace_modules_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplaceModules);

/** UPDATE isolation — the projector's re-projection of the I1 columns, and the transition commands'
 *  `FOR UPDATE` row lock. `withCheck` blocks moving a module into another tenant (the trigger refuses a
 *  `pariwar_id` change anyway — I2). No DELETE policy exists — see the INSERT policy's comment. */
export const marketplaceModulesTenantIsolationUpdate = pgPolicy('marketplace_modules_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplaceModules);
