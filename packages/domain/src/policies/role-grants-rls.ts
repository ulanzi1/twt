// RLS policy declarations for the `role_grants` table — Story 1.8 (Task 5, AC-2).
//
// A SCOPED table — tenant-isolated on BOTH read and write — NOT a Passport-style
// cross-readable carve-out. This is the load-bearing distinction: a Pariwar's role
// grants are private to that Pariwar; a cross-Pariwar grant read is a REAL leak
// (it would let Pariwar A enumerate who holds what role in Pariwar B). So both
// policies key on `pariwar_id` via Story 1.6's closed-failure construct, exactly
// like `events_log` (contrast `pariwar_passport`, whose SELECT is `USING (true)`).
//
// `role_grants` is added to the adversarial cross-pariwar-leak suite as a SCOPED
// (must-return-0) table — NOT to the carve-out set.
//
// The `nullif(current_setting('app.pariwar_id', true), '')::uuid` expression is the
// same construct events_log proved in Story 1.6: `current_setting(…, true)` returns
// '' (not RAISE) when scope is unset; `nullif(…, '')` maps that to NULL so
// `pariwar_id = NULL` is "no match" → 0 rows / blocked write, rather than a
// `''::uuid` cast error. A non-empty non-UUID value still fails the cast
// (defense-in-depth); that path is closed upstream by setPariwarScope's regex guard.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { roleGrants } from '../schema/role_grants.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only grants whose
 * `pariwar_id = X`. Unset session variable → nullif → NULL → 0 rows. This is the
 * leak-prevention guarantee the cross-pariwar-leak suite asserts.
 */
export const roleGrantsTenantIsolationSelect = pgPolicy(
  'role_grants_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(roleGrants);

/**
 * Write isolation (`for: 'all'` covers insert | update | delete). Grants are
 * MUTABLE (a Super Admin adds/edits/revokes them, FR-44) — so unlike the
 * Passport singleton, DELETE is a legitimate operation and the migration GRANTs it
 * (see 0004_role-grants.sql). `withCheck` blocks an INSERT/UPDATE that would write
 * a row scoped to a different tenant than the session; unset scope → NULL → blocked.
 */
export const roleGrantsTenantIsolationWrite = pgPolicy(
  'role_grants_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(roleGrants);
