// RLS policy declarations for `pool_snapshots` — Story 7.1 (Task 6).
//
// TENANT-ISOLATED read + write — mirrors `pools-rls.ts` / `claims-rls.ts` (NOT
// cross-readable). A snapshot belongs to exactly one Pariwar; a snapshot row is
// read/written under that Pariwar's `app.pariwar_id`. No write-rejection trigger —
// pool_snapshots is a plain append table, not an event-derived state cache.
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { poolSnapshots } from '../schema/pool_snapshots.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose `pariwar_id = X`. */
export const poolSnapshotsTenantIsolationSelect = pgPolicy('pool_snapshots_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(poolSnapshots);

/** Write isolation (`for: 'all'` covers the snapshot writer's INSERT). `withCheck`
 *  defends against writing a snapshot row owned by a different tenant. */
export const poolSnapshotsTenantIsolationWrite = pgPolicy('pool_snapshots_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(poolSnapshots);
