// RLS policy declarations for `member_search_projection` — Story 4.7 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `members-rls.ts` / `member-nominees-rls.ts`, NOT the
// `pariwar-passport-rls.ts` cross-readable carve-out. A projection row belongs to exactly one Pariwar;
// the admin member-search read runs under that Pariwar's `app.pariwar_id` (so a cross-Pariwar search
// returns 0 rows — the AC1 "scope-respecting" guarantee is enforced at the RLS layer, not just in code).
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`: unset scope → '' → nullif →
// NULL → `pariwar_id = NULL` is "no match" → 0 rows (quiet fail-closed).
//
// NOTE: RLS is orthogonal to the projection write-rejection trigger (D1 refinement ii). RLS isolates BY
// TENANT; the trigger blocks projection writes that do not come from the projector REGARDLESS of tenant
// (the `app.member_search_projection_writer` guard, mirroring the 0018 `members.state` trigger). Both
// apply to every write.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberSearchProjection } from '../schema/member_search_projection.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose `pariwar_id = X` (so the
 * admin member-search resolves only that Pariwar's members). Unset session variable → nullif → NULL →
 * 0 rows.
 */
export const memberSearchProjectionTenantIsolationSelect = pgPolicy(
  'member_search_projection_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberSearchProjection);

/**
 * Write isolation (`for: 'all'` covers the projector's INSERT of the initial projection row + its UPDATE
 * on every subsequent refresh). `withCheck` defends against an INSERT/UPDATE that would create/move a
 * projection row owned by a different tenant.
 */
export const memberSearchProjectionTenantIsolationWrite = pgPolicy(
  'member_search_projection_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberSearchProjection);
