// Canonical-JSON re-export shim — backward-compatibility surface for @twt/events.
//
// ⚠ The implementation MOVED to @twt/domain at Story 1.10 (DD-1 / D13-1.5). The
// audit-log hash chain + its domain-level producers (KmsProvider.auditHook,
// runAsCrossTenant) must call the canonicalizer from inside @twt/domain, and
// @twt/events already depends on @twt/domain — so @twt/domain is the single home
// (keeping it here and importing from @twt/domain would be a layering inversion +
// turbo cycle). This shim re-exports it so every existing @twt/events consumer
// (events-log replay determinism, packages/events/src/index.ts public surface,
// the canonical-json.test.ts re-export coverage) is unchanged.
//
// There is exactly ONE definition of canonicalJsonStringify in the repo
// (architecture §1.5 build-time invariant): packages/domain/src/canonical-json.ts.

export { canonicalJsonStringify } from '@twt/domain';
export type { CanonicalJsonValue } from '@twt/domain';
