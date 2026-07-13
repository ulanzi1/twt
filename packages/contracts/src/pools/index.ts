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
