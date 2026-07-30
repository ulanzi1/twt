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

// Story 10.4 (Task 3; AC3) — the helpdesk_reply member-notification emitter seam. Exported here (the
// apps/api-facing barrel; pure, no pg-boss/GCS pulled in) so the admin reply/resolve handlers fire it
// inline POST-COMMIT — the shepherd-hook precedent. `createHelpdeskReplyFanOutNotifier` REUSES the
// shipped `fanOutAlertToMembers` dispatch composition (never re-implements it); `consoleHelpdeskReplyNotifier`
// is the log-only production default (see the module header's crypto-boundary note).
export {
  buildHelpdeskReplyAlert,
  consoleHelpdeskReplyNotifier,
  createHelpdeskReplyFanOutNotifier,
  createCapturingHelpdeskReplyNotifier,
  type HelpdeskReplyEvent,
  type HelpdeskReplyNotifier,
  type CapturingHelpdeskReplyNotifier,
} from './scheduler/helpdesk-reply-notify.js';

// Story 6.13 — the pool-spawn TRIGGER seam (AC6). Exported here (the apps/api-facing barrel; pure, no
// pg-boss/GCS pulled in) so the cycle-freeze commit handler fires it POST-COMMIT — the FIRST live emitter
// of the Epic-7 pool-spawn trigger, with NO live Pool Engine consumer yet (the dispatch()/shepherd-hook
// discipline). Never rolls back the committed freeze (a throw is swallowed).
export {
  consolePoolSpawnTrigger,
  createCapturingPoolSpawnTrigger,
  createThrowingPoolSpawnTrigger,
  type PoolSpawnTrigger,
  type CapturingPoolSpawnTrigger,
} from './pool-spawn-trigger.js';

// Story 8.8 (Task 7; AC3) — the contribution-CONFIRMED notification enqueue seam. Exported from this
// barrel (pure enqueue; no pg-boss client, no GCS pulled in) so **Epic 9's reconciliation matcher can
// call it POST-COMMIT the moment it emits `contribution.confirmed`** — the counterparty contract of
// record. There is deliberately NO cron and NO recovery sweep behind that queue: `contribution.confirmed`
// has exactly one producer and it is unbuilt, and a producer-less scheduled worker is the anti-pattern
// Story 5.6 named. When Epic 9 lands, the notification fires with ZERO changes in Story 8.8's code.
export {
  enqueueContributionConfirmedNotification,
  type ContributionConfirmedNotifyPayload,
  type NotifyEnqueueContext,
} from './scheduler/contribution-notify-triggers.js';

// Story 9.7 (Task 5; FR-30/FR-32 "member notified") — the contribution-MISMATCH notification enqueue seam.
// Exported from this barrel (pure enqueue; no pg-boss client, no GCS pulled in) so **the Story 9.4 matcher
// worker calls it POST-COMMIT, best-effort, when it emits `contribution.reconciliation-mismatch`** — the
// symmetric counterpart of the 8.8 confirmed seam (8.8 shipped only confirmed; 9.7 owns mismatch). No cron,
// no recovery sweep — the matcher's own 4h sweep heals a dropped notify. A failed enqueue never fails the verdict.
export {
  enqueueContributionMismatchNotification,
  type ContributionMismatchNotifyPayload,
} from './scheduler/contribution-notify-triggers.js';
