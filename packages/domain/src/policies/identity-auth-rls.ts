// RLS policy declarations for the global identity + admin-auth tables — Story 1.9
// (AC-7, Task 2.3). THE IDENTITY/AUTH CARVE-OUT FAMILY.
//
// ⚠ Reconciliation R2 (load-bearing): these tables are GLOBAL, NOT pariwar-scoped.
// Login executes BEFORE any `app.pariwar_id` is set — you look up the admin by
// email blind index, verify factors, THEN resolve their Pariwar memberships from
// `role_grants` and set scope. They have NO `pariwar_id` column to scope on (the
// step_up_otps.pariwar_id is INFORMATIONAL, never an RLS key). Copying the
// `role_grants` scoped construct (`pariwar_id = nullif(current_setting('app.
// pariwar_id', true), '')::uuid`) here would make every login return 0 rows and
// make auth structurally impossible.
//
// POSTURE (recorded in ADR-0009, surfaced for architecture confirmation): model
// alongside `pariwar-passport-rls.ts` (the established cross-tenant carve-out
// precedent) — ENABLE + FORCE RLS for consistency + defense-in-depth (so no future
// owner-run migration silently bypasses), with a permissive `USING (true)` /
// `WITH CHECK (true)` policy for `twt_app`. Unlike the Passport carve-out (which
// keeps WRITES tenant-isolated), these have no tenant dimension at all, so reads
// AND writes are global. Access is funnelled through the narrow apps/api auth repo,
// not tenant-data query paths. The stored secrets are defense-in-depth hardened
// regardless: email is Tier-1 ciphertext + Tier-2 blind index, password is
// Argon2id+pepper, recovery codes + OTPs are hashed.
//
// In the cross-pariwar-leak suite these are classified as GLOBAL / non-tenant
// (cross-readable-by-design) tables — NOT scoped-must-return-0 (contrast
// role_grants). A wrong classification would red-fail legitimate global access.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { adminCredentials } from '../schema/admin_credentials.js';
import { adminSessions } from '../schema/admin_sessions.js';
import { recoveryCodes } from '../schema/recovery_codes.js';
import { stepUpOtps } from '../schema/step_up_otps.js';
import { users } from '../schema/users.js';
import { webauthnCredentials } from '../schema/webauthn_credentials.js';
import { appRole } from './_roles.js';

/**
 * The carve-out policy shape: `FOR ALL TO twt_app USING (true) WITH CHECK (true)`.
 * Global access — auth precedes scope, so there is no `app.pariwar_id` to key on.
 */
export const usersGlobalAccess = pgPolicy('users_global_access', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(users);

export const adminCredentialsGlobalAccess = pgPolicy('admin_credentials_global_access', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(adminCredentials);

export const webauthnCredentialsGlobalAccess = pgPolicy('webauthn_credentials_global_access', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(webauthnCredentials);

export const recoveryCodesGlobalAccess = pgPolicy('recovery_codes_global_access', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(recoveryCodes);

export const adminSessionsGlobalAccess = pgPolicy('admin_sessions_global_access', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(adminSessions);

export const stepUpOtpsGlobalAccess = pgPolicy('step_up_otps_global_access', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(stepUpOtps);
