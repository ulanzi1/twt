// RLS policy declarations for the `events_log` table — Story 1.6 substrate.
//
// Architecture §1.2 line 715-770 — RLS is the typed-constraint enforcement of
// Cross-Cutting #1 ("every query scoped by pariwar_id; typed constraint at the
// data layer"). Drizzle's `pgPolicy` declarative API defines the policies; the
// `.link(eventsLog)` standalone pattern keeps `schema/` focused on column shape
// and `policies/` focused on access policy (matching the architecture's
// packages/domain/src/policies/ directory structure).
//
// The `nullif(current_setting('app.pariwar_id', true), '')::uuid` expression is
// the load-bearing closed-failure construct. The `, true` second argument makes
// the lookup non-erroring (returns '' rather than RAISE when the variable is
// unset); `nullif(…, '')` then maps that empty string to NULL so the comparison
// `pariwar_id = NULL` yields NULL (treated as "no match" by the RLS engine) →
// the query returns 0 rows rather than ERRORing on a `''::uuid` cast failure.
// (Empirically, a bare `''::uuid` cast in the USING clause RAISES and aborts the
// statement instead of filtering — verified at dev-time; the nullif wrapper is
// the fix that honours architecture §1.2's "quiet fail-closed → empty" intent.)
// A non-empty but non-UUID value still fails the cast (defense-in-depth); that
// path is closed upstream by setPariwarScope's UUID_REGEX guard. This is the
// DB-layer counterpart to the loud assertPariwarScopeSet guard in db.ts.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { eventsLog } from '../schema/events_log.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose
 * `pariwar_id = X`. Unset session variable → nullif → NULL → 0 rows.
 */
export const eventsLogTenantIsolationSelect = pgPolicy(
  'events_log_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(eventsLog);

/**
 * Write isolation (`for: 'all'` covers insert | update | delete). The append-
 * only triggers from Story 1.3 still reject UPDATE/DELETE structurally — RLS is
 * the second guard. `withCheck` defends against an INSERT that would create a
 * row visible to a different tenant (pariwar_id mismatched to the session).
 */
export const eventsLogTenantIsolationWrite = pgPolicy(
  'events_log_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(eventsLog);
