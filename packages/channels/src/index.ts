// @twt/channels — the Epic 5 channel primitive (Story 5.1): the channel-provider abstraction + provider
// stubs, the per-channel pure renderers, the deep-freeze immutability guard, and the policy-agnostic
// central dispatcher. Epic 6 (claim) and Epic 8 (contribution) PUBLISH `Alert`s; this package OWNS
// delivery (the FR-23 nudge seam, architectural-freeze row 15).
//
// Justified as a `packages/` primitive (not apps/api/modules) by architecture's second-consumer promotion
// rule: apps/api and apps/jobs both need channel-send access. Consumes `@twt/contracts` (Alert) +
// `@twt/domain` (canonical-json, audit, HMAC).

export type { Channel, ProviderId, RenderedMessage, SendTarget, SendResult, SendStatus, ChannelProvider } from './provider.js';
export {
  createFcmProvider,
  createApnsProvider,
  createFixturePushProvider,
  createFixtureWhatsappProvider,
  createPushProviders,
  createWhatsappProvider,
  createWhatsappBusinessProvider,
  fixturePushProviders,
  smsDltProvider,
  telegramProvider,
  DEFAULT_PROVIDER_REGISTRY,
  type PushProviderDeps,
  type FixturePushOptions,
  type FixtureWhatsappOptions,
  type WhatsappProviderDeps,
} from './providers/index.js';
// Story 5.2 — real push transports: the per-Pariwar Firebase App cache, the messaging seam, and the
// send-error classification the invalidation seam (Task 5) reads back off SendResult.detail.
export { createFirebaseAppCache, type FirebaseAppCache, type PushMessagingHandle } from './providers/firebase-app.js';
export {
  classifyPushError,
  firebaseErrorCode,
  isUnrecoverableTokenRejection,
  rejectionDetail,
  type PushErrorClass,
} from './providers/push-errors.js';
// Story 5.3 — real WhatsApp Business transport: the per-Pariwar Meta Cloud API client cache + the narrow
// messaging seam, the Meta send-error classifier (the honest AC6 failure classes read off
// SendResult.detail), and the pure Meta-status mapping seam Story 5.4's webhook receiver consumes.
export {
  createWhatsappAppCache,
  WhatsappSendError,
  type WhatsappAppCache,
  type WhatsappMessagingHandle,
  type WhatsappTemplateMessage,
  type WhatsappClientConfig,
  type FetchLike,
  type FetchInit,
  type FetchResponse,
} from './providers/whatsapp-app.js';
export {
  classifyWhatsappError,
  rejectionDetail as whatsappRejectionDetail,
  type WhatsappErrorClass,
} from './providers/whatsapp-errors.js';
export { mapMetaStatus, type MetaDeliveryStatus } from './providers/whatsapp-status.js';
export { deepFreeze, isFrozenMutationError, type DeepReadonly } from './freeze.js';
export { render, escapeText, type RenderableAlert } from './render.js';
export {
  createAuditPort,
  createRenderedMessageHash,
  alertPayloadDigest,
  sha256Hex,
  type AuditPort,
  type RenderedMessageHash,
  type RenderedMessageHmacDeps,
} from './audit.js';
export {
  dispatch,
  isCategoryEligible,
  noLifecycleSuppression,
  CANONICAL_CHANNEL_LADDER,
  TELEGRAM_SIDE_CHANNEL,
  type DispatchDeps,
  type DispatchOutcome,
  type ChannelAttempt,
  type DeliveryResolver,
  type RenderFn,
  type LifecycleSuppressionHook,
  type LifecycleSuppressionDecision,
} from './dispatch.js';
