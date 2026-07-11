// packages/contracts/src/claims/index.ts
//
// Claim-subsystem contracts barrel (Story 6.2). Consume via the `@twt/contracts` TOP
// barrel (the nominee/index.ts convention — there is no subpath `exports` map):
//   import { ClaimIntakeInitiateRequest } from '@twt/contracts';
//
// 6.2 lands the member-app claim-filing DTOs (handover-trust OTP + intake). 6.3 adds the
// helpline-mediated (operator-console) intake DTOs (./helpline.ts). The claim case object /
// verification-stage / appeal surfaces land at 6.5+/6.10+.

export * from './filing.js';
export * from './helpline.js';
// Story 6.4 — the ICP convergence-resolution DTOs (pending list + merge + override) for the
// operator/trustee <ConvergenceDecisionStrip>.
export * from './convergence.js';
// Story 6.5 — the FROZEN OcrProvider port + DTOs + the provider-neutral error taxonomy
// (death-certificate OCR extraction seam) and the claim-document upload wire DTOs +
// the reusable ClaimDocumentStorage port.
export * from './ocr.js';
export * from './documents.js';
// Story 6.8 — the claim-time nominee bank-detail collection DTOs (dual-account #1/#2 collection +
// the IFSC-lookup read). NON-PII presence-view responses; the IFSC wire regex re-declared.
export * from './nominee-bank.js';
// Story 6.9 — the claim-time DPDPA consent DTOs (three granular opt-ins + revoke; CONSUMER of the
// Story 2.7 consent registry). Constrained ['en','hi'] locale; NON-PII presence-view responses; the
// request carries box selections + locale only (the server resolves the canonical consent copy).
export * from './dpdpa-consent.js';
