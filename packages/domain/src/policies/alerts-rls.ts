// RLS policy declarations for `alerts` — Story 8.1 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `pools-rls.ts` / `claims-rls.ts`, NOT
// the `pariwar-passport-rls.ts` cross-readable carve-out. An alert belongs to exactly
// one Pariwar; an alert row is read/written under that Pariwar's `app.pariwar_id`.
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`:
// unset scope → '' → nullif → NULL → `pariwar_id = NULL` is "no match" → 0 rows
// (quiet fail-closed), rather than erroring on a `''::uuid` cast.
//
// NOTE: RLS is orthogonal to the `alerts.current_state` write-rejection trigger
// (AC5). RLS isolates BY TENANT; the trigger blocks state-cache writes that do not
// come from the projector REGARDLESS of tenant. Both apply to every INSERT/UPDATE.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { alerts } from '../schema/alerts.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose
 * `pariwar_id = X` (so alert reads resolve only that Pariwar's alerts). Unset session
 * variable → nullif → NULL → 0 rows.
 */
export const alertsTenantIsolationSelect = pgPolicy('alerts_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(alerts);

/**
 * Write isolation (`for: 'all'` covers the projector's INSERT of the initial row +
 * its UPDATE of the cached state). `withCheck` defends against an INSERT/UPDATE that
 * would create/move an alert row owned by a different tenant.
 */
export const alertsTenantIsolationWrite = pgPolicy('alerts_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(alerts);
