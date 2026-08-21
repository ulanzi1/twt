// RLS policy declarations for the per-Pariwar directory-publication kill switch — code review,
// Story 11a.3 (2026-08-21, D3).
//
// TENANT-ISOLATED read + write on `pariwar_directory_publication` — mirrors
// `pariwar-public-name-presentation-rls.ts` exactly: standard inline tenant-isolation on
// pariwar_id, SYMMETRIC. An unset scope yields 0 rows (Story 1.6 closed-failure construct), which
// resolves to ENABLED (the ruled default), not to a shield — see the schema file's header.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { pariwarDirectoryPublication } from '../schema/pariwar_directory_publication.js';
import { appRole } from './_roles.js';

export const pariwarDirectoryPublicationTenantIsolationSelect = pgPolicy(
  'pariwar_directory_publication_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarDirectoryPublication);

export const pariwarDirectoryPublicationTenantIsolationWrite = pgPolicy(
  'pariwar_directory_publication_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarDirectoryPublication);
