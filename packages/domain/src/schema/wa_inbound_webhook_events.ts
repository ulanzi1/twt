// `wa_inbound_webhook_events` — the §3.11 dedicated webhook-queue table (Story 5.4, Task 4; AC2).
//
// The ingress primitive VERIFIES Meta's X-Hub-Signature-256, PERSISTS the raw inbound payload here, and ACKs
// 200 — all with NO business logic in the handler path (AR-44/§3.11). The async worker (apps/jobs
// wa-webhook-processor) drains un-processed rows and does the matching / state transitions / status
// persistence. Keeping ingress (persist+ack) and processing (the worker) split is what keeps the handler
// comfortably inside Meta's 5s timeout.
//
// ── RLS: standard inline tenant-isolation (0037/0038 shape) ────────────────────────────────────────────
// pariwar_id comes from the URL path (the trust-establishing signature key is known from the path BEFORE the
// body is parsed). STANDARD inline tenant-isolation RLS on pariwar_id (Story 1.6 closed-failure construct).
// The worker drains on the BYPASSRLS service pool (cross-tenant), like the other apps/jobs sweeps.
//
// ── PII discipline ─────────────────────────────────────────────────────────────────────────────────────
// `raw_payload` is Meta-opaque inbound webhook data — msisdns appear in it (the sender `from`), so it is
// OPERATIONAL data, NOT a Tier-1 envelope-encrypted column (mirror whatsapp_send_status' "Meta opaque id,
// plain text" posture). It is stored intact for the worker + provenance; retention hygiene reclaims processed
// rows via a sweep (operational cleanup, like the device-token / validity-cache GC).
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields camelCase; table plural.

import { index, jsonb, boolean, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, WaInboundWebhookEventId } from '../ids/index.js';

export const waInboundWebhookEvents = pgTable(
  'wa_inbound_webhook_events',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded `WaInboundWebhookEventId`.
    eventId: uuid('event_id').defaultRandom().primaryKey().$type<WaInboundWebhookEventId>(),

    // Tenant scope (RLS predicate column; branded). From the URL path (known before the body is trusted).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The verified inbound Meta body, stored intact for the worker + provenance. Permissive jsonb.
    rawPayload: jsonb('raw_payload').notNull(),

    // Whether the X-Hub-Signature-256 verified. Only verified events are persisted (an invalid signature
    // fails closed + persists nothing), so this is TRUE for every row today — recorded explicitly for
    // provenance + forward-compat if a "persist-then-quarantine" mode is ever added.
    signatureVerified: boolean('signature_verified').notNull(),

    // The worker sets this on drain — un-processed = NULL. Backs the drain scan + replay-idempotency.
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' }),

    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The worker's drain scan (un-processed events, oldest first).
    index('wa_inbound_webhook_events_processed_idx').on(t.processedAt),
  ],
);

export type WaInboundWebhookEventRow = typeof waInboundWebhookEvents.$inferSelect;
export type WaInboundWebhookEventInsert = typeof waInboundWebhookEvents.$inferInsert;
