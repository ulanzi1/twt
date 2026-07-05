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
  apnsProvider,
  fcmProvider,
  smsDltProvider,
  telegramProvider,
  whatsappBusinessProvider,
  DEFAULT_PROVIDER_REGISTRY,
} from './providers/index.js';
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
