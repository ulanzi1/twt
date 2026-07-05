// Provider-stub barrel — Story 5.1 (AC2). Exposes the 5 concrete stubs + a channel→provider registry the
// dispatcher uses to resolve a logical `Channel` to its transport provider(s). Real SDK integration
// (5.2–5.6) swaps a stub for a real implementation of the same `ChannelProvider` interface; the registry
// shape and the dispatcher stay unchanged.

import type { Channel, ChannelProvider } from '../provider.js';
import { apnsProvider } from './apns.js';
import { fcmProvider } from './fcm.js';
import { smsDltProvider } from './sms-dlt.js';
import { telegramProvider } from './telegram.js';
import { whatsappBusinessProvider } from './whatsapp-business.js';

export { apnsProvider, fcmProvider, smsDltProvider, telegramProvider, whatsappBusinessProvider };

/**
 * The default provider registry: each logical channel → the provider(s) that serve it. `push` lists both
 * transports (`fcm` for Android, `apns` for iOS); the dispatcher selects by `SendTarget.platform`. Every
 * value is a readonly non-empty tuple so channel iteration order never depends on object-key order.
 */
export const DEFAULT_PROVIDER_REGISTRY: Readonly<Record<Channel, readonly ChannelProvider[]>> = {
  push: [fcmProvider, apnsProvider],
  whatsapp: [whatsappBusinessProvider],
  sms: [smsDltProvider],
  telegram: [telegramProvider],
};
