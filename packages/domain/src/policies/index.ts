// Barrel for RLS policy declarations + the shared role-name constants.
//
// Consumed via `import { eventsLogTenantIsolationSelect, appRole } from
// '@twt/domain/policies'` (or the top-level `policies.*` namespace re-export in
// packages/domain/src/index.ts). One file per table's policy set; the barrel
// re-exports every policy module + the `_roles.ts` constants. See README.md.

export * from './_roles.js';
export * from './events-log-rls.js';
export * from './audit-log-entries-rls.js';
export * from './audit-integrity-checks-rls.js';
export * from './pariwar-passport-rls.js';
export * from './role-grants-rls.js';
export * from './identity-auth-rls.js';
