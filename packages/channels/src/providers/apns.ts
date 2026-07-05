// APNs (Apple Push Notification service) provider — iOS push transport for the `push` channel. Story 5.2
// (AC1, AC5): the REAL implementation replacing the 5.1 stub, behind the UNCHANGED `ChannelProvider` port.
//
// ── APNs via the Firebase Admin SDK (ADR-0027 — no native `.p8` path) ─────────────────────────────────
// iOS tokens are sent through the SAME per-Pariwar firebase-admin messaging handle as FCM — the Apple
// Push auth key is configured INSIDE each per-Pariwar Firebase project (BigDev CONFIRMED 2026-07-05). This
// provider only differs from `fcm.ts` in the message BLOCK it builds (`apns`/`aps` vs `android`); it shares
// the same handle, the same error classification, and the same factory shape. The dispatcher routes iOS
// targets here by `SendTarget.platform === 'ios'` (5.1 selectProvider, unchanged).

import type { Message } from 'firebase-admin/messaging';

import type { ChannelProvider, RenderedMessage, SendResult, SendStatus } from '../provider.js';
import type { PushProviderDeps } from './fcm.js';
import { classifyPushError, rejectionDetail } from './push-errors.js';

/** Build the APNs (iOS) message from the rendered push output + the resolved device token. */
function buildApnsMessage(rendered: RenderedMessage, token: string): Message {
  return {
    token,
    // The deep-link rides in the top-level `data` map (firebase-admin surfaces it as APNs custom keys) —
    // the iOS app reads `deepLink` on tap.
    ...(rendered.deepLink ? { data: { deepLink: rendered.deepLink } } : {}),
    apns: {
      payload: {
        aps: {
          alert: { title: rendered.title ?? undefined, body: rendered.body },
        },
      },
    },
  };
}

/** Build the real APNs provider bound to a per-Pariwar messaging handle. */
export function createApnsProvider(deps: PushProviderDeps): ChannelProvider {
  return {
    id: 'apns',
    channel: 'push',
    scope: 'per-pariwar',
    async send(rendered, target): Promise<SendResult> {
      try {
        const messageId = await deps.messaging.send(buildApnsMessage(rendered, target.address));
        return { channel: 'push', provider: 'apns', status: 'accepted', providerMessageId: messageId };
      } catch (err) {
        const { code, errorClass } = classifyPushError(err);
        return {
          channel: 'push',
          provider: 'apns',
          status: 'rejected',
          providerMessageId: null,
          detail: rejectionDetail(errorClass, code),
        };
      }
    },
    getStatus(messageId): Promise<SendStatus> {
      // APNs gives no post-accept delivery receipt for a v1 send → honest `unknown`.
      return Promise.resolve({ providerMessageId: messageId, state: 'unknown' });
    },
  };
}
