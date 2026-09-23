// RLS policy declarations for the Story 6.20 nominee-declaration history tables (Task 1; D1, D4, D7).
//
// TENANT-ISOLATED, and ⛔ never one `FOR ALL` policy: a `FOR ALL` policy carries a DELETE leg, and every
// one of these tables is append-only (the `member-moderation-appeals-rls.ts` posture). Each table gets
// SELECT + INSERT; the three that hold Tier-1 PII (versions, determinations, corrections) also get a
// tenant-scoped UPDATE leg — and the COLUMN-LEVEL grants in migration 0119 are what keep that leg from
// being a general edit capability:
//   · member_nominee_versions — the three ciphertext columns ONLY (the DPDPA-RTBF scrub, D11). A
//     column-aware trigger backs the grant.
//   · nominee_determinations  — the supersession columns (D4 / D7) and the two ciphertext columns (RTBF).
//   · nominee_corrections     — the step + per-step decision columns (D7) and the ciphertext columns (RTBF).
// `nominee_determination_items` and `claim_nominee_findings` have ⛔ no UPDATE leg at all.
// ⛔ No `twt_service` leg: every read and write runs in the caller's Pariwar scope.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimNomineeFindings } from '../schema/claim_nominee_findings.js';
import { memberNomineeVersions } from '../schema/member_nominee_versions.js';
import { nomineeCorrections } from '../schema/nominee_corrections.js';
import { nomineeDeterminationItems, nomineeDeterminations } from '../schema/nominee_determinations.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const memberNomineeVersionsTenantIsolationSelect = pgPolicy('member_nominee_versions_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(memberNomineeVersions);

export const memberNomineeVersionsTenantIsolationInsert = pgPolicy('member_nominee_versions_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(memberNomineeVersions);

export const memberNomineeVersionsTenantIsolationUpdate = pgPolicy('member_nominee_versions_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(memberNomineeVersions);

export const nomineeDeterminationsTenantIsolationSelect = pgPolicy('nominee_determinations_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(nomineeDeterminations);

export const nomineeDeterminationsTenantIsolationInsert = pgPolicy('nominee_determinations_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(nomineeDeterminations);

export const nomineeDeterminationsTenantIsolationUpdate = pgPolicy('nominee_determinations_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(nomineeDeterminations);

export const nomineeDeterminationItemsTenantIsolationSelect = pgPolicy('nominee_determination_items_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(nomineeDeterminationItems);

export const nomineeDeterminationItemsTenantIsolationInsert = pgPolicy('nominee_determination_items_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(nomineeDeterminationItems);

export const nomineeCorrectionsTenantIsolationSelect = pgPolicy('nominee_corrections_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(nomineeCorrections);

export const nomineeCorrectionsTenantIsolationInsert = pgPolicy('nominee_corrections_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(nomineeCorrections);

export const nomineeCorrectionsTenantIsolationUpdate = pgPolicy('nominee_corrections_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(nomineeCorrections);

export const claimNomineeFindingsTenantIsolationSelect = pgPolicy('claim_nominee_findings_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimNomineeFindings);

export const claimNomineeFindingsTenantIsolationInsert = pgPolicy('claim_nominee_findings_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimNomineeFindings);
