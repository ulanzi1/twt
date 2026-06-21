// RLS policy declarations for the `niyamavali_amendments` table — Story 2.3 (Task 4).
//
// TENANT-ISOLATED read + write — mirrors `events-log-rls.ts` (and the sibling
// `clause-versions-rls.ts`), NOT the `pariwar-passport` carve-out. The amendment
// ledger carries the same per-Pariwar rule lineage as `clause_versions`, so it
// gets the same fail-closed posture (Story 1.6 leak invariant — every scoped
// table fails closed to 0 rows cross-tenant; the passport is the only exception).
//
// The table is fully append-only (the migration installs UPDATE/DELETE/TRUNCATE
// reject triggers), so the write policy's `for: 'all'` admits only the INSERT
// path in practice; `withCheck` still guards that an inserted row is owned by the
// session's tenant.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { niyamavaliAmendments } from '../schema/niyamavali_amendments.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose
 * `pariwar_id = X`. Unset session variable → nullif → NULL → 0 rows.
 */
export const niyamavaliAmendmentsTenantIsolationSelect = pgPolicy(
  'niyamavali_amendments_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(niyamavaliAmendments);

/**
 * Write isolation (`for: 'all'`; the append-only triggers reject UPDATE/DELETE,
 * so only INSERT is reachable). `withCheck` guards the inserted row's tenant.
 */
export const niyamavaliAmendmentsTenantIsolationWrite = pgPolicy(
  'niyamavali_amendments_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(niyamavaliAmendments);
