// packages/contracts/src/withdrawal/withdrawal.ts
//
// The voluntary-withdrawal transport DTOs (Story 3.10, Task 4) — the `POST /api/v1/member/withdrawal`
// confirm request + status response, and the bounded, NON-PII `WithdrawalReasonCode` dropdown enum.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — the domain barrel
// re-exports `encryption` → `node:async_hooks`). So this uses plain primitives + `Iso8601Datetime`.
// ALL objects `.strict()` (the nominee/kyc/life-events directory discipline). Match the
// nominee/medical/life-events openapi posture: NO `.openapi()` (keeps `v1.yaml` byte-stable + dodges
// the `encryption → node:async_hooks` barrel import) — the withdrawal path is NOT added to v1.yaml.
//
// ── PII discipline (Tier-1 echo-back) ─────────────────────────────────────────────────────────────
// `reasonCode` is a NON-PII bounded enum (safe in the audit context). `reasonText` is OPTIONAL free
// text — potential Tier-1 PII → it is a REQUEST body ONLY (never logged; the server encrypts it into
// member_withdrawals.reason_text_ciphertext; the audit trail + event carry NEITHER). The RESPONSE
// (`WithdrawalStatusResponse`) NEVER round-trips the reason back — it exposes only the terminal state
// + the two lock timestamps.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/**
 * The bounded set of exit-reason dropdown codes (AC1b). NON-PII — safe in the DB column + audit
 * context. Deliberately SMALL + generic so it carries no free-text identity data; the member may also
 * add optional free-text (`reasonText`, Tier-1) or withdraw with no reason at all. Value-aligned with
 * the `withdrawal.reason.*` i18n dropdown labels (en/hi).
 */
export const WithdrawalReasonCode = z.enum([
  'financial',
  'relocation',
  'dissatisfied',
  'personal',
  'other',
]);
export type WithdrawalReasonCode = z.output<typeof WithdrawalReasonCode>;

/**
 * `POST /api/v1/member/withdrawal` — confirm a voluntary withdrawal. BOTH fields optional (a member
 * may withdraw with no reason). `reasonText` is Tier-1 PII (REQUEST-only; the server encrypts it) —
 * bounded length, never echoed back.
 */
export const WithdrawalConfirmRequest = z
  .object({
    reasonCode: WithdrawalReasonCode.optional(),
    reasonText: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();
export type WithdrawalConfirmRequest = z.output<typeof WithdrawalConfirmRequest>;

/**
 * The withdrawal confirm response — the terminal state + the 12-month rejoin-lock window the mobile
 * client renders on the dignified "you have withdrawn; rejoin permitted on {date}" confirmation.
 * `state` is always `withdrawn` (the terminal state 3.10 closes at). NO reason is echoed (R1).
 */
export const WithdrawalStatusResponse = z
  .object({
    state: z.literal('withdrawn'),
    withdrawnAt: Iso8601Datetime,
    rejoinPermittedAt: Iso8601Datetime,
  })
  .strict();
export type WithdrawalStatusResponse = z.output<typeof WithdrawalStatusResponse>;
