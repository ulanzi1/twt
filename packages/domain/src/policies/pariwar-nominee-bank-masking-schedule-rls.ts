// RLS policy declarations for the per-Pariwar nominee-bank MASKING SCHEDULE — Story 11b.3a (Task 1;
// AC3).
//
// TENANT-ISOLATED read + write on `pariwar_nominee_bank_masking_schedule` — mirrors
// `pariwar-public-name-presentation-rls.ts` / `pool-fixed-amount-schedule-rls.ts` exactly: standard
// inline tenant-isolation on pariwar_id, SYMMETRIC. An unset scope yields 0 rows (Story 1.6
// closed-failure construct).
//
// ⚠⛔ AND 0 ROWS RESOLVES TO **NOT MASKED**, ⛔ not to a shield — `D8-default` RULED **FAIL-OPEN**
// (`2026-09-02-179` cl.1), because cl.10(b) forbids making immediate masking the code's assumption.
// ⭐ That is a DELIBERATE asymmetry with the rest of the codebase and it is argued in full in the
// schema file's header. ⛔ Do not "harden" it here.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { pariwarNomineeBankMaskingSchedule } from '../schema/pariwar_nominee_bank_masking_schedule.js';
import { appRole } from './_roles.js';

export const pariwarNomineeBankMaskingScheduleTenantIsolationSelect = pgPolicy(
  'pariwar_nominee_bank_masking_schedule_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarNomineeBankMaskingSchedule);

export const pariwarNomineeBankMaskingScheduleTenantIsolationWrite = pgPolicy(
  'pariwar_nominee_bank_masking_schedule_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarNomineeBankMaskingSchedule);
