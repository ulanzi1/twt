// RLS policy declarations for `member_validity_cache` — Story 4.8 (Task 1).
//
// TENANT-ISOLATED read + write — the cache holds the FULL per-member validity payload keyed by
// `pariwar_id`, so it MUST be tenant-isolated exactly like `members` / `member_search_projection` (the
// data it caches). Mirrors members-rls.ts (NOT the pariwar-passport cross-readable carve-out).
//
// Unlike member_search_projection (projector-EXCLUSIVE writes), this table is written by the cache-aside
// READ path (validity-service `getValidityCached`, on a miss) and DELETEd by the D3-A member-event
// trigger + the poisoned-entry overwrite — so there is NO projector-exclusive write-guard trigger, just
// ordinary tenant-isolation. `for: 'all'` covers the miss-path INSERT/UPDATE, the trigger DELETE, and
// the GC sweep. Story 1.6 closed-failure construct: unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberValidityCache } from '../schema/member_validity_cache.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a cache-aside read under `app.pariwar_id = X` sees only that tenant's cache rows. */
export const memberValidityCacheTenantIsolationSelect = pgPolicy(
  'member_validity_cache_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberValidityCache);

/**
 * Write isolation (`for: 'all'` covers the miss-path INSERT/UPDATE, the D3-A trigger DELETE, and the GC
 * sweep DELETE). `withCheck` defends against writing a row visible to a different tenant.
 */
export const memberValidityCacheTenantIsolationWrite = pgPolicy(
  'member_validity_cache_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberValidityCache);
