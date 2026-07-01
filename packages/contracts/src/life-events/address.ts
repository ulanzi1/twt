// packages/contracts/src/life-events/address.ts
//
// The Life Events ADDRESS-update transport DTO (Story 3.9, Task 4). The request shape for
// `POST /member/life-events/address` — one of the four Life Events sub-types (FR-5).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — the domain
// barrel re-exports `encryption` → `node:async_hooks`). So this uses plain `string` + a local
// wire-enum. ALL objects `.strict()` (the nominee/kyc directory discipline). Match the
// nominee/medical openapi posture: NO `.openapi()` (keeps `v1.yaml` path-stable + dodges the
// `encryption → node:async_hooks` barrel import).
//
// ── PII discipline (Tier-1 echo-back) ─────────────────────────────────────────────────
// `addressLine` is Tier-1 PII — it is a REQUEST body ONLY (never logged; the audit trail + event
// carry a presence marker only). The RESPONSE (the shared LifeEventsSummaryResponse) NEVER
// round-trips the raw address bytes back — it exposes `address.recorded` presence only.

import { z } from 'zod';

/** Which locale the member filled the form in ('en' | 'hi'). NON-PII. Local wire-enum (value-aligned
 * with `member_addresses.locale`), mirroring the per-module `MedicalAckLocale` / `MemberTermsLocale`. */
export const LifeEventsLocale = z.enum(['en', 'hi']);
export type LifeEventsLocale = z.output<typeof LifeEventsLocale>;

/**
 * `POST /member/life-events/address` — update the member's address. `addressLine` is the member's
 * typed value (Tier-1 PII — REQUEST-only; the server encrypts it before it lands in
 * `member_addresses`). `locale` records the form locale for the dignified-validation copy audit.
 */
export const AddressUpdateRequest = z
  .object({
    addressLine: z.string().trim().min(1).max(500),
    locale: LifeEventsLocale,
  })
  .strict();
export type AddressUpdateRequest = z.output<typeof AddressUpdateRequest>;
