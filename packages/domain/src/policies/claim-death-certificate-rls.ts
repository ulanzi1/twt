// RLS policy declarations for the Story 6.21a death-certificate tables (Task 1; D1, D2).
//
// ONE file for both tables. TENANT-ISOLATED, and ⛔ never one `FOR ALL` policy: a `FOR ALL` policy carries
// a DELETE leg, and both tables are append-only — ⛔ no certificate is ever deleted (`2026-09-25-243`,
// option C; invariant 3):
//   · claim_death_certificate_uploads — SELECT + INSERT only. ⛔ No UPDATE leg: an upload row has no
//     mutable column.
//   · claim_death_certificate_reviews — SELECT + INSERT + a tenant-scoped UPDATE leg, which the
//     COLUMN-LEVEL grants in migration 0122 narrow to the two supersession columns (the review writer)
//     and the two ciphertext columns (the DPDPA-RTBF scrub, D11). A column-aware trigger backs the grant
//     for every role, and a one-way trigger keeps a superseded review from being revived.
// ⛔ No `twt_service` leg: every read and write runs in the caller's Pariwar scope.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimDeathCertificateReviews } from '../schema/claim_death_certificate_reviews.js';
import { claimDeathCertificateUploads } from '../schema/claim_death_certificate_uploads.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimDeathCertificateUploadsTenantIsolationSelect = pgPolicy('claim_death_certificate_uploads_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimDeathCertificateUploads);

export const claimDeathCertificateUploadsTenantIsolationInsert = pgPolicy('claim_death_certificate_uploads_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimDeathCertificateUploads);

export const claimDeathCertificateReviewsTenantIsolationSelect = pgPolicy('claim_death_certificate_reviews_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimDeathCertificateReviews);

export const claimDeathCertificateReviewsTenantIsolationInsert = pgPolicy('claim_death_certificate_reviews_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimDeathCertificateReviews);

export const claimDeathCertificateReviewsTenantIsolationUpdate = pgPolicy('claim_death_certificate_reviews_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimDeathCertificateReviews);
