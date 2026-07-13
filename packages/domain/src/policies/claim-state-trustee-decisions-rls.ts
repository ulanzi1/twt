// RLS policy declarations for the State-Trustee decision table — Story 6.13 (Task 2).
//
// TENANT-ISOLATED read + write for `claim_state_trustee_decisions` — mirrors
// `claim-verifier-decisions-rls.ts` / `claims-rls.ts` EXACTLY. A decision row belongs to exactly one
// Pariwar; every access (the cycle-freeze write paths + the pending-list read model) runs under that
// Pariwar's `app.pariwar_id`.
//
// Uses Story 1.6's closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`: unset scope → '' → nullif →
// NULL → 0 rows (quiet fail-closed). A cross-tenant reader sees NOTHING (Task 9 asserts this). The
// `users.display_name` source column is on the GLOBAL identity carve-out (identity-auth-rls.ts) — NOT
// pariwar-scoped — so no new policy is needed there.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimStateTrusteeDecisions } from '../schema/claim_state_trustee_decisions.js';
import { appRole } from './_roles.js';

export const claimStateTrusteeDecisionsTenantIsolationSelect = pgPolicy(
  'claim_state_trustee_decisions_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimStateTrusteeDecisions);

export const claimStateTrusteeDecisionsTenantIsolationWrite = pgPolicy(
  'claim_state_trustee_decisions_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimStateTrusteeDecisions);
