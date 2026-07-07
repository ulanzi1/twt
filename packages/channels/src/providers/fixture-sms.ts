// Fixture (log-only) SMS provider — Story 5.6 (AC1). The zero-config default when the global SMS gateway
// credential is ABSENT (`SmsAppClient.isConfigured()` false) / a category has no registered DLT template
// (the repo's opt-in-real convention: turnstile/digilocker/kyc; and 5.2/5.3/5.5's fixture push/whatsapp/
// telegram — mirrors WA's own blank-config-row check exactly). No network, no gateway — so the stack boots
// with ZERO telephony config in dev / CI / not-yet-provisioned environments. Setting the gateway credential
// + a registered DLT template opts into the real sms-dlt provider (createSmsProvider selects real-vs-fixture
// — the selection stays OUT of `dispatch`).
//
// Reports `accepted` (a log-only "send" always succeeds), so downstream dispatch behaves as if SMS worked.
// NEVER logs the recipient E.164 (Tier-1 PII) — only that a fixture send occurred.
//
// `scope: 'global'` — the fixture has NO gateway credential (it is the zero-config, log-only default); the
// real createSmsDltProvider is bound to the global gateway handle and ALSO declares 'global' (DLT PE/OE
// registration is platform-level — there is no per-Pariwar SMS scope).

import type { ChannelProvider, SendResult, SendStatus } from '../provider.js';

export interface FixtureSmsOptions {
  /** Optional sink for the log-only line. Defaults to no-op (keeps unit tests quiet). */
  readonly log?: (line: string) => void;
}

/** Build a log-only SMS provider used when no global gateway credential / DLT template is configured. */
export function createFixtureSmsProvider(options: FixtureSmsOptions = {}): ChannelProvider {
  return {
    id: 'sms-dlt',
    channel: 'sms',
    scope: 'global',
    send(): Promise<SendResult> {
      options.log?.('[fixture-sms] (no global SMS gateway credential / DLT template configured — log-only, no send)');
      return Promise.resolve({
        channel: 'sms',
        provider: 'sms-dlt',
        status: 'accepted',
        providerMessageId: 'fixture-sms',
        detail: 'fixture sms provider (no global SMS gateway credential configured)',
      });
    },
    getStatus(messageId): Promise<SendStatus> {
      return Promise.resolve({ providerMessageId: messageId, state: 'unknown' });
    },
  };
}
