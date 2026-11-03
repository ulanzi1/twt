// Barrel for the field-worker attribution-code registry — Story 13.2 (Task 5; AT1). Re-exported from @twt/domain as the
// `attributionCode` namespace (see ../index.ts). ⚠ Reachable from `apps/*` ONLY through the API door
// `apps/api/src/modules/field-worker/attribution-code-access.ts` — the repo-wide reach fence
// (apps/api/tests/unit/attribution-code-reach-fence.test.ts, AT8 v2 ii) fails any other importer, and ⛔ other domain module
// imports `../attribution-code/`. The export list is PINNED (tests/attribution-code/exports.test.ts); `assertTxBoundScope`
// (tx-guard.ts) is module-private and ⛔ re-exported here.

export {
  ATTRIBUTION_CODE_DENYLIST,
  ATTRIBUTION_CODE_LENGTH,
  ATTRIBUTION_CODE_PATTERN,
  generateAttributionCode,
  isDenylistedAttributionCode,
} from './code.js';
export {
  ATTRIBUTION_CODE_MAX_ATTEMPTS,
  allocateAttributionCode,
  type AllocateAttributionCodeInput,
  type AllocateAttributionCodeOptions,
  type AllocatedAttributionCode,
} from './allocate.js';
export {
  readAttributionCodeForFieldWorker,
  resolveAttribution,
  type AttributionAsOf,
  type ReadAttributionCodeForFieldWorkerInput,
  type ResolveAttributionInput,
} from './resolve.js';
export {
  flagAllocationExhausted,
  listAllocationFlags,
  type AttributionCodeAllocationFlagView,
  type FlagAllocationExhaustedInput,
  type ListAllocationFlagsInput,
} from './flags.js';
export {
  AttributionCaptureMismatchError,
  AttributionCodeAllocationExhaustedError,
  AttributionCodeRequiresTransactionError,
  AttributionPariwarScopeMismatchError,
  FieldWorkerAlreadyHasAttributionCodeError,
  InvalidAttributionCodeError,
} from './errors.js';
