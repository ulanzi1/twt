// RLS policy declarations for `claim_correction_no_correction_records` — Story 6.19c, migration 0136 (Task 8). SELECT +
// INSERT only — the record is APPEND-ONLY (as the marks); ⛔ no UPDATE leg, ⛔ no DELETE leg, ⛔ no `FOR ALL`. Story 1.6's
// closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimCorrectionNoCorrectionRecords } from '../schema/claim_correction_closure.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimCorrectionNoCorrectionRecordsTenantIsolationSelect = pgPolicy(
  'claim_correction_no_correction_records_tenant_isolation_select',
  { as: 'permissive', for: 'select', to: appRole, using: SCOPE },
).link(claimCorrectionNoCorrectionRecords);

export const claimCorrectionNoCorrectionRecordsTenantIsolationInsert = pgPolicy(
  'claim_correction_no_correction_records_tenant_isolation_insert',
  { as: 'permissive', for: 'insert', to: appRole, withCheck: SCOPE },
).link(claimCorrectionNoCorrectionRecords);
