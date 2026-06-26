// packages/contracts/src/nominee/index.ts
//
// Nominee-declaration contracts barrel (Story 3.4). Consume via the `@twt/contracts` TOP
// barrel (the kyc/index.ts convention — there is no subpath `exports` map):
//   import { NomineeDeclareRequest, NomineeStatusResponse } from '@twt/contracts';
//
// These are the signup nominee-step transport DTOs (the third signup-wizard SURFACE). They
// register real OpenAPI components + paths (see scripts/emit-openapi.ts).

export * from './declaration.js';
