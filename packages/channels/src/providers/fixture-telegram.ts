// Fixture (log-only) Telegram provider — Story 5.5 (AC1). The zero-config default when a Pariwar's bot-token
// secret NAME is ABSENT / the config row is absent / `enabled=false` (the repo's opt-in-real convention:
// turnstile/digilocker/kyc; 5.2's fixture-push; 5.3's fixture-whatsapp). No network, no Telegram — so the
// stack boots with ZERO Telegram config in dev / CI / not-yet-provisioned Pariwars. Setting the NAME +
// `enabled=true` opts into the real telegram provider (createTelegramProvider selects real-vs-fixture — the
// selection stays OUT of `dispatch`).
//
// Reports `accepted` (a log-only "send" always succeeds), so downstream dispatch behaves as if Telegram
// worked. NEVER logs the recipient chat id — only that a fixture send occurred.
//
// `scope: 'global'` — the fixture has NO per-Pariwar credential (it is the zero-config, log-only default); the
// real createTelegramBotProvider is the one bound to a per-Pariwar handle + declares 'per-pariwar'. (The 5.2
// fixture-push review-fix, pre-applied: a fixture is 'global', NOT 'per-pariwar'.)

import type { ChannelProvider, SendResult, SendStatus } from '../provider.js';

export interface FixtureTelegramOptions {
  /** Optional sink for the log-only line. Defaults to no-op (keeps unit tests quiet). */
  readonly log?: (line: string) => void;
}

/** Build a log-only Telegram provider used when no per-Pariwar bot credential is configured. */
export function createFixtureTelegramProvider(options: FixtureTelegramOptions = {}): ChannelProvider {
  return {
    id: 'telegram',
    channel: 'telegram',
    scope: 'global',
    send(): Promise<SendResult> {
      options.log?.('[fixture-telegram] (no per-Pariwar bot credential configured — log-only, no Telegram send)');
      return Promise.resolve({
        channel: 'telegram',
        provider: 'telegram',
        status: 'accepted',
        providerMessageId: 'fixture-telegram',
        detail: 'fixture telegram provider (no per-Pariwar bot credential configured)',
      });
    },
    getStatus(messageId): Promise<SendStatus> {
      return Promise.resolve({ providerMessageId: messageId, state: 'unknown' });
    },
  };
}
