// RLS policy declarations for the per-Pariwar DRIVE TARGET VISIBILITY record — Story 11b.13
// (Task 2; AC3, AC4).
//
// TENANT-ISOLATED read + write on `pariwar_drive_target_visibility` — mirrors
// `pariwar-public-name-presentation-rls.ts` exactly: standard inline tenant-isolation on
// pariwar_id, SYMMETRIC. An unset scope yields 0 rows (Story 1.6 closed-failure construct).
//
// ⭐⭐ AND 0 ROWS RESOLVES TO **HIDDEN FROM EVERYONE** — `2026-09-04-190` cl.7(b), a FAIL-CLOSED
// default. ⚠⛔ This is the DELIBERATE OPPOSITE of the nominee-bank masking schedule's `D8-default`
// FAIL-OPEN (`2026-09-02-179` cl.1), and the contrast is the point: there an infrastructure failure
// that yields zero rows resolves to PUBLISH — a property recorded as an unresolved reactivation
// precondition on that control. ⭐ Here **RLS scope failure and "nothing configured" land on the
// same answer, and that answer is non-disclosure.** ⛔ Do not "harden" or "align" this; the safe
// direction is already the ruled one.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { pariwarDriveTargetVisibility } from '../schema/pariwar_drive_target_visibility.js';
import { appRole } from './_roles.js';

export const pariwarDriveTargetVisibilityTenantIsolationSelect = pgPolicy(
  'pariwar_drive_target_visibility_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarDriveTargetVisibility);

export const pariwarDriveTargetVisibilityTenantIsolationWrite = pgPolicy(
  'pariwar_drive_target_visibility_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarDriveTargetVisibility);
