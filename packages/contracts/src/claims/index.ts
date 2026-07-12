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
// Story 6.10 — the READ-ONLY verifier-console compound read model (VerifierConsolePacket): the six
// signal sections over the four-state vocabulary (present|empty|unavailable|not_available_yet), the
// D10 concealment tri-state, and the response envelope. NO adjudication controls (Story 6.11).
export * from './verifier-console.js';
// Story 6.11 — the verifier adjudication (approve/deny/escalate/revise) DTOs (the FIRST verifier WRITE):
// the request DTOs (outcome + reason_code + rationale?, .strict() — server-derived actor identity, R5),
// the outcome↔reason-code compat superRefine (AC8), and the NON-PII decision response.
export * from './verification-decision.js';
// Story 6.12 — the member-facing shepherd read DTO (GET /member/claims/:id/shepherd) backing the mobile
// <ShepherdContactCard>: a discriminated union (assigned → display_name + role_label + contact snapshot |
// not_assigned). The E.164 wire regex is re-declared (no @twt/domain import).
export * from './shepherd.js';
