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
export * from './audit-integrity-acknowledgements-rls.js';
export * from './pariwar-passport-rls.js';
export * from './role-grants-rls.js';
export * from './identity-auth-rls.js';
export * from './idempotency-keys-rls.js';
// Story 2.3 — Niyamavali rule registry tenant-isolation policies.
export * from './clause-versions-rls.js';
export * from './niyamavali-amendments-rls.js';
// Story 2.4 — Niyamavali draft-store tenant-isolation policies.
export * from './clause-drafts-rls.js';
// Story 2.6 — T&C registry tenant-isolation policies (versions + pinned-clauses).
export * from './terms-and-conditions-versions-rls.js';
export * from './terms-and-conditions-pinned-clauses-rls.js';
// Story 2.7 — consent registry tenant-isolation policies (NOT cross-readable).
export * from './consent-records-rls.js';
