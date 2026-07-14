// RLS policy declarations for the R9 votes table — Story 6.14 (Task 2).
//
// TENANT-ISOLATED read + write for `claim_r9_votes` — mirrors `claim-r9-voting-sessions-rls.ts` EXACTLY. A
// vote row belongs to exactly one Pariwar; every access (the cast/revise write paths + the panel +
// votes-by-trustee reads) runs under that Pariwar's `app.pariwar_id`.
//
// Story 1.6 closed-failure construct: unset scope → 0 rows (quiet fail-closed). A cross-tenant reader sees
// NOTHING (Task 11 asserts this SYMMETRICALLY on both R9 tables).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimR9Votes } from '../schema/claim_r9_votes.js';
import { appRole } from './_roles.js';

export const claimR9VotesTenantIsolationSelect = pgPolicy('claim_r9_votes_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(claimR9Votes);

export const claimR9VotesTenantIsolationWrite = pgPolicy('claim_r9_votes_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(claimR9Votes);
