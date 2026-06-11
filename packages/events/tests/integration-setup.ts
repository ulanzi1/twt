// Thin re-export — the per-test transaction-rollback substrate was relocated to
// packages/domain/src/test-utils/integration-setup.ts at Story 1.6 so both
// @twt/domain and @twt/events share one lifecycle implementation. This shim
// preserves the Story 1.3 test imports (`./integration-setup`) unchanged.

export {
  setupLiveDb,
  getTx,
  hasDatabase,
  DATABASE_URL,
  type TxContext,
} from '@twt/domain/src/test-utils/integration-setup.js';
