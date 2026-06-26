// KYC provider request context — Story 3.3a (Task 2/Task 4).
//
// The `KycProvider` port (3 frozen methods) does NOT take a db / tenant on each call, so
// a provider is CONSTRUCTED bound to the request's scope: `getActiveKycProvider(ctx)`
// returns a provider closed over this context. `db` is the tenant-scoped handle (the
// kyc_transactions accessors run on it under `app.pariwar_id`); `pariwarId` is the
// defense-in-depth explicit predicate.
//
// This is an APP-LAYER construction type, NOT a contract shadow — it does not redeclare
// any `@twt/contracts/kyc` shape (the README's no-type-shadowing rule). Kept in a leaf
// file so the provider factory + the registry both import it without a cycle.

import type { Db, ids } from '@twt/domain';

export interface KycProviderContext {
  /** Tenant-scoped db handle (kyc_transactions accessors run on it). */
  readonly db: Db;
  /** The request's Pariwar (the explicit cross-tenant-defense predicate). */
  readonly pariwarId: ids.PariwarId;
}
