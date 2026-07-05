// Provider barrel + channel→provider registry. Story 5.1 shipped 5 STUBS; Story 5.2 turns the two `push`
// transports (fcm/apns) into REAL firebase-admin providers (+ a log-only fixture default) while
// whatsapp/sms/telegram remain 5.1 stubs (real integration lands in 5.3–5.6). The registry SHAPE and the
// dispatcher are unchanged — real providers plug INTO the fixed channel order.

import type { Channel, ChannelProvider } from '../provider.js';
import { createApnsProvider } from './apns.js';
import { createFcmProvider, type PushProviderDeps } from './fcm.js';
import { createFixturePushProvider, type FixturePushOptions } from './fixture-push.js';
import { smsDltProvider } from './sms-dlt.js';
import { telegramProvider } from './telegram.js';
import { whatsappBusinessProvider } from './whatsapp-business.js';

export {
  createApnsProvider,
  createFcmProvider,
  createFixturePushProvider,
  smsDltProvider,
  telegramProvider,
  whatsappBusinessProvider,
  type PushProviderDeps,
  type FixturePushOptions,
};

/**
 * The two log-only fixture push providers — the zero-config default (fcm-role + apns-role). Exposed so the
 * `DEFAULT_PROVIDER_REGISTRY` and any not-yet-provisioned composition path resolve to a no-network push.
 */
export function fixturePushProviders(options: FixturePushOptions = {}): readonly ChannelProvider[] {
  return [createFixturePushProvider('fcm', options), createFixturePushProvider('apns', options)];
}

/**
 * Select the two `push` transports: the REAL fcm/apns providers when a per-Pariwar messaging handle is
 * available (its FCM secret resolved), else the log-only fixtures. This is the AC2 real-vs-fixture seam —
 * the composition layer (apps/api / apps/jobs) calls it once per Pariwar; the selection NEVER leaks into
 * `dispatch` (the dispatcher stays policy-agnostic).
 */
export function createPushProviders(
  push: { readonly messaging: PushProviderDeps['messaging'] } | null | undefined,
  fixtureOptions: FixturePushOptions = {},
): readonly ChannelProvider[] {
  if (push == null) return fixturePushProviders(fixtureOptions);
  return [createFcmProvider({ messaging: push.messaging }), createApnsProvider({ messaging: push.messaging })];
}

/**
 * The default provider registry: each logical channel → the provider(s) that serve it. `push` defaults to
 * the log-only fixtures (zero Firebase config); a real per-Pariwar registry is built by the composition
 * layer via `createPushProviders`. Every value is a readonly non-empty tuple so channel iteration order
 * never depends on object-key order.
 */
export const DEFAULT_PROVIDER_REGISTRY: Readonly<Record<Channel, readonly ChannelProvider[]>> = {
  push: fixturePushProviders(),
  whatsapp: [whatsappBusinessProvider],
  sms: [smsDltProvider],
  telegram: [telegramProvider],
};
