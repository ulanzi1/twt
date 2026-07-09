// RLS policy declarations for `claim_documents` — Story 6.5 (Task 2).
//
// TENANT-ISOLATED read + write — mirrors `member-kyc-profiles-rls.ts` / `claims`' RLS
// family, NOT the global identity-auth carve-out. A claim document belongs to exactly one
// Pariwar; the upload endpoint's write + the OCR job's upsert + the verifier console's read
// all run under that Pariwar's `app.pariwar_id`. There is NO pre-scope / servicePool read
// path here — every claim-document access is in-scope.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows,
// quiet fail-closed) — identical to `member-kyc-profiles-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimDocuments } from '../schema/claim_documents.js';
import { appRole } from './_roles.js';

export const claimDocumentsTenantIsolationSelect = pgPolicy('claim_documents_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(claimDocuments);

export const claimDocumentsTenantIsolationWrite = pgPolicy('claim_documents_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(claimDocuments);
