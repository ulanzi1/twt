// RLS policy declarations for the per-Pariwar public-name presentation config — Story 11a.1 (Task 8).
//
// TENANT-ISOLATED read + write on `pariwar_public_name_presentation` — standard inline
// tenant-isolation on pariwar_id (mirrors pariwar_appeal_config / pariwar_wa_config). SYMMETRIC.
// Story 1.6 closed-failure construct: an unset scope yields 0 rows.
//
// ⚠ 0 ROWS DOES NOT MEAN "SHIELDED" — it means "no stored mode", which resolves to the RULED
// default (`full_name`). That is intentional and is documented at `kyc/public-name.ts`: fail-closed
// here would silently contradict a ratified Panel ruling. RLS still does its job — a Pariwar can
// never read or write ANOTHER Pariwar's mode — it simply does not get to override the ruling by
// being unreachable.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { pariwarPublicNamePresentation } from '../schema/pariwar_public_name_presentation.js';
import { appRole } from './_roles.js';

export const pariwarPublicNamePresentationTenantIsolationSelect = pgPolicy(
  'pariwar_public_name_presentation_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarPublicNamePresentation);

export const pariwarPublicNamePresentationTenantIsolationWrite = pgPolicy(
  'pariwar_public_name_presentation_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarPublicNamePresentation);
