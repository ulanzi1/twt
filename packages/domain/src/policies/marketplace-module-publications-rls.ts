// RLS policy declarations for `marketplace_module_publications` — Story 12.2 (`2026-11-01-433` QE4; Task 2.1).
//
// TENANT-ISOLATED, INSERT-ONLY — the `marketplace-partners-rls.ts` shape. A publication is written in the publish
// transaction under the module's Pariwar scope and read back by the admin detail page under the same scope. Named select /
// insert policies — ⛔ `for: 'all'`: a publication is never updated or deleted.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { marketplaceModulePublications } from '../schema/marketplace_module_publications.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a query under `app.pariwar_id = X` reads only that Pariwar's publications. */
export const marketplaceModulePublicationsTenantIsolationSelect = pgPolicy(
  'marketplace_module_publications_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(marketplaceModulePublications);

/** INSERT isolation: `withCheck` blocks recording a publication into another tenant. */
export const marketplaceModulePublicationsTenantIsolationInsert = pgPolicy(
  'marketplace_module_publications_tenant_isolation_insert',
  {
    as: 'permissive',
    for: 'insert',
    to: appRole,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(marketplaceModulePublications);
