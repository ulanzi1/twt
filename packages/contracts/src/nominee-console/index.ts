// packages/contracts/src/nominee-console/index.ts
//
// Nominee-console contracts barrel (Story 9.1 — the FIRST Epic-9 surface). Consume via the `@twt/contracts`
// TOP barrel (the kyc/nominee convention — there is no subpath `exports` map):
//   import { NomineeConsoleResponse } from '@twt/contracts';
//
// This is a MEMBER-scoped read model (`/api/v1/member/nominee-console`), distinct from the TENANT-scoped
// reconciliation transport (`reconciliation/`, reserved for Stories 9.2/9.4 — bank-statement intake + UTR
// matching). Presentation only: the gate + pool identity + the staff-takeover verdict; no statement/matcher
// data. No `.openapi()` registration (the nominee/medical member-read posture — openapi/v1.yaml unchanged).

export * from './nominee-console.js';
