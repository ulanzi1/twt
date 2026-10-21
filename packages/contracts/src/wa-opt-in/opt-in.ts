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

/** Story 5.13 — counted WhatsApp-code sends still possible for one request (at most two per request — Decision 2026-10-21-374). */
export const WaOptInCodesRemaining = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type WaOptInCodesRemaining = z.output<typeof WaOptInCodesRemaining>;

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
    // Story 5.13 (WC4) — what the app may offer for "WhatsApp on another phone?" (computed after the mint commits, bounded):
    //   · `codeAvailable` — a WhatsApp code can be SENT now (the code route is provisioned for the Pariwar — complete config, a
    //     resolvable template name and token — a code is left, the member is still signing up and has ⛔ yes ended before);
    //   · `codesRemaining` — counted sends still possible for this request (⛔ more than two per request);
    //   · `liveCode` — a sent code may still be typed (the app reopens at the code field);
    //   · `liveCodeDelivery` — the newest live code: `sent` (Meta accepted it) | `uncertain` (it may have been sent) | null.
    codeAvailable: z.boolean(),
    codesRemaining: WaOptInCodesRemaining,
    liveCode: z.boolean(),
    liveCodeDelivery: z.enum(['sent', 'uncertain']).nullable(),
  })
  .strict();
export type CreateWaOptInResponse = z.output<typeof CreateWaOptInResponse>;

/**
 * GET /api/v1/member/wa-opt-in response — the member's current opt-in status (drives the toggle + copy).
 *   · `available` — the Pariwar has WA enabled AND a display number (⇒ the toggle is shown; false ⇒ absent).
 *   · `state` — null when the member has never opted in; else the current lifecycle state.
 *   · `deepLink` / `verificationPhrase` — present (non-null) ONLY while PENDING (re-open Send-Hello / retry).
 *   · `windowExpiresAt` — non-null ONLY while ACTIVE: Meta's 24h free-form window end — ⛔ the opt-in's end (Story
 *     5.12, `-364` option A: an ACTIVE opt-in lasts until withdrawn; the app does ⛔ condition on this field). Story 5.13 (WC5):
 *     NULL on an ACTIVE opt-in confirmed by a typed WhatsApp code (⛔ inbound message ⇒ ⛔ window opened).
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

// ── Story 5.13 — the WhatsApp code for a member whose WhatsApp is on another phone (WC1–WC5; Decision 2026-10-21-376) ─────────
//   · POST /api/v1/member/wa-opt-in/code        — send a code to the member's REGISTERED number (body `{}` — ⛔ a number field).
//   · POST /api/v1/member/wa-opt-in/code/verify — type it back: a correct code switches WhatsApp on (PENDING → ACTIVE).

/** POST …/code request — EMPTY (`{}`): the server sends only to the registered number (I2). */
export const SendWaOptInCodeRequest = z.object({}).strict();
export type SendWaOptInCodeRequest = z.output<typeof SendWaOptInCodeRequest>;

/**
 * POST …/code 200 — `delivery`: `sent` (Meta accepted it) | `uncertain` (it may have been sent — a code may still arrive);
 * `codesRemaining` after this send; `retryAfterSeconds` before the next send may be asked for (null ⇒ ⛔ further send, or ⛔ wait).
 */
export const SendWaOptInCodeResponse = z
  .object({
    delivery: z.enum(['sent', 'uncertain']),
    codesRemaining: z.union([z.literal(0), z.literal(1)]),
    retryAfterSeconds: z.number().int().min(0).max(60).nullable(),
  })
  .strict();
export type SendWaOptInCodeResponse = z.output<typeof SendWaOptInCodeResponse>;

/** POST …/code/verify request — exactly six digits (anything else is a 400 and spends ⛔ attempt). */
export const VerifyWaOptInCodeRequest = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();
export type VerifyWaOptInCodeRequest = z.output<typeof VerifyWaOptInCodeRequest>;

/** POST …/code/verify 200 — WhatsApp messages are switched on. */
export const VerifyWaOptInCodeResponse = z.object({ state: z.literal('ACTIVE') }).strict();
export type VerifyWaOptInCodeResponse = z.output<typeof VerifyWaOptInCodeResponse>;

/**
 * The `details` of EVERY WhatsApp-code error (`wa_opt_in.code_*`, and the send / verify refusals) — the server builds them from this
 * schema; the app parses `ApiError.details` (typed `unknown`) with it. `codesRemaining` / `liveCode` always; `retryAfterSeconds` on a
 * send refusal or failure; `attemptsRemaining` on a wrong code. ⛔ The code, ⛔ its hash, ⛔ a number.
 */
export const WaOptInCodeErrorDetails = z
  .object({
    codesRemaining: WaOptInCodesRemaining,
    liveCode: z.boolean(),
    retryAfterSeconds: z.number().int().min(0).max(60).nullable().optional(),
    attemptsRemaining: z.union([z.literal(0), z.literal(1)]).optional(),
  })
  .strict();
export type WaOptInCodeErrorDetails = z.output<typeof WaOptInCodeErrorDetails>;
