// RLS policy declarations for `claim_fraud_investigation_steps` (Story 6.22, Task 1.2; DL1).
//
// TENANT-ISOLATED, per command, and ⛔ never one `FOR ALL` policy: a `FOR ALL` policy carries a DELETE leg, and the table
// is append-only. SELECT + INSERT + a tenant-scoped UPDATE leg, which migration 0197's COLUMN-LEVEL grant narrows to
// `note_ciphertext` (the DPDPA-RTBF scrub, DL15); a column-aware trigger backs the grant for every role.
// ⛔ No `twt_service` leg: every read and write runs in the caller's Pariwar scope.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimFraudInvestigationSteps } from '../schema/claim_fraud_investigation_steps.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimFraudInvestigationStepsTenantIsolationSelect = pgPolicy('claim_fraud_investigation_steps_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimFraudInvestigationSteps);

export const claimFraudInvestigationStepsTenantIsolationInsert = pgPolicy('claim_fraud_investigation_steps_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimFraudInvestigationSteps);

export const claimFraudInvestigationStepsTenantIsolationUpdate = pgPolicy('claim_fraud_investigation_steps_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimFraudInvestigationSteps);
