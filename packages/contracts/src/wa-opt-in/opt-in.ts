// packages/contracts/src/wa-opt-in/opt-in.ts
//
// Transport contracts for the member WhatsApp opt-in surface — Story 5.4 (Task 6; AC1/AC4). The member-
// session-gated endpoints:
//   · POST   /api/v1/member/wa-opt-in  — mint a PENDING opt-in → deep-link + verification phrase.
//   · GET    /api/v1/member/wa-opt-in  — current opt-in state (drives the settings toggle + copy).
//   · DELETE /api/v1/member/wa-opt-in  — member-initiated revocation (independently revocable).
// These DO register in openapi/v1.yaml (the EXPECTED diff). A contracts SOURCE file MUST NOT import
// `@twt/domain` (browser-bundle rule) — plain `z` only. ALL objects `.strict()`.
//
// ── The state enum is lockstep with the domain `wa_opt_in_state` pgEnum ─────────────────────────────────
// `WaOptInStateSchema` is value-aligned with the domain enum; the anti-drift equality is asserted in
// tests/wa-opt-in.test.ts (the consent_type discipline — contracts→domain is the legal import direction).

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/**
 * The member WA opt-in operational lifecycle states (AC4). Value-aligned with the domain `wa_opt_in_state`
 * pgEnum; the lockstep test is the anti-drift guard.
 */
export const WaOptInStateSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'REVOKED',
  'BLOCKED_BY_META',
  'EXPIRED_24H_WINDOW',
]);
export type WaOptInStateSchema = z.output<typeof WaOptInStateSchema>;

/**
 * POST /api/v1/member/wa-opt-in response — the freshly-minted (or re-issued) PENDING opt-in. Carries the
 * Pariwar's WA Business number, the wa.me Send-Hello deep-link (pre-filled with the verification phrase), and
 * the phrase itself (so the mobile can render it as fallback copy). The member sends this message from their
 * WhatsApp; the inbound-webhook match advances the opt-in to ACTIVE.
 */
export const CreateWaOptInResponse = z
  .object({
    // The mint handler only ever mints (or re-issues) a PENDING opt-in — narrower than the full lifecycle
    // enum (WaOptInStateSchema), which GET/status legitimately returns any of the 5 values for.
    state: z.literal('PENDING'),
    displayPhoneNumber: z.string(),
    deepLink: z.string(),
    verificationPhrase: z.string(),
  })
  .strict();
export type CreateWaOptInResponse = z.output<typeof CreateWaOptInResponse>;

/**
 * GET /api/v1/member/wa-opt-in response — the member's current opt-in status (drives the toggle + copy).
 *   · `available` — the Pariwar has WA enabled AND a display number (⇒ the toggle is shown; false ⇒ absent).
 *   · `state` — null when the member has never opted in; else the current lifecycle state.
 *   · `deepLink` / `verificationPhrase` — present (non-null) ONLY while PENDING (re-open Send-Hello / retry).
 *   · `windowExpiresAt` — present (non-null) ONLY while ACTIVE (the 24h Meta window end).
 */
export const WaOptInStatusResponse = z
  .object({
    available: z.boolean(),
    displayPhoneNumber: z.string().nullable(),
    state: WaOptInStateSchema.nullable(),
    deepLink: z.string().nullable(),
    verificationPhrase: z.string().nullable(),
    windowExpiresAt: Iso8601Datetime.nullable(),
  })
  .strict();
export type WaOptInStatusResponse = z.output<typeof WaOptInStatusResponse>;

/** DELETE /api/v1/member/wa-opt-in response — the member-initiated revocation outcome. */
export const RevokeWaOptInResponse = z
  .object({
    state: WaOptInStateSchema,
  })
  .strict();
export type RevokeWaOptInResponse = z.output<typeof RevokeWaOptInResponse>;
