// RLS policy declarations for `cohort_invalidation_epochs` — Story 4.8 (Task 1).
//
// TENANT-ISOLATED read + write — an epoch row is scoped to one Pariwar's cohort. The amendment-publish
// bump (in the publish tx, scoped) + the trustee invalidate-all + the cache-key read all run under
// `app.pariwar_id`, so tenant isolation is both correct and sufficient (mirror members-rls.ts). Story
// 1.6 closed-failure construct: unset scope → '' → nullif → NULL → 0 rows (quiet fail-closed → epoch 0).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { cohortInvalidationEpochs } from '../schema/cohort_invalidation_epochs.js';
import { appRole } from './_roles.js';

/** SELECT isolation: cheap cache-key epoch read under `app.pariwar_id = X` sees only that cohort. */
export const cohortInvalidationEpochsTenantIsolationSelect = pgPolicy(
  'cohort_invalidation_epochs_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(cohortInvalidationEpochs);

/**
 * Write isolation (`for: 'all'` covers the epoch-bump UPSERT — INSERT the first bump, UPDATE thereafter).
 * `withCheck` defends against bumping a cohort owned by a different tenant.
 */
export const cohortInvalidationEpochsTenantIsolationWrite = pgPolicy(
  'cohort_invalidation_epochs_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(cohortInvalidationEpochs);
