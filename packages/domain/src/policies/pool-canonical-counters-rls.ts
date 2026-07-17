// RLS policy declarations for `pool_canonical_counters` — Story 7.2 (Task 3).
//
// TENANT-ISOLATED read + write — mirrors `pools-rls.ts`. A Pariwar's identifier counter is
// its own: cross-tenant visibility would leak how many pools another tenant spawned in a
// month, and cross-tenant WRITE would let one tenant skip another's sequence.
//
// The allocator (pool/naming.ts) bumps this row inside the caller's transaction, which
// already carries `app.pariwar_id` — so the `for: 'all'` policy covers the
// INSERT … ON CONFLICT DO UPDATE. Note the UPSERT is silently filtered to zero rows under
// a MISSING scope rather than raising; the allocator turns that into a loud error rather
// than handing back unreserved identifiers.
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { poolCanonicalCounters } from '../schema/pool_canonical_counters.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose `pariwar_id = X`. */
export const poolCanonicalCountersTenantIsolationSelect = pgPolicy(
  'pool_canonical_counters_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(poolCanonicalCounters);

/** Write isolation (`for: 'all'` covers the allocator's INSERT … ON CONFLICT DO UPDATE). */
export const poolCanonicalCountersTenantIsolationWrite = pgPolicy(
  'pool_canonical_counters_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(poolCanonicalCounters);
