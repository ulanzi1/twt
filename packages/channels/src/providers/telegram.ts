// Telegram provider — the `telegram` parallel fire-and-forget MIRROR side-channel (announcements-only; the
// category eligibility gate lives in dispatch.ts, NOT here). Story 5.5 (AC1, AC2): the REAL Telegram Bot API
// implementation replacing the 5.1 stub, behind the UNCHANGED `ChannelProvider` port.
//
// ── Factory, not a singleton (per-Pariwar binding) — mirrors createWhatsappBusinessProvider ────────────
// The frozen `send(rendered, target)` carries NO `pariwar_id` — but Telegram bots are per-Pariwar (AR-17). So
// this is a FACTORY: the composition layer resolves the Pariwar's messaging handle (telegram-app.ts cache) and
// builds a provider bound to it. `scope: 'per-pariwar'`. The provider stays pure of DB access — it CLASSIFIES
// a Telegram error (telegram-errors.ts) and never touches Postgres.
//
// ── Fire-and-forget (FR-73) — the provider NEVER rejects ───────────────────────────────────────────────
// Telegram is a parallel mirror side-channel, NOT part of CANONICAL_CHANNEL_LADDER — no fallback ladder fires
// on a Telegram failure (the dispatcher already isolates it). `send` resolves to a `rejected` SendResult whose
// `detail` classifies the failure (no PII) on ANY error; it never throws (mirror whatsapp-business.ts).
//
// NOTE ON NAMING: the story text names this factory `createTelegramProvider`, but that name is used for the
// real-vs-fixture SEAM in providers/index.ts (mirroring createWhatsappProvider). To avoid the collision this
// real factory is `createTelegramBotProvider` (the twin of `createWhatsappBusinessProvider`); the seam stays
// `createTelegramProvider(deps|null)`.

import type { ChannelProvider, RenderedMessage, SendResult, SendStatus, SendTarget } from '../provider.js';
import type { TelegramMessagingHandle } from './telegram-app.js';
import { classifyTelegramError, rejectionDetail } from './telegram-errors.js';

/**
 * What a real Telegram provider needs: a per-Pariwar messaging handle (the telegram-app.ts cache resolves it).
 * The delivery address (the member's `chat_id`) arrives on the frozen `SendTarget.address` at send time.
 */
export interface TelegramProviderDeps {
  readonly messaging: TelegramMessagingHandle;
}

/** Build the real Telegram provider bound to a per-Pariwar handle. */
export function createTelegramBotProvider(deps: TelegramProviderDeps): ChannelProvider {
  return {
    id: 'telegram',
    channel: 'telegram',
    scope: 'per-pariwar',
    async send(rendered: RenderedMessage, target: SendTarget): Promise<SendResult> {
      try {
        const messageId = await deps.messaging.send({ chatId: target.address, text: rendered.body });
        return {
          channel: 'telegram',
          provider: 'telegram',
          status: 'accepted',
          providerMessageId: messageId,
        };
      } catch (err) {
        // NEVER reject the promise (fire-and-forget) — resolve to a well-formed `rejected` result whose
        // `detail` encodes the Telegram failure class (no PII). The dispatcher isolates Telegram from the
        // ladder, so this failure never cascades.
        const { code, errorClass } = classifyTelegramError(err);
        return {
          channel: 'telegram',
          provider: 'telegram',
          status: 'rejected',
          providerMessageId: null,
          detail: rejectionDetail(errorClass, code),
        };
      }
    },
    getStatus(messageId: string): Promise<SendStatus> {
      // Telegram gives NO async delivery receipt — honest `unknown` (never fabricate `delivered`).
      return Promise.resolve({ providerMessageId: messageId, state: 'unknown' });
    },
  };
}
