// `telegram_inbound_webhook_events` — the §3.11 dedicated webhook-queue table (Story 5.5, Task 2; AC8).
//
// The ingress primitive VERIFIES Telegram's `X-Telegram-Bot-Api-Secret-Token` header (constant-time compare),
// PERSISTS the raw inbound update here, and ACKs 200 — all with NO business logic in the handler path
// (AR-44/§3.11). The async worker (apps/jobs tg-webhook-processor) drains un-processed rows and does the
// matching / state transitions. Keeping ingress (persist+ack) and processing (the worker) split is what keeps
// the handler comfortably fast. Mirrors wa_inbound_webhook_events exactly.
//
// ── RLS: standard inline tenant-isolation (0037/0038 shape) ────────────────────────────────────────────
// pariwar_id comes from the URL path (the trust-establishing secret token is known from the path BEFORE the
// body is trusted). STANDARD inline tenant-isolation RLS on pariwar_id (Story 1.6 closed-failure construct).
// The worker drains on the BYPASSRLS service pool (cross-tenant), like the other apps/jobs sweeps.
//
// ── PII discipline ─────────────────────────────────────────────────────────────────────────────────────
// `raw_payload` is Telegram-opaque inbound update data (a chat id, a username, message text — no phone/Aadhaar)
// — OPERATIONAL data, NOT a Tier-1 envelope-encrypted column (mirror wa_inbound_webhook_events). Stored intact
// for the worker + provenance; retention hygiene reclaims processed rows via a sweep.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields camelCase; table plural.

import { boolean, index, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, TelegramInboundWebhookEventId } from '../ids/index.js';

export const telegramInboundWebhookEvents = pgTable(
  'telegram_inbound_webhook_events',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded `TelegramInboundWebhookEventId`.
    eventId: uuid('event_id').defaultRandom().primaryKey().$type<TelegramInboundWebhookEventId>(),

    // Tenant scope (RLS predicate column; branded). From the URL path (known before the body is trusted).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The verified inbound Telegram update, stored intact for the worker + provenance. Permissive jsonb.
    rawPayload: jsonb('raw_payload').notNull(),

    // Whether the X-Telegram-Bot-Api-Secret-Token verified. Only verified updates are persisted (an invalid
    // token fails closed + persists nothing), so this is TRUE for every row today — recorded explicitly for
    // provenance + forward-compat.
    signatureVerified: boolean('signature_verified').notNull(),

    // The worker sets this on drain — un-processed = NULL. Backs the drain scan + replay-idempotency.
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' }),

    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The worker's drain scan (un-processed events, oldest first).
    index('telegram_inbound_webhook_events_processed_idx').on(t.processedAt),
  ],
);

export type TelegramInboundWebhookEventRow = typeof telegramInboundWebhookEvents.$inferSelect;
export type TelegramInboundWebhookEventInsert = typeof telegramInboundWebhookEvents.$inferInsert;
