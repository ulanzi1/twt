// RLS policy declarations for `member_addresses` — Story 3.9 (Task 2).
//
// TENANT-ISOLATED read + write — mirrors `member-medical-disclosures-rls.ts`, NOT the global
// identity-auth carve-out. A member's address history belongs to exactly one Pariwar; the
// in-scope append write + the history read run under that Pariwar's `app.pariwar_id`. There is
// NO pre-scope / servicePool read path here (every address access is fully member-session-gated).
//
// The write policy is `for: 'all'` (mirroring member-medical-disclosures) but the migration GRANT
// excludes UPDATE/DELETE — the address rows are APPEND-ONLY immutable history (AC1 "prior value
// preserved"), so the only write the grant permits is INSERT; the policy still guards that
// INSERT's WITH CHECK predicate.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet
// fail-closed) — identical to `member-medical-disclosures-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberAddresses } from '../schema/member_addresses.js';
import { appRole } from './_roles.js';

export const memberAddressesTenantIsolationSelect = pgPolicy(
  'member_addresses_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberAddresses);

export const memberAddressesTenantIsolationWrite = pgPolicy(
  'member_addresses_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberAddresses);
