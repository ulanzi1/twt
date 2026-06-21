// RLS policy declarations for the `clause_versions` table — Story 2.3 (Task 4).
//
// TENANT-ISOLATED read + write — mirrors `events-log-rls.ts`, NOT the
// `pariwar-passport-rls.ts` cross-readable carve-out. Rationale (ADR-0020 /
// Story 2.3 Dev Notes §"RLS posture"): the Niyamavali IS publicly rendered
// (FR-79, Story 2.5), but each Pariwar's public site is its own per-Pariwar
// build/domain that reads with `app.pariwar_id` set to that Pariwar — a
// tenant-scoped SELECT already serves it. The `pariwar_passport` cross-readable
// carve-out stays the SINGLE positive exception to the Story 1.6 leak invariant;
// adding a second cross-readable table would expand that exception surface and
// force a leak-suite change, for no concrete cross-tenant public-read need.
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`:
// unset scope → '' → nullif → NULL → `pariwar_id = NULL` is "no match" → 0 rows
// (quiet fail-closed), rather than erroring on a `''::uuid` cast.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { clauseVersions } from '../schema/clause_versions.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose
 * `pariwar_id = X`. Unset session variable → nullif → NULL → 0 rows.
 */
export const clauseVersionsTenantIsolationSelect = pgPolicy(
  'clause_versions_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(clauseVersions);

/**
 * Write isolation (`for: 'all'` covers insert | update | delete). `withCheck`
 * defends against an INSERT/UPDATE that would create a row owned by a different
 * tenant. UPDATE is legitimate here (unlike events_log): `superseded_by_version`
 * + `deprecated_at` are mutable; historical immutability of `payload`/`clause_id`/
 * `version` is enforced at the domain layer for 2.3 (a column-restricted trigger
 * is deferred to Story 2.4).
 */
export const clauseVersionsTenantIsolationWrite = pgPolicy(
  'clause_versions_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(clauseVersions);
