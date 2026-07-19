// packages/contracts/src/pools/index.ts
//
// Pool-subsystem contracts barrel (Story 6.13). Consume via the `@twt/contracts` TOP barrel (the
// nominee/claims convention — there is NO subpath `exports` map on this package):
//   import { PoolSpawnTriggerPayload } from '@twt/contracts';
//
// 6.13 lands the FIRST pools contract: the injectable pool-spawn TRIGGER SEAM payload (AC6) — authored +
// emitted with NO live Epic-7 consumer (the dispatch()/[[project_channels_no_live_dispatch_yet]]
// discipline). The substantive Pool-Engine contracts (snapshot / cycle / disbursement) land at Epic 7
// Stories 7.1/7.2/7.3+.

export * from './pool-spawn-trigger.js';
// Story 7.1 — the pool-snapshot cold-storage port (AC3). The write/read-by-key seam the
// snapshot writer + the (deferred) dump job call through; concrete GCS + in-memory
// adapters live in @twt/platform-adapters (apps cannot depend on apps).
export * from './snapshot-storage.js';
// Story 7.5 — the fixed-amount schedule surface (FR-15): the 12-month-notice standard change + the
// emergency adjustment override request/response DTOs + the schedule/effective-amount read view.
export * from './fixed-amount.js';
// Story 7.6 — pool-bound payment enforcement (FR-16/17/18): the wrong-pool verdict/reason-code union
// (lockstep-pinned to @twt/domain), the member-cycle collection-binding response DTO, the CLOSED
// helpdesk-action set (AC3.10), and the trustee-attestable-correction request seam (AC3.11). No live
// 7.6 route → no .openapi() (the deep-link.ts posture); consumed by Epic 8/9/10.
export * from './pool-bound-payment.js';
