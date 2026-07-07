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
  createFixtureSmsProvider,
  createFixtureTelegramProvider,
  createFixtureWhatsappProvider,
  createPushProviders,
  createSmsProvider,
  createSmsDltProvider,
  createTelegramProvider,
  createTelegramBotProvider,
  createWhatsappProvider,
  createWhatsappBusinessProvider,
  fixturePushProviders,
  DEFAULT_PROVIDER_REGISTRY,
  type PushProviderDeps,
  type FixturePushOptions,
  type FixtureSmsOptions,
  type FixtureTelegramOptions,
  type FixtureWhatsappOptions,
  type SmsProviderDeps,
  type TelegramProviderDeps,
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
// Story 5.5 — real Telegram Bot transport: the per-Pariwar Telegram Bot API client cache + the narrow
// messaging seam, and the Telegram send-error classifier (the honest AC2 failure classes read off
// SendResult.detail). Telegram is a fire-and-forget mirror side-channel — no cascade, no fallback.
export {
  createTelegramAppCache,
  TelegramSendError,
  type TelegramAppCache,
  type TelegramMessagingHandle,
  type TelegramTextMessage,
  type TelegramClientConfig,
} from './providers/telegram-app.js';
export {
  classifyTelegramError,
  rejectionDetail as telegramRejectionDetail,
  type TelegramErrorClass,
} from './providers/telegram-errors.js';
// Story 5.6 — real SMS-DLT transport: the GLOBAL DLT-transactional telephony-gateway client + the narrow
// messaging seam, the gateway send-error classifier (the honest failure classes read off SendResult.detail),
// and the static per-category DLT template registry (SMS-eligibility = category present in the registry).
export {
  createSmsAppClient,
  SmsSendError,
  type SmsAppClient,
  type SmsMessagingHandle,
  type SmsGatewayMessage,
  type SmsClientConfig,
  type SmsFetchLike,
  type SmsFetchInit,
  type SmsFetchResponse,
} from './providers/sms-app.js';
export {
  classifySmsError,
  rejectionDetail as smsRejectionDetail,
  type SmsErrorClass,
} from './providers/sms-errors.js';
export {
  resolveDltTemplate,
  SMS_DLT_TEMPLATE_REGISTRY,
  type DltTemplate,
} from './sms-dlt-registry.js';
// Story 5.6 — the retry / backoff / cascade primitive the dispatch.ts seam reserves for 5.6: a reusable,
// deterministically-testable in-process primitive (injectable clock) the future live fan-out drives. NO live
// dispatch call site; does NOT change the frozen dispatch / ChannelProvider / CANONICAL_CHANNEL_LADDER shapes.
export {
  runChannelCascade,
  DEFAULT_SMS_BACKOFF_MS,
  RETRYABLE_CASCADE_OUTCOMES,
  type CascadeConfig,
  type CascadeSender,
  type ChannelSendOutcome,
  type CascadeOutcome,
  type CascadeTrailEntry,
} from './cascade.js';
// Story 5.7 — the in-app-engagement cost-optimization POLICY primitive the dispatch.ts seam reserves for 5.7:
// a pure, deterministically-testable decision function + per-category staleness-window config + PII-free
// suppression-reason record + best-effort audit-emit helper. The POLICY sibling of 5.6's cascade RETRY
// primitive — both WRAP dispatch, neither lives inside it. NO live dispatch call site; does NOT change the
// frozen dispatch / ChannelProvider / CANONICAL_CHANNEL_LADDER / LifecycleSuppressionHook shapes.
export {
  evaluateCostOptimization,
  auditCostSuppression,
  stalenessWindowFor,
  COST_OPTIMIZED_CHANNELS,
  DEFAULT_STALENESS_WINDOW_MS,
  STALENESS_WINDOW_BY_CATEGORY,
  type CostOptimizationInput,
  type CostOptimizationDecision,
  type CostNonSuppressionReason,
  type CostSuppressionReason,
  type CostSuppressionAuditInput,
} from './cost-optimization.js';
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
