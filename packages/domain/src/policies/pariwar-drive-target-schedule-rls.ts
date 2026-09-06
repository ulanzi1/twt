// RLS policy declarations for the per-Pariwar DRIVE TARGET SCHEDULE — Story 11b.13 (Task 2; AC1).
//
// TENANT-ISOLATED read + write on `pariwar_drive_target_schedule` — mirrors
// `pariwar-nominee-bank-masking-schedule-rls.ts` / `pool-fixed-amount-schedule-rls.ts` exactly:
// standard inline tenant-isolation on pariwar_id, SYMMETRIC. An unset scope yields 0 rows (Story
// 1.6 closed-failure construct).
//
// ⭐ AND 0 ROWS RESOLVES TO **NO TARGET**, which Story 11b.14's ruling makes **⛔ NO BAR** — ⛔ not
// to a bar measured against a guess, and ⛔ not to a division by zero. ⚠ That is the SAFE landing
// here, and it is the deliberate contrast with the masking schedule's `D8-default` FAIL-OPEN
// (`2026-09-02-179` cl.1), where 0 rows resolves to DISCLOSURE. ⛔ Do not read the two as one
// posture because the tables share a shape.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { pariwarDriveTargetSchedule } from '../schema/pariwar_drive_target_schedule.js';
import { appRole } from './_roles.js';

export const pariwarDriveTargetScheduleTenantIsolationSelect = pgPolicy(
  'pariwar_drive_target_schedule_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarDriveTargetSchedule);

export const pariwarDriveTargetScheduleTenantIsolationWrite = pgPolicy(
  'pariwar_drive_target_schedule_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarDriveTargetSchedule);
