// packages/contracts/src/claims/index.ts
//
// Claim-subsystem contracts barrel (Story 6.2). Consume via the `@twt/contracts` TOP
// barrel (the nominee/index.ts convention — there is no subpath `exports` map):
//   import { ClaimIntakeInitiateRequest } from '@twt/contracts';
//
// 6.2 lands the member-app claim-filing DTOs (handover-trust OTP + intake). The claim
// case object / verification-stage / appeal surfaces land at 6.5+/6.10+.

export * from './filing.js';
