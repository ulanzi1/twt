// RLS policy declaration for the `audit_log_entries` table — Story 1.10 (AC-8).
//
// Architecture §1.2 L715-770 — RLS is the typed-constraint enforcement of
// Cross-Cutting #1 ("every query scoped by pariwar_id"). Story 1.6 invariant:
// every table `twt_app` touches is RLS-forced. Tenant SELECTs of audit lines are
// isolated by `pariwar_id` exactly like `events_log`.
//
// ── SELECT-ONLY (the deliberate difference from events-log-rls.ts) ─────────────
// Unlike events_log (which has both a SELECT and a `for: 'all'` write policy),
// `audit_log_entries` gets ONLY a tenant-isolation SELECT policy. Tenants NEVER
// write audit rows: the hash-chain writer (../audit/write.ts) runs under the
// BYPASSRLS service role (DD-2/DD-3) so it can read the true GLOBAL chain tail
// across all tenants and serialize inserts. `twt_app` is granted SELECT only (no
// INSERT) in migration 0007, so no write policy is needed or correct here — a
// write policy `TO twt_app` would imply tenants can append audit lines, which
// they must not. The append-only triggers (migration 0006) are the second guard
// on top of the absent write grant.
//
// The `nullif(current_setting('app.pariwar_id', true), '')::uuid` expression is
// the Story 1.6 load-bearing closed-failure construct: `, true` makes the lookup
// non-erroring when the variable is unset (returns ''), and `nullif(…, '')` maps
// that empty string to NULL so `pariwar_id = NULL` yields "no match" → 0 rows,
// instead of a `''::uuid` cast that would RAISE and abort the statement. Copy it
// EXACTLY (Story 1.6 chose it for that reason).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { auditLogEntries } from '../schema/audit_log_entries.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only audit rows
 * whose `pariwar_id = X`. Unset session variable → nullif → NULL → 0 rows.
 * Cross-tenant audit rows (CROSS_TENANT_SENTINEL_UUID pariwar_id) are visible
 * only to a session scoped to that sentinel — never to a real tenant.
 */
export const auditLogEntriesTenantIsolationSelect = pgPolicy(
  'audit_log_entries_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(auditLogEntries);
