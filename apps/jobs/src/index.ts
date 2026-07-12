// @twt/jobs public surface.
//
// Story 1.11a — the audit-integrity verification function (`verifyAuditChain`) +
// its observability seams are exported here so the on-demand apps/api endpoint
// (DD-4's HTTP trigger) and the post-mirror/cron CLIs all call the SAME function.
// The mirror job (Story 1.10) is invoked via its CLI, not this barrel, so the GCS
// SDK is never pulled into apps/api by importing from here.

export {
  verifyAuditChain,
  verifyChainWalk,
  createDbChunkReader,
  createInMemoryChunkReader,
  DEFAULT_INTEGRITY_CHUNK_SIZE,
  type TriggerSource,
  type ChunkReader,
  type ChainWalkVerdict,
  type VerifyAuditChainOptions,
} from './audit/integrity-check.js';
export {
  createConsoleIntegritySink,
  createConsoleIntegrityAlerter,
  createCapturingIntegritySink,
  createCapturingIntegrityAlerter,
  resolveIntegritySinkFromEnv,
  resolveIntegrityAlerterFromEnv,
  type IntegrityObservabilitySink,
  type IntegrityAlerter,
  type CapturingIntegritySink,
  type CapturingIntegrityAlerter,
} from './audit/integrity-observability.js';

// Story 6.12 — the shepherd-assigned member-notification hook seam. Exported here (the apps/api-facing
// barrel; pure, no pg-boss/GCS pulled in) so the R6 manual apps/api reassignment route fires the SAME hook
// as the assign worker — one definition, both call sites (RATIFIED correction iii). Never sends bytes (R4).
export {
  consoleShepherdAssignedNotificationHook,
  createCapturingShepherdAssignedHook,
  type ShepherdAssignedEvent,
  type ShepherdAssignedNotificationHook,
  type CapturingShepherdAssignedHook,
} from './shepherd-notification-hook.js';
