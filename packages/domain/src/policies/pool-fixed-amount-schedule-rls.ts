// RLS policy declarations for `pool_fixed_amount_schedule` — Story 7.5 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors pariwar-appeal-config-rls.ts / pools-rls.ts,
// NOT the pariwar-passport cross-readable carve-out. A schedule row belongs to exactly
// one Pariwar; it is read/written under that Pariwar's `app.pariwar_id`. Story 1.6's
// closed-failure construct: unset scope → '' → nullif → NULL → 0 rows (fail-closed) —
// a Pariwar with no readable schedule surfaces PoolFixedAmountNotConfiguredError at the
// spawn read (fail loud), never a silent default. SYMMETRIC (for:'all' covers the
// insert of a new head + the update of the prior head's effective_until on supersede).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { poolFixedAmountSchedule } from '../schema/pool_fixed_amount_schedule.js';
import { appRole } from './_roles.js';

export const poolFixedAmountScheduleTenantIsolationSelect = pgPolicy(
  'pool_fixed_amount_schedule_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(poolFixedAmountSchedule);

export const poolFixedAmountScheduleTenantIsolationWrite = pgPolicy(
  'pool_fixed_amount_schedule_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(poolFixedAmountSchedule);
