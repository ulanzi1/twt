// packages/contracts/src/claims/filing.ts
//
// Member-app claim-filing transport DTOs (Story 6.2, Task 1). The request/response wire
// shapes for the Ravi-mode intake flow:
//   · POST /api/v1/member/claims/handover-otp        → send the handover-trust OTP
//   · POST /api/v1/member/claims/handover-otp/verify → verify it (establish handover-trust)
//   · POST /api/v1/member/claims/intake              → relationship-confirm → emit intake
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — the
// domain barrel re-exports `encryption` → `node:async_hooks`). So the claim-lifecycle
// state literals + the intake channel are RE-DECLARED here as wire enums (value-aligned
// with `@twt/domain` schema/claims.ts CLAIM_LIFECYCLE_STATES / CLAIM_INTAKE_CHANNELS),
// exactly the `NomineeRelationship` precedent. This file describes ONLY the REST wire
// shape — it does NOT shadow the `claim.*` event payloads (those live in @twt/domain
// events.ts, README anti-pattern #2). ALL objects `.strict()`.
//
// ── PII discipline ────────────────────────────────────────────────────────────────────
// The handover-OTP response echoes ONLY a MASKED nominee mobile hint (country code + last
// 4) — never the raw number. No nominee name/UPI/Aadhaar is ever carried on any claim-
// filing wire shape (claim-time nominee collection is Story 6.8).

import { z } from 'zod';

// ── Wire enums (re-declared; value-aligned with schema/claims.ts) ──────────────────────

/**
 * The claimant's relationship to the deceased member (AC3 relationship-confirm). Value-
 * aligned with the nominee relationship set (data-quality constraint at the wire, not the
 * DB). Recorded on the `claim.intake_initiated` audit trail — never the claimant's PII.
 */
export const ClaimantRelationship = z.enum(['spouse', 'child', 'parent', 'sibling', 'other']);
export type ClaimantRelationship = z.output<typeof ClaimantRelationship>;

/**
 * The claim-lifecycle state literal returned on the wire (value-aligned with
 * `@twt/domain` CLAIM_LIFECYCLE_STATES — re-declared, NOT imported, per the contracts
 * browser-bundle rule). 6.2 only ever emits `intake_pending`, but the full set keeps the
 * response type forward-safe for the later claim-status surfaces (6.10/6.11).
 */
export const ClaimLifecycleState = z.enum([
  'intake_pending',
  'intake_converged',
  'documents_pending',
  'verification_in_progress',
  'verifier_review',
  'verifier_approved',
  'state_trustee_freeze',
  'state_trustee_approved',
  'approved',
  'denied',
  'appeal_stage_1',
  'appeal_stage_2',
  'appeal_stage_3',
  'reversed',
  'settled',
]);
export type ClaimLifecycleState = z.output<typeof ClaimLifecycleState>;

// ── handover-trust OTP (AC2) ───────────────────────────────────────────────────────────

/**
 * `POST /member/claims/handover-otp` — send the handover-trust OTP to the NOMINEE's
 * declared mobile (Story 3.4 `member_nominees`, Tier-1 decrypt). No body: the deceased
 * member is derived from the authenticated (Ravi-mode) session; the nominee is resolved
 * server-side. An empty strict object so an unexpected key is still rejected.
 */
export const HandoverOtpRequest = z.object({}).strict();
export type HandoverOtpRequest = z.output<typeof HandoverOtpRequest>;

/**
 * The handover-OTP send response. Always `sent: true` (enumeration/existence defense — a
 * member with no resolvable nominee gets the same shape; the flow routes to helpline). The
 * MASKED nominee mobile hint (`+91·····NNNN`) lets the UI explain "OTP sent to nominee
 * phone [masked]" — never the raw number.
 */
export const HandoverOtpResponse = z
  .object({
    sent: z.literal(true),
    nomineeMobileMasked: z.string(),
  })
  .strict();
export type HandoverOtpResponse = z.output<typeof HandoverOtpResponse>;

/**
 * `POST /member/claims/handover-otp/verify` — submit the 6-digit code from Ravi's own
 * phone. A wrong/expired code returns `{ verified: false }` (dignified, generic — the UI
 * cannot distinguish expired from wrong, Pattern 4); a match establishes handover-trust.
 */
export const HandoverOtpVerifyRequest = z
  .object({
    code: z.string().regex(/^\d{6}$/, 'code must be 6 digits'),
  })
  .strict();
export type HandoverOtpVerifyRequest = z.output<typeof HandoverOtpVerifyRequest>;

export const HandoverOtpVerifyResponse = z.object({ verified: z.boolean() }).strict();
export type HandoverOtpVerifyResponse = z.output<typeof HandoverOtpVerifyResponse>;

// ── intake (AC3) ───────────────────────────────────────────────────────────────────────

/**
 * `POST /member/claims/intake` — relationship-confirm → mint `claim_case_id` + emit
 * `claim.intake_initiated` (→ freeze). Requires established handover-trust (a step-up
 * elevation preHandler). The `deceased_member_id` + `claimant_actor_id` are NOT in the
 * wire shape — the server derives the deceased from the session and applies the v1
 * null-claimant policy (Dev Notes "Decisions").
 */
export const ClaimIntakeInitiateRequest = z
  .object({
    relationship: ClaimantRelationship,
  })
  .strict();
export type ClaimIntakeInitiateRequest = z.output<typeof ClaimIntakeInitiateRequest>;

/**
 * The intake response — the minted (or, on an idempotent retry, the EXISTING) canonical
 * claim id + its current lifecycle state. A double-tap/retry returns the SAME `claimCaseId`
 * with `state: 'intake_pending'` (AC3 idempotency), never a second claim.
 */
export const ClaimIntakeInitiateResponse = z
  .object({
    claimCaseId: z.string().uuid(),
    state: ClaimLifecycleState,
  })
  .strict();
export type ClaimIntakeInitiateResponse = z.output<typeof ClaimIntakeInitiateResponse>;
