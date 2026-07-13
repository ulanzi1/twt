// RLS policy declarations for the cycle-freeze commit record table — Story 6.13 (Task 2).
//
// TENANT-ISOLATED read + write for `cycle_freeze_commits` — mirrors `claim-verifier-decisions-rls.ts` /
// `claims-rls.ts` EXACTLY. A commit record belongs to exactly one Pariwar; every access (the commit
// write path + the post-commit trigger read + the `trigger_delivered` flip) runs under that Pariwar's
// `app.pariwar_id`.
//
// Uses Story 1.6's closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`: unset scope → '' → nullif →
// NULL → 0 rows (quiet fail-closed). A cross-tenant reader sees NOTHING (Task 9 asserts this).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { cycleFreezeCommits } from '../schema/cycle_freeze_commits.js';
import { appRole } from './_roles.js';

export const cycleFreezeCommitsTenantIsolationSelect = pgPolicy(
  'cycle_freeze_commits_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(cycleFreezeCommits);

export const cycleFreezeCommitsTenantIsolationWrite = pgPolicy(
  'cycle_freeze_commits_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(cycleFreezeCommits);
