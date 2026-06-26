// RLS policy declarations for `member_nominees` — Story 3.4 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `member-kyc-profiles-rls.ts` / `members-rls.ts`,
// NOT the global identity-auth carve-out. A member's nominee row-set belongs to exactly one
// Pariwar; the in-scope declare write (delete-then-insert) + the status read run under that
// Pariwar's `app.pariwar_id`. There is NO pre-scope / servicePool read path here (every
// nominee access is fully member-session-gated) — unlike kyc.repo's PUBLIC callback lookup.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows,
// quiet fail-closed) — identical to `member-kyc-profiles-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberNominees } from '../schema/member_nominees.js';
import { appRole } from './_roles.js';

export const memberNomineesTenantIsolationSelect = pgPolicy(
  'member_nominees_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberNominees);

export const memberNomineesTenantIsolationWrite = pgPolicy(
  'member_nominees_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberNominees);
