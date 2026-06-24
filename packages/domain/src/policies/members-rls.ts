// RLS policy declarations for `members` — Story 3.1 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `consent-records-rls.ts` /
// `events-log-rls.ts`, NOT the `pariwar-passport-rls.ts` cross-readable carve-out.
// A member belongs to exactly one Pariwar; a member row is read/written under that
// Pariwar's `app.pariwar_id`. The `pariwar_passport` cross-readable carve-out stays
// the SINGLE positive exception to the Story 1.6 leak invariant.
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`:
// unset scope → '' → nullif → NULL → `pariwar_id = NULL` is "no match" → 0 rows
// (quiet fail-closed), rather than erroring on a `''::uuid` cast.
//
// NOTE: RLS is orthogonal to the `members.state` write-rejection trigger (AC3).
// RLS isolates BY TENANT; the trigger blocks state-cache writes that do not come
// from the projector REGARDLESS of tenant. Both apply to every UPDATE.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { members } from '../schema/members.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose
 * `pariwar_id = X` (so `getMemberStateAt` / overlay reads resolve only that
 * Pariwar's members). Unset session variable → nullif → NULL → 0 rows.
 */
export const membersTenantIsolationSelect = pgPolicy('members_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(members);

/**
 * Write isolation (`for: 'all'` covers the projector's INSERT of the initial row +
 * its UPDATE of the cached state). `withCheck` defends against an INSERT/UPDATE that
 * would create/move a member row owned by a different tenant.
 */
export const membersTenantIsolationWrite = pgPolicy('members_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(members);
