// packages/contracts/src/device-tokens/register.ts
//
// Push device-token registration transport DTOs — Story 5.2 (Task 4). The request/response shapes for the
// two registration endpoints:
//   · `POST /api/v1/member/device-tokens` (member-session-gated) — the Story 3.2 app-open consumer.
//   · `POST /api/v1/admin/device-tokens`  (admin-session-gated)  — the Story 1.9 admin-auth consumer.
// Both share this request shape; the guard + owning-principal differ (composition layer).
//
// ── PII discipline ────────────────────────────────────────────────────────────────────────────────────
// The `token` is the raw FCM/APNs device token — Tier-1 PII (architecture §3.4 L1937). It is a REQUEST
// body only: NEVER logged, NEVER echoed back. The response is a minimal ack (status + platform) — it does
// NOT round-trip the token (mirrors the nominee/KYC presence-flag echo-back discipline).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). Plain `z` only. ALL
// objects `.strict()`. HTTP endpoints → these DO register in openapi/v1.yaml (unlike the internal Alert /
// deep-link render seam).

import { z } from 'zod';

/** The device platform — routes fcm (Android) vs apns (iOS) at delivery time. Value-aligned with the DB CHECK. */
export const DeviceTokenPlatform = z.enum(['android', 'ios']);
export type DeviceTokenPlatform = z.output<typeof DeviceTokenPlatform>;

/**
 * `POST /…/device-tokens` — register the current device's push token. `token` is the raw FCM/APNs token
 * (Tier-1 PII, request-only). Bounded length defends the encrypt/blind-index path from an oversized body
 * (FCM tokens are ~150–300 chars; the cap is generous headroom, not a spec value).
 */
export const DeviceTokenRegisterRequest = z
  .object({
    platform: DeviceTokenPlatform,
    token: z.string().trim().min(1).max(4096),
  })
  .strict();
export type DeviceTokenRegisterRequest = z.output<typeof DeviceTokenRegisterRequest>;

/**
 * The registration ack — minimal + NON-PII. `status` is always `registered` (the upsert is idempotent);
 * `platform` echoes the routed platform. NEVER the token (Tier-1 echo-back discipline).
 */
export const DeviceTokenRegisterResponse = z
  .object({
    status: z.literal('registered'),
    platform: DeviceTokenPlatform,
  })
  .strict();
export type DeviceTokenRegisterResponse = z.output<typeof DeviceTokenRegisterResponse>;
