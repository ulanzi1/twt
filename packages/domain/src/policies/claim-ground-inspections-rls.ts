// RLS policy declarations for the ground-inspection tables — Story 6.7 (Task 3).
//
// TENANT-ISOLATED read + write for BOTH `claim_ground_inspections` and its child
// `claim_ground_inspection_photos` — mirrors `claim-peer-mesh-selections-rls.ts` /
// `claims-rls.ts` EXACTLY. An assignment + its photos belong to exactly one Pariwar; every
// access (schedule/reschedule/findings/complete/refusal/photo write + the read accessor) runs
// under that Pariwar's `app.pariwar_id`.
//
// Uses Story 1.6's closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`: unset scope →
// '' → nullif → NULL → 0 rows (quiet fail-closed). A cross-tenant reader sees NOTHING on
// either table (Task 7 asserts this).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimGroundInspections } from '../schema/claim_ground_inspections.js';
import { claimGroundInspectionPhotos } from '../schema/claim_ground_inspection_photos.js';
import { appRole } from './_roles.js';

// ── claim_ground_inspections ──────────────────────────────────────────────────

export const claimGroundInspectionsTenantIsolationSelect = pgPolicy(
  'claim_ground_inspections_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimGroundInspections);

export const claimGroundInspectionsTenantIsolationWrite = pgPolicy(
  'claim_ground_inspections_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimGroundInspections);

// ── claim_ground_inspection_photos ────────────────────────────────────────────

export const claimGroundInspectionPhotosTenantIsolationSelect = pgPolicy(
  'claim_ground_inspection_photos_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimGroundInspectionPhotos);

export const claimGroundInspectionPhotosTenantIsolationWrite = pgPolicy(
  'claim_ground_inspection_photos_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimGroundInspectionPhotos);
