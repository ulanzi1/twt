// Public API surface for the idempotency keyed-store module — Story 1.12.
//
// Consumed via `import { createKeyedStore } from '@twt/domain/idempotency'` or the
// top-level `idempotency.*` namespace re-export in packages/domain/src/index.ts
// (mirroring `audit.*`). The keyed store is DB/table logic (advisory lock +
// idempotency_keys table) independent of pg-boss — both apps/api request handlers
// and apps/jobs workers import it without an app→app dependency.

export {
  createKeyedStore,
  purgeExpiredKeys,
  IdempotencyKeyNotClaimedError,
  type KeyedStore,
  type KeyedStoreOptions,
  type ClaimOutcome,
} from './keyed-store.js';
