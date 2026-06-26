// packages/contracts/src/kyc/provider.ts
//
// The FROZEN KYC provider port (Story 3.3a, AC1) — architectural-freeze row 13 /
// AR-43. `KycProvider` is a PURE TypeScript interface (a port; no runtime): the
// exactly-three-method seam every KYC consumer codes against. The concrete
// DigiLocker implementation lives in ONE module (`apps/api/src/modules/kyc/providers/
// digilocker/`), the SOLE place the DigiLocker OAuth client / eAadhaar-XML transport
// is imported (enforced by the `kyc-provider-boundary` CI gate). A future provider
// swap (FR-58C flag flip) is a single-module change because consumers depend only on
// this interface + the neutral `KycProfile` / `KycError` types.
//
// The data shapes (`KycInitiation`, `KycCallbackPayload`, `KycTransactionStatus`) are
// `.strict()` Zod schemas + paired `z.output` types (the contracts directory
// discipline). NO `.openapi()` registration — 3.3a ships no HTTP endpoint, so
// `openapi/v1.yaml` stays byte-identical (the Story 2.7 plain-z.* precedent).
//
// `initiate(memberId: string, …)` uses `string`, NOT the domain `MemberId` brand: a
// contracts SOURCE file MUST NOT import `@twt/domain` (the domain barrel re-exports
// `encryption` → `node:async_hooks`, which breaks browser bundles — the explicit rule
// in rules/clause.ts L23-28). The app-layer caller passes a branded `MemberId`;
// TypeScript widens it to `string` at the boundary.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';
import type { KycProfile } from './profile.js';

/**
 * The reason a KYC flow is being initiated. `signup` is the first-time eKYC at member
 * onboarding (Story 3.3b); `relink` is the AR-24 step-up-gated "DigiLocker re-link" of
 * an existing member. The provider treats both as an OAuth authorization-code start;
 * the consumer decides the lifecycle effect.
 */
export const KycIntent = z.enum(['signup', 'relink']);
export type KycIntent = z.output<typeof KycIntent>;

/**
 * The result of `initiate` (AC1): the opaque provider transaction id, the URL to
 * redirect the member to (the DigiLocker / Meri Pehchaan authorize URL today), and the
 * instant the initiation expires. The consumer surfaces `authorizationUrl` to the
 * client and persists `transactionId` to correlate the callback.
 */
export const KycInitiation = z
  .object({
    transactionId: z.string().min(1),
    authorizationUrl: z.string().url(),
    expiresAt: Iso8601Datetime,
  })
  .strict();
export type KycInitiation = z.output<typeof KycInitiation>;

/**
 * The OAuth callback payload handed to `verifyAndPullProfile` (AC1): the `state` the
 * provider echoes back (validated against the persisted transaction — CSRF defense)
 * and the authorization `code` exchanged at the token endpoint. Provider-neutral: an
 * aggregator swap maps its own callback into this shape.
 */
export const KycCallbackPayload = z
  .object({
    state: z.string().min(1),
    code: z.string().min(1),
  })
  .strict();
export type KycCallbackPayload = z.output<typeof KycCallbackPayload>;

/** The lifecycle state of a provider KYC transaction (returned by `getStatus`). */
export const KycTransactionState = z.enum(['pending', 'verified', 'failed', 'expired']);
export type KycTransactionState = z.output<typeof KycTransactionState>;

/**
 * The result of `getStatus` (AC1): the transaction id + its current state, read from
 * the provider's persisted transaction row (`kyc_transactions`). Provider-neutral.
 */
export const KycTransactionStatus = z
  .object({
    transactionId: z.string().min(1),
    status: KycTransactionState,
  })
  .strict();
export type KycTransactionStatus = z.output<typeof KycTransactionStatus>;

/**
 * The frozen KYC provider port (AC1) — exactly three methods. A PURE interface: no
 * runtime, no transport, no DigiLocker-specifics. The DigiLocker concrete
 * implementation + every future provider implements THIS and nothing more; consumers
 * import only this type (and `KycProfile` / `KycError`). This is the load-bearing
 * single-module-swap seam (AR-43 / architectural-freeze row 13).
 *
 * `verifyAndPullProfile` THROWS a `KycProviderError` (see errors.ts) on any failure —
 * the normalized, provider-neutral error taxonomy (AC5). It never silently returns a
 * partial/unverified profile.
 */
export interface KycProvider {
  /** Begin a KYC flow for `memberId` with the given `intent`; returns the redirect seam. */
  initiate(memberId: string, intent: KycIntent): Promise<KycInitiation>;
  /** Complete the OAuth callback: verify the PKI signature + map to a neutral `KycProfile`. */
  verifyAndPullProfile(callback: KycCallbackPayload): Promise<KycProfile>;
  /** Read the current state of a previously-initiated transaction. */
  getStatus(transactionId: string): Promise<KycTransactionStatus>;
}
