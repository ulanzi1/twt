// RLS policy declarations for the Story 10.24 contribution-fact projections (Task 2).
//
// TENANT-ISOLATED read + write for BOTH `member_contribution_ledger` and `member_pool_assignments` —
// they project a Pariwar's own contribution and assignment history, so they are isolated exactly like
// the data they project (mirror member-validity-cache-rls / pool-snapshots-rls; NOT the
// pariwar-passport cross-readable carve-out).
//
// ── Why `for: 'all'` on the write leg, and why the WITH CHECK matters here specifically ─────────
// The ledger's writer is an events_log AFTER-INSERT TRIGGER running SECURITY INVOKER (migration 0093),
// i.e. under the appending session's own scope. The `withCheck` is therefore not decorative: it is
// what makes a tenant-mismatched append fail LOUDLY at the projection write rather than silently
// project a confirmation into another tenant. Both live callers append inside `withPariwarScope(...)`
// stamping the same `pariwar_id` they write on the event, so the check passes.
//
// Neither table grants DELETE (migration 0093) — these are append projections whose repair path is the
// idempotent backfill (`INSERT … ON CONFLICT DO NOTHING`), never a truncate-and-rebuild. There is no
// projector-exclusivity write-rejection trigger either: unlike `members.state` / `pools.current_state`
// these hold no lifecycle state, only projected facts (Story 1.6 closed-failure construct applies:
// unset scope → '' → nullif → NULL → 0 rows).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberContributionLedger } from '../schema/member_contribution_ledger.js';
import { memberPoolAssignments } from '../schema/member_pool_assignments.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a fact derivation under `app.pariwar_id = X` sees only that tenant's ledger rows. */
export const memberContributionLedgerTenantIsolationSelect = pgPolicy(
  'member_contribution_ledger_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberContributionLedger);

/** Write isolation (`for: 'all'` covers the trigger INSERT, the reversal UPDATE, and the backfill). */
export const memberContributionLedgerTenantIsolationWrite = pgPolicy(
  'member_contribution_ledger_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberContributionLedger);

/** SELECT isolation for the member↔pool assignment index. */
export const memberPoolAssignmentsTenantIsolationSelect = pgPolicy(
  'member_pool_assignments_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberPoolAssignments);

/** Write isolation (the `pool/spawn.ts` bulk insert + the backfill; no UPDATE/DELETE grant exists). */
export const memberPoolAssignmentsTenantIsolationWrite = pgPolicy(
  'member_pool_assignments_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberPoolAssignments);
