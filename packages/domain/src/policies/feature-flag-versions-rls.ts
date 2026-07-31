// RLS policy declarations for `feature_flag_versions` — Story 10.8 (Task 1; AC1).
//
// TENANT-ISOLATED with ONE deliberate carve-out: `pariwar_id` is NULLABLE, and NULL means "this is
// the GLOBAL flag row" (the catalog default that applies to every Pariwar). So unlike the ~18
// sibling tenant tables, the SELECT predicate carries an explicit `OR pariwar_id IS NULL` leg.
//
// ⚠ DO NOT "FIX" THE READ LEG. It is load-bearing (Decision 3): without it a tenant could not read
// the global catalog rows at all, and `flagVersionInForce`'s override-beats-global precedence — the
// entire point of the two-tier registry — would collapse to "override or nothing".
//
// The asymmetry between the legs is the actual security property, and it is intentional:
//   · SELECT  — own-tenant rows OR global rows. Read the catalog; read your own overrides.
//   · INSERT  — own-tenant rows ONLY (`withCheck` has NO null leg). A tenant-scoped caller can
//     publish its OWN override but can NEVER write a global row; global rows are authored on the
//     SERVICE pool (the seed/catalog path), outside tenant scope.
//   · UPDATE  — own-tenant rows ONLY, both `using` and `withCheck` (same reasoning). The only
//     column any UPDATE ever touches is `superseded_by_version` (the append-only forward-pointer);
//     migration 0087's immutability trigger is the DB-level backstop for that.
// Note `nullif(current_setting('app.pariwar_id', true), '')::uuid` is NULL when the scope is unset,
// and `pariwar_id = NULL` is never true — so an UNSET scope reads ONLY the global rows and can
// write nothing at all (the Story 1.6 closed-failure posture holds).
//
// Deliberately NOT `for: 'all'`: this table is append-only-by-design; `all` would also grant DELETE,
// letting a tenant-scoped caller break the supersession chain (and erase flag history).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { featureFlagVersions } from '../schema/feature_flag_versions.js';
import { appRole } from './_roles.js';

/** SELECT isolation: own-tenant override rows PLUS the cross-readable GLOBAL rows (pariwar_id IS
 *  NULL). The `OR pariwar_id IS NULL` leg is the deliberate Decision-3 carve-out — see the header. */
export const featureFlagVersionsTenantIsolationSelect = pgPolicy(
  'feature_flag_versions_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid OR pariwar_id IS NULL`,
  },
).link(featureFlagVersions);

/** INSERT isolation — publishing a per-Pariwar override. NO null leg by design: a tenant-scoped
 *  caller can never author a GLOBAL row (that is a service-pool/seed path). */
export const featureFlagVersionsTenantIsolationInsert = pgPolicy(
  'feature_flag_versions_tenant_isolation_insert',
  {
    as: 'permissive',
    for: 'insert',
    to: appRole,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(featureFlagVersions);

/** UPDATE isolation — ONLY the `superseded_by_version` forward-pointer is ever set on a prior row
 *  (`createFlagVersion`); migration 0087's append-only trigger enforces that at the DB. Own-tenant
 *  rows only, on both legs — a tenant cannot supersede a global row. */
export const featureFlagVersionsTenantIsolationUpdate = pgPolicy(
  'feature_flag_versions_tenant_isolation_update',
  {
    as: 'permissive',
    for: 'update',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(featureFlagVersions);
