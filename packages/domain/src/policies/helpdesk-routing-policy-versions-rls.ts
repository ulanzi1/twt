// RLS policy declarations for `helpdesk_routing_policy_versions` — Story 10.1 (Task 2).
//
// TENANT-ISOLATED read + write — this table holds per-Pariwar OVERRIDES only (the default v1
// policy is code data, not a row — see the schema header), so plain tenant isolation suffices;
// there is no cross-readable default row to carve out. A Pariwar can only read/write its own
// override versions. Mirrors `clause-versions-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { helpdeskRoutingPolicyVersions } from '../schema/helpdesk_routing_policy_versions.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a query under `app.pariwar_id = X` reads only that Pariwar's override versions. */
export const helpdeskRoutingPolicyVersionsTenantIsolationSelect = pgPolicy(
  'helpdesk_routing_policy_versions_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(helpdeskRoutingPolicyVersions);

/** INSERT isolation — publishing a new version row. `withCheck` blocks writing an override into
 *  another tenant. Deliberately NOT `for: 'all'`: this table is append-only-by-design (the
 *  `clause_versions` immutability posture — a prior row's `policy_document`/`version` is NEVER
 *  mutated); `all` would also grant DELETE, letting a tenant-scoped caller break the
 *  `superseded_by_version` supersession chain. */
export const helpdeskRoutingPolicyVersionsTenantIsolationInsert = pgPolicy(
  'helpdesk_routing_policy_versions_tenant_isolation_insert',
  {
    as: 'permissive',
    for: 'insert',
    to: appRole,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(helpdeskRoutingPolicyVersions);

/** UPDATE isolation — ONLY the `superseded_by_version` forward-pointer is ever set on a prior row
 *  (`createRoutingPolicyVersion`); no column-level enforcement exists here (that's an app-layer
 *  discipline), but no DELETE policy exists — see the INSERT policy's comment above. */
export const helpdeskRoutingPolicyVersionsTenantIsolationUpdate = pgPolicy(
  'helpdesk_routing_policy_versions_tenant_isolation_update',
  {
    as: 'permissive',
    for: 'update',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(helpdeskRoutingPolicyVersions);
