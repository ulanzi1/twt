// FCM (Firebase Cloud Messaging) provider — Android push transport for the `push` channel. Story 5.2
// (AC1, AC5): the REAL firebase-admin implementation replacing the 5.1 stub, behind the UNCHANGED
// `ChannelProvider` port.
//
// ── Factory, not a singleton (per-Pariwar binding) ────────────────────────────────────────────────────
// The frozen `send(rendered, target)` signature carries NO `pariwar_id` — but FCM credentials are
// per-Pariwar (AR-17). So this is a FACTORY: the composition layer resolves the Pariwar's messaging handle
// (firebase-app.ts cache) and builds a provider bound to it. `scope: 'per-pariwar'` (5.1 declared the
// field). The provider stays pure of DB access — it CLASSIFIES a token error (push-errors.ts) and the
// composition layer does the isolated `markInvalid` write (Task 5); nothing here touches Postgres.

import type { Message } from 'firebase-admin/messaging';

import type { ChannelProvider, RenderedMessage, SendResult, SendStatus } from '../provider.js';
import type { PushMessagingHandle } from './firebase-app.js';
import { classifyPushError, rejectionDetail } from './push-errors.js';

/** What a real push provider needs: a per-Pariwar messaging handle (the firebase-app.ts cache resolves it). */
export interface PushProviderDeps {
  readonly messaging: PushMessagingHandle;
}

/** Build the FCM (Android) message from the rendered push output + the resolved device token. */
function buildFcmMessage(rendered: RenderedMessage, token: string): Message {
  return {
    token,
    notification: { title: rendered.title ?? undefined, body: rendered.body },
    // The deep-link rides in the FCM `data` payload (string map) — the app reads `data.deepLink` on tap.
    ...(rendered.deepLink ? { data: { deepLink: rendered.deepLink } } : {}),
    // Push is the primary time-critical channel — high priority so a data/notification message is not
    // deferred by Android Doze. (Cost-optimization / batching WRAPS dispatch in 5.7; not here.)
    android: { priority: 'high' },
  };
}

/** Build the real FCM provider bound to a per-Pariwar messaging handle. */
export function createFcmProvider(deps: PushProviderDeps): ChannelProvider {
  return {
    id: 'fcm',
    channel: 'push',
    scope: 'per-pariwar',
    async send(rendered, target): Promise<SendResult> {
      try {
        const messageId = await deps.messaging.send(buildFcmMessage(rendered, target.address));
        return { channel: 'push', provider: 'fcm', status: 'accepted', providerMessageId: messageId };
      } catch (err) {
        // NEVER reject the promise on the normal error path — resolve to a well-formed `rejected` result
        // whose `detail` encodes the token-lifecycle class (no PII) so the invalidation seam can read it.
        const { code, errorClass } = classifyPushError(err);
        return {
          channel: 'push',
          provider: 'fcm',
          status: 'rejected',
          providerMessageId: null,
          detail: rejectionDetail(errorClass, code),
        };
      }
    },
    getStatus(messageId): Promise<SendStatus> {
      // FCM gives no post-accept delivery receipt for a v1 send → honest `unknown` (never fabricate `delivered`).
      return Promise.resolve({ providerMessageId: messageId, state: 'unknown' });
    },
  };
}
