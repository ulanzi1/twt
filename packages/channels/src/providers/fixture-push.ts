// Fixture (log-only) push provider — Story 5.2 (AC2). The zero-config default when a Pariwar's FCM
// service-account secret NAME is ABSENT (the repo's opt-in-real convention: turnstile/digilocker/kyc). It
// mirrors `createLogStepUpDelivery` — no network, no firebase-admin — so the stack boots with ZERO Firebase
// config in dev / CI / not-yet-provisioned Pariwars. Setting the secret NAME opts into the real fcm/apns
// providers (createPushProviders selects real-vs-fixture — the selection stays OUT of `dispatch`).
//
// Reports `accepted` (a log-only "send" always succeeds), so downstream dispatch behaves as if push worked.
// NEVER logs the raw device token (Tier-1 PII, AI-4-3(c)) — only platform + deep-link presence.

import type { ChannelProvider, ProviderId, SendResult, SendStatus } from '../provider.js';

export interface FixturePushOptions {
  /** Optional sink for the log-only line. Defaults to no-op (keeps unit tests quiet). */
  readonly log?: (line: string) => void;
}

/**
 * Build a log-only push provider for one transport role (`fcm` = Android, `apns` = iOS). The registry lists
 * one per role so the dispatcher's `selectProvider` (iOS → the `apns` id) still routes correctly.
 */
export function createFixturePushProvider(id: Extract<ProviderId, 'fcm' | 'apns'>, options: FixturePushOptions = {}): ChannelProvider {
  return {
    id,
    channel: 'push',
    // 'global' — the fixture has NO per-Pariwar credential (it's the zero-config, log-only default); the
    // real fcm/apns providers (createFcmProvider/createApnsProvider) are the ones bound to a per-Pariwar
    // messaging handle and correctly declare 'per-pariwar'.
    scope: 'global',
    send(rendered, target): Promise<SendResult> {
      options.log?.(
        `[fixture-push:${id}] platform=${target.platform ?? 'unknown'} deepLink=${rendered.deepLink ? 'yes' : 'no'} (no per-Pariwar FCM secret configured — log-only)`,
      );
      return Promise.resolve({
        channel: 'push',
        provider: id,
        status: 'accepted',
        providerMessageId: `fixture-push:${id}`,
        detail: 'fixture push provider (no per-Pariwar FCM secret configured)',
      });
    },
    getStatus(messageId): Promise<SendStatus> {
      return Promise.resolve({ providerMessageId: messageId, state: 'unknown' });
    },
  };
}
