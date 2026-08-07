// RLS policy declarations for `pariwar_custom_field_definitions` — Story 10.12 (Task 2; AC1).
//
// TENANT-ISOLATED read + write. This table holds per-Pariwar definitions ONLY — there is no
// cross-tenant default row and there must not be (a globally-authored custom field would be a schema
// change wearing a tenant's clothes), so plain tenant isolation is exactly right and needs none of
// `feature-flag-versions-rls.ts`'s `OR pariwar_id IS NULL` carve-out. Mirrors
// `helpdesk-routing-policy-versions-rls.ts` / `clause-versions-rls.ts`.
//
// ⚠ THREE POLICIES, NOT `for: 'all'`. `all` would also grant DELETE — and a DELETE here is not a
// tidy-up, it is the destruction of the only record of what a stored value MEANS. Retirement is a
// VERSION (a new row with `retired_at` set), so nothing in the design ever needs to remove one.
// Migration 0095 backs this with `GRANT SELECT, INSERT, UPDATE` and no DELETE grant at all.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { pariwarCustomFieldDefinitions } from '../schema/pariwar_custom_field_definitions.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a query under `app.pariwar_id = X` reads only that Pariwar's definitions. */
export const pariwarCustomFieldDefinitionsTenantIsolationSelect = pgPolicy(
  'pariwar_custom_field_definitions_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarCustomFieldDefinitions);

/** INSERT isolation — publishing a new version row. `withCheck` blocks writing a definition into
 *  another tenant, which for this table is the sharpest form of the leak: a definition authored into
 *  a neighbouring Pariwar would then govern THAT Pariwar's member writes. */
export const pariwarCustomFieldDefinitionsTenantIsolationInsert = pgPolicy(
  'pariwar_custom_field_definitions_tenant_isolation_insert',
  {
    as: 'permissive',
    for: 'insert',
    to: appRole,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarCustomFieldDefinitions);

/** UPDATE isolation — ONLY the `superseded_by_version` forward-pointer is ever set on a prior row
 *  (`publishDefinitionVersion`). Column-level immutability is not expressible in a policy; the
 *  append-only BEFORE UPDATE trigger in migration 0095 is the enforcement. */
export const pariwarCustomFieldDefinitionsTenantIsolationUpdate = pgPolicy(
  'pariwar_custom_field_definitions_tenant_isolation_update',
  {
    as: 'permissive',
    for: 'update',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarCustomFieldDefinitions);
