// Public API surface for the named cross-tenant operations module.
//
// Architecture §1.2 line 767 — "the cross-tenant module's exports are limited to
// the helper and its variants". Consumers of `@twt/domain/cross-tenant` (via the
// `crossTenant.*` namespace re-export in packages/domain/src/index.ts) get the
// helper + the sentinel constant and nothing else; raw pg.Pool construction
// primitives are intentionally NOT re-exported. A downstream Story that needs a
// non-helper entry point lands a new named export here with the same
// audit-emission contract. See README.md.

export {
  runAsCrossTenant,
  CROSS_TENANT_SENTINEL_UUID,
  type CrossTenantContext,
} from './run-as-cross-tenant.js';
