// Barrel for the member Telegram opt-in state-machine accessors — Story 5.5 (Task 3).
// Re-exported from @twt/domain as the `telegramOptIn` namespace (see ../index.ts) so consumers call
// `telegramOptIn.createPendingOptIn(...)` / `telegramOptIn.isOptInActive(...)` /
// `telegramOptIn.persistInboundWebhookEvent(...)`. Mirrors the `wa-opt-in/` module shape (read / write /
// errors split) plus the webhook-queue + verification-code helpers.

export * from './read.js';
export * from './write.js';
export * from './webhook-events.js';
export * from './code.js';
export * from './audit.js';
export * from './errors.js';
