// packages/contracts/src/auth/passkey.ts
//
// WebAuthn passkey ceremonies (Story 1.9, AC-2). The OPTIONS responses are the
// browser-spec `PublicKeyCredential*OptionsJSON` payloads — provider-controlled,
// so they are NOT modelled here (the route returns them raw; the OpenAPI path
// documents the request). The VERIFY requests carry the browser response JSON in a
// `response` field — also provider-controlled (a passthrough record), wrapped in a
// `.strict()` envelope so no stray top-level keys are accepted.

import { z } from 'zod';

/** The provider-controlled browser ceremony response (Registration/AuthenticationResponseJSON). */
export const WebAuthnResponseJson = z.record(z.string(), z.unknown());
export type WebAuthnResponseJson = z.output<typeof WebAuthnResponseJson>;

// ── Registration (enroll a passkey) ──────────────────────────────────────────

export const PasskeyRegisterOptionsRequest = z
  .object({
    /** Out-of-band enrollment link token (bootstrap / post-reset path, AC-2). */
    enrollmentToken: z.string().optional(),
    deviceLabel: z.string().max(64).optional(),
  })
  .strict();
export type PasskeyRegisterOptionsRequest = z.output<typeof PasskeyRegisterOptionsRequest>;

export const PasskeyRegisterVerifyRequest = z
  .object({
    response: WebAuthnResponseJson,
    enrollmentToken: z.string().optional(),
    deviceLabel: z.string().max(64).optional(),
  })
  .strict();
export type PasskeyRegisterVerifyRequest = z.output<typeof PasskeyRegisterVerifyRequest>;

export const PasskeyRegisterVerifyResponse = z
  .object({
    verified: z.boolean(),
    /** Returned ONCE at first enrollment — exactly 10 one-time recovery codes (AC-2). */
    recoveryCodes: z.array(z.string().min(1)).length(10).optional(),
  })
  .strict();
export type PasskeyRegisterVerifyResponse = z.output<typeof PasskeyRegisterVerifyResponse>;

// ── Authentication (second factor) ───────────────────────────────────────────

export const PasskeyAuthOptionsRequest = z.object({}).strict();
export type PasskeyAuthOptionsRequest = z.output<typeof PasskeyAuthOptionsRequest>;

export const PasskeyAuthVerifyRequest = z
  .object({
    response: WebAuthnResponseJson,
  })
  .strict();
export type PasskeyAuthVerifyRequest = z.output<typeof PasskeyAuthVerifyRequest>;

export const PasskeyAuthVerifyResponse = z
  .object({
    authenticated: z.literal(true),
  })
  .strict();
export type PasskeyAuthVerifyResponse = z.output<typeof PasskeyAuthVerifyResponse>;
