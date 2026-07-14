// RLS policy declarations for the R9 voting session table — Story 6.14 (Task 2).
//
// TENANT-ISOLATED read + write for `claim_r9_voting_sessions` — mirrors `claim-state-trustee-decisions-rls.ts`
// EXACTLY. A session row belongs to exactly one Pariwar; every access (the R9 write paths + the queue/panel
// read models) runs under that Pariwar's `app.pariwar_id`.
//
// Uses Story 1.6's closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`: unset scope → '' → nullif →
// NULL → 0 rows (quiet fail-closed). A cross-tenant reader sees NOTHING (Task 11 asserts this SYMMETRICALLY
// on both R9 tables — no repeat of the 6.13 cycle_freeze_commits asymmetry).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimR9VotingSessions } from '../schema/claim_r9_voting_sessions.js';
import { appRole } from './_roles.js';

export const claimR9VotingSessionsTenantIsolationSelect = pgPolicy(
  'claim_r9_voting_sessions_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimR9VotingSessions);

export const claimR9VotingSessionsTenantIsolationWrite = pgPolicy(
  'claim_r9_voting_sessions_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimR9VotingSessions);
