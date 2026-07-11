// RLS policy declarations for `claim_nominee_bank_accounts` — Story 6.8 (Task 3).
//
// TENANT-ISOLATED read + write — mirrors `claims-rls.ts` / `claim-ground-inspections-rls.ts`
// EXACTLY. A claim's nominee bank accounts belong to exactly one Pariwar; every access (the
// dual collection routes + the read accessor Epic 7/9 consumes) runs under that Pariwar's
// `app.pariwar_id`.
//
// Uses Story 1.6's closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`: unset scope → '' →
// nullif → NULL → 0 rows (quiet fail-closed). A cross-tenant `claim_case_id` guess resolves to
// empty, never another Pariwar's disbursement accounts (AC5; Task 7 asserts this).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimNomineeBankAccounts } from '../schema/claim_nominee_bank_accounts.js';
import { appRole } from './_roles.js';

export const claimNomineeBankAccountsTenantIsolationSelect = pgPolicy(
  'claim_nominee_bank_accounts_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimNomineeBankAccounts);

export const claimNomineeBankAccountsTenantIsolationWrite = pgPolicy(
  'claim_nominee_bank_accounts_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimNomineeBankAccounts);
