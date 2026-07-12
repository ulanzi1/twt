// RLS policy declarations for the shepherd-assignment table — Story 6.12 (Task 1).
//
// TENANT-ISOLATED read + write for `claim_shepherd_assignments` — mirrors
// `claim-verifier-decisions-rls.ts` / `claims-rls.ts` EXACTLY. An assignment row belongs to exactly one
// Pariwar; every access (the assignment write path + the member card / console section read model) runs
// under that Pariwar's `app.pariwar_id`.
//
// Uses Story 1.6's closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`: unset scope → '' → nullif →
// NULL → 0 rows (quiet fail-closed). A cross-tenant reader sees NOTHING (Task 8 asserts this). The
// `users.display_name` + contact source columns are on the GLOBAL identity carve-out
// (identity-auth-rls.ts) — NOT pariwar-scoped — so no new policy is needed there.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimShepherdAssignments } from '../schema/claim_shepherd_assignments.js';
import { appRole } from './_roles.js';

export const claimShepherdAssignmentsTenantIsolationSelect = pgPolicy(
  'claim_shepherd_assignments_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimShepherdAssignments);

export const claimShepherdAssignmentsTenantIsolationWrite = pgPolicy(
  'claim_shepherd_assignments_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimShepherdAssignments);
