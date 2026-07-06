// Fixture (log-only) WhatsApp provider — Story 5.3 (AC2). The zero-config default when a Pariwar's WA
// access-token secret NAME is ABSENT / the config row is absent / `enabled=false` (the repo's opt-in-real
// convention: turnstile/digilocker/kyc; and 5.2's fixture-push). No network, no Meta — so the stack boots
// with ZERO Meta config in dev / CI / not-yet-provisioned Pariwars. Setting the NAME + `enabled=true` opts
// into the real whatsapp-business provider (createWhatsappProvider selects real-vs-fixture — the selection
// stays OUT of `dispatch`).
//
// Reports `accepted` (a log-only "send" always succeeds), so downstream dispatch behaves as if WA worked.
// NEVER logs the recipient msisdn (Tier-1 PII) — only that a fixture send occurred.
//
// `scope: 'global'` — the fixture has NO per-Pariwar credential (it is the zero-config, log-only default);
// the real createWhatsappBusinessProvider is the one bound to a per-Pariwar handle + declares 'per-pariwar'.
// (This is the exact 5.2 fixture-push review-fix pre-applied: a fixture is 'global', NOT 'per-pariwar'.)

import type { ChannelProvider, SendResult, SendStatus } from '../provider.js';

export interface FixtureWhatsappOptions {
  /** Optional sink for the log-only line. Defaults to no-op (keeps unit tests quiet). */
  readonly log?: (line: string) => void;
}

/** Build a log-only WhatsApp provider used when no per-Pariwar WA credential is configured. */
export function createFixtureWhatsappProvider(options: FixtureWhatsappOptions = {}): ChannelProvider {
  return {
    id: 'whatsapp-business',
    channel: 'whatsapp',
    scope: 'global',
    send(): Promise<SendResult> {
      options.log?.('[fixture-whatsapp] (no per-Pariwar WA credential configured — log-only, no Meta send)');
      return Promise.resolve({
        channel: 'whatsapp',
        provider: 'whatsapp-business',
        status: 'accepted',
        providerMessageId: 'fixture-whatsapp',
        detail: 'fixture whatsapp provider (no per-Pariwar WA credential configured)',
      });
    },
    getStatus(messageId): Promise<SendStatus> {
      return Promise.resolve({ providerMessageId: messageId, state: 'unknown' });
    },
  };
}
