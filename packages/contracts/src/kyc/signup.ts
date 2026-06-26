// packages/contracts/src/kyc/signup.ts
//
// The signup KYC-step transport DTOs (Story 3.3b, Task 2). These are the FIRST KYC HTTP
// endpoints' request/response shapes — the surface that CONSUMES the 3.3a `KycProvider`
// seam: initiate → DigiLocker callback → confirm, plus the manual fallback + status.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — the
// domain barrel re-exports `encryption` → `node:async_hooks`; see rules/clause.ts). So
// these use `_common` primitives (`UuidString`, `Iso8601Datetime`) + plain `string`, and
// the wire enums (lifecycle state, transaction status) are RE-DECLARED here value-aligned
// with the domain spellings (the same technique kyc_transactions.status uses to mirror the
// contracts `KycTransactionState`). ALL objects `.strict()` (the kyc/ directory discipline).
//
// ── PII discipline (Dev Notes §"Member KYC profile — PII discipline") ─────────────────
// The manual-submit body carries Tier-1 PII (name / dob / photo) — it is a REQUEST body
// (never logged; the audit trail carries masked-Aadhaar / transactionId only). The
// member-facing confirmation view (`KycProfileSummaryResponse`) NEVER echoes the raw photo
// bytes back — it exposes a `photoPresent` boolean + the masked-Aadhaar last-4 only; the
// full Aadhaar number never enters any shape here.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

// ── Wire enums (re-declared; value-aligned with domain) ───────────────────────────────

/** Provider transaction state — value-aligns with the contracts `KycTransactionState`. */
export const KycSignupTransactionStatus = z.enum(['pending', 'verified', 'failed', 'expired']);
export type KycSignupTransactionStatus = z.output<typeof KycSignupTransactionStatus>;

/** The member's KYC standing, derived from the stored profile (none / verified / manual). */
export const MemberKycState = z.enum(['none', 'digilocker_verified', 'manual_pending']);
export type MemberKycState = z.output<typeof MemberKycState>;

/**
 * The member lifecycle-state wire literal — value-aligned with the domain
 * `MEMBER_LIFECYCLE_STATES` tuple (re-declared because contracts cannot import `@twt/domain`).
 * The client displays/branches on it loosely; the server is the authority.
 */
export const MemberLifecycleStateWire = z.enum([
  'pending-kyc',
  'pending-fee',
  'pending-valid',
  'lock-in',
  'active',
  'active-in-grace',
  'lapsed-unpaid',
  'withdrawn',
  'anonymized',
]);
export type MemberLifecycleStateWire = z.output<typeof MemberLifecycleStateWire>;

// ── initiate ──────────────────────────────────────────────────────────────────────────

/** `POST /member/kyc/initiate` → the DigiLocker redirect seam (projects the 3.3a `KycInitiation`). */
export const KycInitiateResponse = z
  .object({
    transactionId: z.string().min(1),
    authorizationUrl: z.string().url(),
    expiresAt: Iso8601Datetime,
  })
  .strict();
export type KycInitiateResponse = z.output<typeof KycInitiateResponse>;

// ── callback (PUBLIC; state-correlated) ───────────────────────────────────────────────

/** `POST /kyc/callback` — the OAuth callback inputs DigiLocker redirects the browser with. */
export const KycCallbackRequest = z
  .object({
    state: z.string().min(1),
    code: z.string().min(1),
  })
  .strict();
export type KycCallbackRequest = z.output<typeof KycCallbackRequest>;

// ── confirm ───────────────────────────────────────────────────────────────────────────

/** `POST /member/kyc/confirm` — the member confirms the shown DigiLocker profile. */
export const KycConfirmRequest = z.object({ transactionId: z.string().min(1) }).strict();
export type KycConfirmRequest = z.output<typeof KycConfirmRequest>;

// ── manual fallback ───────────────────────────────────────────────────────────────────

/**
 * `POST /member/kyc/manual` — the self-declared KYC record. `photo` is an optional base64
 * `data:image/…;base64,…` URI (bounded; NEVER logged — pii-scrape discipline). name/dob are
 * the member's typed values; the record is stored `self_declared` awaiting trustee verify.
 */
export const KycManualSubmitRequest = z
  .object({
    name: z.string().trim().min(1).max(200),
    dob: z.string().trim().min(1).max(40),
    photo: z
      .string()
      .regex(/^data:image\/(jpeg|jpg|png);base64,/, 'photo must be a base64 image data-URI')
      .max(7_000_000)
      .optional(),
  })
  .strict();
export type KycManualSubmitRequest = z.output<typeof KycManualSubmitRequest>;

// ── profile summary (member-facing confirmation view) ─────────────────────────────────

/**
 * The member-facing confirmation view — what the confirm screen shows. NEVER the raw photo
 * bytes (`photoPresent` flag), NEVER the full Aadhaar (`aadhaarMaskedId` is last-4 only).
 */
export const KycProfileSummaryResponse = z
  .object({
    name: z.string(),
    dob: z.string(),
    aadhaarMaskedId: z.string().nullable(),
    verificationStrength: z.enum(['aadhaar_kyc', 'self_declared', 'unverified']),
    photoPresent: z.boolean(),
  })
  .strict();
export type KycProfileSummaryResponse = z.output<typeof KycProfileSummaryResponse>;

// ── status ────────────────────────────────────────────────────────────────────────────

/**
 * `GET /member/kyc/status` — the KYC-step entry read the mobile screen polls. Carries the
 * current transaction status (when a DigiLocker flow is in flight), the member's KYC
 * standing, the lifecycle state, and the FR-58C `manualFallbackEnabled` seam flag (AC3 —
 * the UI hides the manual CTA + shows the hard-mandatory copy block when it is `false`).
 */
export const KycStatusResponse = z
  .object({
    transactionStatus: KycSignupTransactionStatus.optional(),
    memberKycState: MemberKycState,
    lifecycleState: MemberLifecycleStateWire,
    manualFallbackEnabled: z.boolean(),
  })
  .strict();
export type KycStatusResponse = z.output<typeof KycStatusResponse>;
