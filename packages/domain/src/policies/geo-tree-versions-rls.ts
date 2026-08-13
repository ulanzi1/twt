// RLS policy declarations for `geo_tree_versions` — Story 1.18 (Task 3).
//
// TENANT-ISOLATED read + write. Each Pariwar owns its OWN state→district→block subtree (`GEO_RANK`
// puts `pariwar: 1` ABOVE `state: 2` — the Pariwar is the tenant, the geography sits inside it), so
// there is no cross-Pariwar national tree, no cross-readable sentinel row, and no default row to
// carve out (there is no code default geography at all — ADR-0038). Plain tenant isolation is the
// whole requirement. Mirrors `helpdesk-routing-policy-versions-rls.ts`.
//
// ⛔ THIS TABLE IS AN AUTHORIZATION INPUT, NOT REFERENCE DATA. A cross-tenant read of another
// Pariwar's tree discloses that Pariwar's administrative structure AND supplies an
// authorization-widening input — so this table joins the adversarial cross-Pariwar
// must-return-0 set (`tests/integration/cross-pariwar-leak.spec.ts`) rather than being treated as
// harmless geography.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { geoTreeVersions } from '../schema/geo_tree_versions.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a query under `app.pariwar_id = X` reads only that Pariwar's tree versions. */
export const geoTreeVersionsTenantIsolationSelect = pgPolicy(
  'geo_tree_versions_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(geoTreeVersions);

/** INSERT isolation — publishing a new tree version. `withCheck` blocks writing a tree into another
 *  tenant. Deliberately NOT `for: 'all'`: this table is append-only-by-design (the `clause_versions`
 *  immutability posture — a prior row's `tree_document`/`version` is NEVER mutated); `all` would
 *  also grant DELETE, letting a tenant-scoped caller break the `superseded_by_version` chain. */
export const geoTreeVersionsTenantIsolationInsert = pgPolicy(
  'geo_tree_versions_tenant_isolation_insert',
  {
    as: 'permissive',
    for: 'insert',
    to: appRole,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(geoTreeVersions);

/** UPDATE isolation — ONLY the `superseded_by_version` forward-pointer is ever set on a prior row
 *  (`createGeoTreeVersion`); no column-level enforcement exists here (that's an app-layer
 *  discipline), but no DELETE policy exists — see the INSERT policy's comment above. */
export const geoTreeVersionsTenantIsolationUpdate = pgPolicy(
  'geo_tree_versions_tenant_isolation_update',
  {
    as: 'permissive',
    for: 'update',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(geoTreeVersions);
