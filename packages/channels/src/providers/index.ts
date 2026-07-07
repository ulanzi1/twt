// Provider barrel + channel→provider registry. Story 5.1 shipped 5 STUBS; Story 5.2 turned the two `push`
// transports (fcm/apns) into REAL firebase-admin providers; Story 5.3 turned `whatsapp` into a REAL Meta
// WhatsApp Business Cloud API provider; Story 5.5 turned `telegram` into a REAL Telegram Bot provider; Story
// 5.6 turns `sms` into a REAL DLT-transactional telephony-gateway provider (each + a log-only fixture
// default). The registry SHAPE and the dispatcher are unchanged — real providers plug INTO the fixed
// channel order.

import type { Channel, ChannelProvider } from '../provider.js';
import { createApnsProvider } from './apns.js';
import { createFcmProvider, type PushProviderDeps } from './fcm.js';
import { createFixturePushProvider, type FixturePushOptions } from './fixture-push.js';
import { createFixtureSmsProvider, type FixtureSmsOptions } from './fixture-sms.js';
import { createFixtureTelegramProvider, type FixtureTelegramOptions } from './fixture-telegram.js';
import { createFixtureWhatsappProvider, type FixtureWhatsappOptions } from './fixture-whatsapp.js';
import { createSmsDltProvider, type SmsProviderDeps } from './sms-dlt.js';
import { createTelegramBotProvider, type TelegramProviderDeps } from './telegram.js';
import { createWhatsappBusinessProvider, type WhatsappProviderDeps } from './whatsapp-business.js';

export {
  createApnsProvider,
  createFcmProvider,
  createFixturePushProvider,
  createFixtureSmsProvider,
  createFixtureTelegramProvider,
  createFixtureWhatsappProvider,
  createSmsDltProvider,
  createTelegramBotProvider,
  createWhatsappBusinessProvider,
  type PushProviderDeps,
  type FixturePushOptions,
  type FixtureSmsOptions,
  type FixtureTelegramOptions,
  type FixtureWhatsappOptions,
  type SmsProviderDeps,
  type TelegramProviderDeps,
  type WhatsappProviderDeps,
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
 * Select the `whatsapp` provider: the REAL Meta WhatsApp Business provider when the per-Pariwar WA deps are
 * available (config `enabled`, credential NAME resolved, an approved template for the category), else the
 * log-only fixture. Mirrors createPushProviders' real-vs-fixture seam; the selection stays OUT of `dispatch`.
 * Guards BOTH `null` AND `undefined` (the 5.2 review-fix pre-applied).
 */
export function createWhatsappProvider(
  wa: WhatsappProviderDeps | null | undefined,
  fixtureOptions: FixtureWhatsappOptions = {},
): ChannelProvider {
  if (wa == null) return createFixtureWhatsappProvider(fixtureOptions);
  return createWhatsappBusinessProvider(wa);
}

/**
 * Select the `telegram` provider: the REAL Telegram Bot provider when the per-Pariwar bot deps are available
 * (config `enabled`, bot-token NAME resolved), else the log-only fixture. Mirrors createWhatsappProvider's
 * real-vs-fixture seam; the selection stays OUT of `dispatch` (the dispatcher stays policy-agnostic). Guards
 * BOTH `null` AND `undefined` (the 5.2 review-fix pre-applied).
 */
export function createTelegramProvider(
  tg: TelegramProviderDeps | null | undefined,
  fixtureOptions: FixtureTelegramOptions = {},
): ChannelProvider {
  if (tg == null) return createFixtureTelegramProvider(fixtureOptions);
  return createTelegramBotProvider(tg);
}

/**
 * Select the `sms` provider: the REAL DLT-transactional telephony-gateway provider when the global gateway
 * deps are available (credential resolved + the alert's category has a registered DLT template), else the
 * log-only fixture. Mirrors createWhatsappProvider's real-vs-fixture seam; the selection stays OUT of
 * `dispatch` (the dispatcher stays policy-agnostic). Guards BOTH `null` AND `undefined` (the 5.2 review-fix
 * convention). SMS has NO per-Pariwar dimension — DLT registration is platform-global.
 */
export function createSmsProvider(
  sms: SmsProviderDeps | null | undefined,
  fixtureOptions: FixtureSmsOptions = {},
): ChannelProvider {
  if (sms == null) return createFixtureSmsProvider(fixtureOptions);
  return createSmsDltProvider(sms);
}

/**
 * The default provider registry: each logical channel → the provider(s) that serve it. `push` defaults to
 * the log-only fixtures (zero Firebase config); `whatsapp`/`sms`/`telegram` default to their log-only
 * fixtures (zero Meta / telephony / Telegram config). A real registry is built by the composition layer via
 * createPushProviders / createWhatsappProvider / createSmsProvider / createTelegramProvider. Every value is a
 * readonly non-empty tuple so channel iteration order never depends on object-key order.
 */
export const DEFAULT_PROVIDER_REGISTRY: Readonly<Record<Channel, readonly ChannelProvider[]>> = {
  push: fixturePushProviders(),
  whatsapp: [createFixtureWhatsappProvider()],
  sms: [createFixtureSmsProvider()],
  telegram: [createFixtureTelegramProvider()],
};
