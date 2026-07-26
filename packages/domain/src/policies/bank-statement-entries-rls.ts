// RLS policy declarations for `bank_statement_entries` — Story 9.4 (Task 2/7).
//
// TENANT-ISOLATED read + write — mirrors `claim-nominee-bank-rls.ts` EXACTLY. A persisted bank-statement
// entry belongs to exactly one Pariwar; every access (the matcher worker's persist + read, both under
// `withPariwarScope`) runs under that Pariwar's `app.pariwar_id`.
//
// Uses Story 1.6's closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`: unset scope → '' → nullif →
// NULL → 0 rows (quiet fail-closed). A cross-tenant `entry_id` guess resolves to empty, never another
// Pariwar's statement rows. These rows are Tier-1-adjacent statement PII, so tenant isolation is the
// protection boundary (the source blob is Tier-1-encrypted; these are its re-derivable matcher cache).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { bankStatementEntries } from '../schema/bank_statement_entries.js';
import { appRole } from './_roles.js';

export const bankStatementEntriesTenantIsolationSelect = pgPolicy(
  'bank_statement_entries_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(bankStatementEntries);

export const bankStatementEntriesTenantIsolationWrite = pgPolicy(
  'bank_statement_entries_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(bankStatementEntries);
