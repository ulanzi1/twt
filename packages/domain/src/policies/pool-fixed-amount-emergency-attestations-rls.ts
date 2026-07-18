// RLS policy declarations for `pool_fixed_amount_emergency_attestations` — Story 7.5 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors pariwar-appeal-config-rls.ts / pools-rls.ts.
// An emergency attestation belongs to exactly one Pariwar; read/written under that
// Pariwar's `app.pariwar_id`. Story 1.6's closed-failure construct (unset scope → 0
// rows, fail-closed).
//
// The row is APPEND-ONLY at the PRIVILEGE level (the migration grants SELECT + INSERT,
// NOT UPDATE/DELETE), so the write policy's `for:'all'` only ever governs the INSERT +
// SELECT in practice — no UPDATE/DELETE grant exists to exercise the rest. The
// write-once immutability is thus enforced by the grant, and RLS is the tenant fence
// over the INSERT and reads.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { poolFixedAmountEmergencyAttestations } from '../schema/pool_fixed_amount_emergency_attestations.js';
import { appRole } from './_roles.js';

export const poolFixedAmountEmergencyAttestationsTenantIsolationSelect = pgPolicy(
  'pool_fixed_amount_emergency_attestations_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(poolFixedAmountEmergencyAttestations);

export const poolFixedAmountEmergencyAttestationsTenantIsolationWrite = pgPolicy(
  'pool_fixed_amount_emergency_attestations_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(poolFixedAmountEmergencyAttestations);
