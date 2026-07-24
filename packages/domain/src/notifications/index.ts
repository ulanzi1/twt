// Barrel for the notification composition substrate — Story 8.8 (Task 1; D4).
//
// Re-exported from @twt/domain as the `notifications` namespace (see ../index.ts) so consumers call
// `notifications.resolvePushTargets(...)` / `notifications.resolvePoolIdentity(...)` /
// `notifications.invalidatePushToken(...)`.
//
// WHY this namespace exists: Story 8.8 is the stack's FIRST live `dispatch()` fan-out. The fan-out is
// cron/worker-driven so it lives in `apps/jobs`, which cannot import `apps/api` (apps/api already
// depends on `@twt/jobs` — the reverse edge is a turbo cycle). Everything here is a pure relocation of
// Epic-5/8 composition reads that previously lived in `apps/api`; every original apps/api module
// re-exports from here, so there is ONE definition and no apps/api call site changed.
//
// What this namespace is NOT: it holds NO policy and NO transport. Channel eligibility, the canonical
// ladder, the cascade, the renderers, cost-optimization and the degraded-mode bridge all stay frozen
// in `@twt/channels`; the composition that sequences them lives in `apps/jobs`.

// The four per-member delivery-target reads (push 5.2 / WhatsApp 5.4 / SMS 5.6 / Telegram 5.5).
export * from './delivery.js';
// The per-pool member-facing identity join (deceased family first-name + last-initial, letter code,
// curated name) — Story 8.6 D6, shared by the card, the passbook, the Note PDF and the 8.8 fan-out.
export * from './pool-identity.js';
// The isolated best-effort push-token invalidation write (Story 5.2 AC5). The unrecoverable-rejection
// CLASSIFICATION stays with the caller (it lives in @twt/channels, which depends on @twt/domain).
export * from './push-invalidation.js';
