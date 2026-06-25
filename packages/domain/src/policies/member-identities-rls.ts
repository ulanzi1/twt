// RLS policy declarations for `member_identities` — Story 3.2 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `members-rls.ts` / `consent-records-rls.ts`,
// NOT the global identity-auth carve-out. A member's mobile-identity row belongs to
// exactly one Pariwar; in-scope reads/writes run under that Pariwar's `app.pariwar_id`.
//
// The PRE-SCOPE login lookup (mobile → member, before any scope) deliberately reads
// THROUGH the BYPASSRLS `deps.servicePool` (the `admin-session.handler.ts` precedent,
// R2) — RLS isolates the in-scope profile path; servicePool serves the cross-tenant
// login lookup. Uses Story 1.6's closed-failure construct (unset scope → '' → nullif
// → NULL → 0 rows, quiet fail-closed) — identical to `members-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberIdentities } from '../schema/member_identities.js';
import { appRole } from './_roles.js';

export const memberIdentitiesTenantIsolationSelect = pgPolicy(
  'member_identities_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberIdentities);

export const memberIdentitiesTenantIsolationWrite = pgPolicy(
  'member_identities_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberIdentities);
