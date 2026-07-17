// RLS policy declarations for `pool_names` — Story 7.2 (Task 5).
//
// TENANT-ISOLATED read + write — mirrors `pools-rls.ts` / `pool-snapshots-rls.ts` (NOT
// cross-readable). A Pariwar's curated pool-name list is its own cultural configuration:
// one tenant must never read, extend, or reorder another's list. No write-rejection
// trigger — `pool_names` is trustee-curated configuration, not an event-derived state
// cache.
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { poolNames } from '../schema/pool_names.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose `pariwar_id = X`. */
export const poolNamesTenantIsolationSelect = pgPolicy('pool_names_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(poolNames);

/** Write isolation (`for: 'all'` covers the curation INSERT/UPDATE). `withCheck` defends
 *  against writing a name row owned by a different tenant. */
export const poolNamesTenantIsolationWrite = pgPolicy('pool_names_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(poolNames);
