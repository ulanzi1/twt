// RLS policy declarations for `marketplace_partners` — Story 12.2 (`2026-11-01-433` QE3 (A); Task 2.1).
//
// TENANT-ISOLATED, INSERT-ONLY — mirrors `marketplace-modules-rls.ts` minus UPDATE. A partner belongs to exactly one
// Pariwar and is read / registered under that Pariwar's `app.pariwar_id` (Story 1.6's fail-closed construct: unset scope
// → NULL → 0 rows). Named select / insert policies — ⛔ `for: 'all'`, which would grant UPDATE / DELETE too; the table is
// immutable (a misspelt partner is a new partner).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { marketplacePartners } from '../schema/marketplace_partners.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a query under `app.pariwar_id = X` reads only that Pariwar's partners. */
export const marketplacePartnersTenantIsolationSelect = pgPolicy('marketplace_partners_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplacePartners);

/** INSERT isolation: `withCheck` blocks registering a partner into another tenant. */
export const marketplacePartnersTenantIsolationInsert = pgPolicy('marketplace_partners_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplacePartners);
