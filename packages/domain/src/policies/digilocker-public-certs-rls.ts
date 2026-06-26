// RLS policy for `digilocker_public_certs` — Story 3.3a (Task 3).
//
// GLOBAL infra table, NOT tenant-scoped (see schema/digilocker_public_certs.ts header):
// issuer public certs are the same artifact for every Pariwar and the daily refresh job
// runs with NO `app.pariwar_id` set. POSTURE mirrors the member-auth carve-out
// (member-auth-rls.ts / ADR-0009): ENABLE + FORCE RLS for consistency + defense-in-depth
// with a permissive `USING (true) WITH CHECK (true)` policy for `twt_app`. The rows hold
// only PUBLIC certificates (no secret, no PII), and write access is funnelled through
// the narrow `refreshDigiLockerCerts()` / `deactivateDigiLockerCert()` accessors.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { digilockerPublicCerts } from '../schema/digilocker_public_certs.js';
import { appRole } from './_roles.js';

export const digilockerPublicCertsGlobalAccess = pgPolicy('digilocker_public_certs_global_access', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(digilockerPublicCerts);
