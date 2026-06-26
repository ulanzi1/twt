// RLS policies for `kyc_transactions` — Story 3.3a (Task 3).
//
// TENANT-ISOLATED read + write — mirrors `consent-records-rls.ts` /
// `terms-and-conditions-versions-rls.ts`, NOT the `pariwar-passport-rls.ts`
// cross-readable carve-out. A provider transaction belongs to one Pariwar; the callback
// + getStatus resolve it under that Pariwar's `app.pariwar_id`. The `pariwar_passport`
// cross-readable carve-out stays the SINGLE positive exception to the Story 1.6 leak
// invariant.
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`: unset scope
// → '' → nullif → NULL → `pariwar_id = NULL` is "no match" → 0 rows (quiet fail-closed),
// rather than erroring on a `''::uuid` cast.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { kycTransactions } from '../schema/kyc_transactions.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose
 * `pariwar_id = X` (so the callback `state` lookup + `getStatus` resolve only this
 * Pariwar's transactions). Unset session variable → nullif → NULL → 0 rows.
 */
export const kycTransactionsTenantIsolationSelect = pgPolicy(
  'kyc_transactions_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(kycTransactions);

/**
 * Write isolation (`for: 'all'` covers the `initiate` INSERT + the status UPDATE + a
 * future TTL-cleanup DELETE). `withCheck` defends against an INSERT/UPDATE that would
 * create/move a row owned by a different tenant.
 */
export const kycTransactionsTenantIsolationWrite = pgPolicy('kyc_transactions_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(kycTransactions);
