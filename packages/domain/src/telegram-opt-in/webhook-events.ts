// Inbound Telegram webhook-queue accessors — Story 5.5 (Task 3; AC8).
//
// The §3.11 persist-and-ack half: `persistInboundWebhookEvent` runs on the ingress request tx (RLS enforces
// the tenant match from the URL-path pariwar_id). The worker-drain half (`claimUnprocessedWebhookEvents` /
// `markWebhookEventProcessed`) runs cross-tenant on the apps/jobs BYPASSRLS service pool. No business logic
// here — matching / transitions live in the worker (this is the primitive persistence seam). Mirrors
// wa-opt-in/webhook-events.ts exactly.

import { and, asc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';

import { clampLimit } from '../pagination.js';
import type { Db } from '../db.js';
import type { PariwarId, TelegramInboundWebhookEventId } from '../ids/index.js';
import {
  type TelegramInboundWebhookEventRow,
  telegramInboundWebhookEvents,
} from '../schema/telegram_inbound_webhook_events.js';

export interface PersistInboundWebhookEventInput {
  pariwarId: PariwarId;
  /** The verified inbound Telegram update, stored intact for the worker + provenance. */
  rawPayload: unknown;
  /** Whether the secret token verified (TRUE for every persisted row — invalid tokens persist nothing). */
  signatureVerified: boolean;
}

/**
 * Persist one verified inbound webhook event on the ingress request tx (AC8). Returns the inserted row (its
 * `event_id` + `received_at`). NO downstream call — the worker drains + processes.
 */
export async function persistInboundWebhookEvent(
  db: Db,
  input: PersistInboundWebhookEventInput,
): Promise<TelegramInboundWebhookEventRow> {
  const inserted = await db
    .insert(telegramInboundWebhookEvents)
    .values({
      pariwarId: input.pariwarId,
      rawPayload: input.rawPayload,
      signatureVerified: input.signatureVerified,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[persistInboundWebhookEvent] insert returned no row — check session scope');
  }
  return row;
}

/**
 * The worker drain scan (AC8): atomically claims the oldest un-processed events (processed_at IS NULL),
 * bounded by `limit`. A single `UPDATE ... FOR UPDATE SKIP LOCKED` statement — the SKIP-LOCKED subquery
 * selects candidate rows without blocking on ones already claimed by a concurrent tick/replica, and the outer
 * UPDATE stamps `processed_at` in the SAME statement, so two overlapping ticks can never both claim the same
 * row. Cross-tenant (the worker's service login is BYPASSRLS); each row carries its pariwar_id.
 */
export async function claimUnprocessedWebhookEvents(
  db: Db,
  limit: number,
): Promise<TelegramInboundWebhookEventRow[]> {
  const candidates = db
    .select({ eventId: telegramInboundWebhookEvents.eventId })
    .from(telegramInboundWebhookEvents)
    .where(isNull(telegramInboundWebhookEvents.processedAt))
    .orderBy(asc(telegramInboundWebhookEvents.receivedAt))
    .limit(clampLimit(limit, { default: 200, cap: 500 }))
    .for('update', { skipLocked: true });

  return db
    .update(telegramInboundWebhookEvents)
    .set({ processedAt: sql`now()` })
    .where(inArray(telegramInboundWebhookEvents.eventId, candidates))
    .returning();
}

/** Mark an event processed (worker end-of-drain). Idempotent — re-marking a processed event is a no-op UPDATE. */
export async function markWebhookEventProcessed(
  db: Db,
  eventId: TelegramInboundWebhookEventId,
): Promise<void> {
  await db
    .update(telegramInboundWebhookEvents)
    .set({ processedAt: sql`now()` })
    .where(
      and(
        eq(telegramInboundWebhookEvents.eventId, eventId),
        isNull(telegramInboundWebhookEvents.processedAt),
      ),
    );
}

/**
 * Reclaim processed webhook-queue rows older than `ttlSeconds` (operational hygiene — the worker has already
 * consumed them). Cross-tenant on the service pool. Returns the number of rows deleted.
 */
export async function purgeProcessedWebhookEvents(db: Db, ttlSeconds: number): Promise<number> {
  const deleted = await db
    .delete(telegramInboundWebhookEvents)
    .where(
      and(
        sql`${telegramInboundWebhookEvents.processedAt} IS NOT NULL`,
        lt(telegramInboundWebhookEvents.processedAt, sql`now() - make_interval(secs => ${ttlSeconds})`),
      ),
    )
    .returning({ id: telegramInboundWebhookEvents.eventId });
  return deleted.length;
}
