// packages/contracts/src/life-events/index.ts
//
// Life Events panel contracts barrel (Story 3.9). Consume via the `@twt/contracts` TOP barrel
// (the nominee/index.ts convention — there is no subpath `exports` map):
//   import { AddressUpdateRequest, PostingUpdateRequest, LifeEventsSummaryResponse } from '@twt/contracts';
//
// The NEW address + posting sub-type request DTOs + the shared summary response. The nominee +
// medical Life Events routes REUSE the existing `NomineeDeclareRequest` / medical submit contracts
// unchanged (no new contract for those two).

export * from './address.js';
export * from './posting.js';
export * from './summary.js';
