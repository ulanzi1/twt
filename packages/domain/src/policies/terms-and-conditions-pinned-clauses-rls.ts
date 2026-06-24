// RLS policy declarations for `terms_and_conditions_pinned_clauses` — Story 2.6
// (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `clause-versions-rls.ts` /
// `terms-and-conditions-versions-rls.ts`. The link rows are scoped by their own
// `pariwar_id` column (denormalised onto the junction row), so a pin is isolated
// without a join to the parent T&C row. NOT cross-readable.
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`:
// unset scope → '' → nullif → NULL → 0 rows (quiet fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { termsAndConditionsPinnedClauses } from '../schema/terms_and_conditions_pinned_clauses.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only link rows whose
 * `pariwar_id = X`. Unset session variable → nullif → NULL → 0 rows.
 */
export const termsAndConditionsPinnedClausesTenantIsolationSelect = pgPolicy(
  'terms_and_conditions_pinned_clauses_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(termsAndConditionsPinnedClauses);

/**
 * Write isolation (`for: 'all'` mirrors the parent-table pattern for consistency;
 * only SELECT + INSERT are granted to twt_app in the migration, so UPDATE/DELETE
 * are blocked at the ACL layer). `withCheck` defends against an INSERT that would
 * create a link row owned by a different tenant.
 */
export const termsAndConditionsPinnedClausesTenantIsolationWrite = pgPolicy(
  'terms_and_conditions_pinned_clauses_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(termsAndConditionsPinnedClauses);
