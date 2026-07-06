// packages/contracts/src/channel-config/config.ts
//
// Per-Pariwar WhatsApp Business config transport DTOs — Story 5.3 (Task 4; AC4). The request/response
// shapes for the trustee config endpoints (admin-session + `pariwar.configure_channels`-gated):
//   · GET/PUT  /api/v1/p/{pariwarId}/admin/channel-config/whatsapp            — the WA config singleton.
//   · GET/PUT  /api/v1/p/{pariwarId}/admin/channel-config/whatsapp/templates  — the per-category UTILITY
//                                                                               template mapping.
//
// ── Credential discipline ─────────────────────────────────────────────────────────────────────────────
// `accessTokenSecretName` is a Secret-Manager NAME (a POINTER), NOT the token value — safe to round-trip in
// the admin form (AI-4-3(c): the NAME is safe to log; the resolved token is not, and never appears here).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). Plain `z` only (+ the
// in-package AlertCategory). ALL objects `.strict()`. HTTP endpoints → these DO register in openapi/v1.yaml.

import { z } from 'zod';

import { AlertCategory } from '../alerts/alert.js';

/** The Meta template lifecycle states (value-aligned with the DB CHECK + the Meta template lifecycle). */
export const WaTemplateApprovalStatus = z.enum(['pending', 'approved', 'rejected', 'paused']);
export type WaTemplateApprovalStatus = z.output<typeof WaTemplateApprovalStatus>;

/** A nullable, trimmed, bounded config string (a not-yet-provisioned field is `null`, not `''`). */
const optionalConfigString = z.string().trim().min(1).max(256).nullable();

/**
 * The WA config singleton — request (PUT) + response (GET) share this shape. `enabled` is the FR-72 admin
 * toggle. The Meta-addressing fields are nullable (a config row may exist, disabled, before provisioning).
 * `accessTokenSecretName` is a NAME pointer (NULL ⇒ the channel resolves to the fixture). `graphApiVersion`
 * is required (the form defaults it) so a Meta version bump is a config change, not a redeploy.
 */
export const WaConfigDto = z
  .object({
    enabled: z.boolean(),
    displayPhoneNumber: optionalConfigString,
    phoneNumberId: optionalConfigString,
    wabaId: optionalConfigString,
    accessTokenSecretName: optionalConfigString,
    graphApiVersion: z
      .string()
      .trim()
      .regex(/^v\d+\.\d+$/, 'must be a Meta Graph API version like v21.0')
      .max(16),
    // Story 5.4 — inbound-webhook credential NAME pointers (NOT the secret values; AI-4-3(c)). Both nullable
    // (a config row may exist before the webhook is provisioned). NULL ⇒ that webhook path fails-closed.
    appSecretSecretName: optionalConfigString,
    webhookVerifyTokenSecretName: optionalConfigString,
  })
  .strict();
export type WaConfigDto = z.output<typeof WaConfigDto>;

/** GET /api/v1/p/{pariwarId}/admin/channel-config/whatsapp — the config + whether a row has been provisioned yet. */
export const WaConfigResponse = z
  .object({
    /** false when no config row exists yet (the DTO carries the zero-config defaults). */
    configured: z.boolean(),
    config: WaConfigDto,
  })
  .strict();
export type WaConfigResponse = z.output<typeof WaConfigResponse>;

/** PUT /api/v1/p/{pariwarId}/admin/channel-config/whatsapp — upsert the config. */
export const WaConfigUpsertRequest = WaConfigDto;
export type WaConfigUpsertRequest = z.output<typeof WaConfigUpsertRequest>;

/** One per-category UTILITY template mapping (request PUT + response element). */
export const WaTemplateDto = z
  .object({
    alertCategory: AlertCategory,
    templateName: z.string().trim().min(1).max(512),
    languageCode: z
      .string()
      .trim()
      .regex(/^[a-z]{2}(_[A-Z]{2})?$/, 'must be a language code like en or en_US')
      .max(8),
    approvalStatus: WaTemplateApprovalStatus,
  })
  .strict();
export type WaTemplateDto = z.output<typeof WaTemplateDto>;

/** PUT /api/v1/p/{pariwarId}/admin/channel-config/whatsapp/templates — upsert one category's template mapping. */
export const WaTemplateUpsertRequest = WaTemplateDto;
export type WaTemplateUpsertRequest = z.output<typeof WaTemplateUpsertRequest>;

/** GET /api/v1/p/{pariwarId}/admin/channel-config/whatsapp/templates — the full per-category mapping list. */
export const WaTemplatesResponse = z
  .object({
    templates: z.array(WaTemplateDto),
  })
  .strict();
export type WaTemplatesResponse = z.output<typeof WaTemplatesResponse>;
