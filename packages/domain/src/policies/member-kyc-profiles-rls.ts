// RLS policy declarations for `member_kyc_profiles` — Story 3.3b (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `member-identities-rls.ts` / `members-rls.ts`,
// NOT the global identity-auth carve-out. A member's KYC profile belongs to exactly one
// Pariwar; the in-scope confirm/manual write + the status read run under that Pariwar's
// `app.pariwar_id`. There is NO pre-scope / servicePool read path here (unlike
// member_identities' mobile login lookup) — every KYC profile access is in-scope.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows,
// quiet fail-closed) — identical to `member-identities-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberKycProfiles } from '../schema/member_kyc_profiles.js';
import { appRole } from './_roles.js';

export const memberKycProfilesTenantIsolationSelect = pgPolicy(
  'member_kyc_profiles_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberKycProfiles);

export const memberKycProfilesTenantIsolationWrite = pgPolicy(
  'member_kyc_profiles_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberKycProfiles);
