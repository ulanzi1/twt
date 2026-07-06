// packages/contracts/src/telegram-opt-in/opt-in.ts
//
// Transport contracts for the member Telegram opt-in surface — Story 5.5 (Task 6; AC4/AC10). The member-
// session-gated endpoints:
//   · POST   /api/v1/member/telegram-opt-in  — mint a PENDING opt-in → the t.me `/start` deep-link.
//   · GET    /api/v1/member/telegram-opt-in  — current opt-in state (drives the settings toggle + copy).
//   · POST   /api/v1/member/telegram-opt-in/revoke — member-initiated revocation (independently revocable).
// These DO register in openapi/v1.yaml (the EXPECTED diff). A contracts SOURCE file MUST NOT import
// `@twt/domain` (browser-bundle rule) — plain `z` only. ALL objects `.strict()`.
//
// ── The state enum is lockstep with the domain `telegram_opt_in_state` pgEnum ───────────────────────────
// `TelegramOptInStateSchema` is value-aligned with the domain enum; the anti-drift equality is asserted in
// tests/telegram-opt-in.test.ts (the consent_type discipline — contracts→domain is the legal import
// direction). Deliberately SIMPLER than WhatsApp: NO `EXPIRED_24H_WINDOW` (Telegram has no Meta 24h session
// window — a bot may message a user until the user blocks/stops it; `EXPIRED` is the stale-PENDING sweep only).

import { z } from 'zod';

/**
 * The member Telegram opt-in operational lifecycle states (AC4/AC10). Value-aligned with the domain
 * `telegram_opt_in_state` pgEnum; the lockstep test is the anti-drift guard.
 *   · PENDING — minted on the settings-toggle tap; awaiting the bot `/start <code>` match.
 *   · ACTIVE  — the inbound `/start` matched a PENDING; the bot may deliver (no window).
 *   · REVOKED — member/`/stop`/admin opt-out.
 *   · BLOCKED — the user blocked/kicked the bot (`my_chat_member` update).
 *   · EXPIRED — the stale-PENDING sweep (a PENDING that never matched within the TTL). NO past-window sweep.
 */
export const TelegramOptInStateSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'REVOKED',
  'BLOCKED',
  'EXPIRED',
]);
export type TelegramOptInStateSchema = z.output<typeof TelegramOptInStateSchema>;

/**
 * POST /api/v1/member/telegram-opt-in response — the freshly-minted (or re-issued) PENDING opt-in. Carries
 * the `https://t.me/<bot_username>?start=<code>` deep-link: tapping it opens the bot and sends `/start <code>`;
 * the inbound-update webhook match advances the opt-in to ACTIVE. The mint handler only ever mints (or
 * re-issues) a PENDING, so `state` is narrower than the full lifecycle enum.
 */
export const TelegramOptInRequestResponse = z
  .object({
    state: z.literal('PENDING'),
    deepLink: z.string(),
  })
  .strict();
export type TelegramOptInRequestResponse = z.output<typeof TelegramOptInRequestResponse>;

/**
 * GET /api/v1/member/telegram-opt-in response — the member's current opt-in status (drives the toggle + copy).
 *   · `available` — the Pariwar has Telegram enabled AND a bot username (⇒ the toggle is shown; false ⇒ absent).
 *   · `state` — null when the member has never opted in; else the current lifecycle state.
 *   · `deepLink` — present (non-null) ONLY while PENDING (re-open the `/start` deep-link / retry).
 */
export const TelegramOptInStatusResponse = z
  .object({
    available: z.boolean(),
    state: TelegramOptInStateSchema.nullable(),
    deepLink: z.string().nullable(),
  })
  .strict();
export type TelegramOptInStatusResponse = z.output<typeof TelegramOptInStatusResponse>;

/** POST /api/v1/member/telegram-opt-in/revoke response — the member-initiated revocation outcome. */
export const RevokeTelegramOptInResponse = z
  .object({
    state: TelegramOptInStateSchema,
  })
  .strict();
export type RevokeTelegramOptInResponse = z.output<typeof RevokeTelegramOptInResponse>;
