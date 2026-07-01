// RLS policy declarations for `member_postings` — Story 3.9 (Task 3).
//
// TENANT-ISOLATED read + write — mirrors `member-addresses-rls.ts` / `member-medical-disclosures-rls.ts`.
// A member's posting history belongs to exactly one Pariwar; the in-scope append write + the history
// read run under that Pariwar's `app.pariwar_id`. There is NO pre-scope / servicePool read path.
//
// The write policy is `for: 'all'` but the migration GRANT excludes UPDATE/DELETE — posting rows are
// APPEND-ONLY immutable history (AC1); the only write the grant permits is INSERT.
//
// Story 1.6 closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberPostings } from '../schema/member_postings.js';
import { appRole } from './_roles.js';

export const memberPostingsTenantIsolationSelect = pgPolicy(
  'member_postings_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberPostings);

export const memberPostingsTenantIsolationWrite = pgPolicy(
  'member_postings_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberPostings);
