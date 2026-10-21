// Barrel for the member WA opt-in state-machine accessors — Story 5.4 (Task 3/4).
// Re-exported from @twt/domain as the `waOptIn` namespace (see ../index.ts) so consumers call
// `waOptIn.createPendingOptIn(...)` / `waOptIn.isOptInActive(...)` / `waOptIn.persistInboundWebhookEvent(...)`.
// Mirrors the `consent/` module shape (read / write / errors split) plus the webhook-queue + phrase helpers.

export * from './read.js';
export * from './write.js';
export * from './webhook-events.js';
export * from './phrase.js';
export * from './audit.js';
export * from './errors.js';
// Story 5.13 — the WhatsApp code (member_wa_opt_in_codes, migration 0178).
export * from './code.js';
