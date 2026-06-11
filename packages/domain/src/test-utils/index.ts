// Barrel for workspace-shared integration-test utilities (Story 1.6).
//
// Consumed by @twt/domain's own integration tests and re-exported by
// @twt/events's thin tests/integration-setup.ts shim. Exposes the per-test
// transaction-rollback lifecycle (setupLiveDb / getTx) + the DATABASE_URL
// presence flags used by `describe.skipIf(!hasDatabase)`.

export {
  setupLiveDb,
  getTx,
  hasDatabase,
  DATABASE_URL,
  type TxContext,
} from './integration-setup.js';
